-- Add waiting_reservations column to statistics table
-- This will track reservations that are in 'waiting' or 'confirmed' status

ALTER TABLE statistics 
ADD COLUMN waiting_reservations integer DEFAULT 0;

-- Update existing statistics to calculate waiting_reservations
-- This will set waiting_reservations to 0 for all existing records initially
-- The actual values will be calculated when updateDailyStatistics is called

-- Add a comment to the column
COMMENT ON COLUMN statistics.waiting_reservations IS 'Number of reservations in waiting or confirmed status';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'statistics' 
AND column_name = 'waiting_reservations'; 