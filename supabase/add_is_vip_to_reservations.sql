-- Add loyalty flag to reservations so VIP badge persists across refreshes
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;

-- Optional: backfill can be done later if you plan to link guestbook entries by name/phone
-- UPDATE public.reservations r
-- SET is_vip = true
-- FROM public.guestbook g
-- WHERE (r.guest_name = g.name OR r.phone = g.phone) AND COALESCE(g.is_vip, false) = true;


