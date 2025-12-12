-- Fix cleared reservations to have status 'arrived' instead of 'cancelled'
-- Cleared reservations are guests who arrived and then left (finished their visit)

-- Update regular reservations
UPDATE reservations
SET status = 'arrived'
WHERE status = 'cancelled' AND cleared = true;

-- Update event reservations
UPDATE event_reservations
SET status = 'arrived'
WHERE status = 'cancelled' AND cleared = true;

