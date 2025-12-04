-- Add logo_light_url column to profiles table for UI theme-specific header logo
-- This allows restaurants to set a separate logo for Light theme while keeping the original for Dark theme

-- Add the logo_light_url column to store URL used for light theme (header/UI)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS logo_light_url TEXT;

-- Document the purpose
COMMENT ON COLUMN profiles.logo_light_url IS 'URL of light-theme header logo. App shows this in Light theme; falls back to logo if not set.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'logo_light_url';

