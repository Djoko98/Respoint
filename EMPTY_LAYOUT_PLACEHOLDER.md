# Empty Layout Placeholder

## Pregled Funkcionalnosti

Kada korisnik uđe u zonu koja nema nijedan kreirani layout, prikazuje se elegantna placeholder komponenta koja poziva na akciju.

## Izgled Komponente

### Vizuelni Elementi:
1. **Plus Ikonica** - Velika SVG ikonica (48x48px) unutar kruga
   - Krug: 96x96px sa sivom pozadinom (#1F2937)
   - Border: 2px siva (#374151) koja prelazi u tamniju na hover
   - Ikonica: Siva boja (#6B7280)

2. **Primarni Tekst** - "Add Default Layout"
   - Font: 18px, medium weight
   - Boja: Siva (#9CA3AF)

3. **Sekundarni Tekst** - "Click to start designing your layout"
   - Font: 14px
   - Boja: Tamnija siva (#6B7280)

### Animacije:
- **Fade-in** animacija pri učitavanju (0.4s)
- **Hover efekat** na celoj komponenti (opacity: 0.8)
- **Transition** na border boji kruga

## Tehnički Detalji

### Uslovi za Prikaz:
Placeholder se prikazuje samo kada su ispunjeni SVI sledeći uslovi:
1. Postoji trenutna zona (`currentZone` je definisan)
2. Korisnik NIJE u edit modu (`!isEditing`)
3. NE postoje saved layouts za trenutnu zonu (`savedLayouts[currentZone.id].length === 0`)
4. Trenutni layout je prazan:
   - Nema stolova (`layout.tables.length === 0`)
   - Nema zidova (`layout.walls.length === 0`)
   - Nema tekstova (`layout.texts.length === 0`)

### Funkcionalnost:
- **Klik na komponentu** poziva `toggleEditMode()` funkciju
- Korisnik automatski ulazi u edit mod za kreiranje layouta
- Komponenta nestaje čim se uđe u edit mod

## CSS Animacija

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
```

## Pointer Events

- Glavni kontejner ima `pointerEvents: 'none'` da ne blokira canvas
- Unutrašnja komponenta ima `pointerEvents: 'auto'` da omogući klik
- Ovo omogućava da samo placeholder bude klikabilan, ne ceo canvas

## Integracija sa Postojećim Sistemom

- Placeholder se automatski sakriva kada:
  1. Korisnik uđe u edit mod
  2. Kreira se prvi element u layoutu
  3. Učita se saved layout
  4. Promeni se zona

- Kompatibilan sa:
  - Automatskim učitavanjem default layouta
  - Undo/Redo sistemom
  - Saved layouts funkcionalnostima 