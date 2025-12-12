import React from 'react';
import type { Event } from '../../types/event';
import CreateEventModal from './CreateEventModal';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

// Thin wrapper around CreateEventModal so that editing uses a distinct component.
// It passes the existing event as initialEvent and its date as initialDate.
const EditEventModal: React.FC<EditEventModalProps> = ({ isOpen, onClose, event }) => {
  // event.date is already in YYYY-MM-DD format
  const initialDate = React.useMemo(() => {
    try {
      return new Date(event.date);
    } catch {
      return new Date();
    }
  }, [event.date]);

  return (
    <CreateEventModal
      isOpen={isOpen}
      onClose={onClose}
      initialDate={initialDate}
      initialEvent={event}
    />
  );
};

export default EditEventModal;


