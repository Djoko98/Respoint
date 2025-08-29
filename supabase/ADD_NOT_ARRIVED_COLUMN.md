# SQL Uputstvo za dodavanje not_arrived_reservations kolone

## Koraci za izvršavanje u Supabase Dashboard-u

1. Idite na SQL Editor u Supabase Dashboard-u
2. Izvršite sledeće SQL komande redom:

### 1. Dodavanje nove kolone `not_arrived_reservations`
```sql
-- Dodavanje nove kolone
ALTER TABLE statistics
ADD COLUMN not_arrived_reservations integer DEFAULT 0;
```

### 2. Preimenovanje `arrived_guests` u `arrived_reservations`
```sql
-- Preimenovanje kolone
ALTER TABLE statistics
RENAME COLUMN arrived_guests TO arrived_reservations;
```

### 3. Ažuriranje postojećih podataka
```sql
-- Ažuriranje podataka za novu kolonu (računa se kao: total - cancelled - arrived)
UPDATE statistics
SET not_arrived_reservations = GREATEST(0, total_reservations - cancelled_reservations - arrived_reservations);
```

### 4. (Opciono) Kreiranje trigger-a za automatsko ažuriranje
```sql
-- Kreiranje funkcije koja automatski izračunava not_arrived_reservations
CREATE OR REPLACE FUNCTION calculate_not_arrived_reservations()
RETURNS TRIGGER AS $$
BEGIN
    NEW.not_arrived_reservations := GREATEST(0, NEW.total_reservations - NEW.cancelled_reservations - NEW.arrived_reservations);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Kreiranje trigger-a
CREATE TRIGGER statistics_calculate_not_arrived
BEFORE INSERT OR UPDATE ON statistics
FOR EACH ROW
EXECUTE FUNCTION calculate_not_arrived_reservations();
```

## Napomene

- `arrived_reservations` sada predstavlja broj rezervacija koje su stigle (ne broj gostiju)
- `not_arrived_reservations` predstavlja broj rezervacija koje nisu ni otkazane ni stigle
- TypeScript kod je već ažuriran da koristi nova imena polja 