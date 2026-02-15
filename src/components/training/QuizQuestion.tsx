'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface QuizOption {
  id: string
  text: string
}

interface QuizData {
  id: string
  question: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'
  options: QuizOption[]
}

interface QuizResult {
  isCorrect: boolean
  correctAnswer: string | string[]
  explanation?: string
}

interface QuizQuestionProps {
  quiz: QuizData
  onAnswer: (quizId: string, answer: string | string[]) => void
  result?: QuizResult
  disabled: boolean
}

export function QuizQuestion({
  quiz,
  onAnswer,
  result,
  disabled,
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<string[]>([])

  const isTrueFalse = quiz.type === 'TRUE_FALSE'
  const isMultiple = quiz.type === 'MULTIPLE_CHOICE'

  const options: QuizOption[] = isTrueFalse
    ? [
        { id: 'true', text: 'Vero' },
        { id: 'false', text: 'Falso' },
      ]
    : quiz.options

  const handleSelect = (optionId: string) => {
    if (disabled) return
    if (isMultiple) {
      setSelected((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      )
    } else {
      setSelected([optionId])
    }
  }

  const handleSubmit = () => {
    if (selected.length === 0) return
    if (isMultiple) {
      onAnswer(quiz.id, selected)
    } else {
      onAnswer(quiz.id, selected[0])
    }
  }

  const getOptionStyle = (optionId: string) => {
    if (!result) {
      const isSelected = selected.includes(optionId)
      return isSelected
        ? 'border-blue-500 bg-blue-500/10 text-white'
        : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-500'
    }

    const correctAnswers = Array.isArray(result.correctAnswer)
      ? result.correctAnswer
      : [result.correctAnswer]
    const isCorrectOption = correctAnswers.includes(optionId)
    const isSelected = selected.includes(optionId)

    if (isCorrectOption) return 'border-green-500 bg-green-500/10 text-green-400'
    if (isSelected && !isCorrectOption) return 'border-red-500 bg-red-500/10 text-red-400'
    return 'border-zinc-700 bg-zinc-800/30 text-zinc-500'
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h4 className="mb-4 text-lg font-medium text-white">{quiz.question}</h4>

      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${getOptionStyle(option.id)}`}
          >
            {isMultiple ? (
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  selected.includes(option.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-zinc-600'
                }`}
              >
                {selected.includes(option.id) && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ) : (
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selected.includes(option.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-zinc-600'
                }`}
              >
                {selected.includes(option.id) && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>
            )}
            <span className="text-sm">{option.text}</span>
          </button>
        ))}
      </div>

      {!result && (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0 || disabled}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Conferma Risposta
        </button>
      )}

      {result && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${
            result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}
        >
          {result.isCorrect ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                result.isCorrect ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {result.isCorrect ? 'Corretto!' : 'Risposta errata'}
            </p>
            {result.explanation && (
              <p className="mt-1 text-sm text-zinc-400">{result.explanation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
