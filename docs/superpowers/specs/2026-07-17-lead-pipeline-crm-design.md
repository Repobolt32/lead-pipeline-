# Lead Pipeline CRM — Design Spec
*2026-07-17*

## Overview

A personal CRM for cold-calling restaurant owners sourced from Google Maps (via Apify exports). Solo use. Two-page app with a sidebar nav. Goal: 50–100 calls/day with minimum friction.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (Postgres) |
| Styling | Vanilla CSS (no Tailwind) |
| Deploy | Vercel |
| Auth | None (solo use) |

---

## Supabase Schema

### Table: `leads`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | auto-generated |
| `name` | text | Restaurant name |
| `phone` | text | Primary phone (click-to-call) |
| `whatsapp_number` | text | Defaults to `phone`, editable inline |
| `google_maps_url` | text | Full Maps link |
| `address` | text | Full address |
| `rating` | numeric | e.g. 4.2 |
| `website` | text | Website URL (nullable) |
| `instagram` | text | IG link if found (nullable) |
| `facebook` | text | FB link if found (nullable) |
| `city` | text | City name (for filtering) |
| `call_status` | text | `pending` \| `called` \| `call_later` \| `no_answer` |
| `sale_status` | text | `pending` \| `free_trial` \| `rejected` \| `proceed` |
| `notes` | text | Free text, nullable |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto |

---

## Pages

### 1. Import Page (`/import`)

**Purpose:** Upload Apify CSV export → clean → store to Supabase.

**Flow:**
1. User selects city name (text input)
2. User uploads CSV file (from Apify Google Maps scraper export)
3. App parses CSV and maps these Apify columns:
   - `title` → `name`
   - `phone` → `phone` (strip non-digits, keep + prefix)
   - `url` → `google_maps_url`
   - `address` → `address`
   - `totalScore` → `rating`
   - `website` → `website`
   - `categoryName` → ignored
4. **Cleaning rules:**
   - Deduplicate by phone number (skip if phone already exists in DB for that city)
   - Strip whitespace from all fields
   - If `website` exists, extract social links: scan for `instagram.com` or `facebook.com` in the website's HTML — store in `instagram` / `facebook` columns
   - `whatsapp_number` defaults to same as `phone`
5. Show preview table of cleaned rows before insert
6. "Import X leads" confirm button → bulk insert to Supabase
7. Show success count + skipped duplicates count

**Note on social scraping:** Parsing the website for social links is a best-effort client-side fetch. If CORS blocks it, store null silently — no errors shown to user.

---

### 2. Outreach Page (`/outreach`)

**Purpose:** Work through leads city by city, make calls, log outcomes, send WhatsApp.

**Layout:**
- City dropdown at top (populated from distinct `city` values in DB)
- Table of leads filtered by selected city
- 10 rows per page, pagination controls at bottom (Previous / Page N of M / Next)
- Light grey container background (`#F3F4F6`)
- Table rows: white background (`#FFFFFF`), black border (`1px solid #111`)
- Sticky table header

**Table Columns (left to right):**

| # | Column | Details |
|---|---|---|
| 1 | **Name** | Restaurant name, plain text |
| 2 | **Phone** | Clickable `tel:` link → triggers phone dialer |
| 3 | **Maps** | "View" button → opens Google Maps URL in new tab |
| 4 | **Call Status** | Dropdown or pill buttons (see statuses below) |
| 5 | **WhatsApp** | Button → opens WhatsApp (see below) |
| 6 | **Sale Status** | Dropdown or pill buttons (see statuses below) |
| 7 | **Notes** | Inline editable text field, muted style |

**Call Status options + row background colors:**

| Status | Row BG Color |
|---|---|
| `pending` | White `#FFFFFF` |
| `called` | Light green `#D1FAE5` |
| `call_later` | Light yellow `#FEF9C3` |
| `no_answer` | Light red `#FEE2E2` |

**Sale Status options:**

| Status | Display |
|---|---|
| `pending` | Grey pill |
| `free_trial` | Blue pill |
| `proceed` | Green pill |
| `rejected` | Red pill |

**WhatsApp Button behavior:**
- Default number: `whatsapp_number` (same as `phone` by default)
- Inline editable number field next to the button (pre-filled with `whatsapp_number`)
- On click: opens `https://wa.me/{number}?text={encodedMessage}` in new tab
- The WhatsApp message template (hardcoded):

```
Hi, I'm reaching out about a software tool built specifically for restaurants like yours. 
I'd love to show you a quick demo — here's a short video walking you through it: [VIDEO_LINK]

Would love to know your thoughts!
```

*(VIDEO_LINK is a hardcoded constant in the codebase — easy to update in one place)*

**Status updates:**
- All status changes auto-save to Supabase on change (no Save button)
- Notes auto-save on blur (click away)
- WhatsApp number edits auto-save on blur

---

## UI Design System

- **Font:** Inter (Google Fonts)
- **Sidebar:** Fixed left sidebar, 220px wide, dark background (`#111827`), white text
- **Sidebar nav items:** Import, Outreach
- **Main content area:** Light grey `#F3F4F6`
- **Table container:** White card with subtle shadow, black border rows
- **Buttons:** Solid, minimal — black primary, white secondary
- **Page title:** Shown in top bar of main content

---

## Constraints / Rules

- No auth — app is open, single user
- No per-city lead limit — import as many as Apify returns
- All status updates are instant (optimistic UI — update local state first, then Supabase in background)
- Mobile is NOT a priority — desktop-only layout
- No email/SMS — WhatsApp only
- VIDEO_LINK constant lives in `lib/constants.ts`

---

## Out of Scope (v1)

- Scheduling / calendar reminders
- Analytics / dashboards
- Multi-user / team support
- Export to CSV
- Twilio or auto-dialer integration
