/**
 * Import Teamwork PM → Muscari OS
 *
 * Migra progetti, tasklist→folder, task, milestone, commenti e tag
 * dal dump SQL di Teamwork PM (MySQL) al database PostgreSQL di Muscari OS.
 *
 * Esecuzione: cd /var/www/projects/muscari-os && npx tsx prisma/import-teamwork.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as readline from 'readline'

// ============================================================
// SETUP
// ============================================================

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SQL_DUMP_PATH = '/var/www/uploads/283128_TeamworkPM_Backup_20260219.sql'

// 24 project IDs from the CSV export
const TARGET_PROJECT_IDS = new Set([
  403192, 449595, 570972, 623548, 753050, 742074, 750109, 734645,
  677691, 548885, 677674, 721602, 747169, 754913, 748198, 752457,
  742668, 724418, 720508, 752580, 745186, 707415, 742066, 729394,
])

// ============================================================
// TYPES
// ============================================================

interface TWProject {
  projectId: number
  projectname: string
  projectDescription: string | null
  companyId: number | null
  projectStatus: string
  projectStartDate: string | null
  projectEndDate: string | null
  projectCategoryId: number | null
  projectCreatedDate: string | null
}

interface TWTasklist {
  tasklistId: number
  projectId: number
  tasklistName: string
  tasklistDescription: string | null
  tasklistDisplayOrder: number
  tasklistStatus: string
}

interface TWTask {
  taskId: number
  taskName: string
  taskDescription: string | null
  taskProgress: number
  tasklistId: number
  taskDisplayOrder: number
  taskStatus: string
  taskStartDate: string | null
  taskDueDate: string | null
  taskPriority: number | null
  taskCompletedDate: string | null
  taskCreatedDate: string | null
  taskEstimateMinutes: number | null
  taskParentTaskId: number | null
  taskDescriptionContentType: string
}

interface TWMilestone {
  milestoneId: number
  milestoneName: string
  milestoneDueDate: string | null
  projectId: number
  milestoneStatus: string
  milestoneCompletedDateTime: string | null
  milestoneDateCreated: string | null
}

interface TWComment {
  commentId: number
  commentBody: string | null
  commentPostedByUserId: number
  commentPostedDateTime: string | null
  commentDeleted: number
  projectId: number
  objectId: number
  objectType: string
  commentHTMLBody: string | null
  contentType: string
}

interface TWCompany {
  companyId: number
  companyName: string
}

interface TWTag {
  tagId: number
  tagName: string
}

interface TWTagItem {
  tagId: number
  itemId: number
  itemType: string
}

interface TWProjectCategory {
  projectCategoryId: number
  projectCategoryName: string
}

// ============================================================
// SQL PARSER — state machine per tuple VALUES
// ============================================================

/**
 * Parsa le tuple da una riga INSERT INTO `table` VALUES (...),(...);
 * Gestisce: quote escape (\' e ''), NULL, _binary prefix, numeri.
 */
function parseValues(valuesStr: string): (string | number | null)[][] {
  const rows: (string | number | null)[][] = []
  let i = 0
  const len = valuesStr.length

  while (i < len) {
    // Cerca inizio tupla '('
    while (i < len && valuesStr[i] !== '(') i++
    if (i >= len) break
    i++ // skip '('

    const row: (string | number | null)[] = []
    while (i < len) {
      // skip whitespace
      while (i < len && (valuesStr[i] === ' ' || valuesStr[i] === '\t')) i++

      if (i >= len) break

      if (valuesStr[i] === ')') {
        i++ // skip ')'
        break
      }

      if (valuesStr[i] === ',') {
        i++ // skip comma between values
        // skip whitespace after comma
        while (i < len && (valuesStr[i] === ' ' || valuesStr[i] === '\t')) i++
      }

      if (i >= len || valuesStr[i] === ')') {
        if (i < len) i++
        break
      }

      // NULL
      if (valuesStr.startsWith('NULL', i)) {
        row.push(null)
        i += 4
        continue
      }

      // _binary prefix (strip it, read the quoted string that follows)
      if (valuesStr.startsWith('_binary', i)) {
        i += 7
        // skip whitespace
        while (i < len && valuesStr[i] === ' ') i++
        // fall through to string parsing below
      }

      // Quoted string
      if (valuesStr[i] === "'") {
        i++ // skip opening quote
        let str = ''
        while (i < len) {
          if (valuesStr[i] === '\\') {
            // Escape sequence
            i++
            if (i < len) {
              const ch = valuesStr[i]
              if (ch === "'") str += "'"
              else if (ch === '"') str += '"'
              else if (ch === '\\') str += '\\'
              else if (ch === 'n') str += '\n'
              else if (ch === 'r') str += '\r'
              else if (ch === 't') str += '\t'
              else if (ch === '0') str += '\0'
              else str += ch
              i++
            }
          } else if (valuesStr[i] === "'" && i + 1 < len && valuesStr[i + 1] === "'") {
            // Doubled quote escape
            str += "'"
            i += 2
          } else if (valuesStr[i] === "'") {
            i++ // skip closing quote
            break
          } else {
            str += valuesStr[i]
            i++
          }
        }
        row.push(str)
        continue
      }

      // Number (integer or decimal, possibly negative)
      if (valuesStr[i] === '-' || valuesStr[i] === '+' || (valuesStr[i] >= '0' && valuesStr[i] <= '9')) {
        let numStr = ''
        if (valuesStr[i] === '-' || valuesStr[i] === '+') {
          numStr += valuesStr[i]
          i++
        }
        while (i < len && ((valuesStr[i] >= '0' && valuesStr[i] <= '9') || valuesStr[i] === '.')) {
          numStr += valuesStr[i]
          i++
        }
        const num = numStr.includes('.') ? parseFloat(numStr) : parseInt(numStr, 10)
        row.push(num)
        continue
      }

      // Unknown token — skip to next comma or closing paren
      while (i < len && valuesStr[i] !== ',' && valuesStr[i] !== ')') i++
      row.push(null)
    }

    if (row.length > 0) {
      rows.push(row)
    }
  }

  return rows
}

