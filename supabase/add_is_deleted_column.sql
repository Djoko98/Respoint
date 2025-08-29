-- Add is_deleted column to reservations table for soft delete functionality
-- This allows reservations to be hidden from UI while keeping them for statistics

-- Add the column
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_is_deleted ON reservations(is_deleted);

-- Create index for user_id + is_deleted combination (commonly queried together)
CREATE INDEX IF NOT EXISTS idx_reservations_user_is_deleted ON reservations(user_id, is_deleted);

-- Add comment to explain the column purpose
COMMENT ON COLUMN reservations.is_deleted IS 'Soft delete flag - when true, reservation is hidden from UI but kept for statistics'; 