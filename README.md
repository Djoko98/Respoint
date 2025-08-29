# Restaurant President

Desktop aplikacija za upravljanje rasporedom stolova i rezervacijama u restoranu.

## Pokretanje

1. Instaliraj zavisnosti:
   ```
   npm install
   ```
2. (Po potrebi) kopiraj `.env.example` u `.env` i izmeni vrednosti.
3. Pokreni aplikaciju:
   ```
   npm run dev
   ```
4. Otvoriće se Electron desktop aplikacija.

## Tehnologije
- Electron
- React + TypeScript + Vite
- TailwindCSS
- Context API + custom hooks
- localStorage persistence

## Struktura foldera
- `src/` - svi React komponenti, context-i, hook-ovi, tipovi, utili
- `electron/` - Electron main process
