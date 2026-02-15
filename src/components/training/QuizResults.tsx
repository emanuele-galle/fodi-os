'use client'

import { CheckCircle2, XCircle, Trophy } from 'lucide-react'

interface QuizResultItem {
  quiz: { id: string; question: string }
  isCorrect: boolean
  score: number
}

interface QuizResultsProps {
  results: QuizResultItem[]
  totalScore: number
  maxScore: number
}

export function QuizResults({ results, totalScore, maxScore }: QuizResultsProps) {
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const correctCount = results.filter((r) => r.isCorrect).length

  const getColor = () => {
    if (percentage > 80) return 'text-green-400'
    if (percentage > 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getBgColor = () => {
    if (percentage > 80) return 'bg-green-500/10 border-green-500/30'
    if (percentage > 50) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-6 text-center ${getBgColor()}`}>
        <Trophy className={`mx-auto mb-3 h-10 w-10 ${getColor()}`} />
        <h3 className={`text-3xl font-bold ${getColor()}`}>{percentage}%</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {correctCount} su {results.length} risposte corrette
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Punteggio: {totalScore}/{maxScore}
        </p>
      </div>

      <div className="space-y-2">
        {results.map((result, i) => (
          <div
            key={result.quiz.id}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
          >
            {result.isCorrect ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-400" />
            )}
            <span className="text-sm text-zinc-300">
              <span className="text-zinc-500">#{i + 1}</span>{' '}
              {result.quiz.question}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
