# Supabase Setup za ResPoint

## Pristup

**Supabase je izvor istine** - Sva schema izmene se rade direktno u Supabase Dashboard-u, a aplikacija je alinirana sa live schema strukturom.

## Koraci za pristup bazi podataka

1. **Prijavite se na Supabase Dashboard**
   - Idite na: https://supabase.com/dashboard
   - Prijavite se na vaš projekat

2. **Schema je već postavljen**
   - Sve tabele su kreirarane direktno u Supabase
   - Aplikacija koristi TypeScript tipove koji su alinirni sa live schema

3. **Za izmene schema**
   - Koristite Supabase Dashboard (Table Editor ili SQL Editor)
   - Nakon izmena, update-ujte TypeScript tipove u aplikaciji

## Trenutna struktura baze podataka

### Tabela `profiles`
- `id` - UUID (primarni ključ, povezan sa auth.users)
- `updated_at` - Timestamp with time zone
- `name` - Text (ime korisnika)
- `restaurant_name` - Text (naziv restorana)
- `role` - Text (uloga korisnika)
- `logo` - Text (URL loga za header prikaz, opciono)
- `logo_light_url` - Text (URL za svetlu temu, opciono; ako nema, koristi `logo`)
- `print_logo_url` - Text (URL loga za štampanje i PDF dokumente, opciono)
- `phone` - Text (telefon, opciono)
- `address` - Text (adresa, opciono)
- `timezone` - Text (vremenska zona, opciono)
- `language` - Text (jezik aplikacije, opciono)
- `auto_archive` - Boolean (automatsko arhiviranje starih rezervacija, opciono)

### Tabela `reservations`
- `id` - UUID (primarni ključ)
- `user_id` - UUID (strani ključ)
- `zone_id` - Text (ID zone)
- `guest_name` - Text (ime gosta)
- `date` - Text (datum rezervacije)
- `time` - Text (vreme rezervacije)
- `number_of_guests` - Integer (broj gostiju)
- `table_ids` - JSONB (lista ID-jeva stolova)
- `phone` - Text (telefon, opciono)
- `email` - Text (email, opciono)
- `notes` - Text (napomene, opciono)
- `color` - Text (boja rezervacije, opciono)
- `status` - Text (status rezervacije)
- `created_at` - Timestamp with time zone
- `updated_at` - Timestamp with time zone

### Tabela `zones`
- `id` - UUID (primarni ključ)
- `name` - Text (naziv zone)
- `created_at` - Timestamp with time zone
- `color` - Text (boja zone, opciono)
- `updated_at` - Timestamp with time zone
- `order` - Integer (redosled zona)
- `user_id` - UUID (strani ključ)

### Tabela `layouts`
- `id` - UUID (primarni ključ)
- `user_id` - UUID (strani ključ)
- `zone_id` - UUID (strani ključ)
- `name` - Text (naziv layout-a)
- `data` - JSONB (podaci o layout-u)
- `is_active` - Boolean (da li je aktivan)
- `created_at` - Timestamp with time zone
- `updated_at` - Timestamp with time zone

### Tabela `saved_layouts`
- `id` - UUID (primarni ključ)
- `user_id` - UUID (strani ključ)
- `zone_id` - UUID (strani ključ)
- `name` - Text (naziv sačuvanog layout-a)
- `layout` - JSONB (podaci o layout-u)
- `is_default` - Boolean (da li je podrazumevani)
- `created_at` - Timestamp with time zone
- `updated_at` - Timestamp with time zone

### Tabela `zone_layouts`
- `id` - UUID (primarni ključ)
- `user_id` - UUID (strani ključ)
- `zone_id` - Text (ID zone)
- `layout` - JSONB (podaci o layout-u)
- `updated_at` - Timestamp with time zone

