# AccountSettings - Performance Optimization

## Rešeni Problemi

### 1. Logo Upload Problem ✅
- **Problem**: Logo se nije ažuriravao odmah nakon upload-a zbog keša browsera
- **Rešenje**: 
  - Dodato `?v=${Date.now()}` timestamp na URL za izbegavanje keša
  - Dodato `key` prop na img element za forsirane re-render
  - Optimizovana logika za čišćenje URL-a pre čuvanja u bazu

### 2. Performance Problem ✅  
- **Problem**: Komponenta od 815 linija sa previše re-render-a
- **Rešenje**:
  - **Podela u sekcije**: Kreiran RestaurantInfoSection, OwnerInfoSection, ContactInfoSection, PreferencesSection, AdvancedOptionsSection
  - **React.memo**: Sve sekcije koriste memo za prevenciju nepotrebnih re-render-a
  - **useCallback**: Sve funkcije su optimizovane sa useCallback 
  - **useMemo**: Timezone options su memoized
  - **Lokalizovan state**: Svaka sekcija ima svoj lokalni state (npr. showPasswords)

## Struktura Komponenti

```
AccountSettings/
├── AccountSettings.tsx          # Glavna komponenta (optimizovana)
├── RestaurantInfoSection.tsx    # Logo upload + restaurant name
├── OwnerInfoSection.tsx         # Owner info + password change  
├── ContactInfoSection.tsx       # Phone, address, timezone
├── PreferencesSection.tsx       # Language, auto-archive
├── AdvancedOptionsSection.tsx   # Export data, deactivate account
└── README.md                    # Ova dokumentacija
```

## Ključne Optimizacije

1. **Logo Upload Fix**:
   - `logoKey` state forsirava re-render img elementa
   - Timestamp na URL izbegava browser keš
   - Čišćenje URL-a pre čuvanja u bazu

2. **Performance**:
   - Komponente su podeljene na logičke celine
   - React.memo prevencija nepotrebnih render-a
   - useCallback za stabilne funkcije
   - useMemo za teške kalkulacije

3. **State Management**:
   - Glavni state ostaje u AccountSettings
   - Lokalni state (showPasswords) u relevantnim sekcijama
   - Optimized dependency arrays u useEffect

## Rezultat

- ✅ Logo se odmah prikazuje posle upload-a
- ✅ Bolje performanse bez lagovanja
- ✅ Čist i održiv kod podelen u logičke celine
- ✅ Memoized komponente i funkcije 