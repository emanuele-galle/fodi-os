'use client'

import { Users, Calendar, Check } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardContent } from '@/components/ui/Card'
import type { TeamMember, CalendarInfo } from './types'
import { TEAM_COLORS } from './constants'

interface TeamSidebarProps {
  teamMembers: TeamMember[]
  selectedTeamIds: string[]
  setSelectedTeamIds: React.Dispatch<React.SetStateAction<string[]>>
  userId: string
  teamColorMap: Map<string, string>
  calendars: CalendarInfo[]
  selectedCalendars: Set<string>
  setSelectedCalendars: React.Dispatch<React.SetStateAction<Set<string>>>
}

function TeamMemberList({
  teamMembers,
  selectedTeamIds,
  setSelectedTeamIds,
  userId,
  teamColorMap,
  size = 'sm',
}: {
  teamMembers: TeamMember[]
  selectedTeamIds: string[]
  setSelectedTeamIds: React.Dispatch<React.SetStateAction<string[]>>
  userId: string
  teamColorMap: Map<string, string>
  size?: 'sm' | 'md'
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className={`${size === 'md' ? 'text-sm' : 'text-sm'} font-semibold ${size === 'sm' ? 'flex items-center gap-1.5' : ''}`}>
          {size === 'sm' && <Users className="h-4 w-4 text-muted" />}
          Calendari Team
        </p>
        {size === 'md' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const allIds = teamMembers.filter((m) => m.hasGoogleCalendar).map((m) => m.id)
                setSelectedTeamIds(allIds)
              }}
              className="text-xs text-primary hover:underline"
            >
              Tutti
            </button>
            <button
              onClick={() => setSelectedTeamIds(userId ? [userId] : [])}
              className="text-xs text-muted hover:underline"
            >
              Solo io
            </button>
          </div>
        )}
      </div>
      {size === 'sm' && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              const allIds = teamMembers.filter((m) => m.hasGoogleCalendar).map((m) => m.id)
              setSelectedTeamIds(allIds)
            }}
            className="text-xs text-primary hover:underline"
          >
            Tutti
          </button>
          <button
            onClick={() => setSelectedTeamIds(userId ? [userId] : [])}
            className="text-xs text-muted hover:underline"
          >
            Solo io
          </button>
        </div>
      )}
      <div className={`space-y-${size === 'sm' ? '0.5' : '1'} ${size === 'md' ? 'max-h-48 overflow-y-auto' : ''}`}>
        {teamMembers
          .filter((m) => m.hasGoogleCalendar)
          .map((m) => {
            const isSelected = selectedTeamIds.includes(m.id)
            const isSelf = m.id === userId
            const color = teamColorMap.get(m.id) || TEAM_COLORS[0]
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (isSelf) return
                  setSelectedTeamIds((prev) =>
                    isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                  )
                }}
                className={`w-full flex items-center gap-${size === 'sm' ? '2' : '2.5'} px-2 py-1.5 rounded-md text-left transition-colors ${
                  isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                } ${isSelf ? 'opacity-70 cursor-default' : ''}`}
              >
                <div
                  className={`w-3 h-3 rounded-sm border-2 ${size === 'sm' ? 'flex-shrink-0 ' : ''}flex items-center justify-center ${
                    isSelected ? '' : 'border-border'
                  }`}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {isSelected && <Check className="h-2 w-2 text-white" />}
                </div>
                <Avatar src={m.avatarUrl} name={`${m.firstName} ${m.lastName}`} size="xs" />
                <span className={`text-${size === 'sm' ? 'xs' : 'sm'} truncate`}>{m.firstName} {m.lastName}</span>
                {isSelf && <span className="text-xs text-muted ml-auto">(tu)</span>}
              </button>
            )
          })}
      </div>
    </>
  )
}

