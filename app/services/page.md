# Services Pages

---

## Services Index (`/services`)

### What it does
Lists the 3 main service categories. Mobile shows a snap carousel with auto-advance; desktop shows a 3-column grid.

### Logic
```
useEffect on mount:
  setInterval every 3 seconds
    → scroll the mobile carousel to the next card
    → loops back to 0 after the last card

Dot buttons → manually scroll to that card index

No database calls. Fully static.
```

### Services listed
- Traditional Burial → `/services/traditional`
- Cremation Services → `/services/cremation`
- Columbarium → `/columbarium`

---

## Traditional Burial (`/services/traditional`)

### What it does
List nung 5 burial packages with inclusions, reservation CTA and tarp submission floww.

### Packages
| Package | Price |
|---|---|
| OMB | ₱25,000 |
| Half Glass | ₱35,000 |
| JR Full Glass | ₱47,000 |
| SR Full Glass | ₱57,000 |
| Ordinary Metal | ₱75,000 |

### Reserve button
```
Links to:
/billing?product=package&label=Traditional+Burial+Package
for pre-filling form
    ↓
Billing page picks up the params and pre-fills the form
```

### ObituaryForm (at the bottom)
```
Standalone form component — user fills deceased info + uploads photo
INSERT obituaries { ..., is_published: false }
Admin reviews and publishes from admin panel
```

### No auth required
Anyone can view packages. Billing page handles auth.

---

## Cremation Services (`/services/cremation`)

### What it does
Shows the cremation service rate, a grid of available urns, and CTAs to reserve.

### Service rate
₱25,000 — links to `/billing?product=cremation&label=Cremation+Service&price=25000`

### Urns available
| Urn | Price |
|---|---|
| Wooden | ₱3,500 |
| Black Metal | ₱3,500 |
| Gray Metal | ₱5,500 |
| Brown Metal | ₱15,000 |
| Blue Metal | ₱15,000 |
| White Marble | ₱5,500 |

Each urn links to `/billing?product=urn&label=...&price=...`

On the billing page, urn purchases show a toggle:
```
Include ₱25,000 cremation service fee? 'nakalagay sa figma'
  ON  → total = urn price + ₱25,000
  OFF → urn only
```
