-- Add is_deleted column to event_reservations table for soft delete functionality
ALTER TABLE public.event_reservations
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Create an index for better query performance when filtering out deleted reservations
CREATE INDEX IF NOT EXISTS idx_event_reservations_is_deleted 
ON public.event_reservations(is_deleted);

