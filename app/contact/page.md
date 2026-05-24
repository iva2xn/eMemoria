# Contact Page (`/contact`)

## What this page does
Shows contact details and a message form. Visitors can send an inquiry that goes straight into the database for staff to review.

## Layout
```
Mobile:  form stacked below map
Desktop: map on left, form on right (2-col grid)

Contact details bar:
  Mobile  → collapsible dropdown (closed by default)
  Desktop → 4-column divider row (always visible)
```

## Submit flow
```
User fills name, email, subject, message → clicks Send
      ↓
Validation: name, email, message required
      ↓
INSERT inquiries {
  name, email, subject, message,
  is_read: false  (default)
}
      ↓
Error?   → show error banner
Success  → show success state ("Message Received")
           clear the form fields
           "Send another message" link resets back to the form
```

## Subjects available
- Funeral Package Inquiry
- Pre-planning Memorial Schemes
- Custom Chapel Altar Details
- Columbarium Reservation
- General Inquiry

## What happens after submission
```
Inquiry saved in DB with is_read = false
      ↓
Admin sees it in the Inquiries tab (admin panel)
Unread dot shows green, read dot shows grey
Admin expands it → is_read flips to true
Admin can reply via the "Reply via Email" button
  (opens mailto: link with subject pre-filled)
```

## No auth required
Anyone can submit a contact form — no login needed.
