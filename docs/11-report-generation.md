# Report Generation — Technical Explanation

How the Sales Report feature works, from the filters to the exported files.

---

## Overview

The Sales Report is a modal inside the admin Overview tab. It lets admins filter payment records by date, status, product type, and payment method — then export the results as a CSV or PDF.

Everything runs **in the browser**. No server-side rendering, no backend endpoint. The data comes from Supabase, and the files are generated and downloaded client-side.

---

## How the data is fetched

```typescript
// Base query — always filters by date range
let q = supabase
  .from('payments')
  .select('id, created_at, approved_at, guest_name, guest_email,
           product_type, product_ref, method, reference_number,
           amount, status, notes')
  .gte('created_at', `${dateFrom}T00:00:00`)
  .lte('created_at', `${dateTo}T23:59:59`)
  .order('created_at', { ascending: false })

// Optional filters — only added if not 'all'
if (statusFilt !== 'all') q = q.eq('status', statusFilt)
if (product    !== 'all') q = q.eq('product_type', product)
if (method     !== 'all') q = q.eq('method', method)
```

The query is rebuilt and re-run every time a filter changes (via `useCallback` + `useEffect`).

---

## Summary stats (computed from the results, no extra query)

Once the rows are fetched, all the summary numbers are calculated in JavaScript:

```
totalRevenue  = sum of amount WHERE status = 'approved'
totalPending  = sum of amount WHERE status = 'pending'
approvedCount = count WHERE status = 'approved'
pendingCount  = count WHERE status = 'pending'
rejectedCount = count WHERE status = 'rejected'

byProduct = group approved rows by product_type, sum amounts
byMethod  = group approved rows by method, sum amounts
```

No extra database queries — it's all derived from the one fetch.

---

## CSV Export

CSV (Comma-Separated Values) is a plain text format that opens in Excel or Google Sheets.

```
How it works:

1. Define the column headers as an array
2. Map each payment row to an array of values
3. Join each row with commas
4. Join all rows with newlines
5. Create a Blob (binary large object) from the string
6. Create a temporary download link
7. Trigger a click on it → browser downloads the file
8. Clean up the URL object
```

```typescript
const csv = [headers, ...csvRows].map(row => row.join(',')).join('\n')
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
const url  = URL.createObjectURL(blob)
const a    = document.createElement('a')
a.href     = url
a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`
a.click()
URL.revokeObjectURL(url)
```

No library needed — this is built-in browser functionality.

---

## PDF Export

PDF generation uses two libraries:
- **jsPDF** — creates the PDF document and draws shapes/text
- **jspdf-autotable** — adds the transactions table automatically

Both are loaded with **dynamic import** so they're not bundled into the initial page load:

```typescript
const { default: jsPDF }     = await import('jspdf')
const { default: autoTable } = await import('jspdf-autotable')
```

This means the ~200KB library only downloads when the admin actually clicks "Export as PDF".

---

## PDF layout structure

```
┌─────────────────────────────────────────────────────────┐
│  [Green header band]                                     │
│  [Logo]  M. P. GAYETA          Sales Report             │
│          Funeral Services                  Generated: .. │
├─────────────────────────────────────────────────────────┤
│  [Light green band]                                      │
│  Period: ... | Status: ... | Product: ... | Method: ...  │
├─────────────────────────────────────────────────────────┤
│  [Summary boxes — 5 across]                              │
│  Total Revenue | Approved | Pending Amt | Pending | Txns │
├─────────────────────────────────────────────────────────┤
│  [Transactions table]                                    │
│  Date | Client | Email | Product | Ref | Method | ...    │
│  ─────────────────────────────────────────────────────  │
│  row 1                                                   │
│  row 2                                                   │
│  ...                                                     │
│  ─────────────────────────────────────────────────────  │
│  TOTAL (APPROVED)                    PHP X,XXX.XX        │
├─────────────────────────────────────────────────────────┤
│  M. P. Gayeta Funeral Services · Confidential · Page 1  │
└─────────────────────────────────────────────────────────┘
```

The logo is fetched from `/logo.png` and embedded as a base64 image. If the fetch fails, the PDF still generates — the logo is optional.

---

## Quick date presets

The filter panel has preset buttons that set the date range instantly:

| Preset | From | To |
|---|---|---|
| Today | today | today |
| This Week | last Sunday | today |
| This Month | 1st of current month | today |
| Last Month | 1st of last month | last day of last month |
| This Year | Jan 1 of current year | today |

These are computed from `new Date()` at the time the modal opens.

---

## Export dropdown (split button)

The Export button is a split button:
- Left half → exports CSV immediately
- Right half (chevron) → opens a dropdown with "Export as CSV" and "Export as PDF"

The dropdown closes when you click outside it (handled by a `mousedown` event listener on `document`).

---

## Why client-side generation?

- **No server needed** — Vercel's free tier has no persistent server, so server-side PDF generation would require a separate service
- **Fast** — the data is already in memory from the fetch, no round-trip needed
- **Private** — the PDF is generated locally and never uploaded anywhere
- **Simple** — fewer moving parts, easier to maintain
