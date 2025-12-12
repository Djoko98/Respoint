-- Events & Event reservations schema for ResPoint
-- Run this script in Supabase SQL editor once to create supporting tables for the Event mode.

------------------------------------------------------------
-- 1) EVENTS TABLE
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  -- Same string date format as reservations.date (YYYY-MM-DD)
  date text NOT NULL,
  -- Event time window (24h format HH:MM)
  start_time text NOT NULL,
  end_time text NOT NULL,
  -- Total capacity (number of seats for entire event)
  capacity_total integer,
  -- Optional list of zone ids that belong to this event (jsonb text[] style)
  zone_ids jsonb,
  -- Deposit settings
  enable_deposit boolean NOT NULL DEFAULT false,
  -- 'fixed' = same amount per reservation, 'per_person' = amount per guest
  deposit_type text NOT NULL DEFAULT 'fixed',
  deposit_amount numeric(10,2),
  -- Ticket / entrance fee settings
  enable_ticket boolean NOT NULL DEFAULT false,
  ticket_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional FK to profiles / auth user (keep loose to avoid migration issues)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_user_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.events
        ADD CONSTRAINT events_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN undefined_table THEN
        -- If profiles table name changes, just skip FK – RLS will still protect rows
        NULL;
    END;
  END IF;
END$$;

-- Keep deposit_type constrained to known values
ALTER TABLE public.events
  ADD CONSTRAINT events_deposit_type_check
  CHECK (deposit_type IN ('fixed','per_person'))
  NOT VALID;

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_events_user_date
  ON public.events(user_id, date);

CREATE INDEX IF NOT EXISTS idx_events_date
  ON public.events(date);

------------------------------------------------------------
-- 2) EVENT_RESERVATIONS TABLE
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  -- User owner (mirrors events.user_id for RLS)
  user_id uuid NOT NULL,
  guest_name text NOT NULL,
  phone text,
  email text,
  notes text,
  -- Denormalised date/time for easier filtering & analytics
  date text NOT NULL,
  time text NOT NULL,
  number_of_guests integer NOT NULL,
  zone_id text,
  table_ids jsonb,
  -- Unique reservation code used for check‑in & search
  reservation_code text NOT NULL UNIQUE,
  -- Payment tracking for deposit / ticket
  payment_status text NOT NULL DEFAULT 'unpaid',
  deposit_required numeric(10,2),
  deposit_paid numeric(10,2),
  ticket_price numeric(10,2),
  ticket_paid numeric(10,2),
  -- Logical status of the reservation within the event
  status text NOT NULL DEFAULT 'booked',
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- FK to events (cascade delete event reservations when event is removed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_reservations_event_id_fkey'
  ) THEN
    ALTER TABLE public.event_reservations
      ADD CONSTRAINT event_reservations_event_id_fkey
      FOREIGN KEY (event_id)
      REFERENCES public.events(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Optional loose FK to profiles for clarity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_reservations_user_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.event_reservations
        ADD CONSTRAINT event_reservations_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;
END$$;

-- Keep payment_status constrained to supported values
ALTER TABLE public.event_reservations
  ADD CONSTRAINT event_reservations_payment_status_check
  CHECK (payment_status IN ('unpaid','partial','paid','not_required'))
  NOT VALID;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_event_reservations_event_id
  ON public.event_reservations(event_id);

CREATE INDEX IF NOT EXISTS idx_event_reservations_user_code
  ON public.event_reservations(user_id, reservation_code);

CREATE INDEX IF NOT EXISTS idx_event_reservations_date
  ON public.event_reservations(date);

------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reservations ENABLE ROW LEVEL SECURITY;

-- Users can fully manage ONLY their own events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Users can manage own events'
  ) THEN
    DROP POLICY "Users can manage own events" ON public.events;
  END IF;

  CREATE POLICY "Users can manage own events" ON public.events
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END$$;

-- Users can manage ONLY reservations that belong to their events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_reservations'
      AND policyname = 'Users can manage own event reservations'
  ) THEN
    DROP POLICY "Users can manage own event reservations" ON public.event_reservations;
  END IF;

  CREATE POLICY "Users can manage own event reservations" ON public.event_reservations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END$$;

-- Convenience check
SELECT 'Events & event_reservations tables are ready' AS status;


