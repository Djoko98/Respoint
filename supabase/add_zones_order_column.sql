-- Add order column to zones table for drag & drop functionality
-- Run this script in your Supabase SQL editor

-- Add order column to zones table
ALTER TABLE zones ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Create index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_zones_order ON zones("order");

-- Update existing zones to have proper order values
-- This will set the order based on created_at timestamp for existing records
WITH ordered_zones AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as new_order
  FROM zones
  WHERE "order" = 0 OR "order" IS NULL
)
UPDATE zones 
SET "order" = ordered_zones.new_order
FROM ordered_zones 
WHERE zones.id = ordered_zones.id;

-- Verify the update worked
SELECT user_id, id, name, "order", created_at 
FROM zones 
ORDER BY user_id, "order";

-- Update RLS policies to allow updating the order column
-- Drop and recreate the update policy to include order column
DROP POLICY IF EXISTS "Users can update own zones" ON zones;

CREATE POLICY "Users can update own zones" ON zones
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment to document the order column
COMMENT ON COLUMN zones."order" IS 'Sort order for zones within a user account';

-- Final verification
SELECT 'Migration completed successfully! Zones now have order column.' as status; 