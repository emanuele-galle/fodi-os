'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Bot, User, Copy, Check } from 'lucide-react'
import { AiToolIndicator } from './AiToolIndicator'
import { AiToolResultCard } from './AiToolResultCard'
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
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary/20 text-primary' : 'bg-violet-500/20 text-violet-400',
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]', isUser && 'items-end')}>
        {/* Tool indicators (deduplicated) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
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

        {/* Message bubble */}
        {message.content && (
          <div className="group relative">
            <div className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              isUser
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/15 rounded-tr-md'
                : 'bg-muted/80 backdrop-blur-sm border border-white/5 text-foreground rounded-tl-md',
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
                          <code className="px-1 py-0.5 rounded bg-background/50 text-xs font-mono" {...props}>
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children }) => (
                        <pre className="rounded-lg bg-background/50 p-3 my-2 overflow-x-auto text-xs">
                          {children}
                        </pre>
                      ),
                      // Table
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2 max-w-full scrollbar-thin scrollbar-thumb-border">
                          <table className="w-full text-[11px] border-collapse">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border/30 px-1.5 py-1 text-left font-semibold bg-background/30 whitespace-nowrap">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border/30 px-1.5 py-1">{children}</td>
                      ),
                      // Links
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                          {children}
                        </a>
                      ),
                      // Blockquote
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
                          {children}
                        </blockquote>
                      ),
                      // HR
                      hr: () => <hr className="border-border/30 my-3" />,
                      // Strong/em
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
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
                  className="p-1 rounded-md hover:bg-background/50 transition-colors"
                  title="Copia"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
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
            'text-[11px] text-muted-foreground/70',
            isUser ? 'pr-1' : 'pl-1',
          )}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  )
}
