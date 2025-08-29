-- Migration: Add is_deleted column for soft delete functionality
-- Date: 2024-01-15
-- Purpose: Allow reservations to be hidden from UI while keeping them for statistics

-- Add the is_deleted column
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_is_deleted ON reservations(is_deleted);
CREATE INDEX IF NOT EXISTS idx_reservations_user_is_deleted ON reservations(user_id, is_deleted);

-- Add column comment
COMMENT ON COLUMN reservations.is_deleted IS 'Soft delete flag - when true, reservation is hidden from UI but kept for statistics'; 