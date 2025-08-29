-- Simple script to add missing columns to profiles table
-- Run each command separately in Supabase SQL Editor if needed

-- First, let's see what columns currently exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY column_name;

-- Add missing columns one by one (ignore errors if column already exists)

-- Add logo column (essential for logo functionality)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo TEXT;

-- Add phone column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add address column  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Add timezone column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Belgrade';

-- Add language column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'eng';

-- Add auto_archive column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_archive BOOLEAN DEFAULT true;

-- Verify all columns were added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY column_name;

-- Success message
SELECT 'All columns should now be added to profiles table!' as status; 