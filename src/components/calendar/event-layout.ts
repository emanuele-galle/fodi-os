import type { CalendarEvent } from './types'

interface EventLayout {
  event: CalendarEvent
  column: number
  totalColumns: number
}

interface TimedItem {
  event: CalendarEvent
  mins: { start: number; end: number }
}

interface ClusterItem extends TimedItem {
  column: number
}

function getEventMinutes(ev: CalendarEvent): { start: number; end: number } | null {
  if (!ev.start.dateTime || !ev.end.dateTime) return null
  const s = new Date(ev.start.dateTime)
  const e = new Date(ev.end.dateTime)
  return {
    start: s.getHours() * 60 + s.getMinutes(),
    end: e.getHours() * 60 + e.getMinutes(),
  }
}

function findAvailableColumn(cluster: ClusterItem[], item: TimedItem): number {
  const usedColumns = new Set(
    cluster
      .filter((c) => c.mins.start < item.mins.end && item.mins.start < c.mins.end)
      .map((c) => c.column)
  )
  let col = 0
  while (usedColumns.has(col)) col++
  return col
}

function placeInCluster(clusters: ClusterItem[][], item: TimedItem): void {
  for (const cluster of clusters) {
    const overlaps = cluster.some((c) => c.mins.start < item.mins.end && item.mins.start < c.mins.end)
    if (overlaps) {
      const col = findAvailableColumn(cluster, item)
      cluster.push({ ...item, column: col })
      return
    }
  }
  clusters.push([{ ...item, column: 0 }])
}

/**
 * Assigns columns to overlapping timed events so they render side-by-side.
 */
export function layoutOverlappingEvents(events: CalendarEvent[]): EventLayout[] {
  const timed = events
    .map((ev) => ({ event: ev, mins: getEventMinutes(ev) }))
    .filter((x): x is TimedItem => x.mins !== null)
    .sort((a, b) => a.mins.start - b.mins.start || b.mins.end - a.mins.end)

  if (timed.length === 0) return []

  const clusters: ClusterItem[][] = []
  for (const item of timed) {
    placeInCluster(clusters, item)
  }

  const result: EventLayout[] = []
  for (const cluster of clusters) {
    const maxCol = Math.max(...cluster.map((c) => c.column)) + 1
    for (const item of cluster) {
      result.push({ event: item.event, column: item.column, totalColumns: maxCol })
    }
  }

  return result
}
