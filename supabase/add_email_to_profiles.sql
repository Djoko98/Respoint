-- Dodavanje email kolone u profiles i popunjavanje iz auth.users
-- Pokreni ovaj skript u Supabase SQL editoru JEDNOM.

-- 1) Dodaj kolonu ako već ne postoji
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2) Popuni email vrednostima iz auth.users za postojeće naloge
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 3) Opcioni check
SELECT id, email
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;


