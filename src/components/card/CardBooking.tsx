'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, Check, ChevronLeft, ChevronRight } from 'lucide-react'

type BookingStep = 'loading' | 'date' | 'time' | 'form' | 'success'

type AvailabilityData = {
  slots: Record<string, string[]>
  duration: number
  timezone: string
}

type CardBookingProps = {
  slug: string
  duration: number
}

export default function CardBooking({ slug, duration }: CardBookingProps) {
  const [step, setStep] = useState<BookingStep>('loading')
  const [availability, setAvailability] = useState<AvailabilityData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAvailability()
  }, [slug])

  async function fetchAvailability() {
    try {
      const res = await fetch(`/api/c/${slug}/availability`)
      if (!res.ok) {
        setError('Prenotazioni non disponibili al momento')
        setStep('date')
        return
      }
      const data: AvailabilityData = await res.json()
      setAvailability(data)
      setStep('date')
    } catch {
      setError('Errore nel caricamento disponibilità')
      setStep('date')
    }
  }

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setStep('time')
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time)
    setStep('form')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/c/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          date: selectedDate,
          timeSlot: selectedTime,
          notes: form.notes || undefined,
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Errore nella prenotazione')
        return
      }

      setStep('success')
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  const dates = availability ? Object.keys(availability.slots).sort() : []

  function scrollDates(direction: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    return {
      day: days[date.getDay()],
      num: date.getDate(),
      month: months[date.getMonth()],
    }
  }

  const inputClass = 'w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all'

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.06]" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-[15px] font-semibold text-white/90 tracking-tight">Prenota un appuntamento</h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.06]" />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 overflow-hidden">
        {error && step !== 'success' && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* LOADING */}
        {step === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* DATE SELECTION */}
        {step === 'date' && dates.length > 0 && (
          <div>
            <p className="text-[13px] text-white/35 mb-4 text-center tracking-wide">Scegli una data</p>
            <div className="relative">
              {dates.length > 4 && (
                <>
                  <button onClick={() => scrollDates('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
                    <ChevronLeft className="w-4 h-4 text-white/50" />
                  </button>
                  <button onClick={() => scrollDates('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </button>
                </>
              )}
              <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-none px-1 py-1">
                {dates.map((dateStr) => {
                  const { day, num, month } = formatDate(dateStr)
                  const slotCount = availability!.slots[dateStr].length
                  const isSelected = selectedDate === dateStr
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateSelect(dateStr)}
                      className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                          : 'bg-white/[0.03] border-white/[0.08] hover:border-purple-500/30 hover:bg-white/[0.06] text-white/70'
                      }`}
                    >
                      <span className={`text-[11px] font-medium ${isSelected ? 'text-purple-200' : 'text-white/40'}`}>{day}</span>
                      <span className="text-lg font-bold leading-none">{num}</span>
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-purple-200' : 'text-white/30'}`}>{month}</span>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-200' : 'text-purple-400/60'}`}>
                        {slotCount} slot
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'date' && dates.length === 0 && !error && (
          <p className="text-sm text-white/30 text-center py-6">
            Nessuna disponibilità al momento
          </p>
        )}

        {/* TIME SELECTION */}
        {step === 'time' && selectedDate && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep('date')} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                <ChevronLeft className="w-4 h-4 text-white/40" />
              </button>
              <p className="text-[13px] text-white/40 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(selectedDate).num} {formatDate(selectedDate).month} — Scegli l&apos;orario
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {availability!.slots[selectedDate].map((time) => {
                const isSelected = selectedTime === time
                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'bg-white/[0.03] border-white/[0.08] hover:border-purple-500/30 hover:bg-white/[0.06] text-white/60'
                    }`}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setStep('time')} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                <ChevronLeft className="w-4 h-4 text-white/40" />
              </button>
              <p className="text-[13px] text-white/40">
                {formatDate(selectedDate!).num} {formatDate(selectedDate!).month} alle {selectedTime} — {duration} min
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                required
                placeholder="Nome e cognome *"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
              <input
                type="email"
                required
                placeholder="Email *"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputClass}
              />
              <input
                type="tel"
                placeholder="Telefono (opzionale)"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className={inputClass}
              />
              <textarea
                placeholder="Note (opzionale)"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full overflow-hidden flex items-center justify-center gap-2.5 mt-4 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-bold text-[14px] shadow-lg shadow-purple-500/15 transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/25 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <Calendar className="w-[18px] h-[18px] relative" />
              <span className="relative">{submitting ? 'Prenotazione in corso...' : 'Conferma Prenotazione'}</span>
            </button>
          </form>
        )}

        {/* SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Prenotato!</h3>
            <p className="text-sm text-white/35 max-w-[260px]">
              Appuntamento confermato per il {formatDate(selectedDate!).num} {formatDate(selectedDate!).month} alle {selectedTime}. Riceverai una conferma via email.
            </p>
            <button
              onClick={() => {
                setStep('date')
                setSelectedDate(null)
                setSelectedTime(null)
                setForm({ name: '', email: '', phone: '', notes: '' })
                setError(null)
              }}
              className="mt-4 text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors"
            >
              Torna al profilo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
