# Soft Delete Functionality 🗑️

## Pregled

Implementirana je "soft delete" funkcionalnost za rezervacije koje omogućava da se finalized rezervacije "obrišu" iz UI prikaza ali da ostanu u bazi podataka za potrebe statistika i izveštaja.

## Kako funkcioniše

### 1. Database Schema
```sql
-- Nova kolona u reservations tabeli
ALTER TABLE reservations ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
```

### 2. Tipovi rezervacija
```typescript
interface ReservationDB {
  // ... ostala polja ...
  is_deleted?: boolean; // boolean for soft delete
}

interface Reservation {
  // ... ostala polja ...
  isDeleted?: boolean; // For soft delete
}
```

### 3. Service funkcije

**reservationsService.getAll()**
- Filtrira rezervacije sa `is_deleted = true`
- UI prikazuje samo aktivne rezervacije

**reservationsService.softDeleteReservation()**
- Postavlja `is_deleted = true`
- Rezervacija se uklanja iz UI ali ostaje u bazi

**statisticsService.updateDailyStatistics()**
- Broji SVE rezervacije (uključujući obrisane)
- Statistike ostaju tačne

### 4. UI Behavior

#### Finalized rezervacije (arrived/not_arrived):
- **Dugme**: "Delete reservation" (umesto "Cancel reservation")
- **Akcija**: Poziva `softDeleteReservation()`
- **Rezultat**: Rezervacija nestaje iz UI ali ostaje u statistikama

#### Regularne rezervacije (waiting/confirmed):
- **Dugme**: "Cancel reservation"
- **Akcija**: Postavlja `status = 'cancelled'`
- **Rezultat**: Rezervacija se prebacuje u "Closed" tab

### 5. Filtering Logic

```typescript
// UI queries - filtriraju obrisane
.neq('is_deleted', true)

// Statistics queries - uključuju sve
// Nema filtriranje po is_deleted
```

## Prednosti

1. **Čuva podatke** - Rezervacije se ne gube trajno
2. **Tačne statistike** - Svi podaci ostaju za analitiku
3. **Čist UI** - Korisnici ne vide obrisane rezervacije
4. **Reverzibilno** - Mogućnost vraćanja ako je potrebno

## SQL Migracija

Pokrenite jednu od sledećih SQL skripti:
- `supabase/add_is_deleted_column.sql` 
- `supabase/migrations/003_add_is_deleted_column.sql`

## Testiranje

1. **Kreirajte rezervaciju**
2. **Označite kao "arrived" ili "not_arrived"**
3. **Otvorite edit modal** - trebalo bi da vidite "Delete reservation"
4. **Kliknite Delete** - rezervacija nestaje iz UI
5. **Proverite Analytics** - rezervacija se i dalje broji u statistikama

## Tehnička implementacija

### ReservationForm.tsx
```typescript
// Za finalized rezervacije
const confirmDelete = async () => {
  await reservationsService.softDeleteReservation(editReservation.id, user.id);
  onClose();
};
```

### reservationsService.ts
```typescript
async softDeleteReservation(id: string, userId: string) {
  await supabase
    .from('reservations')
    .update({ is_deleted: true })
    .eq('id', id)
    .eq('user_id', userId);
}
```

## Napomene

- **Soft delete** se koristi SAMO za finalized rezervacije
- **Cancel** funkcionalnost ostaje za regularne rezervacije
- **Statistics** broje sve rezervacije bez obzira na is_deleted flag
- **UI** filtrira obrisane rezervacije iz svih prikaza 