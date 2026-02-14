'use client'

import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  length?: number
}

export function OtpInput({ value, onChange, disabled, length = 6 }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.padEnd(length, '').split('').slice(0, length)

  const focusInput = useCallback((index: number) => {
    const input = inputRefs.current[index]
    if (input) {
      input.focus()
      input.select()
    }
  }, [])

  const handleChange = useCallback((index: number, char: string) => {
    if (!/^\d$/.test(char)) return

    const newDigits = [...digits]
    newDigits[index] = char
    const newValue = newDigits.join('').replace(/[^\d]/g, '')
    onChange(newValue)

    if (index < length - 1) {
      focusInput(index + 1)
    }
  }, [digits, onChange, length, focusInput])

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newDigits = [...digits]
      if (newDigits[index]) {
        newDigits[index] = ''
        onChange(newDigits.join(''))
      } else if (index > 0) {
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        focusInput(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1)
    }
  }, [digits, onChange, length, focusInput])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      focusInput(Math.min(pasted.length, length - 1))
    }
  }, [onChange, length, focusInput])

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit || ''}
          disabled={disabled}
          autoComplete="one-time-code"
          onChange={(e) => {
            const val = e.target.value
            if (val.length > 1) {
              // Handle autofill
              const clean = val.replace(/\D/g, '').slice(0, length)
              onChange(clean)
              focusInput(Math.min(clean.length, length - 1))
            } else {
              handleChange(i, val)
            }
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold rounded-lg border-2 border-border/60 bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Cifra ${i + 1} di ${length}`}
        />
      ))}
    </div>
  )
}
