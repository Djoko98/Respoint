-- Add color column to event_reservations table for storing table color preference
-- Run this script in Supabase SQL editor to add the color field

-- Add color column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'event_reservations' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE public.event_reservations
    ADD COLUMN color text DEFAULT '#8B5CF6';
  END IF;
END$$;

-- Add a comment explaining the column
COMMENT ON COLUMN public.event_reservations.color IS 'HEX color code for table visualization on the canvas';

