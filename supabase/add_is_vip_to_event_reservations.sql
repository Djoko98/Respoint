-- Migration: Add is_vip column to event_reservations table
-- This allows tracking if an event reservation guest is a VIP/loyalty guest

-- Add the is_vip column to event_reservations
ALTER TABLE public.event_reservations
ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN public.event_reservations.is_vip IS 'Indicates if the guest is a VIP/loyalty guest';

