'use client'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- component handlers and dynamic props */
import {
  AlertCircle,
  Users,
  Video,
  Mail,
  Repeat,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import type { CalendarEvent, CalendarInfo, TeamMember, RecurrenceType, RecurrenceEndType, NewEventData } from './types'
import { RRULE_DAY_LABELS } from './constants'

interface EventFormModalProps {
  showNewEvent: boolean
  editingEvent: CalendarEvent | null
  blockMode: boolean
  newEvent: NewEventData
  creating: boolean
  createError: string | null
  calendars: CalendarInfo[]
  targetCalendarId: string
  recurrenceType: RecurrenceType
  recurrenceCustomDays: number[]
  recurrenceEndType: RecurrenceEndType
  recurrenceEndDate: string
  recurrenceEndCount: number
  selectedAttendees: string[]
  attendeeSearch: string
  teamMembers: TeamMember[]
  setShowNewEvent: (show: boolean) => void
  setEditingEvent: (ev: CalendarEvent | null) => void
  setBlockMode: (mode: boolean) => void
  setNewEvent: (ev: NewEventData) => void
  setTargetCalendarId: (id: string) => void
  setRecurrenceType: (type: RecurrenceType) => void
  setRecurrenceCustomDays: React.Dispatch<React.SetStateAction<number[]>>
  setRecurrenceEndType: (type: RecurrenceEndType) => void
  setRecurrenceEndDate: (date: string) => void
  setRecurrenceEndCount: (count: number) => void
  setSelectedAttendees: React.Dispatch<React.SetStateAction<string[]>>
  setAttendeeSearch: (search: string) => void
  handleCreateEvent: (e: React.FormEvent) => void
}

export function EventFormModal({
  showNewEvent,
  editingEvent,
  blockMode,
  newEvent,
  creating,
  createError,
  calendars,
  targetCalendarId,
  recurrenceType,
  recurrenceCustomDays,
  recurrenceEndType,
  recurrenceEndDate,
  recurrenceEndCount,
  selectedAttendees,
  attendeeSearch,
  teamMembers,
  setShowNewEvent,
  setEditingEvent,
  setBlockMode,
  setNewEvent,
  setTargetCalendarId,
  setRecurrenceType,
  setRecurrenceCustomDays,
  setRecurrenceEndType,
  setRecurrenceEndDate,
  setRecurrenceEndCount,
  setSelectedAttendees,
  setAttendeeSearch,
  handleCreateEvent,
}: EventFormModalProps) {
  const handleClose = () => { setShowNewEvent(false); setEditingEvent(null); setBlockMode(false) }
  const handleCancel = () => { setShowNewEvent(false); setEditingEvent(null) }
  const handleToggleBlock = () => {
    setBlockMode(!blockMode)
    if (!blockMode) setNewEvent({ ...newEvent, summary: 'Non disponibile' })
    else setNewEvent({ ...newEvent, summary: '' })
  }
  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, summary: e.target.value })
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, startDate: e.target.value })
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated: NewEventData = { ...newEvent, startTime: e.target.value }
    if (!newEvent.endTime) {
      const [h, m] = e.target.value.split(':').map(Number)
      const newH = Math.min(h + 1, 23)
      updated.endTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    setNewEvent(updated)
  }
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, endDate: e.target.value })
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, endTime: e.target.value })
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, location: e.target.value })
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setNewEvent({ ...newEvent, description: e.target.value })
  const handleRecurrenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => setRecurrenceType(e.target.value as RecurrenceType)
  const handleRecurrenceEndNever = () => setRecurrenceEndType('never')
  const handleRecurrenceEndDate = () => setRecurrenceEndType('date')
  const handleRecurrenceEndCount = () => setRecurrenceEndType('count')
  const handleRecurrenceEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setRecurrenceEndDate(e.target.value)
  const handleRecurrenceEndCountChange = (e: React.ChangeEvent<HTMLInputElement>) => setRecurrenceEndCount(parseInt(e.target.value) || 1)
  const handleAttendeeSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setAttendeeSearch(e.target.value)
  const handleAttendeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = attendeeSearch.trim()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !selectedAttendees.includes(val)) {
        setSelectedAttendees((prev) => [...prev, val])
        setAttendeeSearch('')
      }
    }
  }
  const handleTargetCalendarChange = (e: React.ChangeEvent<HTMLSelectElement>) => setTargetCalendarId(e.target.value)
  const handleMeetToggle = (e: React.ChangeEvent<HTMLInputElement>) => setNewEvent({ ...newEvent, withMeet: e.target.checked })
  const handleAddExternalAttendee = () => {
    setSelectedAttendees((prev) => [...prev, attendeeSearch.trim()])
    setAttendeeSearch('')
  }

  return (
    <Modal
      open={showNewEvent}
      onClose={handleClose}
      title={editingEvent ? 'Modifica Evento' : blockMode ? 'Blocca Disponibilità' : 'Nuovo Evento'}
    >
      <form onSubmit={handleCreateEvent} className="space-y-4">
        {createError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{createError}</p>
          </div>
        )}

        {/* Block slot toggle */}
        {!editingEvent && (
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              role="switch"
              aria-checked={blockMode}
              onClick={handleToggleBlock}
              className={`relative w-10 h-5 rounded-full transition-colors ${blockMode ? 'bg-orange-500' : 'bg-border'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${blockMode ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Segna come non disponibile
            </span>
          </label>
        )}

        <Input
          id="summary"
          label={blockMode ? 'Motivo (opzionale)' : 'Titolo'}
          value={newEvent.summary}
          onChange={handleSummaryChange}
          required={!blockMode}
          placeholder={blockMode ? 'Non disponibile' : ''}
        />

        {/* Calendar target selector */}
        {calendars.length > 1 && (
          <div>
            <label htmlFor="targetCal" className="block text-sm font-medium mb-1">Calendario</label>
            <select
              id="targetCal"
              value={targetCalendarId}
              onChange={handleTargetCalendarChange}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary}{cal.primary ? ' (principale)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="startDate"
            label="Data inizio"
            type="date"
            value={newEvent.startDate}
            onChange={handleStartDateChange}
            required
          />
          <Input
            id="startTime"
            label="Ora inizio"
            type="time"
            value={newEvent.startTime}
            onChange={handleStartTimeChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="endDate"
            label="Data fine"
            type="date"
            value={newEvent.endDate}
            onChange={handleEndDateChange}
            placeholder={newEvent.startDate}
          />
          <Input
            id="endTime"
            label="Ora fine"
            type="time"
            value={newEvent.endTime}
            onChange={handleEndTimeChange}
          />
        </div>

        {!blockMode && (
          <>
            <Input
              id="location"
              label="Luogo"
              value={newEvent.location}
              onChange={handleLocationChange}
            />

            <div>
              <label htmlFor="desc" className="block text-sm font-medium mb-1">Descrizione</label>
              <textarea
                id="desc"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                value={newEvent.description}
                onChange={handleDescriptionChange}
              />
            </div>
          </>
        )}

        {/* Recurrence selector */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <Repeat className="h-4 w-4 text-muted" />
            Ripetizione
          </label>
          <select
            value={recurrenceType}
            onChange={handleRecurrenceTypeChange}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          >
            <option value="none">Nessuna ripetizione</option>
            <option value="daily">Ogni giorno</option>
            <option value="weekly">Ogni settimana</option>
            <option value="biweekly">Ogni 2 settimane</option>
            <option value="monthly">Ogni mese</option>
            <option value="custom">Personalizzata...</option>
          </select>

          {recurrenceType === 'custom' && (
            <div className="mt-2 p-3 rounded-lg bg-secondary/30 space-y-3">
              <p className="text-xs font-medium text-muted">Ripeti nei giorni:</p>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                  const isSelected = recurrenceCustomDays.includes(dayIdx)
                  return (
                    <button
                      key={dayIdx}
                      type="button"
                       
                      onClick={() => {
                        setRecurrenceCustomDays((prev) =>
                          isSelected ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
                        )
                      }}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-muted hover:border-primary/50'
                      }`}
                    >
                      {RRULE_DAY_LABELS[dayIdx]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {recurrenceType !== 'none' && (
            <div className="mt-2 p-3 rounded-lg bg-secondary/30 space-y-2">
              <p className="text-xs font-medium text-muted">Termina:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="recurrenceEnd"
                    checked={recurrenceEndType === 'never'}
                    onChange={handleRecurrenceEndNever}
                    className="accent-primary"
                  />
                  Mai
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="recurrenceEnd"
                    checked={recurrenceEndType === 'date'}
                    onChange={handleRecurrenceEndDate}
                    className="accent-primary"
                  />
                  Il giorno
                  {recurrenceEndType === 'date' && (
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={handleRecurrenceEndDateChange}
                      className="ml-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="recurrenceEnd"
                    checked={recurrenceEndType === 'count'}
                    onChange={handleRecurrenceEndCount}
                    className="accent-primary"
                  />
                  Dopo
                  {recurrenceEndType === 'count' && (
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={recurrenceEndCount}
                      onChange={handleRecurrenceEndCountChange}
                      className="ml-1 w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  )}
                  <span className={recurrenceEndType === 'count' ? '' : 'text-muted'}>occorrenze</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Participants selection */}
        {!blockMode && <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <Users className="h-4 w-4 text-muted" />
            Partecipanti
          </label>
          <input
            type="text"
            placeholder="Cerca membro del team o inserisci email..."
            value={attendeeSearch}
            onChange={handleAttendeeSearchChange}
            onKeyDown={handleAttendeeKeyDown}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
          {selectedAttendees.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedAttendees.map((email) => {
                const member = teamMembers.find((m) => m.email === email)
                return (
                  <button
                    key={email}
                    type="button"
                     
                    onClick={() => setSelectedAttendees((prev) => prev.filter((a) => a !== email))}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {member ? (
                      <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size="xs" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    {member ? `${member.firstName} ${member.lastName}` : email}
                    <span className="text-primary/60 ml-0.5">x</span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="max-h-32 overflow-y-auto border border-border/50 rounded-lg">
            {teamMembers
              .filter((m) => {
                if (selectedAttendees.includes(m.email)) return false
                if (!attendeeSearch) return true
                const query = attendeeSearch.toLowerCase()
                return (
                  `${m.firstName} ${m.lastName}`.toLowerCase().includes(query) ||
                  m.email.toLowerCase().includes(query)
                )
              })
              .slice(0, 8)
              .map((member) => (
                <button
                  key={member.id}
                  type="button"
                   
                  onClick={() => {
                    setSelectedAttendees((prev) => [...prev, member.email])
                    setAttendeeSearch('')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/50 transition-colors text-sm"
                >
                  <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size="xs" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-muted truncate">{member.email}</p>
                  </div>
                </button>
              ))}
            {/* Show "Invite external email" option */}
            {attendeeSearch.trim() &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeSearch.trim()) &&
              !selectedAttendees.includes(attendeeSearch.trim()) &&
              !teamMembers.some((m) => m.email === attendeeSearch.trim()) && (
              <button
                type="button"
                onClick={handleAddExternalAttendee}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/50 transition-colors text-sm border-t border-border/50"
              >
                <Mail className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium text-primary">Invita {attendeeSearch.trim()}</p>
                  <p className="text-xs text-muted">Partecipante esterno</p>
                </div>
              </button>
            )}
          </div>
        </div>}

        {/* Meet toggle */}
        {!blockMode && !editingEvent && (
          <label className="flex items-center gap-3 text-sm p-3 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={newEvent.withMeet || selectedAttendees.length > 0}
                onChange={handleMeetToggle}
                disabled={selectedAttendees.length > 0}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border rounded-full peer-checked:bg-indigo-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <Video className="h-4 w-4 text-indigo-500" />
            <span>Aggiungi Google Meet</span>
            {selectedAttendees.length > 0 && (
              <span className="text-xs text-muted">(automatico con partecipanti)</span>
            )}
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Annulla
          </Button>
          <Button type="submit" loading={creating}>
            {editingEvent ? 'Salva Modifiche' : blockMode ? 'Blocca Slot' : 'Crea Evento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
