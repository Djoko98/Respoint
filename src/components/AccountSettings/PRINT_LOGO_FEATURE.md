# Print Logo Feature 🖨️

## Nova Funkcionalnost
Dodana je mogućnost upload-a posebnog "Print Logo" koji se koristi **samo za štampanje rezervacija** (u PDF-u ili PrintView komponenti).

## Šta je Dodato ✅

### 1. User Interface Updates

**User Type (`src/types/user.ts`):**
```typescript
export interface User {
  // ... existing fields ...
  logo?: string; // Header display logo
  printLogoUrl?: string; // Print/PDF logo (new field)
}
```

### 2. Database & Storage

**AuthService (`src/services/authService.ts`):**
- Dodato `print_logo_url` field u `UserProfile` interface
- Ažurirana `updateProfile` funkcija da čuva print logo URL

**StorageService (`src/services/storageService.ts`):**
- `uploadPrintLogo()` - Upload print logo fajla
- `deletePrintLogo()` - Brisanje print logo fajla
- Koristi `print-logo.{ext}` naming convention

**UserContext (`src/context/UserContext.tsx`):**
- Čita `printLogoUrl` iz profile podataka
- Postavlja u user state

### 3. Account Settings UI

**RestaurantInfoSection (`src/components/AccountSettings/RestaurantInfoSection.tsx`):**
```tsx
// Dodano novo polje za print logo
<div>
  <label>Print Logo (Receipts & Print Documents)</label>
  <div className="flex items-start gap-4">
    <div className="w-24 h-24 preview">
      {printLogoUrl ? <img src={printLogoUrl} /> : <NoLogoIcon />}
    </div>
    <div>
      <button onClick={uploadPrintLogo}>Upload Print Logo</button>
      <button onClick={removePrintLogo}>Remove Print Logo</button>
    </div>
  </div>
</div>
```

**AccountSettings (`src/components/AccountSettings/AccountSettings.tsx`):**
- `printLogoUrl` u formData state
- `isPrintLogoUploading` state
- `handlePrintLogoUpload()` funkcija
- `handleRemovePrintLogo()` funkcija
- Čuva u bazu kao `print_logo_url`

### 4. Print Integration

**ReservationPrintPreview (`src/components/ReservationPrintPreview/ReservationPrintPreview.tsx`):**
```tsx
// Smart logo selection - print logo ima prioritet
const logoUrl = user?.printLogoUrl || user?.logo;

// Koristi u print HTML-u i preview-u
{logoUrl && <img src={logoUrl} alt="Restaurant" />}
```

## Kako Funkcioniše 🔄

### Upload Process:
1. **User klkne "Upload Print Logo"** u Account Settings
2. **File se upload-uje** u Supabase Storage (`logos/{userId}/print-logo.{ext}`)
3. **URL se čuva** u `print_logo_url` kolonu u profiles tabeli
4. **FormData se ažurira** sa timestamped URL za cache-busting
5. **Preview se prikazuje** odmah u UI

### Print Process:
1. **User otvara Print Preview** za rezervaciju
2. **Sistema proverava** da li postoji `user.printLogoUrl`
3. **Logo prioritet**: `printLogoUrl` > `logo` > none
4. **Prikazuje se** u print dokumentu i preview-u

## File Structure 📁

```
Supabase Storage:
├── restaurant-logos/
│   └── logos/{userId}/
│       ├── logo.{ext}        # Header logo
│       └── print-logo.{ext}  # Print logo (new)
```

## Database Schema

```sql
-- profiles table
ALTER TABLE profiles 
ADD COLUMN print_logo_url TEXT;
```

## UI Flow

### Account Settings:
```
┌─────────────────────────────────────┐
│ Restaurant Information              │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Restaurant Logo (Header Display)│ │ 
│ │ [Preview] [Upload] [Remove]     │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Print Logo (Receipts & Print)   │ │ <- NEW
│ │ [Preview] [Upload] [Remove]     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Print Preview:
```
┌─────────────────────────────────────┐
│        [PRINT LOGO]                 │ <- Uses printLogoUrl
│     Restaurant Name                 │    if available
│     Address                         │
│     ─────────────────               │
│     RESERVATION                     │
│     Guest: John Doe                 │
│     Date: Dec 25                    │
│     Time: 19:00h                    │
│     ─────────────────               │
└─────────────────────────────────────┘
```

## Benefits

- ✅ **Separate logos**: Header vs Print optimization
- ✅ **Better print quality**: Optimized logo za štampanje
- ✅ **Fallback logic**: Koristi header logo ako print logo nije postavljen
- ✅ **Cache-busting**: Instant preview updates
- ✅ **File management**: Automatic storage handling
- ✅ **UI consistency**: Isti stil kao postojeći logo upload

## Usage

1. **Idi u Account Settings**
2. **Scroll to "Print Logo" sekciju**
3. **Upload PNG/JPG** (max 5MB)
4. **Save Changes**
5. **Test u Print Preview** - trebalo bi da koristi novi print logo 