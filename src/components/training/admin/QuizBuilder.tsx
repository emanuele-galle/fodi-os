'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react'

type QuizType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'

interface QuizOption {
  label: string
  value: string
}

interface Quiz {
  id?: string
  question: string
  type: QuizType
  options: QuizOption[]
  correctAnswer: string | string[]
  explanation: string
  sortOrder: number
}

const QUIZ_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Scelta Singola' },
  { value: 'MULTIPLE_CHOICE', label: 'Scelta Multipla' },
  { value: 'TRUE_FALSE', label: 'Vero/Falso' },
]

const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { label: 'Vero', value: 'true' },
  { label: 'Falso', value: 'false' },
]

interface QuizBuilderProps {
  lessonId: string
  quizzes: Quiz[]
  onChange: (quizzes: Quiz[]) => void
}

export function QuizBuilder({ quizzes, onChange }: QuizBuilderProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  function addQuestion() {
    const newQuiz: Quiz = {
      question: '',
      type: 'SINGLE_CHOICE',
      options: [
        { label: '', value: 'a' },
        { label: '', value: 'b' },
      ],
      correctAnswer: '',
      explanation: '',
      sortOrder: quizzes.length,
    }
    onChange([...quizzes, newQuiz])
    setExpandedIdx(quizzes.length)
  }

  function updateQuestion(idx: number, updates: Partial<Quiz>) {
    const updated = [...quizzes]
    updated[idx] = { ...updated[idx], ...updates }
    onChange(updated)
  }

  function removeQuestion(idx: number) {
    onChange(quizzes.filter((_, i) => i !== idx))
    setExpandedIdx(null)
  }

  function reorder(idx: number, direction: 'up' | 'down') {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= quizzes.length) return
    const updated = [...quizzes]
    const temp = updated[idx]
    updated[idx] = updated[swapIdx]
    updated[swapIdx] = temp
    updated.forEach((q, i) => (q.sortOrder = i))
    onChange(updated)
    setExpandedIdx(swapIdx)
  }

  function addOption(qIdx: number) {
    const q = quizzes[qIdx]
    const nextVal = String.fromCharCode(97 + q.options.length) // a, b, c, d...
    updateQuestion(qIdx, {
      options: [...q.options, { label: '', value: nextVal }],
    })
  }

  function removeOption(qIdx: number, optIdx: number) {
    const q = quizzes[qIdx]
    if (q.options.length <= 2) return
    const newOptions = q.options.filter((_, i) => i !== optIdx)
    const removedValue = q.options[optIdx].value
    // Clean up correct answer
    let newCorrect = q.correctAnswer
    if (Array.isArray(newCorrect)) {
      newCorrect = newCorrect.filter((v) => v !== removedValue)
    } else if (newCorrect === removedValue) {
      newCorrect = ''
    }
    updateQuestion(qIdx, { options: newOptions, correctAnswer: newCorrect })
  }

  function updateOption(qIdx: number, optIdx: number, label: string) {
    const q = quizzes[qIdx]
    const newOptions = [...q.options]
    newOptions[optIdx] = { ...newOptions[optIdx], label }
    updateQuestion(qIdx, { options: newOptions })
  }

  function handleTypeChange(qIdx: number, type: QuizType) {
    if (type === 'TRUE_FALSE') {
      updateQuestion(qIdx, {
        type,
        options: TRUE_FALSE_OPTIONS,
        correctAnswer: '',
      })
    } else if (type === 'MULTIPLE_CHOICE') {
      updateQuestion(qIdx, {
        type,
        correctAnswer: [],
      })
    } else {
      const q = quizzes[qIdx]
      updateQuestion(qIdx, {
        type,
        correctAnswer: Array.isArray(q.correctAnswer) ? (q.correctAnswer[0] ?? '') : q.correctAnswer,
      })
    }
  }

  function toggleCorrectMultiple(qIdx: number, value: string) {
    const q = quizzes[qIdx]
    const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : []
    const newCorrect = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateQuestion(qIdx, { correctAnswer: newCorrect })
  }

  const inputClass = 'flex h-9 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40'

  return (
    <div className="space-y-3">
      {quizzes.length === 0 ? (
        <p className="text-xs text-muted py-2">Nessuna domanda aggiunta</p>
      ) : (
        <div className="space-y-2">
          {quizzes.map((q, qIdx) => (
            <div
              key={qIdx}
              className="rounded-lg border border-border/40 bg-secondary/20 overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedIdx(expandedIdx === qIdx ? null : qIdx)}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); reorder(qIdx, 'up') }}
                    disabled={qIdx === 0}
                    className="p-0.5 text-muted hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); reorder(qIdx, 'down') }}
                    disabled={qIdx === quizzes.length - 1}
                    className="p-0.5 text-muted hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-xs font-medium text-muted shrink-0">D{qIdx + 1}</span>
                <span className="flex-1 text-sm text-foreground truncate">
                  {q.question || 'Nuova domanda...'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted">
                  {QUIZ_TYPE_OPTIONS.find((t) => t.value === q.type)?.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeQuestion(qIdx) }}
                  className="p-1 text-muted hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expanded */}
              {expandedIdx === qIdx && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/30">
                  <div className="space-y-1.5 pt-3">
                    <label className="text-xs font-medium text-muted">Domanda</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                      rows={2}
                      placeholder="Scrivi la domanda..."
                      className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted">Tipo</label>
                    <select
                      value={q.type}
                      onChange={(e) => handleTypeChange(qIdx, e.target.value as QuizType)}
                      className={inputClass}
                    >
                      {QUIZ_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Options */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted">Opzioni</label>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          {q.type === 'MULTIPLE_CHOICE' ? (
                            <input
                              type="checkbox"
                              checked={Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.value)}
                              onChange={() => toggleCorrectMultiple(qIdx, opt.value)}
                              className="h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/30"
                              title="Risposta corretta"
                            />
                          ) : (
                            <input
                              type="radio"
                              name={`quiz-${qIdx}-correct`}
                              checked={q.correctAnswer === opt.value}
                              onChange={() => updateQuestion(qIdx, { correctAnswer: opt.value })}
                              className="h-4 w-4 border-border/50 text-primary focus:ring-primary/30"
                              title="Risposta corretta"
                            />
                          )}
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Opzione ${optIdx + 1}`}
                            disabled={q.type === 'TRUE_FALSE'}
                            className={`${inputClass} ${q.type === 'TRUE_FALSE' ? 'opacity-60' : ''}`}
                          />
                          {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                            <button
                              onClick={() => removeOption(qIdx, optIdx)}
                              className="p-1 text-muted hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.type !== 'TRUE_FALSE' && (
                      <button
                        onClick={() => addOption(qIdx)}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        + Aggiungi opzione
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted">Spiegazione (opzionale)</label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                      rows={2}
                      placeholder="Spiegazione della risposta corretta..."
                      className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addQuestion}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-border/50 text-muted hover:text-foreground hover:border-border/80 transition-colors w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        Aggiungi Domanda
      </button>
    </div>
  )
}
