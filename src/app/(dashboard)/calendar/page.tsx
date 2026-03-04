'use client'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- component handlers and dynamic props */
import { useCalendarState } from '@/hooks/useCalendarState'
import { useCalendarTeam } from '@/hooks/useCalendarTeam'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useEventForm } from '@/hooks/useEventForm'
import { useCalendarKeyboard } from '@/hooks/useCalendarKeyboard'

import {
  CalendarHeader,
  SyncStatusBar,
  TeamSidebarDesktop,
  TeamPanelMobile,
  CalendarsPanelMobile,
  CalendarsSidebarDesktop,
  AgendaView,
  WeekView,
  DayView,
  MonthView,
  EventDetailModal,
  EventFormModal,
  NotConnectedState,
  MobileViewToggle,
  LoadingSkeleton,
  MiniCalendar,
} from '@/components/calendar'

export default function CalendarPage() {
  const state = useCalendarState()
  const team = useCalendarTeam()

  const eventsData = useCalendarEvents({
    year: state.year,
    month: state.month,
    selectedTeamIds: team.selectedTeamIds,
    canViewTeam: team.canViewTeam,
    isMultiUser: team.isMultiUser,
    teamColorMap: team.teamColorMap,
  })

  const form = useEventForm({
    userId: team.userId,
    brandCalendarId: eventsData.brandCalendarId,
    targetCalendarId: eventsData.targetCalendarId,
    setTargetCalendarId: eventsData.setTargetCalendarId,
    fetchEvents: eventsData.fetchEvents,
  })

  useCalendarKeyboard({
    selectedDayKey: state.selectedDayKey,
    setSelectedDayKey: state.setSelectedDayKey,
    setYear: state.setYear,
    setMonth: state.setMonth,
    setDesktopView: state.setDesktopView,
    goToToday: state.goToToday,
    todayKey: state.todayKey,
    openNewEventForDate: form.openNewEventForDate,
    showNewEvent: form.showNewEvent,
    selectedEvent: form.selectedEvent,
  })

  if (eventsData.connected === false) return <NotConnectedState />

  return (
    <div className="animate-fade-in">
      <CalendarHeader
        today={state.today}
        year={state.year}
        month={state.month}
        isCurrentMonth={state.isCurrentMonth}
        todayKey={state.todayKey}
        desktopView={state.desktopView}
        setDesktopView={state.setDesktopView}
        setSelectedDayKey={state.setSelectedDayKey}
        goToToday={state.goToToday}
        prevMonth={state.prevMonth}
        nextMonth={state.nextMonth}
        openNewEventForDate={form.openNewEventForDate}
        eventsByDate={eventsData.eventsByDate}
        getEventColor={eventsData.getEventColor}
        setSelectedEvent={form.setSelectedEvent}
      />

      <SyncStatusBar
        syncStatus={eventsData.syncStatus}
        lastSyncTime={eventsData.lastSyncTime}
        scopeError={eventsData.scopeError}
        fetchError={eventsData.fetchError}
        brandCalendarId={eventsData.brandCalendarId}
        calendars={eventsData.calendars}
        fetchEvents={eventsData.fetchEvents}
      />

      <MobileViewToggle
        mobileView={state.mobileView}
        setMobileView={state.setMobileView}
        todayKey={state.todayKey}
        setSelectedDayKey={state.setSelectedDayKey}
        canViewTeam={team.canViewTeam}
        isMultiUser={team.isMultiUser}
        selectedTeamIds={team.selectedTeamIds}
        showTeamPanel={team.showTeamPanel}
        setShowTeamPanel={team.setShowTeamPanel}
      />

      {team.canViewTeam && team.showTeamPanel && (
        <TeamPanelMobile
          teamMembers={team.teamMembers}
          selectedTeamIds={team.selectedTeamIds}
          setSelectedTeamIds={team.setSelectedTeamIds}
          userId={team.userId}
          teamColorMap={team.teamColorMap}
        />
      )}

      {!team.canViewTeam && (
        <CalendarsPanelMobile
          calendars={eventsData.calendars}
          selectedCalendars={eventsData.selectedCalendars}
          setSelectedCalendars={eventsData.setSelectedCalendars}
        />
      )}

      <div className="flex gap-4">
        {team.canViewTeam && (
          <TeamSidebarDesktop
            teamMembers={team.teamMembers}
            selectedTeamIds={team.selectedTeamIds}
            setSelectedTeamIds={team.setSelectedTeamIds}
            userId={team.userId}
            teamColorMap={team.teamColorMap}
            calendars={eventsData.calendars}
            selectedCalendars={eventsData.selectedCalendars}
            setSelectedCalendars={eventsData.setSelectedCalendars}
            miniCalendar={
              <MiniCalendar
                todayKey={state.todayKey}
                selectedDayKey={state.selectedDayKey}
                eventsByDate={eventsData.eventsByDate}
                onSelectDay={(key) => {
                  state.setSelectedDayKey(key)
                  state.setDesktopView('day')
                  const [y, m] = key.split('-').map(Number)
                  state.setYear(y)
                  state.setMonth(m - 1)
                }}
              />
            }
          />
        )}

        {!team.canViewTeam && (
          <CalendarsSidebarDesktop
            calendars={eventsData.calendars}
            selectedCalendars={eventsData.selectedCalendars}
            setSelectedCalendars={eventsData.setSelectedCalendars}
          />
        )}

        <div className="flex-1 min-w-0">
          {eventsData.loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {state.mobileView === 'agenda' && (
                <AgendaView
                  eventsByDate={eventsData.eventsByDate}
                  todayKey={state.todayKey}
                  isMultiUser={team.isMultiUser}
                  getEventColor={eventsData.getEventColor}
                  setSelectedEvent={form.setSelectedEvent}
                  setSelectedDayKey={state.setSelectedDayKey}
                  setMobileView={state.setMobileView}
                />
              )}

              {state.desktopView === 'agenda' && (
                <div className="hidden md:block">
                  <AgendaView
                    eventsByDate={eventsData.eventsByDate}
                    todayKey={state.todayKey}
                    isMultiUser={team.isMultiUser}
                    getEventColor={eventsData.getEventColor}
                    setSelectedEvent={form.setSelectedEvent}
                    setSelectedDayKey={state.setSelectedDayKey}
                    setMobileView={state.setMobileView}
                    isDesktop
                  />
                </div>
              )}

              {state.desktopView === 'week' && (
                <WeekView
                  weekDates={state.weekDates}
                  todayKey={state.todayKey}
                  eventsByDate={eventsData.eventsByDate}
                  getEventColor={eventsData.getEventColor}
                  setSelectedEvent={form.setSelectedEvent}
                  setSelectedDayKey={state.setSelectedDayKey}
                  setDesktopView={state.setDesktopView}
                  setNewEvent={form.setNewEvent}
                  setCreateError={form.setCreateError}
                  setShowNewEvent={form.setShowNewEvent}
                />
              )}

              {state.mobileView === 'day' && (
                <div className="md:hidden">
                  <DayView
                    selectedDayKey={state.selectedDayKey}
                    setSelectedDayKey={state.setSelectedDayKey}
                    setYear={state.setYear}
                    setMonth={state.setMonth}
                    todayKey={state.todayKey}
                    eventsByDate={eventsData.eventsByDate}
                    isMultiUser={team.isMultiUser}
                    getEventColor={eventsData.getEventColor}
                    setSelectedEvent={form.setSelectedEvent}
                    openNewEventForDate={form.openNewEventForDate}
                    setNewEvent={form.setNewEvent}
                    setCreateError={form.setCreateError}
                    setShowNewEvent={form.setShowNewEvent}
                    handleQuickCreate={form.handleQuickCreate}
                  />
                </div>
              )}
              {state.desktopView === 'day' && (
                <div className="hidden md:block">
                  <DayView
                    selectedDayKey={state.selectedDayKey}
                    setSelectedDayKey={state.setSelectedDayKey}
                    setYear={state.setYear}
                    setMonth={state.setMonth}
                    todayKey={state.todayKey}
                    eventsByDate={eventsData.eventsByDate}
                    isMultiUser={team.isMultiUser}
                    getEventColor={eventsData.getEventColor}
                    setSelectedEvent={form.setSelectedEvent}
                    openNewEventForDate={form.openNewEventForDate}
                    setNewEvent={form.setNewEvent}
                    setCreateError={form.setCreateError}
                    setShowNewEvent={form.setShowNewEvent}
                    handleQuickCreate={form.handleQuickCreate}
                  />
                </div>
              )}

              <MonthView
                year={state.year}
                month={state.month}
                daysInMonth={state.daysInMonth}
                firstDay={state.firstDay}
                totalCells={state.totalCells}
                todayKey={state.todayKey}
                eventsByDate={eventsData.eventsByDate}
                desktopView={state.desktopView}
                mobileView={state.mobileView}
                getEventColor={eventsData.getEventColor}
                setSelectedEvent={form.setSelectedEvent}
                setSelectedDayKey={state.setSelectedDayKey}
                setDesktopView={state.setDesktopView}
                setMobileView={state.setMobileView}
              />
            </>
          )}
        </div>
      </div>

      <EventDetailModal
        selectedEvent={form.selectedEvent}
        confirmDelete={form.confirmDelete}
        isMultiUser={team.isMultiUser}
        userId={team.userId}
        teamColorMap={team.teamColorMap}
        deleting={form.deleting}
        setSelectedEvent={form.setSelectedEvent}
        setConfirmDelete={form.setConfirmDelete}
        openEditEvent={form.openEditEvent}
        handleDeleteEvent={form.handleDeleteEvent}
      />

      <EventFormModal
        showNewEvent={form.showNewEvent}
        editingEvent={form.editingEvent}
        blockMode={form.blockMode}
        newEvent={form.newEvent}
        creating={form.creating}
        createError={form.createError}
        calendars={eventsData.calendars}
        targetCalendarId={eventsData.targetCalendarId}
        recurrenceType={form.recurrenceType}
        recurrenceCustomDays={form.recurrenceCustomDays}
        recurrenceEndType={form.recurrenceEndType}
        recurrenceEndDate={form.recurrenceEndDate}
        recurrenceEndCount={form.recurrenceEndCount}
        selectedAttendees={form.selectedAttendees}
        attendeeSearch={form.attendeeSearch}
        teamMembers={team.teamMembers}
        setShowNewEvent={form.setShowNewEvent}
        setEditingEvent={form.setEditingEvent}
        setBlockMode={form.setBlockMode}
        setNewEvent={form.setNewEvent}
        setTargetCalendarId={eventsData.setTargetCalendarId}
        setRecurrenceType={form.setRecurrenceType}
        setRecurrenceCustomDays={form.setRecurrenceCustomDays}
        setRecurrenceEndType={form.setRecurrenceEndType}
        setRecurrenceEndDate={form.setRecurrenceEndDate}
        setRecurrenceEndCount={form.setRecurrenceEndCount}
        setSelectedAttendees={form.setSelectedAttendees}
        setAttendeeSearch={form.setAttendeeSearch}
        handleCreateEvent={form.handleCreateEvent}
      />
    </div>
  )
}
