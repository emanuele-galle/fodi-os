export const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
export const HOURS = Array.from({ length: 24 }, (_, i) => i) // 0:00 - 23:00
export const SLOT_HEIGHT = 60 // px per hour in day/week view

export const RRULE_DAYS: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
}

export const RRULE_DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export const EVENT_COLORS = [
  '#039BE5', '#7986CB', '#33B679', '#8E24AA', '#E67C73',
  '#F6BF26', '#F4511E', '#039BE5', '#616161', '#3F51B5',
  '#0B8043', '#D50000',
]

export const TEAM_COLORS = [
  '#039BE5', // blue (utente corrente)
  '#E67C73', // red
  '#33B679', // green
  '#8E24AA', // purple
  '#F6BF26', // yellow
  '#F4511E', // orange
  '#7986CB', // indigo
  '#616161', // gray
]

export const CALENDAR_VIEWER_ROLES = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM']
