-- Script to check which columns exist in profiles table
-- Run this in Supabase SQL Editor to see current table structure

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- This will show you exactly which columns exist in your profiles table 