// ============================================================
// FASE 1: Parse SQL dump riga per riga
// ============================================================

interface ParsedData {
  projects: TWProject[]
  tasklists: TWTasklist[]
  tasks: TWTask[]
  milestones: TWMilestone[]
  comments: TWComment[]
  companies: TWCompany[]
  tags: TWTag[]
  tagItems: TWTagItem[]
  projectCategories: TWProjectCategory[]
}

async function parseSqlDump(): Promise<ParsedData> {
  console.log('Fase 1: Parsing SQL dump...')

  const data: ParsedData = {
    projects: [],
    tasklists: [],
    tasks: [],
    milestones: [],
    comments: [],
    companies: [],
    tags: [],
    tagItems: [],
    projectCategories: [],
  }

  // Collect all projectIds we encounter for tasklist→project resolution
  const tasklistProjectMap = new Map<number, number>() // tasklistId → projectId
  // Collect all tasklists to resolve task→project
  const taskTasklistMap = new Map<number, number>() // taskId → tasklistId (for post-processing)

  const fileStream = fs.createReadStream(SQL_DUMP_PATH, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

  // MySQL dumps can have multi-line INSERT statements. We accumulate lines.
  let currentInsertTable = ''
  let accumulatedLine = ''

  for await (const rawLine of rl) {
    const line = rawLine.trimEnd()

    // Check if this line starts a new INSERT INTO
    const insertMatch = line.match(/^INSERT INTO `(\w+)` VALUES\s/)
    if (insertMatch) {
      // Process any previously accumulated line first
      if (accumulatedLine && currentInsertTable) {
        processInsertLine(currentInsertTable, accumulatedLine, data, tasklistProjectMap)
      }
      currentInsertTable = insertMatch[1]
      accumulatedLine = line
      // Check if line ends with ';' — complete statement
      if (line.endsWith(';')) {
        processInsertLine(currentInsertTable, accumulatedLine, data, tasklistProjectMap)
        currentInsertTable = ''
        accumulatedLine = ''
      }
      continue
    }

    // Continuation of a multi-line INSERT
    if (currentInsertTable && accumulatedLine) {
      accumulatedLine += line
      if (line.endsWith(';')) {
        processInsertLine(currentInsertTable, accumulatedLine, data, tasklistProjectMap)
        currentInsertTable = ''
        accumulatedLine = ''
      }
    }
  }

  // Process any remaining accumulated line
  if (accumulatedLine && currentInsertTable) {
    processInsertLine(currentInsertTable, accumulatedLine, data, tasklistProjectMap)
  }

  // Build tasklistProjectMap from parsed tasklists (all, not just filtered — needed for task resolution)
  for (const tl of data.tasklists) {
    tasklistProjectMap.set(tl.tasklistId, tl.projectId)
  }

  console.log(`  Parsed: ${data.projects.length} projects, ${data.tasklists.length} tasklists, ` +
    `${data.tasks.length} tasks, ${data.milestones.length} milestones, ` +
    `${data.comments.length} comments, ${data.companies.length} companies, ` +
    `${data.tags.length} tags, ${data.tagItems.length} tag items, ` +
    `${data.projectCategories.length} categories`)

  return data
}

/**
 * Tables we care about and their INSERT parsing logic.
 * Column positions are 0-based indices into the VALUES tuple.
 */
const TABLES_OF_INTEREST = new Set([
  'projects', 'tasklists', 'tasks', 'milestones', 'comments',
  'companies', 'tags', 'tags_items', 'projectcategories',
])

function processInsertLine(
  table: string,
  line: string,
  data: ParsedData,
  tasklistProjectMap: Map<number, number>,
) {
  if (!TABLES_OF_INTEREST.has(table)) return

  // Extract VALUES portion
  const valIdx = line.indexOf(' VALUES ')
  if (valIdx === -1) return
  let valuesStr = line.substring(valIdx + 8)
  // Remove trailing semicolon
  if (valuesStr.endsWith(';')) valuesStr = valuesStr.slice(0, -1)

  const rows = parseValues(valuesStr)

  for (const r of rows) {
    switch (table) {
      case 'projects': {
        // Col 0: projectId, 2: projectname, 3: projectDescription,
        // 5: companyId, 7: projectStatus, 19: projectStartDate, 20: projectEndDate,
        // 42: projectCategoryId, 10: projectCreatedDate
        const pid = r[0] as number
        if (!TARGET_PROJECT_IDS.has(pid)) continue
        data.projects.push({
          projectId: pid,
          projectname: str(r[2]),
          projectDescription: strOrNull(r[3]),
          companyId: numOrNull(r[5]),
          projectStatus: str(r[7]),
          projectStartDate: dateStrOrNull(r[19]),
          projectEndDate: dateStrOrNull(r[20]),
          projectCategoryId: numOrNull(r[42]),
          projectCreatedDate: dateStrOrNull(r[10]),
        })
        break
      }
      case 'tasklists': {
        // Col 0: tasklistId, 2: projectId, 3: tasklistName, 4: tasklistDescription,
        // 9: tasklistDisplayOrder, 11: tasklistStatus
        const projId = r[2] as number
        const tlId = r[0] as number
        tasklistProjectMap.set(tlId, projId)
        if (!TARGET_PROJECT_IDS.has(projId)) continue
        const status = str(r[11])
        if (status === 'deleted') continue
        data.tasklists.push({
          tasklistId: tlId,
          projectId: projId,
          tasklistName: str(r[3]),
          tasklistDescription: strOrNull(r[4]),
          tasklistDisplayOrder: num(r[9]),
          tasklistStatus: status,
        })
        break
      }
      case 'tasks': {
        // Col 0: taskId, 2: taskName, 3: taskDescription, 4: taskProgress,
        // 5: tasklistId, 10: taskDisplayOrder, 11: taskStatus,
        // 12: taskStartDate, 13: taskDueDate, 18: taskPriority,
        // 19: taskCompletedDate, 20: taskCreatedDate, 22: taskEstimateMinutes,
        // 24: taskParentTaskId, 28: taskDescriptionContentType
        const status = str(r[11])
        if (status === 'deleted' || status === 'newTaskDefaults') continue
        const tlId = r[5] as number
        // We store all non-deleted tasks now, filter by project later
        data.tasks.push({
          taskId: r[0] as number,
          taskName: str(r[2]),
          taskDescription: strOrNull(r[3]),
          taskProgress: num(r[4]),
          tasklistId: tlId,
          taskDisplayOrder: num(r[10]),
          taskStatus: status,
          taskStartDate: dateStrOrNull(r[12]),
          taskDueDate: dateStrOrNull(r[13]),
          taskPriority: numOrNull(r[18]),
          taskCompletedDate: dateStrOrNull(r[19]),
          taskCreatedDate: dateStrOrNull(r[20]),
          taskEstimateMinutes: numOrNull(r[22]),
          taskParentTaskId: numOrNull(r[24]),
          taskDescriptionContentType: str(r[28]) || 'TEXT',
        })
        break
      }
      case 'milestones': {
        // Col 0: milestoneId, 2: milestoneName, 4: milestoneDueDate,
        // 6: projectId, 9: milestoneStatus, 14: milestoneCompletedDateTime,
        // 15: milestoneDateCreated
        const projId = r[6] as number
        if (!TARGET_PROJECT_IDS.has(projId)) continue
        const status = str(r[9])
        if (status === 'deleted') continue
        data.milestones.push({
          milestoneId: r[0] as number,
          milestoneName: str(r[2]),
          milestoneDueDate: dateStrOrNull(r[4]),
          projectId: projId,
          milestoneStatus: status,
          milestoneCompletedDateTime: dateStrOrNull(r[14]),
          milestoneDateCreated: dateStrOrNull(r[15]),
        })
        break
      }
      case 'comments': {
        // Col 0: commentId, 2: commentBody, 3: commentPostedByUserId,
        // 4: commentPostedDateTime, 5: commentDeleted, 7: projectId,
        // 8: objectId, 9: objectType, 14: commentHTMLBody, 16: contentType
        const projId = r[7] as number
        if (!TARGET_PROJECT_IDS.has(projId)) continue
        const deleted = num(r[5])
        if (deleted !== 0) continue
        const objType = str(r[9])
        if (objType !== 'task') continue
        data.comments.push({
          commentId: r[0] as number,
          commentBody: strOrNull(r[2]),
          commentPostedByUserId: num(r[3]),
          commentPostedDateTime: dateStrOrNull(r[4]),
          commentDeleted: deleted,
          projectId: projId,
          objectId: num(r[8]),
          objectType: objType,
          commentHTMLBody: strOrNull(r[14]),
          contentType: str(r[16]) || 'TEXT',
        })
        break
      }
      case 'companies': {
        // Col 0: companyId, 2: companyName
        data.companies.push({
          companyId: r[0] as number,
          companyName: str(r[2]),
        })
        break
      }
      case 'tags': {
        // Col 0: tagId, 1: tagName
        data.tags.push({
          tagId: r[0] as number,
          tagName: str(r[1]),
        })
        break
      }
      case 'tags_items': {
        // Col 0: tagItemId, 2: tagId, 3: itemId, 4: itemType
        data.tagItems.push({
          tagId: r[2] as number,
          itemId: r[3] as number,
          itemType: str(r[4]),
        })
        break
      }
      case 'projectcategories': {
        // Col 0: projectCategoryId, 1: projectCategoryName
        data.projectCategories.push({
          projectCategoryId: r[0] as number,
          projectCategoryName: str(r[1]),
        })
        break
      }
    }
  }
}

// Helper functions
function str(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}
function strOrNull(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : parseInt(v, 10) || 0
}
function numOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  if (v === 0) return 0
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return isNaN(n) ? null : n
}
function dateStrOrNull(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s === '0000-00-00' || s === '0000-00-00 00:00:00' || s === '1970-01-01') return null
  return s
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 80)
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function parseDate(s: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// ============================================================
// MAPPING CONFIGURATIONS
// ============================================================

// Company name → Muscari client slug (hardcoded mapping)
const COMPANY_TO_CLIENT: Record<string, { slug: string; companyName: string; create: boolean }> = {
  'Mediacom Srls': { slug: 'mediacom-srls', companyName: 'Mediacom Srls', create: true },
  'MD': { slug: 'md', companyName: 'MD', create: true },
  'UNSIC': { slug: 'unsic', companyName: 'UNSIC', create: true },
  'GRUPPO CESTARI': { slug: 'gruppo-cestari', companyName: 'Gruppo Cestari', create: true },
  'CONFIAL': { slug: 'confial-failms', companyName: 'CONFIAL', create: true },
  'ECCELLENZE ITALIANE': { slug: 'eccellenze-tv', companyName: 'Eccellenze Italiane TV', create: true },
  'ECCELLENZE APERTE': { slug: 'eccellenze-aperte', companyName: 'Eccellenze Aperte', create: true },
  'Gruppo Bodini S.r.l.': { slug: 'gruppo-bodini', companyName: 'Gruppo Bodini S.r.l.', create: true },
  'ACCADEMIA DI COMUNICAZIONE': { slug: 'accademia-comunicazione', companyName: 'Accademia di Comunicazione', create: true },
  'Confapi Cuneo': { slug: 'confapi-cuneo', companyName: 'Confapi Cuneo', create: true },
  'Forbes': { slug: 'forbes', companyName: 'Forbes', create: true },
}

// Special handling for Easy Group (CSV has full name with sub-brands)
const COMPANY_FUZZY: [RegExp, string][] = [
  [/easy\s*(group|bunker|yopping|green)/i, 'easy-group'],
]

// Project ID → workspace slug (hardcoded from plan)
const PROJECT_WORKSPACE: Record<number, string> = {
  403192: 'commerciale',  // 0 - AMMINISTRAZIONE
  449595: 'commerciale',  // 1 - PRECOMMESSE
  570972: 'delivery',     // 2 - SITI WEB PMS E CLIENTI
  623548: 'delivery',     // 5 - PARTE WEB
  753050: 'commerciale',  // Archivio storico MD
  742074: 'creative',     // CAMERA NAZIONALE... FASHION WEEK
  750109: 'creative',     // CESTARI Comunicazione
  734645: 'creative',     // CONFIAL: COMUNICAZIONE
  677691: 'creative',     // ECCELLENZE APERTE
  548885: 'commerciale',  // ECCELLENZE ITALIANE
  677674: 'creative',     // ECCELLENZE ITALIANE TV
  721602: 'creative',     // FEGE 2025
  747169: 'commerciale',  // FEGE 2026
  754913: 'commerciale',  // GALA ECCE ITA 2026
  748198: 'creative',     // Gruppo Bodini – Evento 10 Anni
  752457: 'creative',     // Gruppo Bodini: comunicazione
  742668: 'creative',     // GUST'INITALY 2026
  724418: 'creative',     // INTERVISTE EX-STUDENTI
  720508: 'creative',     // INTERVISTE IMPRENDITORI
  752580: 'commerciale',  // Marca Bologna
  745186: 'creative',     // Strategia Comunicazione Edoardo
  707415: 'creative',     // VIDEO PODCAST STORIE
  742066: 'delivery',     // WEBTV UNSIC
  729394: 'creative',     // WORKSHOP PWC-LEONARDO
}

// ============================================================
// MAIN IMPORT FUNCTION
// ============================================================

async function main() {
  console.log('=== Import Teamwork PM → Muscari OS ===\n')

  // Check if SQL dump exists
  if (!fs.existsSync(SQL_DUMP_PATH)) {
    console.error(`ERRORE: File SQL dump non trovato: ${SQL_DUMP_PATH}`)
    process.exit(1)
  }

  // ============================================================
  // FASE 1: Parse SQL dump
  // ============================================================
  const data = await parseSqlDump()

  // Build tasklistId → projectId map from ALL parsed tasklists
  // (we need this for tasks that reference tasklists from target projects)
  const tasklistToProject = new Map<number, number>()
  for (const tl of data.tasklists) {
    tasklistToProject.set(tl.tasklistId, tl.projectId)
  }

  // Filter tasks: keep only those belonging to tasklists in target projects
  const targetTasklistIds = new Set(data.tasklists.map(tl => tl.tasklistId))
  const filteredTasks = data.tasks.filter(t => targetTasklistIds.has(t.tasklistId))
  data.tasks = filteredTasks
  console.log(`  Filtered to ${data.tasks.length} tasks in target projects`)

  // Build tag name lookup
  const tagNameMap = new Map<number, string>()
  for (const tag of data.tags) {
    tagNameMap.set(tag.tagId, tag.tagName)
  }

  // Build task → tag names
  const taskTagsMap = new Map<number, string[]>()
  for (const ti of data.tagItems) {
    if (ti.itemType === 'TASK') {
      const tagName = tagNameMap.get(ti.tagId)
      if (tagName) {
        if (!taskTagsMap.has(ti.itemId)) taskTagsMap.set(ti.itemId, [])
        taskTagsMap.get(ti.itemId)!.push(tagName)
      }
    }
  }

  // Build projectCategoryId → name
  const categoryMap = new Map<number, string>()
  for (const pc of data.projectCategories) {
    categoryMap.set(pc.projectCategoryId, pc.projectCategoryName)
  }

  // Build companyId → companyName
  const companyNameMap = new Map<number, string>()
  for (const c of data.companies) {
    companyNameMap.set(c.companyId, c.companyName)
  }

  // ============================================================
  // FASE 2: Resolve Admin user
  // ============================================================
  console.log('\nFase 2: Resolving admin user...')
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.error('ERRORE: Nessun utente ADMIN trovato nel database Muscari OS')
    process.exit(1)
  }
  console.log(`  Admin: ${admin.firstName} ${admin.lastName} (${admin.email})`)

  // ============================================================
  // FASE 3: Fetch/create workspaces
  // ============================================================
  console.log('\nFase 3: Fetching/creating workspaces...')
  const wsDefinitions = [
    { name: 'Commerciale', slug: 'commerciale', description: 'Space commerciale per vendite e gestione clienti', color: '#3B82F6', icon: 'briefcase', sortOrder: 1 },
    { name: 'Delivery', slug: 'delivery', description: 'Space per il team tecnico e project management', color: '#10B981', icon: 'code', sortOrder: 2 },
    { name: 'Creative', slug: 'creative', description: 'Space per contenuti, video e social media', color: '#8B5CF6', icon: 'palette', sortOrder: 3 },
  ]
  const wsMap: Record<string, string> = {}
  for (const wsDef of wsDefinitions) {
    const ws = await prisma.workspace.upsert({
      where: { slug: wsDef.slug },
      update: {},
      create: wsDef,
    })
    wsMap[ws.slug] = ws.id
  }
  console.log(`  Workspaces: ${Object.keys(wsMap).join(', ')}`)

  // ============================================================
  // FASE 4: Import Clienti
  // ============================================================
  console.log('\nFase 4: Importing clients...')
  const clientSlugMap: Record<string, string> = {} // slug → Muscari client ID

  // Fetch existing clients first
  const existingClients = await prisma.client.findMany()
  for (const c of existingClients) {
    clientSlugMap[c.slug] = c.id
  }
  console.log(`  Existing clients: ${existingClients.length}`)

  // Determine which companies we need from the 24 projects
  const neededCompanyIds = new Set<number>()
  for (const p of data.projects) {
    if (p.companyId && p.companyId > 0) neededCompanyIds.add(p.companyId)
  }

  const twCompanyToMuscariClient = new Map<number, string>() // TW companyId → Muscari clientId
  let clientsCreated = 0

  for (const companyId of neededCompanyIds) {
    const companyName = companyNameMap.get(companyId)
    if (!companyName) continue

    // Try direct mapping first
    let mapping = COMPANY_TO_CLIENT[companyName]

    // Try fuzzy match
    if (!mapping) {
      for (const [regex, slug] of COMPANY_FUZZY) {
        if (regex.test(companyName)) {
          mapping = { slug, companyName: companyName, create: true }
          break
        }
      }
    }

    // Try normalized match (case-insensitive)
    if (!mapping) {
      const normalized = companyName.trim().toUpperCase()
      for (const [key, val] of Object.entries(COMPANY_TO_CLIENT)) {
        if (key.toUpperCase() === normalized) {
          mapping = val
          break
        }
      }
    }

    if (!mapping) {
      // Auto-create with slugified name
      const slug = slugify(companyName)
      mapping = { slug, companyName: companyName, create: true }
      console.log(`  WARNING: No mapping for company '${companyName}' (id=${companyId}), auto-creating as '${slug}'`)
    }

    // Check if client already exists
    if (clientSlugMap[mapping.slug]) {
      twCompanyToMuscariClient.set(companyId, clientSlugMap[mapping.slug])
      console.log(`  Reusing client: ${mapping.slug} (for ${companyName})`)
      continue
    }

    // Create new client
    if (mapping.create) {
      // Check for duplicate slug
      let finalSlug = mapping.slug
      let counter = 2
      while (clientSlugMap[finalSlug]) {
        finalSlug = `${mapping.slug}-${counter}`
        counter++
      }

      const client = await prisma.client.upsert({
        where: { slug: finalSlug },
        update: {},
        create: {
          companyName: mapping.companyName || companyName,
          slug: finalSlug,
          status: 'ACTIVE',
          tags: ['tw-import'],
        },
      })
      clientSlugMap[finalSlug] = client.id
      twCompanyToMuscariClient.set(companyId, client.id)
      clientsCreated++
      console.log(`  Created client: ${companyName} → ${finalSlug}`)
    }
  }
  console.log(`  Clients created: ${clientsCreated}`)

  // ============================================================
  // FASE 5: Import Progetti (24)
  // ============================================================
  console.log('\nFase 5: Importing projects...')
  const projectIdMap = new Map<number, string>() // TW projectId → Muscari projectId
  let projectsCreated = 0

  for (const p of data.projects) {
    const wsSlug = PROJECT_WORKSPACE[p.projectId] || 'creative'
    const wsId = wsMap[wsSlug]
    if (!wsId) {
      console.error(`  SKIP: No workspace for project ${p.projectname} (ws=${wsSlug})`)
      continue
    }

    const clientId = p.companyId ? twCompanyToMuscariClient.get(p.companyId) || null : null

    let slug = slugify(p.projectname)
    // Check for duplicate slug
    let finalSlug = slug
    let counter = 2
    const existingProject = await prisma.project.findUnique({ where: { slug: finalSlug } })
    if (existingProject) {
      // Check if this is from a previous tw-import — reuse it
      finalSlug = slug
      while (true) {
        const existing = await prisma.project.findUnique({ where: { slug: finalSlug } })
        if (!existing) break
        finalSlug = `${slug}-${counter}`
        counter++
      }
    }

    const project = await prisma.project.upsert({
      where: { slug: finalSlug },
      update: {},
      create: {
        workspaceId: wsId,
        clientId,
        name: p.projectname.substring(0, 255),
        slug: finalSlug,
        description: p.projectDescription,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        startDate: parseDate(p.projectStartDate),
        endDate: parseDate(p.projectEndDate),
        color: getProjectColor(wsSlug),
      },
    })

    projectIdMap.set(p.projectId, project.id)
    projectsCreated++
    console.log(`  Project: ${p.projectname} → ${finalSlug} (${wsSlug})`)
  }
  console.log(`  Projects created: ${projectsCreated}`)

  // ============================================================
  // FASE 6: Import Milestone
  // ============================================================
  console.log('\nFase 6: Importing milestones...')
  const milestoneIdMap = new Map<number, string>() // TW milestoneId → Muscari milestoneId
  let milestonesCreated = 0

  for (const m of data.milestones) {
    const muscariProjectId = projectIdMap.get(m.projectId)
    if (!muscariProjectId) continue

    const msStatus = (m.milestoneStatus === 'completed') ? 'completed' : 'pending'

    const milestone = await prisma.milestone.create({
      data: {
        projectId: muscariProjectId,
        name: m.milestoneName.substring(0, 255),
        dueDate: parseDate(m.milestoneDueDate),
        status: msStatus,
        sortOrder: 0,
      },
    })

    milestoneIdMap.set(m.milestoneId, milestone.id)
    milestonesCreated++
  }
  console.log(`  Milestones created: ${milestonesCreated}`)

  // ============================================================
  // FASE 7: Import Folder (da Tasklist)
  // ============================================================
  console.log('\nFase 7: Importing folders (from tasklists)...')
  const folderIdMap = new Map<number, string>() // TW tasklistId → Muscari folderId
  let foldersCreated = 0

  for (const tl of data.tasklists) {
    const muscariProjectId = projectIdMap.get(tl.projectId)
    if (!muscariProjectId) continue

    const folder = await prisma.folder.create({
      data: {
        projectId: muscariProjectId,
        name: tl.tasklistName.substring(0, 255),
        description: tl.tasklistDescription,
        sortOrder: tl.tasklistDisplayOrder,
      },
    })

    folderIdMap.set(tl.tasklistId, folder.id)
    foldersCreated++
  }
  console.log(`  Folders created: ${foldersCreated}`)

  // ============================================================
  // FASE 8: Import Task (2 passate)
  // ============================================================
  console.log('\nFase 8: Importing tasks...')

  // Build TW task sets for quick lookup
  const twTaskIds = new Set(data.tasks.map(t => t.taskId))

  // Passata 1: Create all tasks without parentId
  const taskIdMap = new Map<number, string>() // TW taskId → Muscari taskId
  let tasksCreated = 0
  let tasksSkipped = 0

  // Map TW task → milestoneId (via tasklist → milestone relationship from parsed data)
  // Note: In Teamwork, tasklists can be linked to milestones, but tasks don't have direct milestone links.
  // We'd need the milestone_id from the tasklist. For now, skip milestone linking on tasks.

  for (const t of data.tasks) {
    const folderId = folderIdMap.get(t.tasklistId)
    if (!folderId) {
      tasksSkipped++
      continue
    }

    // Resolve projectId from the tasklist
    const twProjectId = tasklistToProject.get(t.tasklistId)
    if (!twProjectId) {
      tasksSkipped++
      continue
    }
    const muscariProjectId = projectIdMap.get(twProjectId)
    if (!muscariProjectId) {
      tasksSkipped++
      continue
    }

    // Map status
    let status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED' = 'TODO'
    let boardColumn = 'todo'
    if (t.taskStatus === 'completed') {
      status = 'DONE'
      boardColumn = 'done'
    } else if (t.taskStatus === 'new' || t.taskStatus === 'reopened') {
      status = 'TODO'
      boardColumn = 'todo'
    }

    // Map priority: NULL/0 → MEDIUM, 100 → LOW, 200 → MEDIUM, 300 → HIGH
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
    if (t.taskPriority === 100) priority = 'LOW'
    else if (t.taskPriority === 200) priority = 'MEDIUM'
    else if (t.taskPriority === 300) priority = 'HIGH'

    // Get tags for this task
    const tagNames = taskTagsMap.get(t.taskId) || []
    tagNames.push('tw-import') // Add import marker tag

    const task = await prisma.task.create({
      data: {
        projectId: muscariProjectId,
        folderId,
        creatorId: admin.id,
        assigneeId: null,
        title: t.taskName.substring(0, 500),
        description: t.taskDescription,
        status,
        priority,
        boardColumn,
        sortOrder: t.taskDisplayOrder,
        startDate: parseDate(t.taskStartDate),
        dueDate: parseDate(t.taskDueDate),
        completedAt: parseDate(t.taskCompletedDate),
        estimatedHours: t.taskEstimateMinutes ? t.taskEstimateMinutes / 60 : null,
        tags: tagNames,
        // parentId will be set in pass 2
      },
    })

    taskIdMap.set(t.taskId, task.id)
    tasksCreated++

    if (tasksCreated % 200 === 0) {
      console.log(`  ... ${tasksCreated} tasks created`)
    }
  }
  console.log(`  Pass 1: ${tasksCreated} tasks created, ${tasksSkipped} skipped`)

  // Passata 2: Update subtask parentId
  let subtasksLinked = 0
  let orphanSubtasks = 0

  for (const t of data.tasks) {
    if (!t.taskParentTaskId || t.taskParentTaskId === 0) continue

    const muscariTaskId = taskIdMap.get(t.taskId)
    if (!muscariTaskId) continue

    const muscariParentId = taskIdMap.get(t.taskParentTaskId)
    if (!muscariParentId) {
      // Orphan subtask — parent not in our 24 projects. Leave as top-level task.
      orphanSubtasks++
      continue
    }

    await prisma.task.update({
      where: { id: muscariTaskId },
      data: { parentId: muscariParentId },
    })
    subtasksLinked++
  }
  console.log(`  Pass 2: ${subtasksLinked} subtasks linked, ${orphanSubtasks} orphans (kept as top-level)`)

  // ============================================================
  // FASE 9: Import Commenti
  // ============================================================
  console.log('\nFase 9: Importing comments...')
  let commentsCreated = 0
  let commentsSkipped = 0

  for (const c of data.comments) {
    // objectType is already filtered to 'task' during parsing
    const muscariTaskId = taskIdMap.get(c.objectId)
    if (!muscariTaskId) {
      commentsSkipped++
      continue
    }

    // Prefer HTML body, strip tags; fallback to plain text body
    let content: string | null = null
    if (c.commentHTMLBody) {
      content = stripHtml(c.commentHTMLBody)
    } else if (c.commentBody) {
      content = c.commentBody
    }

    if (!content || content.trim() === '') {
      commentsSkipped++
      continue
    }

    await prisma.comment.create({
      data: {
        taskId: muscariTaskId,
        authorId: admin.id,
        content: content.substring(0, 10000), // reasonable limit
      },
    })
    commentsCreated++
  }
  console.log(`  Comments created: ${commentsCreated}, skipped: ${commentsSkipped}`)

  // ============================================================
  // FASE 10: Log riepilogo
  // ============================================================
  console.log('\n=== IMPORT COMPLETATO ===')
  console.log(`  Clients:    ${clientsCreated} created`)
  console.log(`  Projects:   ${projectsCreated}`)
  console.log(`  Milestones: ${milestonesCreated}`)
  console.log(`  Folders:    ${foldersCreated}`)
  console.log(`  Tasks:      ${tasksCreated} (${subtasksLinked} subtasks linked, ${orphanSubtasks} orphans)`)
  console.log(`  Comments:   ${commentsCreated}`)
  console.log('')

  // Verification queries
  console.log('--- Verifica conteggi nel DB ---')
  const dbCounts = await Promise.all([
    prisma.project.count({ where: { slug: { contains: '' } } }),
    prisma.task.count({ where: { tags: { has: 'tw-import' } } }),
    prisma.folder.count(),
    prisma.milestone.count(),
    prisma.comment.count(),
  ])
  console.log(`  Total projects in DB: ${dbCounts[0]}`)
  console.log(`  Tasks with tw-import tag: ${dbCounts[1]}`)
  console.log(`  Total folders in DB: ${dbCounts[2]}`)
  console.log(`  Total milestones in DB: ${dbCounts[3]}`)
  console.log(`  Total comments in DB: ${dbCounts[4]}`)

  // Task status distribution
  const statusDist = await prisma.task.groupBy({
    by: ['status'],
    where: { tags: { has: 'tw-import' } },
    _count: true,
  })
  console.log('\n  Task status distribution (imported):')
  for (const s of statusDist) {
    console.log(`    ${s.status}: ${s._count}`)
  }

  // Subtask count
  const subtaskCount = await prisma.task.count({
    where: { tags: { has: 'tw-import' }, parentId: { not: null } },
  })
  console.log(`\n  Subtasks with parentId set: ${subtaskCount}`)

  console.log('\nDone! Verifica con: cd /var/www/projects/muscari-os && npx prisma studio')

  await pool.end()
}

function getProjectColor(wsSlug: string): string {
  switch (wsSlug) {
    case 'commerciale': return '#3B82F6'
    case 'delivery': return '#10B981'
    case 'creative': return '#8B5CF6'
    default: return '#6366F1'
  }
}

// ============================================================
// ENTRYPOINT
// ============================================================

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('ERRORE FATALE:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
