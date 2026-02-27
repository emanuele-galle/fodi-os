export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink?: string
  attendees?: { email: string; responseStatus?: string }[]
  colorId?: string
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[]
  }
  _ownerUserId?: string
  _ownerName?: string
  _calendarId?: string
  _calendarColor?: string
  recurringEventId?: string
  recurrence?: string[]
}

export interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  hasGoogleCalendar?: boolean
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
export type RecurrenceEndType = 'never' | 'date' | 'count'
export type DesktopView = 'month' | 'week' | 'day'
export type MobileView = 'calendar' | 'agenda' | 'day'

export interface NewEventData {
  summary: string
  description: string
  location: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  withMeet: boolean
}
