-- Setup script for restaurant logo storage
-- Run this in Supabase SQL Editor to set up the storage bucket and policies

-- 1. Create the storage bucket for restaurant logos
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'restaurant-logos',
  'restaurant-logos', 
  true, 
  false, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS policies for the bucket
-- Path structure: logos/{restaurantId}/logo.{ext}

-- Allow users to upload logos to their own restaurant folder
CREATE POLICY "Users can upload own restaurant logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-logos' AND 
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow users to update their own restaurant logos
CREATE POLICY "Users can update own restaurant logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'restaurant-logos' AND 
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow users to delete their own restaurant logos
CREATE POLICY "Users can delete own restaurant logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'restaurant-logos' AND 
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow public access to view all restaurant logos
CREATE POLICY "Public can view restaurant logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-logos');

-- 3. Add missing columns to profiles table (run only if needed)
-- Check first with check_profiles_columns.sql to see which columns exist

-- Add logo column if not exists (required for logo functionality)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'logo') THEN
        ALTER TABLE profiles ADD COLUMN logo TEXT;
        RAISE NOTICE 'Added logo column';
    ELSE
        RAISE NOTICE 'Logo column already exists';
    END IF;
END $$;

-- Add optional columns (these will make Account Settings work fully)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE profiles ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'timezone') THEN
        ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'Europe/Belgrade';
        RAISE NOTICE 'Added timezone column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'language') THEN
        ALTER TABLE profiles ADD COLUMN language TEXT DEFAULT 'eng';
        RAISE NOTICE 'Added language column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'auto_archive') THEN
        ALTER TABLE profiles ADD COLUMN auto_archive BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added auto_archive column';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN profiles.logo IS 'URL to restaurant logo stored in Supabase Storage';

-- Success message
SELECT 'Restaurant logo storage setup completed successfully!' as message; 