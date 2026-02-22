'use client'
import { brandClient } from '@/lib/branding-client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Play } from 'lucide-react'

interface AnimatedDemoProps {
  slug: string
  color: string
  videoUrl?: string
}

export function AnimatedDemo({ slug, color, videoUrl }: AnimatedDemoProps) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  if (videoUrl) {
    const handlePlay = () => {
      setPlaying(true)
      // Wait for state update to reveal controls, then play
      setTimeout(() => {
        videoRef.current?.play().catch(() => {
          // If autoplay blocked, at least show controls
        })
      }, 50)
    }

    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/30 bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          controls={playing}
          playsInline
          className="w-full h-full object-contain"
        />
        {!playing && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center group cursor-pointer bg-black/30"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative h-14 w-14 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
            >
              <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
            </motion.div>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 font-medium">
              Guarda il video tutorial
            </span>
          </button>
        )}
      </div>
    )
  }

  // Fallback: animated demos
  return (
    <div className="relative w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-border/30 bg-card">
      {slug === 'crm' && <CRMDemo color={color} />}
      {slug === 'projects' && <ProjectsDemo color={color} />}
      {slug === 'erp' && <ERPDemo color={color} />}
      {slug === 'chat' && <ChatDemo color={color} />}
      {slug === 'support' && <SupportDemo color={color} />}
      {slug === 'overview' && <OverviewDemo color={color} />}
      {slug === 'content' && <ContentDemo color={color} />}
      {slug === 'mobile' && <MobileDemo color={color} />}
      {slug === 'admin' && <AdminDemo color={color} />}
    </div>
  )
}

