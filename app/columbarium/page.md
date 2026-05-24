# Columbarium Page (`/columbarium`)

## What this page does
Shows the full columbarium slot grid. Visitors can browse available niches, click a slot to see details, and reserve or inquire about it.

## Data fetch
```
Page mounts
    ↓
READ columbarium_slots
  ORDER BY row_number, col_number
    ↓
setSlots(data)   → grid renders
setLoading(false)
```

## Grid layout
```
6 rows × 12 columns = 72 slots total

Row 1 → Top Level         ₱25,000
Row 2 → Eye Level (Upper) ₱35,000
Row 3 → Eye Level (Lower) ₱25,000
Row 4 → Upper Bottom      ₱20,000
Row 5 → Lower Bottom      ₱20,000
Row 6 → Ground Level      ₱20,000

Color coding:
  Green  (#4CAF50) = available  → clickable
  Yellow (#FFC107) = reserved   → clickable (shows info only)
  Red    (#F44336) = occupied   → disabled
```

## Slot click flow
```
User clicks a slot
    ↓
setModal(slot) → SlotModal appears

SlotModal shows:
  - slot code (e.g. R2C05)
  - level name
  - column number
  - price
  - occupant name (if occupied)

Status = available →
  "Reserve" button → /billing?product=columbarium&slot=R2C05&level=...&price=35000
  "Inquire" button → /contact?slot=R2C05&action=inquire

Status = reserved  → info message only
Status = occupied  → info message only

Click backdrop or X → setModal(null) → modal closes
```

## No writes on this page
This page is read-only for visitors. Slot status is only changed by admins from the admin panel.

## Info blocks (above the grid)
- **How to Use** — static instructions
- **Legend + live counts** — counts come from the fetched slots array (no extra query)
- **Pricing** — static rates per row
