-- Add end_date column to events table for multi-day events
-- This allows events to span across midnight (e.g., 20:00 on Dec 11 to 01:00 on Dec 12)

ALTER TABLE events
ADD COLUMN IF NOT EXISTS end_date DATE;

-- If end_date is NULL, the event ends on the same day as it starts (date column)
-- If end_date is set, the event ends on that date at the specified end_time