function OverviewDemo({ color }: { color: string }) {
  const kpis = [
    { label: 'Revenue', value: '€ 24.5k' },
    { label: 'Clienti', value: '128' },
    { label: 'Task', value: '47' },
    { label: 'Ticket', value: '5' },
  ]
  return (
    <div className="p-4 h-full flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
            className="rounded-lg border border-border/30 p-2 text-center"
          >
            <div className="text-xs font-bold" style={{ color }}>{kpi.value}</div>
            <div className="text-[9px] text-muted mt-0.5">{kpi.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex-1 flex gap-2">
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex-1 rounded-lg border border-border/30 p-2 origin-bottom"
        >
          {[40, 65, 30, 80, 55, 70].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
              className="inline-block w-[12%] mx-[2%] rounded-t opacity-60 align-bottom"
              style={{ backgroundColor: color }}
            />
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="w-1/3 rounded-lg border border-border/30 p-2 space-y-1.5"
        >
          {[1, 2, 3].map(i => (
            <div key={i} className="h-2 rounded-full bg-muted/20" style={{ width: `${90 - i * 15}%` }} />
          ))}
        </motion.div>
      </div>
    </div>
  )
}

function CRMDemo({ color }: { color: string }) {
  const clients = ['Marco R.', 'Giulia B.', 'Luca T.', 'Sara M.']
  const stages = ['Lead', 'Proposta', 'Vinto']
  return (
    <div className="p-4 h-full flex gap-3">
      <div className="w-1/3 space-y-1.5">
        <div className="text-[9px] font-semibold text-muted uppercase tracking-wider mb-2">Clienti</div>
        {clients.map((name, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-2 p-1.5 rounded-md bg-secondary/30"
          >
            <div className="h-5 w-5 rounded-full text-[8px] text-white flex items-center justify-center font-bold" style={{ backgroundColor: color }}>
              {name[0]}
            </div>
            <span className="text-[10px]">{name}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex-1 flex gap-2">
        {stages.map((stage, si) => (
          <div key={stage} className="flex-1">
            <div className="text-[9px] font-semibold text-muted uppercase tracking-wider mb-2">{stage}</div>
            {[1, 2].slice(0, si === 0 ? 2 : 1).map((_, ci) => (
              <motion.div
                key={ci}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + si * 0.2 + ci * 0.1 }}
                className="mb-1.5 rounded-md border border-border/30 p-1.5"
              >
                <div className="h-1.5 rounded-full bg-muted/30 w-3/4 mb-1" />
                <div className="text-[9px] font-bold" style={{ color }}>€ {(Math.random() * 10 + 2).toFixed(1)}k</div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectsDemo({ color }: { color: string }) {
  const cols = [
    { title: 'Da fare', items: ['Setup DB', 'API auth'] },
    { title: 'In corso', items: ['UI dashboard'] },
    { title: 'Completato', items: ['Wireframe'] },
  ]
  return (
    <div className="p-4 h-full flex gap-2">
      {cols.map((col, ci) => (
        <div key={col.title} className="flex-1">
          <div className="text-[9px] font-semibold text-muted uppercase tracking-wider mb-2">{col.title}</div>
          {col.items.map((item, ii) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + ci * 0.2 + ii * 0.1 }}
              className="mb-1.5 rounded-md border border-border/30 p-2"
            >
              <div className="text-[10px] font-medium mb-1">{item}</div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded-full text-[7px] text-white flex items-center justify-center" style={{ backgroundColor: color }}>M</div>
                <div className="flex-1 h-1 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: ci === 2 ? '100%' : `${30 + ci * 25}%` }}
                    transition={{ delay: 0.8 + ci * 0.2, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ERPDemo({ color }: { color: string }) {
  const items = [
    { desc: 'Sviluppo web', qty: 40, price: 75 },
    { desc: 'Design UI/UX', qty: 20, price: 85 },
    { desc: 'Hosting annuale', qty: 1, price: 240 },
  ]
  const total = items.reduce((s, it) => s + it.qty * it.price, 0)
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold">Preventivo #2024-047</div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="text-[8px] px-2 py-0.5 rounded-full text-white font-bold"
          style={{ backgroundColor: color }}
        >
          FIRMATO
        </motion.div>
      </div>
      <div className="flex-1 space-y-1">
        {items.map((item, i) => (
          <motion.div
            key={item.desc}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center justify-between text-[10px] py-1 border-b border-border/20"
          >
            <span>{item.desc}</span>
            <span className="font-medium">€ {(item.qty * item.price).toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex items-center justify-between pt-2 border-t border-border/40"
      >
        <span className="text-[10px] font-bold">Totale</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm font-bold"
          style={{ color }}
        >
          € {total.toLocaleString()}
        </motion.span>
      </motion.div>
    </div>
  )
}

function ChatDemo({ color }: { color: string }) {
  const messages = [
    { name: 'Marco', text: 'Ho caricato i mockup del nuovo sito', align: 'left' as const },
    { name: 'Tu', text: 'Ottimo! Li revisiono subito', align: 'right' as const },
    { name: 'Sara', text: 'Aggiungo i commenti entro sera', align: 'left' as const },
  ]
  return (
    <div className="p-4 h-full flex flex-col justify-end gap-2">
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.4, duration: 0.3 }}
          className={`flex ${msg.align === 'right' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[70%] rounded-xl px-3 py-2 ${msg.align === 'right' ? 'text-white' : 'bg-secondary/50'}`} style={msg.align === 'right' ? { backgroundColor: color } : {}}>
            {msg.align === 'left' && <div className="text-[8px] font-bold mb-0.5" style={{ color }}>{msg.name}</div>}
            <div className="text-[10px]">{msg.text}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function SupportDemo({ color }: { color: string }) {
  const statuses = [
    { label: 'Aperto', active: false },
    { label: 'In lavorazione', active: false },
    { label: 'Risolto', active: true },
  ]
  return (
    <div className="p-4 h-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="h-6 px-2 rounded-md text-[9px] font-bold text-white flex items-center"
          style={{ backgroundColor: color }}
        >
          #TK-0042
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] font-medium"
        >
          Problema accesso portale
        </motion.div>
      </div>
      <div className="flex items-center gap-1">
        {statuses.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0.3, backgroundColor: 'transparent' }}
            animate={{
              opacity: 1,
              backgroundColor: i <= 2 ? color : 'transparent',
            }}
            transition={{ delay: 0.6 + i * 0.4, duration: 0.3 }}
            className="flex-1 h-1.5 rounded-full bg-muted/20 overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.6 + i * 0.4, duration: 0.4 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </motion.div>
        ))}
      </div>
      <div className="text-[9px] text-muted flex justify-between">
        {statuses.map(s => <span key={s.label}>{s.label}</span>)}
      </div>
      <div className="flex-1 space-y-1.5">
        {['Ricevuto report errore dal cliente', 'Verificato: problema di cache', 'Risolto con pulizia cache browser'].map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.25 }}
            className="text-[9px] text-muted flex items-start gap-1.5"
          >
            <div className="h-1.5 w-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
            {msg}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ContentDemo({ color }: { color: string }) {
  const files = ['hero-banner.jpg', 'logo-v2.svg', 'brochure.pdf']
  return (
    <div className="p-4 h-full flex flex-col gap-3">
      <div className="text-[9px] font-semibold text-muted uppercase tracking-wider">Libreria Asset</div>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {files.map((file, i) => (
          <motion.div
            key={file}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.2 }}
            className="rounded-lg border border-border/30 p-2 flex flex-col items-center justify-center gap-1"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ delay: 0.6 + i * 0.2 }}
              className="h-10 w-full rounded bg-muted/20"
            />
            <div className="text-[8px] text-muted truncate w-full text-center">{file}</div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + i * 0.15 }}
              className="text-[7px] px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{ backgroundColor: i === 2 ? '#f59e0b' : color }}
            >
              {i === 2 ? 'IN REVIEW' : 'APPROVATO'}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function MobileDemo({ color }: { color: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-28 h-44 rounded-2xl border-2 border-border/40 bg-background relative overflow-hidden"
      >
        <div className="h-4 bg-muted/10 flex items-center justify-center">
          <div className="text-[6px] text-muted">{brandClient.name}</div>
        </div>
        <div className="p-2 space-y-1.5">
          {['Dashboard', 'CRM', 'Progetti', 'Chat'].map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className="h-5 rounded-md flex items-center px-1.5 gap-1"
              style={{ backgroundColor: i === 0 ? `${color}20` : 'transparent' }}
            >
              <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: i === 0 ? color : '#888' }} />
              <span className="text-[7px]" style={{ color: i === 0 ? color : undefined }}>{item}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-0 inset-x-0 h-5 border-t border-border/30 flex items-center justify-around px-2"
        >
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-2 w-2 rounded-full bg-muted/30" />
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

function AdminDemo({ color }: { color: string }) {
  const users = [
    { name: 'Admin', role: 'Admin' },
    { name: 'Marco', role: 'Staff' },
    { name: 'Sara', role: 'Viewer' },
  ]
  return (
    <div className="p-4 h-full flex flex-col gap-3">
      <div className="text-[9px] font-semibold text-muted uppercase tracking-wider">Gestione Utenti</div>
      <div className="space-y-1.5 flex-1">
        {users.map((user, i) => (
          <motion.div
            key={user.name}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-2 p-2 rounded-md border border-border/30"
          >
            <div className="h-6 w-6 rounded-full text-[9px] text-white flex items-center justify-center font-bold" style={{ backgroundColor: color }}>
              {user.name[0]}
            </div>
            <span className="text-[10px] font-medium flex-1">{user.name}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted/20 text-muted font-medium">{user.role}</span>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {['Leggi', 'Scrivi', 'Admin'].map((perm, i) => (
          <motion.div
            key={perm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
            className="text-center p-1.5 rounded-md border border-border/30"
          >
            <div className="text-[7px] text-muted">{perm}</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2 + i * 0.1 }}
              className="h-3 w-3 rounded-full mx-auto mt-1"
              style={{ backgroundColor: i <= 1 ? color : '#ef4444' }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
