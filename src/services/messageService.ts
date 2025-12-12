import { invoke } from '@tauri-apps/api/core';
import type { Event, EventReservation } from '../types/event';

const buildEventReservationMessage = (
  reservation: EventReservation,
  event?: Event | null
): string => {
  const lines: string[] = [];
  if (event) {
    lines.push(`Rezervacija za event: ${event.name}`);
    lines.push(
      `Datum i vreme: ${event.date} • ${event.startTime}–${event.endTime}`
    );
  } else {
    lines.push('Rezervacija za specijalni event');
    lines.push(`Datum: ${reservation.date} • vreme: ${reservation.time}`);
  }
  lines.push(`Gost: ${reservation.guestName}`);
  lines.push(`Broj osoba: ${reservation.numberOfGuests || 0}`);
  lines.push(`Kod rezervacije: ${reservation.reservationCode}`);
  return lines.join('\n');
};

export const messageService = {
  async sendEventReservationNotification(
    reservation: EventReservation,
    event?: Event | null
  ): Promise<void> {
    const phone = reservation.phone;
    if (!phone) return;

    const message = buildEventReservationMessage(reservation, event);

    try {
      await invoke('send_viber_message', {
        phone,
        message,
        reservationCode: reservation.reservationCode,
      });
    } catch (error) {
      console.warn('Viber notification failed (stub):', error);
    }
  },
};


