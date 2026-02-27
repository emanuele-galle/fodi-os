'use client'

import {
  Clock,
  MapPin,
  ExternalLink,
  Video,
  Users,
  Trash2,
  Pencil,
  Check,
  X,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { CalendarEvent } from './types'
import { formatDateFull, formatDateRange } from './utils'
import { TEAM_COLORS } from './constants'

interface EventDetailModalProps {
  selectedEvent: CalendarEvent | null
  confirmDelete: boolean
  isMultiUser: boolean
  userId: string
  teamColorMap: Map<string, string>
  deleting: boolean
  setSelectedEvent: (ev: CalendarEvent | null) => void
  setConfirmDelete: (confirm: boolean) => void
  openEditEvent: (ev: CalendarEvent) => void
  handleDeleteEvent: () => void
}

export function EventDetailModal({
  selectedEvent,
  confirmDelete,
  isMultiUser,
  userId,
  teamColorMap,
  deleting,
  setSelectedEvent,
  setConfirmDelete,
  openEditEvent,
  handleDeleteEvent,
}: EventDetailModalProps) {
  return (
    <>
      {/* Event detail modal */}
      <Modal
        open={!!selectedEvent && !confirmDelete}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.summary || 'Evento'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            {isMultiUser && selectedEvent._ownerName && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: teamColorMap.get(selectedEvent._ownerUserId || '') || TEAM_COLORS[0] }}
                />
                <span className="text-sm font-medium">Calendario di {selectedEvent._ownerName}</span>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {formatDateFull(selectedEvent.start.dateTime || selectedEvent.start.date)}
                </p>
                <p className="text-sm text-muted">
                  {formatDateRange(selectedEvent.start, selectedEvent.end)}
                </p>
              </div>
            </div>

            {selectedEvent.recurringEventId && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <Repeat className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">Evento ricorrente</span>
              </div>
            )}

            {selectedEvent.location && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm">{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.description && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
            )}

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted" />
                  Partecipanti ({selectedEvent.attendees.length})
                </p>
                <div className="space-y-1.5">
                  {selectedEvent.attendees.map((a) => (
                    <div key={a.email} className="flex items-center gap-2 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        a.responseStatus === 'accepted' ? 'bg-emerald-100 text-emerald-600' :
                        a.responseStatus === 'declined' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {a.responseStatus === 'accepted' ? <Check className="h-3 w-3" /> :
                         a.responseStatus === 'declined' ? <X className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                      </div>
                      <span>{a.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video') && (
              <a
                href={selectedEvent.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video')!.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-600 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
              >
                <Video className="h-4 w-4" />
                Partecipa a Google Meet
              </a>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              {selectedEvent.htmlLink && (
                <a
                  href={selectedEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Google Calendar
                </a>
              )}
              <div className="flex-1" />
              {(!selectedEvent._ownerUserId || selectedEvent._ownerUserId === userId) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => openEditEvent(selectedEvent)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Modifica
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Elimina
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Elimina evento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Sei sicuro di voler eliminare <strong>{selectedEvent?.summary}</strong>? Questa azione non può essere annullata.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Annulla
            </Button>
            <Button variant="destructive" size="sm" loading={deleting} onClick={handleDeleteEvent}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Elimina
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
