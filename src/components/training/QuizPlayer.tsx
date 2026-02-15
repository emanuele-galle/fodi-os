'use client'

import { useState, useCallback } from 'react'
import { QuizQuestion } from './QuizQuestion'
import { QuizResults } from './QuizResults'

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
  score: number
}

interface QuizPlayerProps {
  quizzes: QuizData[]
  lessonId: string
  onAllCorrect: () => void
}

export function QuizPlayer({ quizzes, lessonId, onAllCorrect }: QuizPlayerProps) {
  const [results, setResults] = useState<Record<string, QuizResult>>({})
  const [showResults, setShowResults] = useState(false)

  const handleAnswer = useCallback(
    async (quizId: string, answer: string | string[]) => {
      try {
        const res = await fetch(`/api/training/lessons/${lessonId}/quiz/${quizId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        })
        const data = await res.json()

        setResults((prev) => {
          const updated = { ...prev, [quizId]: data }

          // Check if all answered
          if (Object.keys(updated).length === quizzes.length) {
            const allCorrect = Object.values(updated).every((r) => r.isCorrect)
            if (allCorrect) {
              onAllCorrect()
            }
          }

          return updated
        })
      } catch {
        // Fallback: mark as answered with unknown result
        setResults((prev) => ({
          ...prev,
          [quizId]: {
            isCorrect: false,
            correctAnswer: '',
            explanation: 'Errore di connessione. Riprova.',
            score: 0,
          },
        }))
      }
    },
    [lessonId, quizzes.length, onAllCorrect]
  )

  const allAnswered = Object.keys(results).length === quizzes.length

  if (showResults) {
    const resultItems = quizzes.map((q) => ({
      quiz: { id: q.id, question: q.question },
      isCorrect: results[q.id]?.isCorrect ?? false,
      score: results[q.id]?.score ?? 0,
    }))
    const totalScore = resultItems.reduce((sum, r) => sum + r.score, 0)
    const maxScore = quizzes.length * 100

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white">Risultati Quiz</h3>
        <QuizResults
          results={resultItems}
          totalScore={totalScore}
          maxScore={maxScore}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">
        Quiz ({Object.keys(results).length}/{quizzes.length})
      </h3>

      <div className="space-y-4">
        {quizzes.map((quiz) => (
          <QuizQuestion
            key={quiz.id}
            quiz={quiz}
            onAnswer={handleAnswer}
            result={results[quiz.id]}
            disabled={!!results[quiz.id]}
          />
        ))}
      </div>

      {allAnswered && (
        <button
          onClick={() => setShowResults(true)}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Mostra Risultati
        </button>
      )}
    </div>
  )
}
