'use client'

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

interface LessonTextContentProps {
  content: TiptapNode
}

export function LessonTextContent({ content }: LessonTextContentProps) {
  return (
    <div className="lesson-text-content max-w-none space-y-4">
      {content.content?.map((node, i) => (
        <TiptapNodeRenderer key={i} node={node} />
      ))}
    </div>
  )
}

function TiptapNodeRenderer({ node }: { node: TiptapNode }) {
  switch (node.type) {
    case 'paragraph':
      return (
        <p className="text-base leading-7 text-zinc-300">
          <InlineContent content={node.content} />
        </p>
      )

    case 'heading': {
      const level = (node.attrs?.level as number) || 1
      const sizes: Record<number, string> = {
        1: 'text-3xl font-bold mt-8 mb-4',
        2: 'text-2xl font-semibold mt-6 mb-3',
        3: 'text-xl font-semibold mt-5 mb-2',
        4: 'text-lg font-medium mt-4 mb-2',
        5: 'text-base font-medium mt-3 mb-1',
        6: 'text-sm font-medium mt-3 mb-1',
      }
      const className = `${sizes[level] || sizes[1]} text-white`
      const children = <InlineContent content={node.content} />
      if (level === 1) return <h1 className={className}>{children}</h1>
      if (level === 2) return <h2 className={className}>{children}</h2>
      if (level === 3) return <h3 className={className}>{children}</h3>
      if (level === 4) return <h4 className={className}>{children}</h4>
      if (level === 5) return <h5 className={className}>{children}</h5>
      return <h6 className={className}>{children}</h6>
    }

    case 'bulletList':
      return (
        <ul className="list-disc space-y-1 pl-6 text-zinc-300">
          {node.content?.map((child, i) => (
            <TiptapNodeRenderer key={i} node={child} />
          ))}
        </ul>
      )

    case 'orderedList':
      return (
        <ol className="list-decimal space-y-1 pl-6 text-zinc-300">
          {node.content?.map((child, i) => (
            <TiptapNodeRenderer key={i} node={child} />
          ))}
        </ol>
      )

    case 'listItem':
      return (
        <li className="leading-7">
          {node.content?.map((child, i) => (
            <TiptapNodeRenderer key={i} node={child} />
          ))}
        </li>
      )

    case 'codeBlock':
      return (
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4">
          <code className="text-sm text-green-400">
            <InlineContent content={node.content} />
          </code>
        </pre>
      )

    case 'blockquote':
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-zinc-400">
          {node.content?.map((child, i) => (
            <TiptapNodeRenderer key={i} node={child} />
          ))}
        </blockquote>
      )

    case 'image':
      return (
        <img
          src={node.attrs?.src as string}
          alt={(node.attrs?.alt as string) || ''}
          className="my-4 max-w-full rounded-lg"
        />
      )

    case 'horizontalRule':
      return <hr className="my-6 border-zinc-700" />

    default:
      if (node.content) {
        return (
          <>
            {node.content.map((child, i) => (
              <TiptapNodeRenderer key={i} node={child} />
            ))}
          </>
        )
      }
      return null
  }
}

function InlineContent({ content }: { content?: TiptapNode[] }) {
  if (!content) return null

  return (
    <>
      {content.map((node, i) => {
        if (node.type === 'text') {
          let element: React.ReactNode = node.text

          node.marks?.forEach((mark) => {
            switch (mark.type) {
              case 'bold':
                element = <strong key={`b-${i}`}>{element}</strong>
                break
              case 'italic':
                element = <em key={`i-${i}`}>{element}</em>
                break
              case 'code':
                element = (
                  <code
                    key={`c-${i}`}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-blue-400"
                  >
                    {element}
                  </code>
                )
                break
              case 'link':
                element = (
                  <a
                    key={`l-${i}`}
                    href={mark.attrs?.href as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    {element}
                  </a>
                )
                break
            }
          })

          return <span key={i}>{element}</span>
        }

        if (node.type === 'hardBreak') {
          return <br key={i} />
        }

        return <TiptapNodeRenderer key={i} node={node} />
      })}
    </>
  )
}