### Tabela `statistics`
- `id` - UUID (primarni ključ)
- `user_id` - UUID (strani ključ)
- `date` - Date (datum statistike)
- `total_reservations` - Integer (ukupan broj rezervacija)
- `total_guests` - Integer (ukupan broj gostiju)
- `arrived_guests` - Integer (broj gostiju koji su stigli)
- `cancelled_reservations` - Integer (broj otkazanih rezervacija)
- `revenue` - Numeric (prihod)
- `created_at` - Timestamp with time zone
- `updated_at` - Timestamp with time zone

### Tabela `subscription_plans`
- `id` - UUID (primarni ključ)
- `name` - Text (naziv plana)
- `price` - Numeric (cena)
- `features` - JSONB (lista funkcionalnosti)
- `max_reservations` - Integer (maksimalan broj rezervacija, opciono)
- `max_zones` - Integer (maksimalan broj zona, opciono)
- `created_at` - Timestamp with time zone
- `updated_at` - Timestamp with time zone

### Tabela `user_subscriptions`
- `id` - UUID (primarni ključ)
- `user_id` - UUID (strani ključ)
- `plan_id` - UUID (strani ključ)
- `status` - Text (status pretplate)
- `starts_at` - Timestamp with time zone (početak pretplate, opciono)
- `ends_at` - Timestamp with time zone (kraj pretplate, opciono)
- `created_at` - Timestamp with time zone
- `updated_at` - Timestamp with time zone

## Sigurnosne postavke

- **Row Level Security (RLS)** je omogućen na svim tabelama
- Korisnici mogu videti i menjati samo svoje podatke
- Automatski trigger kreira profil korisnika nakon registracije

## Environment varijable

Dodajte sledeće u vaš `.env` fajl:

```
VITE_SUPABASE_URL=https://jxqqptqlvtmlyuaiijvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cXFwdHFsdnRtbHl1YWlpanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyMzkyNjMsImV4cCI6MjA2NTgxNTI2M30.qCuYHdUr-7iQZZPof_R8AznMy2jJ0nrKXOY4IXf2oiE
```

## Testiranje

1. Registrujte novog korisnika kroz aplikaciju
2. Proverite da li je profil automatski kreiran u `profiles` tabeli
3. Kreirajte test rezervaciju
4. Proverite da li se rezervacija pojavljuje u `reservations` tabeli

## Razvoj

- Aplikacija koristi TypeScript tipove koji su aliniranje sa Supabase schema
- Sve izmene schema se rade u Supabase Dashboard-u
- Migration fajlovi se ne koriste - Supabase je izvor istine

## Print Logo Funkcionalnost

### Kolona `print_logo_url` u `profiles` tabeli

Dodana je nova kolona za specijalizovani logo koji se koristi samo za štampanje:

```sql
-- Dodaj kolonu za print logo
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS print_logo_url TEXT;
```

### Logo Prioritet u Štampanju

1. **Ako postoji `print_logo_url`** - koristi se za print dokumente
2. **Ako ne postoji `print_logo_url`** - koristi se osnovni `logo`
3. **Ako nijedan logo ne postoji** - prikazuje se bez loga

### Storage Organizacija

```
restaurant-logos bucket:
├── logos/{user_id}/
│   ├── logo.{ext}        # Header logo
│   └── print-logo.{ext}  # Print logo (novo)
```

## Light/Dark Logo (Header) Funkcionalnost

### Kolona `logo_light_url` u `profiles` tabeli

Dodata je kolona za logo koji se koristi kada je aplikacija u svetloj temi. Ako nije postavljen, aplikacija koristi osnovni `logo`.

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS logo_light_url TEXT;
```

### Storage Organizacija (header logo)

```
restaurant-logos bucket:
├── logos/{user_id}/
│   ├── logo.{ext}         # Header logo (tamna tema)
│   └── logo-light.{ext}   # Header logo (svetla tema)
```

### Komponente Uključene

- **AccountSettings**: Upload i manage print logo
- **ReservationPrintPreview**: Koristi print logo za štampanje
- **StorageService**: Upload/delete print logo fajlova 