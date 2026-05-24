# Tarp Generator — Technical Explanation

How the memorial tarpaulin preview works, from the input fields to the rendered output.

---

## What is a tarp?

A "tarp" (tarpaulin) in this context is a printed memorial banner displayed at a wake. It shows the deceased's name, birth and death dates, age, photo, venue address, and a contact number.

The system generates a **live preview** of this tarp directly in the browser as the user types — no server, no image processing library, just HTML and CSS.

---

## The TarpPreview component

**File:** `components/ui/tarp-preview.tsx`

This is a pure display component. It takes props and renders a styled div that looks like a printed tarp.

```typescript
interface TarpPreviewProps {
  firstName:     string
  middleName:    string
  lastName:      string
  birthDate:     string   // "YYYY-MM-DD" or empty
  deathDate:     string   // "YYYY-MM-DD" or empty
  age:           string | number
  photoUrl:      string | null
  venueAddress:  string
  contactNumber: string
}
```

---

## How the live preview works

The preview is connected directly to the form's state variables. Every keystroke updates the state, which re-renders the component.

```
User types in "First Name" field
        ↓
setFirstName(e.target.value)
        ↓
React re-renders TarpPreview with new firstName prop
        ↓
Preview updates instantly — no button click needed
```

This is standard React controlled inputs. The "live" feel comes from the fact that the preview is rendered right next to the form.

---

## Where the tarp preview appears

| Location | Purpose |
|---|---|
| `/obituaries` → Submit modal | Public submission — visitor fills in deceased info |
| `/billing` → ObituaryModal | After a package payment — client fills tarp details |
| `/services/traditional` → ObituaryForm | Standalone form on the traditional burial page |
| `/admin` → Obituaries tab → Edit panel | Admin edits an existing obituary with live preview |
| `/admin` → Obituaries tab → Create Tarp modal | Admin creates a new tarp directly |
| `/admin` → Obituaries tab → Card grid | Mini tarp previews for each obituary record |

---

## Date formatting

Dates are stored as `YYYY-MM-DD` strings in the database. The tarp displays them in a human-readable format.

```
Input:  "1952-03-15"
Output: "March 15, 1952"

Input:  "" (empty)
Output: "" (nothing shown)
```

The formatting happens inside `TarpPreview` using JavaScript's `Date` object and `toLocaleDateString`.

---

## Photo handling

Photos are stored in Supabase Storage under the `obituaries` bucket.

```
Upload flow:
  User selects a photo file
        ↓
  setPhotoPreview(URL.createObjectURL(file))
        ↓
  TarpPreview receives photoUrl = the local blob URL
        ↓
  Preview shows the photo immediately (before upload)
        ↓
  On form submit:
    supabase.storage.from('obituaries').upload(path, file)
        ↓
  imagePath saved to the obituaries table
        ↓
  On next load, public URL resolved from storage:
    supabase.storage.from('obituaries').getPublicUrl(imagePath)
```

If no photo is provided, `imagePath` defaults to `'obituaries/placeholder.png'` and `photoUrl` is `null`. The tarp renders without a photo in that case.

**PNG with transparent background is recommended** because the tarp has a background image/color, and a transparent PNG lets the deceased's photo blend in naturally.

---

## Tarp layout structure (simplified)

```
┌─────────────────────────────────────────┐
│           [Background / gradient]        │
│                                          │
│         In Loving Memory of              │
│                                          │
│    ┌──────────┐   FIRST NAME             │
│    │          │   MIDDLE NAME            │
│    │  PHOTO   │   LAST NAME              │
│    │          │                          │
│    └──────────┘   Born: March 15, 1952   │
│                   Died: June 3, 2024     │
│                   Age: 72                │
│                                          │
│    📍 Venue Address                      │
│    📞 Contact Number                     │
└─────────────────────────────────────────┘
```

---

## Saving to the database

When the form is submitted, the obituary is saved with `is_published: false`. This means:

- It does **not** appear on the public `/obituaries` page yet
- It shows up in the admin panel under the Obituaries tab
- An admin must click "Publish" to make it live

This gives the funeral home staff a chance to review and correct any details before the tarp goes public.

---

## Admin edit with live preview

In the admin panel's Obituaries tab, clicking "Edit" on a record opens a split panel:

```
Left side:  editable input fields
Right side: TarpPreview (updates as admin types)

Save button → UPDATE obituaries SET ... WHERE id = ?
```

The name is split back into first/middle/last for editing:

```
"Juan Santos Dela Cruz"
        ↓
parts = ["Juan", "Santos", "Dela", "Cruz"]
firstName  = "Juan"
lastName   = "Cruz"
middleName = "Santos Dela"
```

On save, they're joined back:
```
[firstName, middleName, lastName].filter(Boolean).join(' ')
→ "Juan Santos Dela Cruz"
```
