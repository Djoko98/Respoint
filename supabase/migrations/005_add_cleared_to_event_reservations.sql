-- Add 'cleared' column to event_reservations table
-- This flag distinguishes between:
-- - cancelled = true, cleared = false: Guest cancelled before arriving
-- - cancelled = true, cleared = true: Guest arrived and left (cleared out)

ALTER TABLE event_reservations 
ADD COLUMN IF NOT EXISTS cleared BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN event_reservations.cleared IS 'True when guest arrived and later left (vs cancelled before arriving)';

