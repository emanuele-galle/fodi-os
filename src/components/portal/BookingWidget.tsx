'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, Check, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

type BookingStep = 'member' | 'loading' | 'date' | 'time' | 'form' | 'success'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  jobTitle: string | null
}

type AvailabilityData = {
  slots: Record<string, string[]>
  duration: number
  timezone: string
}

interface BookingWidgetProps {
  teamMembers: TeamMember[]
  onBookingComplete?: () => void
}

export default function BookingWidget({ teamMembers, onBookingComplete }: BookingWidgetProps) {
  const [step, setStep] = useState<BookingStep>(teamMembers.length === 1 ? 'loading' : 'member')
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(
    teamMembers.length === 1 ? teamMembers[0] : null
  )
  const [availability, setAvailability] = useState<AvailabilityData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedMember && (step === 'loading' || step === 'date')) {
      fetchAvailability(selectedMember.id)
    }
  }, [selectedMember])

  async function fetchAvailability(userId: string) {
    setStep('loading')
    setError(null)
    try {
      const res = await fetch(`/api/availability?userId=${userId}`)
      if (!res.ok) {
        setError('Disponibilita non caricabile al momento')
        setStep('date')
        return
      }
      const data: AvailabilityData = await res.json()
      setAvailability(data)
      setStep('date')
    } catch {
      setError('Errore nel caricamento disponibilita')
      setStep('date')
    }
  }

  function handleMemberSelect(member: TeamMember) {
    setSelectedMember(member)
    setSelectedDate(null)
    setSelectedTime(null)
    setAvailability(null)
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

  function goBack() {
    if (step === 'form') {
      setStep('time')
    } else if (step === 'time') {
      setStep('date')
    } else if (step === 'date' && teamMembers.length > 1) {
      setStep('member')
      setSelectedMember(null)
      setAvailability(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime || !selectedMember || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      // Find the digital card slug for this member to book through existing endpoint
      const slugRes = await fetch(`/api/portal/booking/slug?userId=${selectedMember.id}`)
      if (!slugRes.ok) {
        // Fallback: book directly via internal endpoint
        setError('Prenotazione non disponibile per questo membro')
        return
      }
      const { slug } = await slugRes.json()

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
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Errore nella prenotazione')
        return
      }

      setStep('success')
      onBookingComplete?.()
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep(teamMembers.length === 1 ? 'loading' : 'member')
    setSelectedMember(teamMembers.length === 1 ? teamMembers[0] : null)
    setSelectedDate(null)
    setSelectedTime(null)
    setForm({ name: '', email: '', phone: '', notes: '' })
    setError(null)
    setAvailability(null)
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

  return (
    <div className="space-y-4">
      {error && step !== 'success' && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* MEMBER SELECTION */}
      {step === 'member' && (
        <div>
          <p className="text-sm text-muted mb-4">Seleziona un membro del team</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleMemberSelect(member)}
                className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  {member.jobTitle && (
                    <p className="text-xs text-muted truncate">{member.jobTitle}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LOADING */}
      {step === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* DATE SELECTION */}
      {step === 'date' && (
        <div>
          {selectedMember && teamMembers.length > 1 && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-3 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Cambia membro
            </button>
          )}
          {selectedMember && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {selectedMember.avatarUrl ? (
                  <img src={selectedMember.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {selectedMember.firstName} {selectedMember.lastName}
                </p>
              </div>
            </div>
          )}

          {dates.length > 0 ? (
            <>
              <p className="text-sm text-muted mb-3">Scegli una data</p>
              <div className="relative">
                {dates.length > 4 && (
                  <>
                    <button
                      onClick={() => scrollDates('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-muted" />
                    </button>
                    <button
                      onClick={() => scrollDates('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-muted" />
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
                        className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-card border-border hover:border-primary/40 hover:bg-secondary/50'
                        }`}
                      >
                        <span className={`text-xs font-medium ${isSelected ? 'opacity-80' : 'text-muted'}`}>{day}</span>
                        <span className="text-lg font-bold leading-none">{num}</span>
                        <span className={`text-xs font-medium ${isSelected ? 'opacity-80' : 'text-muted'}`}>{month}</span>
                        <span className={`text-[11px] mt-0.5 ${isSelected ? 'opacity-70' : 'text-primary/60'}`}>
                          {slotCount} slot
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : !error ? (
            <p className="text-sm text-muted text-center py-6">
              Nessuna disponibilita al momento
            </p>
          ) : null}
        </div>
      )}

      {/* TIME SELECTION */}
      {step === 'time' && selectedDate && (
        <div>
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <Clock className="w-3.5 h-3.5" />
            {formatDate(selectedDate).num} {formatDate(selectedDate).month} - Scegli l&apos;orario
          </button>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availability!.slots[selectedDate].map((time) => {
              const isSelected = selectedTime === time
              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-card border-border hover:border-primary/40 hover:bg-secondary/50'
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
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {formatDate(selectedDate!).num} {formatDate(selectedDate!).month} alle {selectedTime} - {availability?.duration || 30} min
          </button>

          <div className="space-y-3">
            <Input
              required
              placeholder="Nome e cognome *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              type="email"
              required
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              type="tel"
              placeholder="Telefono (opzionale)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Textarea
              placeholder="Note (opzionale)"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <Button
            type="submit"
            loading={submitting}
            className="w-full mt-4"
            size="lg"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Conferma Prenotazione
          </Button>
        </form>
      )}

      {/* SUCCESS */}
      {step === 'success' && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mb-4">
            <Check className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">Prenotato!</h3>
          <p className="text-sm text-muted max-w-[300px]">
            Appuntamento confermato per il {formatDate(selectedDate!).num} {formatDate(selectedDate!).month} alle {selectedTime}.
            Riceverai una conferma via email.
          </p>
          <button
            onClick={reset}
            className="mt-4 text-sm text-primary font-medium hover:underline transition-colors"
          >
            Prenota un altro appuntamento
          </button>
        </div>
      )}
    </div>
  )
}
