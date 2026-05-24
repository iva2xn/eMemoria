# Home Page (`/`)

## What this page does
Landing page. Shows the hero section, a services slider, and a featured services preview. Also handles the post-payment success toast.

## Components used
- `HeroSection` — hero image, headline, CTA buttons, infinite services slider
- `FeaturedServices` — placeholder grid of 4 service cards

## Logic

### Payment success toast
```
URL has ?payment=success
        ↓
setShowToast(true)
router.replace('/') ← cleans the URL without reload
        ↓
Toast shows for 6 seconds, then auto-dismisses
User can also click X to dismiss early
```

### No CRUD
This page is read-only. No database calls.

---

## Data flow
```
User lands on /
      ↓
Check URL params (useSearchParams)
      ↓
?payment=success → show toast
no param         → render normally
```
