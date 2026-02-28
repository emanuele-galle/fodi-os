'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { User, Copy, Check, FileText, ExternalLink } from 'lucide-react'
import { AiToolIndicator } from './AiToolIndicator'
import { AiToolResultCard } from './AiToolResultCard'
import { AiAnimatedAvatar } from './AiAnimatedAvatar'
import type { AiChatMessage } from '@/hooks/useAiChat'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface AiMessageBubbleProps {
  message: AiChatMessage
}

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!message.content) return
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const timestamp = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className={cn('flex gap-3 ai-bubble-in', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border bg-gradient-to-br from-violet-500/20 to-purple-600/20 border-violet-400/10 text-violet-300">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <AiAnimatedAvatar size="sm" className="flex-shrink-0" />
      )}

      {/* Content */}
      <div className={cn('flex flex-col gap-1.5 max-w-[85%] sm:max-w-[80%]', isUser && 'items-end')}>
        {/* Tool indicators (deduplicated) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-0.5">
            {(() => {
              const grouped = new Map<string, { status: string; count: number }>()
              for (const tc of message.toolCalls) {
                const existing = grouped.get(tc.name)
                if (existing) {
                  existing.count++
                  if (tc.status === 'running') existing.status = 'running'
                  else if (tc.status === 'ERROR' && existing.status !== 'running') existing.status = 'ERROR'
                } else {
                  grouped.set(tc.name, { status: tc.status || 'running', count: 1 })
                }
              }
              return Array.from(grouped.entries()).map(([name, { status, count }]) => (
                <AiToolIndicator key={name} name={name} status={status} count={count} />
              ))
            })()}
          </div>
        )}

        {/* Attachments preview (user messages) */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att, i) => (
              att.mimeType.startsWith('image/') ? (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-white/10 hover:border-violet-400/30 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.url}
                    alt={att.fileName}
                    className="max-w-[200px] max-h-[150px] object-cover"
                  />
                </a>
              ) : (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] hover:border-violet-400/20 transition-colors text-xs"
                >
                  <FileText className="h-4 w-4 text-violet-400" />
                  <span className="truncate max-w-[140px]">{att.fileName}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                </a>
              )
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div className="group relative">
            <div className={cn(
              'rounded-2xl px-4 py-3 text-sm leading-relaxed',
              isUser
                ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/15 rounded-tr-md border border-violet-400/10'
                : 'bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] text-foreground rounded-tl-md',
            )}>
              {isUser ? (
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              ) : (
                <div className="ai-markdown break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      // Headings
                      h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1.5 first:mt-0">{children}</h3>,
                      h2: ({ children }) => <h4 className="text-sm font-bold mt-2.5 mb-1 first:mt-0">{children}</h4>,
                      h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h5>,
                      // Paragraphs
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      // Lists
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      // Code
                      code: ({ className, children, ...props }) => {
                        const isBlock = className?.includes('language-')
                        if (isBlock) {
                          return (
                            <code className={cn('text-xs', className)} {...props}>
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code className="px-1 py-0.5 rounded bg-white/[0.06] text-xs font-mono text-violet-300" {...props}>
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children }) => (
                        <pre className="rounded-lg bg-black/20 border border-white/[0.04] p-3 my-2 overflow-x-auto text-xs">
                          {children}
                        </pre>
                      ),
                      // Table
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2 max-w-full ai-scrollbar">
                          <table className="w-full text-[11px] border-collapse">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-white/[0.06] px-2 py-1.5 text-left font-semibold bg-white/[0.03] whitespace-nowrap text-muted-foreground">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-white/[0.04] px-2 py-1.5">{children}</td>
                      ),
                      // Links
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline underline-offset-2 hover:text-violet-300">
                          {children}
                        </a>
                      ),
                      // Blockquote
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-violet-500/30 pl-3 my-2 text-muted-foreground italic">
                          {children}
                        </blockquote>
                      ),
                      // HR
                      hr: () => <hr className="border-white/[0.06] my-3" />,
                      // Strong/em
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Copy button for assistant messages */}
            {!isUser && (
              <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                  title="Copia"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground/40" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tool result cards */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {message.toolCalls
              .filter((tc) => tc.result && tc.status === 'SUCCESS')
              .map((tc) => (
                <AiToolResultCard
                  key={tc.id}
                  toolName={tc.name}
                  result={tc.result!}
                />
              ))}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <span className={cn(
            'text-[11px] text-muted-foreground/40',
            isUser ? 'pr-1' : 'pl-1',
          )}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  )
}
