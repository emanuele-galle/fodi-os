// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- 21st.dev community component
// @ts-nocheck
/**
 * Claude-style Chat Input - REFERENCE COMPONENT
 *
 * Ispirato a ClaudeChatInput di 21st.dev
 * NON usare direttamente - serve come reference per lo stile visivo
 * applicato ai componenti AI esistenti (AiFullscreenLayout, AiChatPanel)
 *
 * Caratteristiche visive:
 * - Container rounded-2xl con border sottile + shadow progressivo
 * - Textarea auto-resize
 * - File preview cards thumbnail (96x96 per immagini)
 * - Action bar: Plus (attach) | Mic | Send
 * - Quick category pills sotto input
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Send, Mic, X, FileText, Image as ImageIcon } from 'lucide-react'

interface FilePreview {
  file: File
  previewUrl?: string
}

export function ClaudeStyleChatInput({
  onSend,
  onFileSelect,
  disabled = false,
  placeholder = 'Scrivi un messaggio...',
}: {
  onSend: (text: string) => void
  onFileSelect?: (files: File[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<FilePreview[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  const handleSend = useCallback(() => {
    const msg = input.trim()
    if (!msg && files.length === 0) return
    onSend(msg)
    setInput('')
    if (files.length > 0 && onFileSelect) {
      onFileSelect(files.map(f => f.file))
      setFiles([])
    }
  }, [input, files, onSend, onFileSelect])

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const newFiles = Array.from(fileList).slice(0, 3).map(file => {
      const preview: FilePreview = { file }
      if (file.type.startsWith('image/')) {
        preview.previewUrl = URL.createObjectURL(file)
      }
      return preview
    })
    setFiles(prev => [...prev, ...newFiles].slice(0, 3))
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const removed = prev[index]
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main container with progressive shadow */}
      <div className="ai-input-container rounded-2xl border border-zinc-200/60 bg-white transition-all duration-300">
        {/* File previews */}
        {files.length > 0 && (
          <div className="flex gap-2 px-4 pt-3">
            {files.map((f, i) => (
              <div key={i} className="relative group">
                {f.previewUrl ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-zinc-200/60">
                    <img src={f.previewUrl} alt={f.file.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="ai-file-card w-24 h-24 rounded-xl border border-zinc-200/60 bg-zinc-50 flex flex-col items-center justify-center gap-1 p-2">
                    <FileText className="h-5 w-5 text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 truncate w-full text-center">{f.file.name}</span>
                    <span className="text-[8px] text-zinc-400">{(f.file.size / 1024).toFixed(0)} KB</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-zinc-800 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-zinc-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <Plus className="h-4 w-4 text-zinc-500" />
            </button>
            <button className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
              <Mic className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() && files.length === 0}
            className="p-2 rounded-xl bg-zinc-900 text-white disabled:opacity-30 hover:bg-zinc-800 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
