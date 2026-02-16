interface WizardSuccessProps {
  message?: string | null
}

export function WizardSuccess({ message }: WizardSuccessProps) {
  const defaultMessage = 'Il tuo messaggio è stato inviato con successo.'

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Success message */}
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        Grazie!
      </h2>
      <p className="text-base text-muted max-w-md">
        {message || defaultMessage}
      </p>
    </div>
  )
}
