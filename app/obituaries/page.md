# Obituaries Page (`/obituaries`)

## What this page does
Displays published obituaries as a coverflow carousel.

## Data fetch
```
Page mounts
    ↓
READ obituaries
  WHERE is_published = true
  ORDER BY created_at DESC
    ↓
For each obituary:
  image_path = 'obituaries/placeholder.png' → photoUrl = null
  image_path = real path                    → resolve public URL from storage
    ↓
setAllPublished(enriched)
```

## Slideshow behavior
```
ObituarySlideshow manages its own state:
  current = index of active card (starts at 0)
  auto-advance timer: every 5 seconds → current + 1

User clicks active card  → onSelect(obituary) → lightbox opens
User clicks side card    → go(i) → that card becomes active
Prev / Next buttons      → go(current ± 1) + reset timer
Thumbnail strip (desktop)→ go(i) + reset timer
Dot indicators (mobile)  → go(i) + reset timer
```

## Lightbox
```
selected != null → full-screen overlay appears
  Shows the TarpPreview at full size
Click backdrop or X → setSelected(null) → closes
```

## Submit Obituary modal
```
User clicks "Submit" button
    ↓
ObituarySubmitModal opens (manages its own form state)

User fills:
  - Deceased: first name, middle name, last name
  - Birth date, death date, age
  - Venue / wake address
  - Contact number
  - Submitter name + email (optional, for follow-up)
  - Photo upload (optional)

Live TarpPreview updates as they type

Submit clicked:
    ↓
Validation (required fields)
    ↓
Photo provided?
  YES → supabase.storage.upload('obituaries', photo)
  NO  → imagePath = 'obituaries/placeholder.png'
    ↓
INSERT obituaries {
  full_name, birth_date, death_date, age,
  image_path, venue_address, contact_number,
  submitter_name, submitter_email,
  is_published: false   ← need i approvee ng admin to 
  before maging visible dun sa live obituary slideshow
    ↓
Error?   → show error banner
Success  → show confirmation screen ("Obituary Submitted")
           Close button dismisses the modal
```

## Publish flow (admin side)
```
Obituary submitted by visitor (is_published = false)
    ↓
Admin sees it in Obituaries tab
Admin clicks "Publish"
    ↓
UPDATE obituaries SET is_published = true WHERE id = ?
    ↓
Obituary now appears in the public slideshow
```
