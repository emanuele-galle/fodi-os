'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Download, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface XmlPreviewModalProps {
  open: boolean
  onClose: () => void
  xmlContent: string
  fileName?: string
}

export function XmlPreviewModal({ open, onClose, xmlContent, fileName }: XmlPreviewModalProps) {
  const [copied, setCopied] = useState(false)

  function handleDownload() {
    const blob = new Blob([xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'fattura.xml'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(xmlContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple XML syntax highlighting via inline coloring
  function highlightXml(xml: string): string {
    return xml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Tags
      .replace(/&lt;(\/?[\w:]+)/g, '<span class="text-indigo-500">&lt;$1</span>')
      .replace(/&gt;/g, '<span class="text-indigo-500">&gt;</span>')
      // Attributes
      .replace(/([\w:]+)=&quot;([^"]*?)&quot;/g, '<span class="text-amber-500">$1</span>=<span class="text-emerald-500">&quot;$2&quot;</span>')
      // XML declaration
      .replace(/&lt;\?xml/g, '<span class="text-muted">&lt;?xml</span>')
      .replace(/\?&gt;/g, '<span class="text-muted">?&gt;</span>')
  }

  return (
    <Modal open={open} onClose={onClose} title="Anteprima XML" size="xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Scarica
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? 'Copiato!' : 'Copia'}
          </Button>
          {fileName && (
            <span className="text-xs text-muted ml-auto">{fileName}</span>
          )}
        </div>

        <div className="p-4 bg-secondary/50 rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto border border-border/30">
          <pre
            className="text-xs font-mono whitespace-pre leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightXml(xmlContent) }}
          />
        </div>
      </div>
    </Modal>
  )
}
