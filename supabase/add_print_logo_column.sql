-- Add print_logo_url column to profiles table for print logo functionality
-- This allows restaurants to have separate logos for header display vs print documents

-- Add the print_logo_url column to store URL of logo used in print/PDF documents
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS print_logo_url TEXT;

-- Add comment to explain the column purpose
COMMENT ON COLUMN profiles.print_logo_url IS 'URL of logo used specifically for printing receipts and PDF documents. Falls back to main logo if not set.';

-- Update any existing rows to have NULL print_logo_url (they will use fallback logic)
-- No action needed as new column will be NULL by default

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'print_logo_url'; 