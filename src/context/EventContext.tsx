import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { eventsService } from '../services/eventsService';
import { eventReservationsService } from '../services/eventReservationsService';
import { messageService } from '../services/messageService';
import type { Event, EventReservation } from '../types/event';
import { UserContext } from './UserContext';

export interface EventContextType {
  events: Event[];
  activeEventId: string | null;
  eventReservations: EventReservation[];
  loadingEvents: boolean;
  loadingReservations: boolean;
  currentDateKey: string | null;
  allEventDates: string[]; // All dates that have events (for calendar display)
  setActiveEventId: (eventId: string | null) => void;
  fetchEventsByDate: (date: Date | string) => Promise<void>;
  refreshAllEventDates: () => Promise<void>;
  refreshActiveEventReservations: () => Promise<void>;
  createEvent: (payload: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  addEventReservation: (payload: {
    eventId?: string;
    guestName: string;
    date: string;
    time: string;
    numberOfGuests: number;
    zoneId?: string;
    tableIds?: string[];
    color?: string;
    isVip?: boolean;
    notes?: string;
    phone?: string;
    email?: string;
    paymentStatus?: EventReservation['paymentStatus'];
    depositRequired?: number;
    ticketPrice?: number;
    reservationCode?: string;
  }) => Promise<EventReservation>;
  updateEventReservation: (
    id: string,
    updates: Partial<EventReservation>
  ) => Promise<EventReservation>;
  deleteEventReservation: (id: string) => Promise<void>;
  softDeleteEventReservation: (id: string) => Promise<void>;
  findReservationByCode: (code: string) => Promise<EventReservation | null>;
}

export const EventContext = createContext<EventContextType>({
  events: [],
  activeEventId: null,
  eventReservations: [],
  loadingEvents: false,
  loadingReservations: false,
  currentDateKey: null,
  allEventDates: [],
  setActiveEventId: () => {},
  fetchEventsByDate: async () => {},
  refreshAllEventDates: async () => {},
  refreshActiveEventReservations: async () => {},
  createEvent: async () => {
    throw new Error('EventContext not initialised');
  },
  updateEvent: async () => {
    throw new Error('EventContext not initialised');
  },
  deleteEvent: async () => {
    throw new Error('EventContext not initialised');
  },
  addEventReservation: async () => {
    throw new Error('EventContext not initialised');
  },
  updateEventReservation: async () => {
    throw new Error('EventContext not initialised');
  },
  deleteEventReservation: async () => {
    throw new Error('EventContext not initialised');
  },
  softDeleteEventReservation: async () => {
    throw new Error('EventContext not initialised');
  },
  findReservationByCode: async () => null,
});

const toDateKey = (value: Date | string): string => {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = `${value.getMonth() + 1}`.padStart(2, '0');
    const d = `${value.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Expecting YYYY-MM-DD like strings; keep as-is if it looks valid
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = `${parsed.getMonth() + 1}`.padStart(2, '0');
      const d = `${parsed.getDate()}`.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {
    // fall through
  }
  return value;
};

export const EventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useContext(UserContext);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventIdState] = useState<string | null>(null);
  const [eventReservations, setEventReservations] = useState<EventReservation[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [currentDateKey, setCurrentDateKey] = useState<string | null>(null);
  const [allEventDates, setAllEventDates] = useState<string[]>([]);

  const setActiveEventId = useCallback((eventId: string | null) => {
    setActiveEventIdState(eventId);
  }, []);

  // Fetch all event dates for calendar display
  const refreshAllEventDates = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setAllEventDates([]);
      return;
    }
    try {
      const dates = await eventsService.getAllEventDates(userId);
      setAllEventDates(dates);
    } catch (err) {
      console.error('❌ EventContext: Failed to fetch all event dates', err);
      setAllEventDates([]);
    }
  }, [user?.id]);

  // Fetch all event dates on mount and when user changes
  useEffect(() => {
    refreshAllEventDates();
  }, [refreshAllEventDates]);

  const fetchEventsByDate = useCallback(
    async (date: Date | string) => {
      const userId = user?.id;
      const dateKey = toDateKey(date);
      setCurrentDateKey(dateKey);

      if (!userId) {
        setEvents([]);
        setActiveEventIdState(null);
        setEventReservations([]);
        return;
      }

      setLoadingEvents(true);
      try {
        const list = await eventsService.getEventsByDate(userId, dateKey);
        setEvents(list);

        if (!list.length) {
          setActiveEventIdState(null);
          setEventReservations([]);
          return;
        }

        // Preserve active event if it still exists for this date, otherwise switch to first
        const stillActive = activeEventId && list.some((e) => e.id === activeEventId);
        const nextActiveId = stillActive ? activeEventId : list[0].id;
        setActiveEventIdState(nextActiveId);
      } catch (error) {
        console.error('❌ EventContext: Failed to fetch events for date', dateKey, error);
        setEvents([]);
        setActiveEventIdState(null);
        setEventReservations([]);
      } finally {
        setLoadingEvents(false);
      }
    },
    [user?.id, activeEventId]
  );

  const refreshActiveEventReservations = useCallback(async () => {
    const userId = user?.id;
    if (!userId || !activeEventId) {
      setEventReservations([]);
      return;
    }

    setLoadingReservations(true);
    try {
      const list = await eventReservationsService.getByEvent(activeEventId, userId);
      setEventReservations(list);
    } catch (error) {
      console.error('❌ EventContext: Failed to fetch reservations for active event', error);
      setEventReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  }, [user?.id, activeEventId]);

  // Whenever activeEventId changes, refresh its reservations
  useEffect(() => {
    if (!activeEventId) {
      setEventReservations([]);
      return;
    }
    void refreshActiveEventReservations();
  }, [activeEventId, refreshActiveEventReservations]);

  // Reset events when user logs out
  useEffect(() => {
    if (!user?.id) {
      setEvents([]);
      setActiveEventIdState(null);
      setEventReservations([]);
      setCurrentDateKey(null);
    }
  }, [user?.id]);

  const createEvent = useCallback(
    async (payload: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) {
        throw new Error('Cannot create event without a logged-in user');
      }

      const created = await eventsService.createEvent({
        ...payload,
        userId: user.id,
      });

      setEvents((prev) => {
        const next = [...prev, created];
        // Keep events sorted by start time within the same date
        return next.sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      // If event is for currently selected date, make it active
      if (!currentDateKey || created.date === currentDateKey) {
        setActiveEventIdState(created.id);
        setEventReservations([]);
      }

      // Refresh all event dates for calendar display (fire and forget, don't block)
      try {
        refreshAllEventDates();
      } catch (e) {
        console.error('Failed to refresh event dates:', e);
      }

      return created;
    },
    [user?.id, currentDateKey, refreshAllEventDates]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<Event>) => {
      const updated = await eventsService.updateEvent(id, updates);

      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updated } : e))
      );

      // Refresh all event dates if date was changed (fire and forget)
      if (updates.date !== undefined) {
        try {
          refreshAllEventDates();
        } catch (e) {
          console.error('Failed to refresh event dates:', e);
        }
      }

      return updated;
    },
    [refreshAllEventDates]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!user?.id) {
        throw new Error('Cannot delete event without a logged-in user');
      }

      await eventsService.deleteEvent(id, user.id);

      setEvents((prev) => prev.filter((e) => e.id !== id));

      setEventReservations((prev) =>
        activeEventId === id ? [] : prev
      );

      if (activeEventId === id) {
        // Pick a new active event on the same date if any
        setActiveEventIdState((prevId) => {
          if (prevId !== id) return prevId;
          const sameDate = events.filter((e) => e.id !== id && e.date === currentDateKey);
          return sameDate.length ? sameDate[0].id : null;
        });
      }

      // Refresh all event dates for calendar display (fire and forget)
      try {
        refreshAllEventDates();
      } catch (e) {
        console.error('Failed to refresh event dates:', e);
      }
    },
    [user?.id, activeEventId, events, currentDateKey, refreshAllEventDates]
  );

  const addEventReservation = useCallback<EventContextType['addEventReservation']>(
    async (payload) => {
      if (!user?.id) {
        throw new Error('Cannot create event reservation without a logged-in user');
      }

      const eventId = payload.eventId ?? activeEventId;
      if (!eventId) {
        throw new Error('No active event selected for creating reservation');
      }

      const created = await eventReservationsService.create({
        eventId,
        userId: user.id,
        guestName: payload.guestName,
        date: payload.date,
        time: payload.time,
        numberOfGuests: payload.numberOfGuests,
        zoneId: payload.zoneId,
        tableIds: payload.tableIds,
        color: payload.color,
        isVip: payload.isVip,
        notes: payload.notes,
        phone: payload.phone,
        email: payload.email,
        paymentStatus: payload.paymentStatus,
        depositRequired: payload.depositRequired,
        ticketPrice: payload.ticketPrice,
        reservationCode: payload.reservationCode,
      });

      if (eventId === activeEventId) {
        setEventReservations((prev) => [...prev, created]);
      }

      // Fire-and-forget notification (Viber stub)
      try {
        const ev = events.find((e) => e.id === eventId) || null;
        await messageService.sendEventReservationNotification(created, ev || undefined);
      } catch (err) {
        console.warn('Failed to send event reservation notification (non-fatal):', err);
      }

      return created;
    },
    [user?.id, activeEventId, events]
  );

  const updateEventReservation = useCallback<
    EventContextType['updateEventReservation']
  >(async (id, updates) => {
    const updated = await eventReservationsService.update(id, updates);

    setEventReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );

    return updated;
  }, []);

  const deleteEventReservation = useCallback<
    EventContextType['deleteEventReservation']
  >(async (id) => {
    if (!user?.id) {
      throw new Error('Cannot delete event reservation without a logged-in user');
    }

    await eventReservationsService.delete(id, user.id);
    setEventReservations((prev) => prev.filter((r) => r.id !== id));
  }, [user?.id]);

  const softDeleteEventReservation = useCallback<
    EventContextType['softDeleteEventReservation']
  >(async (id) => {
    if (!user?.id) {
      throw new Error('Cannot soft delete event reservation without a logged-in user');
    }

    await eventReservationsService.softDelete(id, user.id);
    // Remove from local state (it's still in DB for statistics)
    setEventReservations((prev) => prev.filter((r) => r.id !== id));
  }, [user?.id]);

  const findReservationByCode = useCallback<
    EventContextType['findReservationByCode']
  >(async (code) => {
    if (!user?.id) return null;
    const found = await eventReservationsService.findByCode(user.id, code);
    if (!found) return null;

    // Attach event if already loaded in this context
    const event = events.find((e) => e.id === found.eventId);
    const enriched: EventReservation = event ? { ...found, event } : found;

    // If reservation belongs to currently active event, ensure it's visible in list
    if (found.eventId === activeEventId) {
      setEventReservations((prev) => {
        const exists = prev.some((r) => r.id === found.id);
        if (exists) {
          return prev.map((r) => (r.id === found.id ? enriched : r));
        }
        return [...prev, enriched];
      });
    }

    return enriched;
  }, [user?.id, events, activeEventId]);

  const value: EventContextType = useMemo(
    () => ({
      events,
      activeEventId,
      eventReservations,
      loadingEvents,
      loadingReservations,
      currentDateKey,
      allEventDates,
      setActiveEventId,
      fetchEventsByDate,
      refreshAllEventDates,
      refreshActiveEventReservations,
      createEvent,
      updateEvent,
      deleteEvent,
      addEventReservation,
      updateEventReservation,
      deleteEventReservation,
      softDeleteEventReservation,
      findReservationByCode,
    }),
    [
      events,
      activeEventId,
      eventReservations,
      loadingEvents,
      loadingReservations,
      currentDateKey,
      allEventDates,
      setActiveEventId,
      fetchEventsByDate,
      refreshAllEventDates,
      refreshActiveEventReservations,
      createEvent,
      updateEvent,
      deleteEvent,
      addEventReservation,
      updateEventReservation,
      deleteEventReservation,
      softDeleteEventReservation,
      findReservationByCode,
    ]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
};