function CalendarList({
  calendars,
  selectedCalendars,
  setSelectedCalendars,
  size = 'sm',
}: {
  calendars: CalendarInfo[]
  selectedCalendars: Set<string>
  setSelectedCalendars: React.Dispatch<React.SetStateAction<Set<string>>>
  size?: 'sm' | 'md'
}) {
  if (calendars.length <= 1) return null

  return (
    <div className={size === 'sm' ? '' : 'space-y-1 max-h-48 overflow-y-auto'}>
      {size === 'sm' && (
        <>
          <div className="border-t border-border/50 my-3" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold flex items-center gap-1.5 text-muted">
              <Calendar className="h-3.5 w-3.5" />
              I miei calendari
            </p>
          </div>
        </>
      )}
      {size === 'md' && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted" />
            I miei calendari
          </p>
        </div>
      )}
      <div className={`space-y-${size === 'sm' ? '0.5' : '1'}`}>
        {calendars.map((cal) => {
          const isSelected = selectedCalendars.has(cal.id)
          return (
            <button
              key={cal.id}
              onClick={() => {
                setSelectedCalendars((prev) => {
                  const next = new Set(prev)
                  if (isSelected) next.delete(cal.id)
                  else next.add(cal.id)
                  return next
                })
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-sm border-2 ${size === 'sm' ? 'flex-shrink-0 ' : ''}flex items-center justify-center ${
                  isSelected ? '' : 'border-border'
                }`}
                style={isSelected ? { backgroundColor: cal.backgroundColor, borderColor: cal.backgroundColor } : {}}
              >
                {isSelected && <Check className="h-2 w-2 text-white" />}
              </div>
              <span className={`text-${size === 'sm' ? 'xs' : 'sm'} truncate`}>{cal.summary}</span>
              {cal.primary && <span className={`text-${size === 'sm' ? '[10px]' : 'xs'} text-muted ml-auto ${size === 'sm' ? 'flex-shrink-0' : ''}`}>{size === 'sm' ? 'principale' : '(principale)'}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TeamSidebarDesktop({
  teamMembers,
  selectedTeamIds,
  setSelectedTeamIds,
  userId,
  teamColorMap,
  calendars,
  selectedCalendars,
  setSelectedCalendars,
}: TeamSidebarProps) {
  return (
    <div className="hidden md:block w-52 flex-shrink-0">
      <Card className="sticky top-4">
        <CardContent className="p-3">
          <TeamMemberList
            teamMembers={teamMembers}
            selectedTeamIds={selectedTeamIds}
            setSelectedTeamIds={setSelectedTeamIds}
            userId={userId}
            teamColorMap={teamColorMap}
            size="sm"
          />
          <CalendarList
            calendars={calendars}
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={setSelectedCalendars}
            size="sm"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export function TeamPanelMobile({
  teamMembers,
  selectedTeamIds,
  setSelectedTeamIds,
  userId,
  teamColorMap,
}: Omit<TeamSidebarProps, 'calendars' | 'selectedCalendars' | 'setSelectedCalendars'>) {
  return (
    <div className="md:hidden mb-4 p-3 rounded-lg border border-border bg-card shadow-sm">
      <TeamMemberList
        teamMembers={teamMembers}
        selectedTeamIds={selectedTeamIds}
        setSelectedTeamIds={setSelectedTeamIds}
        userId={userId}
        teamColorMap={teamColorMap}
        size="md"
      />
    </div>
  )
}

export function CalendarsPanelMobile({
  calendars,
  selectedCalendars,
  setSelectedCalendars,
}: {
  calendars: CalendarInfo[]
  selectedCalendars: Set<string>
  setSelectedCalendars: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  if (calendars.length <= 1) return null

  return (
    <div className="md:hidden mb-4 p-3 rounded-lg border border-border bg-card shadow-sm">
      <CalendarList
        calendars={calendars}
        selectedCalendars={selectedCalendars}
        setSelectedCalendars={setSelectedCalendars}
        size="md"
      />
    </div>
  )
}

export function CalendarsSidebarDesktop({
  calendars,
  selectedCalendars,
  setSelectedCalendars,
}: {
  calendars: CalendarInfo[]
  selectedCalendars: Set<string>
  setSelectedCalendars: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  if (calendars.length <= 1) return null

  return (
    <div className="hidden md:block w-52 flex-shrink-0">
      <Card className="sticky top-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted" />
              I miei calendari
            </p>
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedCalendars(new Set(calendars.map((c) => c.id)))}
              className="text-xs text-primary hover:underline"
            >
              Tutti
            </button>
            <button
              onClick={() => {
                const primary = calendars.find((c) => c.primary)
                setSelectedCalendars(new Set(primary ? [primary.id] : []))
              }}
              className="text-xs text-muted hover:underline"
            >
              Principale
            </button>
          </div>
          <div className="space-y-0.5">
            {calendars.map((cal) => {
              const isSelected = selectedCalendars.has(cal.id)
              return (
                <button
                  key={cal.id}
                  onClick={() => {
                    setSelectedCalendars((prev) => {
                      const next = new Set(prev)
                      if (isSelected) next.delete(cal.id)
                      else next.add(cal.id)
                      return next
                    })
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                    isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? '' : 'border-border'
                    }`}
                    style={isSelected ? { backgroundColor: cal.backgroundColor, borderColor: cal.backgroundColor } : {}}
                  >
                    {isSelected && <Check className="h-2 w-2 text-white" />}
                  </div>
                  <span className="text-xs truncate">{cal.summary}</span>
                  {cal.primary && <span className="text-[10px] text-muted ml-auto flex-shrink-0">principale</span>}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
