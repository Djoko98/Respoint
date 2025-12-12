-- Allow storing waiters for event reservations by removing/relaxing the foreign key constraint
-- on reservation_id in reservation_waiters table (if it exists).
-- Event reservation IDs come from event_reservations table, not reservations table.

-- Drop the foreign key constraint if it exists (different possible constraint names)
DO $$
BEGIN
  -- Try dropping the most common constraint name patterns
  BEGIN
    ALTER TABLE reservation_waiters DROP CONSTRAINT IF EXISTS reservation_waiters_reservation_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if constraint doesn't exist
  END;
  
  BEGIN
    ALTER TABLE reservation_waiters DROP CONSTRAINT IF EXISTS fk_reservation_waiters_reservation_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE reservation_waiters DROP CONSTRAINT IF EXISTS reservation_waiters_reservation_id_reservations_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Note: The reservation_id column remains as text/uuid which can now hold both
-- regular reservation IDs and event reservation IDs.
-- The application code handles the distinction between regular and event reservations.

