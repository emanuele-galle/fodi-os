'use client'

import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'
import { AiToolIndicator } from './AiToolIndicator'
import type { AiChatMessage } from '@/hooks/useAiChat'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface AiMessageBubbleProps {
  message: AiChatMessage
}

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user'

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
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        {/* Tool indicators */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {message.toolCalls.map((tc) => (
              <AiToolIndicator key={tc.id} name={tc.name} status={tc.status} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        {message.content && (
          <div className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted text-foreground rounded-tl-md',
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
                      <div className="overflow-x-auto my-2">
                        <table className="w-full text-xs border-collapse">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border/30 px-2 py-1 text-left font-semibold bg-background/30">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border/30 px-2 py-1">{children}</td>
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
        )}
      </div>
    </div>
  )
}
