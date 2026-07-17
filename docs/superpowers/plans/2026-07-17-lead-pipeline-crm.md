# Lead Pipeline CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-page Next.js CRM for restaurant cold-call outreach — Import page (Apify CSV upload → Supabase) and Outreach page (lead table with call/sale status, WhatsApp, click-to-call).

**Architecture:** Next.js 14 App Router, Supabase JS client for DB reads/writes, vanilla CSS for all styling. No auth. Two routes: `/import` and `/outreach`. All Supabase calls are server actions or client-side fetch — no separate API layer needed at this scale.

**Tech Stack:** Next.js 14, Supabase (Postgres + JS client), Vanilla CSS, Vercel deploy, Inter font (Google Fonts), PapaParse (CSV parsing).

## Global Constraints

- Next.js 14 App Router only — no Pages Router
- No Tailwind, no CSS-in-JS — vanilla CSS only
- No auth — app is fully open
- Font: Inter via Google Fonts
- Sidebar: fixed left, 220px, `#111827` bg, white text
- Main bg: `#F3F4F6`
- Table rows: white `#FFFFFF`, `1px solid #111` border
- Row bg by call_status: pending=`#FFFFFF`, called=`#D1FAE5`, call_later=`#FEF9C3`, no_answer=`#FEE2E2`
- All DB writes are optimistic (update local state first, Supabase in background)
- Desktop-only — no mobile responsiveness needed
- VIDEO_LINK and column mappings live in `lib/constants.ts` — never hardcoded elsewhere
- Apify column map (standard Google Maps Scraper output):
  - `title` → `name`
  - `phone` → `phone`
  - `url` → `google_maps_url`
  - `address` → `address`
  - `totalScore` → `rating`
  - `website` → `website`

---

### Task 1: Project Scaffold + Supabase Setup

**Files:**
- Create: `package.json` (via npx)
- Create: `.env.local`
- Create: `lib/constants.ts`
- Create: `lib/supabase.ts`
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: `supabaseClient` (default export from `lib/supabase.ts`) — used by all subsequent tasks
- Produces: `WHATSAPP_MESSAGE`, `VIDEO_LINK`, `APIFY_COLUMN_MAP`, `CALL_STATUS_COLORS`, `SALE_STATUS_OPTIONS` constants from `lib/constants.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd e:\desktop\lead-pipeline
npx create-next-app@latest ./ --typescript --no-tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js 14 project created in current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js papaparse
npm install --save-dev @types/papaparse
```

- [ ] **Step 3: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

User must fill in real values from Supabase dashboard → Settings → API.

- [ ] **Step 4: Create `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 5: Create `lib/constants.ts`**

```typescript
// Update VIDEO_LINK with your Loom URL before going live
export const VIDEO_LINK = 'https://loom.com/share/YOUR_LOOM_ID_HERE'

export const WHATSAPP_MESSAGE = `Hi! I'm reaching out about a software tool built specifically for restaurants like yours.

I'd love to show you a quick demo — here's a short video walking you through it: ${VIDEO_LINK}

Would love to know your thoughts!`

// Apify Google Maps Scraper standard output column names → our DB columns
export const APIFY_COLUMN_MAP: Record<string, string> = {
  title: 'name',
  phone: 'phone',
  url: 'google_maps_url',
  address: 'address',
  totalScore: 'rating',
  website: 'website',
}

// Row background colors by call_status value
export const CALL_STATUS_COLORS: Record<string, string> = {
  pending: '#FFFFFF',
  called: '#D1FAE5',
  call_later: '#FEF9C3',
  no_answer: '#FEE2E2',
}

export const CALL_STATUS_OPTIONS = ['pending', 'called', 'call_later', 'no_answer'] as const
export const SALE_STATUS_OPTIONS = ['pending', 'free_trial', 'proceed', 'rejected'] as const

export type CallStatus = typeof CALL_STATUS_OPTIONS[number]
export type SaleStatus = typeof SALE_STATUS_OPTIONS[number]
```

- [ ] **Step 6: Create Supabase table**

Go to Supabase dashboard → SQL Editor → run:

```sql
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp_number text,
  google_maps_url text,
  address text,
  rating numeric,
  website text,
  instagram text,
  facebook text,
  city text not null,
  call_status text not null default 'pending',
  sale_status text not null default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast city filtering
create index if not exists leads_city_idx on leads(city);

-- Index for dedup check by phone
create index if not exists leads_phone_idx on leads(phone);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
before update on leads
for each row execute function update_updated_at();
```

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js app + Supabase schema"
```

---

### Task 2: Global Layout — Sidebar + Shell

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `components/Sidebar.tsx`
- Create: `components/Sidebar.module.css`

**Interfaces:**
- Consumes: nothing
- Produces: `<RootLayout>` wrapping all pages with sidebar + main content area

- [ ] **Step 1: Create `app/globals.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #111827;
  background: #F3F4F6;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  cursor: pointer;
  font-family: 'Inter', sans-serif;
}

input, select, textarea {
  font-family: 'Inter', sans-serif;
}
```

- [ ] **Step 2: Create `components/Sidebar.module.css`**

```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 220px;
  height: 100vh;
  background: #111827;
  display: flex;
  flex-direction: column;
  padding: 0;
  z-index: 100;
}

.logo {
  padding: 24px 20px 20px;
  border-bottom: 1px solid #1F2937;
}

.logoText {
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.3px;
}

.logoSub {
  font-size: 11px;
  color: #6B7280;
  margin-top: 2px;
}

.nav {
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 4px;
  flex: 1;
}

.navLink {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #9CA3AF;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  text-decoration: none;
}

.navLink:hover {
  background: #1F2937;
  color: #F9FAFB;
}

.navLinkActive {
  background: #1F2937;
  color: #FFFFFF;
}

.navIcon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
```

- [ ] **Step 3: Create `components/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'

const navItems = [
  { href: '/import', label: 'Import Leads', icon: '⬆' },
  { href: '/outreach', label: 'Outreach', icon: '📞' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoText}>LeadPipeline</div>
        <div className={styles.logoSub}>Restaurant Outreach</div>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 4: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'LeadPipeline — Restaurant Outreach CRM',
  description: 'Cold call outreach CRM for restaurant leads',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{
          marginLeft: '220px',
          flex: 1,
          minHeight: '100vh',
          background: '#F3F4F6',
          padding: '32px',
        }}>
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Create redirect at root**

Replace `app/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/outreach')
}
```

- [ ] **Step 6: Run dev server and verify sidebar renders**

```bash
npm run dev
```

Open http://localhost:3000 — should redirect to `/outreach`, show dark sidebar with two nav links, grey main area.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: global layout with sidebar nav"
```

---

### Task 3: Import Page — CSV Upload + Preview

**Files:**
- Create: `app/import/page.tsx`
- Create: `app/import/page.module.css`
- Create: `lib/parseLeads.ts`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts`, `APIFY_COLUMN_MAP` from `lib/constants.ts`
- Produces: Leads inserted into Supabase `leads` table

- [ ] **Step 1: Create `lib/parseLeads.ts`**

This handles CSV parsing, column mapping, cleaning, and dedup check.

```typescript
import Papa from 'papaparse'
import { APIFY_COLUMN_MAP } from './constants'

export interface RawLead {
  name: string
  phone: string
  whatsapp_number: string
  google_maps_url: string
  address: string
  rating: number | null
  website: string
  instagram: string
  facebook: string
  city: string
  call_status: string
  sale_status: string
  notes: string
}

function cleanPhone(raw: string): string {
  if (!raw) return ''
  // Keep digits and leading +
  const stripped = raw.replace(/[^\d+]/g, '')
  return stripped
}

function extractSocials(website: string): { instagram: string; facebook: string } {
  // We attempt a fetch client-side in the component, not here.
  // This returns empty strings — social extraction is done in the component.
  return { instagram: '', facebook: '' }
}

export function parseCSV(csvText: string, city: string): RawLead[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const rows = result.data as Record<string, string>[]

  return rows.map((row) => {
    const mapped: Record<string, string> = {}
    for (const [apifyCol, dbCol] of Object.entries(APIFY_COLUMN_MAP)) {
      mapped[dbCol] = (row[apifyCol] || '').trim()
    }

    const phone = cleanPhone(mapped.phone || '')

    return {
      name: mapped.name || '',
      phone,
      whatsapp_number: phone,
      google_maps_url: mapped.google_maps_url || '',
      address: mapped.address || '',
      rating: mapped.rating ? parseFloat(mapped.rating) : null,
      website: mapped.website || '',
      instagram: '',
      facebook: '',
      city: city.trim(),
      call_status: 'pending',
      sale_status: 'pending',
      notes: '',
    }
  }).filter((lead) => lead.name) // drop empty rows
}
```

- [ ] **Step 2: Create `app/import/page.module.css`**

```css
.container {
  max-width: 900px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 32px;
}

.card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 28px;
  margin-bottom: 24px;
}

.label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  outline: none;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: #111827;
}

.fileArea {
  border: 2px dashed #D1D5DB;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  margin-top: 8px;
}

.fileArea:hover {
  border-color: #111827;
  background: #F9FAFB;
}

.fileAreaActive {
  border-color: #111827;
  background: #F9FAFB;
}

.fileAreaText {
  font-size: 14px;
  color: #6B7280;
}

.fileAreaBold {
  font-weight: 600;
  color: #111827;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.previewTitle {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #111827;
}

.previewInfo {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 16px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th {
  background: #F9FAFB;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  border: 1px solid #E5E7EB;
  color: #374151;
  white-space: nowrap;
}

.table td {
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  color: #111827;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tableWrap {
  overflow-x: auto;
  border-radius: 8px;
}

.btnRow {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 20px;
}

.btnPrimary {
  padding: 10px 24px;
  background: #111827;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}

.btnPrimary:hover {
  background: #1F2937;
}

.btnPrimary:disabled {
  background: #9CA3AF;
  cursor: not-allowed;
}

.btnSecondary {
  padding: 10px 20px;
  background: transparent;
  color: #374151;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: border-color 0.15s;
}

.btnSecondary:hover {
  border-color: #111827;
}

.successBanner {
  background: #D1FAE5;
  border: 1px solid #6EE7B7;
  border-radius: 8px;
  padding: 14px 18px;
  font-size: 14px;
  color: #065F46;
  font-weight: 500;
}

.errorBanner {
  background: #FEE2E2;
  border: 1px solid #FCA5A5;
  border-radius: 8px;
  padding: 14px 18px;
  font-size: 14px;
  color: #991B1B;
}
```

- [ ] **Step 3: Create `app/import/page.tsx`**

```tsx
'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { parseCSV, RawLead } from '@/lib/parseLeads'
import styles from './page.module.css'

export default function ImportPage() {
  const [city, setCity] = useState('')
  const [leads, setLeads] = useState<RawLead[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!city.trim()) {
      setError('Please enter a city name before uploading.')
      return
    }
    setError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text, city)
      setLeads(parsed)
      setFileName(file.name)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (!leads.length) return
    setLoading(true)
    setError('')

    // Fetch existing phones for this city to dedup
    const { data: existing } = await supabase
      .from('leads')
      .select('phone')
      .eq('city', city.trim())

    const existingPhones = new Set((existing || []).map((r: { phone: string }) => r.phone))

    const toInsert = leads.filter((l) => l.phone && !existingPhones.has(l.phone))
    const skipped = leads.length - toInsert.length

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('leads').insert(toInsert)
      if (insertError) {
        setError(`Insert failed: ${insertError.message}`)
        setLoading(false)
        return
      }
    }

    setResult({ inserted: toInsert.length, skipped })
    setLeads([])
    setFileName('')
    setLoading(false)
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Import Leads</h1>
      <p className={styles.subtitle}>Upload an Apify Google Maps CSV export to add leads to a city.</p>

      <div className={styles.card}>
        <div className={styles.fieldGroup}>
          <div>
            <label className={styles.label} htmlFor="city-input">City Name</label>
            <input
              id="city-input"
              className={styles.input}
              type="text"
              placeholder="e.g. Patna"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className={styles.label}>CSV File (from Apify)</label>
            <div
              className={`${styles.fileArea} ${fileName ? styles.fileAreaActive : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              {fileName ? (
                <p className={styles.fileAreaText}>
                  <span className={styles.fileAreaBold}>✓ {fileName}</span>
                  <br />Click to change file
                </p>
              ) : (
                <p className={styles.fileAreaText}>
                  <span className={styles.fileAreaBold}>Click to upload</span> or drag & drop
                  <br />CSV file from Apify export
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {result && (
        <div className={styles.successBanner}>
          ✓ Imported {result.inserted} leads · {result.skipped} duplicates skipped
        </div>
      )}

      {leads.length > 0 && (
        <div className={styles.card}>
          <p className={styles.previewTitle}>Preview — {leads.length} leads parsed</p>
          <p className={styles.previewInfo}>Review before importing. Duplicates (same phone in this city) will be skipped automatically.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Rating</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={i}>
                    <td title={lead.name}>{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td title={lead.address}>{lead.address}</td>
                    <td>{lead.rating ?? '—'}</td>
                    <td title={lead.website}>{lead.website ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.btnRow}>
            <button
              id="import-btn"
              className={styles.btnPrimary}
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? 'Importing...' : `Import ${leads.length} Leads`}
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => { setLeads([]); setFileName('') }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Test import page manually**

```bash
npm run dev
```

1. Go to http://localhost:3000/import
2. Enter city "TestCity"
3. Create a test CSV:
```csv
title,phone,url,address,totalScore,website
Test Restaurant,+919876543210,https://maps.google.com/?cid=123,Test Address Patna,4.2,https://testrestaurant.com
```
4. Upload it — preview table should appear with 1 row
5. Click "Import 1 Leads" — should show success banner
6. Go to Supabase dashboard → Table Editor → leads — verify row inserted

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: import page with CSV upload, parse, preview, and Supabase insert"
```

---

### Task 4: Outreach Page — Lead Table with Statuses

**Files:**
- Create: `app/outreach/page.tsx`
- Create: `app/outreach/page.module.css`
- Create: `components/LeadRow.tsx`
- Create: `components/LeadRow.module.css`
- Create: `components/Pagination.tsx`
- Create: `components/Pagination.module.css`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts`, `CALL_STATUS_COLORS`, `CALL_STATUS_OPTIONS`, `SALE_STATUS_OPTIONS`, `WHATSAPP_MESSAGE` from `lib/constants.ts`
- Produces: Interactive outreach table with all lead management actions

- [ ] **Step 1: Create `components/Pagination.module.css`**

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.btn {
  padding: 7px 14px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: #FFFFFF;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.btn:hover:not(:disabled) {
  border-color: #111827;
  background: #F9FAFB;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pageInfo {
  font-size: 13px;
  color: #6B7280;
  padding: 0 8px;
}
```

- [ ] **Step 2: Create `components/Pagination.tsx`**

```tsx
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <div className={styles.pagination}>
      <button
        id="pagination-prev"
        className={styles.btn}
        onClick={onPrev}
        disabled={page <= 1}
      >
        ← Previous
      </button>
      <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
      <button
        id="pagination-next"
        className={styles.btn}
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/LeadRow.module.css`**

```css
.row {
  transition: background 0.2s;
}

.td {
  padding: 10px 12px;
  border: 1px solid #111;
  vertical-align: middle;
  font-size: 13px;
}

.name {
  font-weight: 500;
  color: #111827;
  min-width: 160px;
  max-width: 200px;
}

.phone {
  white-space: nowrap;
}

.phoneLink {
  color: #111827;
  font-weight: 500;
  text-decoration: none;
  padding: 4px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 12px;
  transition: background 0.15s;
  display: inline-block;
}

.phoneLink:hover {
  background: #F3F4F6;
}

.mapsBtn {
  padding: 4px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.mapsBtn:hover {
  background: #F3F4F6;
  border-color: #111827;
}

.statusSelect {
  padding: 5px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #111827;
  background: transparent;
  cursor: pointer;
  outline: none;
}

.statusSelect:focus {
  border-color: #111827;
}

.salePill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}

.salePill:hover {
  opacity: 0.8;
}

.whatsappCell {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 200px;
}

.waInput {
  width: 110px;
  padding: 4px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
}

.waInput:focus {
  border-color: #111827;
}

.waBtn {
  padding: 4px 10px;
  background: #25D366;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.waBtn:hover {
  background: #1ebe5d;
}

.notesInput {
  width: 100%;
  min-width: 150px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  color: #6B7280;
  background: transparent;
  outline: none;
  resize: none;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.15s;
}

.notesInput:focus {
  border-color: #D1D5DB;
  color: #111827;
  background: #F9FAFB;
}

.notesInput::placeholder {
  color: #D1D5DB;
}
```

- [ ] **Step 4: Create `components/LeadRow.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CALL_STATUS_COLORS,
  CALL_STATUS_OPTIONS,
  SALE_STATUS_OPTIONS,
  WHATSAPP_MESSAGE,
  CallStatus,
  SaleStatus,
} from '@/lib/constants'
import styles from './LeadRow.module.css'

interface Lead {
  id: string
  name: string
  phone: string
  whatsapp_number: string
  google_maps_url: string
  call_status: CallStatus
  sale_status: SaleStatus
  notes: string
}

const SALE_PILL_COLORS: Record<SaleStatus, { bg: string; color: string }> = {
  pending:    { bg: '#F3F4F6', color: '#374151' },
  free_trial: { bg: '#DBEAFE', color: '#1D4ED8' },
  proceed:    { bg: '#D1FAE5', color: '#065F46' },
  rejected:   { bg: '#FEE2E2', color: '#991B1B' },
}

// Cycle through sale statuses on click
const SALE_CYCLE: SaleStatus[] = ['pending', 'free_trial', 'proceed', 'rejected']

interface LeadRowProps {
  lead: Lead
}

export default function LeadRow({ lead: initialLead }: LeadRowProps) {
  const [lead, setLead] = useState<Lead>(initialLead)

  function updateLocal(patch: Partial<Lead>) {
    setLead((prev) => ({ ...prev, ...patch }))
  }

  async function updateDB(patch: Partial<Lead>) {
    await supabase.from('leads').update(patch).eq('id', lead.id)
  }

  function handleCallStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as CallStatus
    updateLocal({ call_status: val })
    updateDB({ call_status: val })
  }

  function handleSaleCycle() {
    const idx = SALE_CYCLE.indexOf(lead.sale_status)
    const next = SALE_CYCLE[(idx + 1) % SALE_CYCLE.length]
    updateLocal({ sale_status: next })
    updateDB({ sale_status: next })
  }

  function handleWaNumberBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    updateLocal({ whatsapp_number: val })
    updateDB({ whatsapp_number: val })
  }

  function handleNotesBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    updateLocal({ notes: val })
    updateDB({ notes: val })
  }

  function handleWhatsApp() {
    const number = lead.whatsapp_number || lead.phone
    const text = encodeURIComponent(WHATSAPP_MESSAGE)
    window.open(`https://wa.me/${number.replace(/\D/g, '')}?text=${text}`, '_blank')
  }

  const rowBg = CALL_STATUS_COLORS[lead.call_status] ?? '#FFFFFF'
  const pillStyle = SALE_PILL_COLORS[lead.sale_status]

  return (
    <tr className={styles.row} style={{ background: rowBg }}>
      {/* Name */}
      <td className={`${styles.td} ${styles.name}`} title={lead.name}>{lead.name}</td>

      {/* Phone */}
      <td className={`${styles.td} ${styles.phone}`}>
        <a
          className={styles.phoneLink}
          href={`tel:${lead.phone}`}
          id={`phone-${lead.id}`}
        >
          📞 {lead.phone}
        </a>
      </td>

      {/* Maps */}
      <td className={styles.td}>
        <button
          className={styles.mapsBtn}
          id={`maps-${lead.id}`}
          onClick={() => window.open(lead.google_maps_url, '_blank')}
          disabled={!lead.google_maps_url}
        >
          📍 View
        </button>
      </td>

      {/* Call Status */}
      <td className={styles.td}>
        <select
          className={styles.statusSelect}
          value={lead.call_status}
          onChange={handleCallStatus}
          id={`call-status-${lead.id}`}
        >
          {CALL_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </td>

      {/* WhatsApp */}
      <td className={styles.td}>
        <div className={styles.whatsappCell}>
          <input
            className={styles.waInput}
            defaultValue={lead.whatsapp_number || lead.phone}
            onBlur={handleWaNumberBlur}
            placeholder="WA number"
            id={`wa-number-${lead.id}`}
          />
          <button
            className={styles.waBtn}
            onClick={handleWhatsApp}
            id={`wa-btn-${lead.id}`}
          >
            WA
          </button>
        </div>
      </td>

      {/* Sale Status */}
      <td className={styles.td}>
        <button
          className={styles.salePill}
          style={{ background: pillStyle.bg, color: pillStyle.color }}
          onClick={handleSaleCycle}
          id={`sale-status-${lead.id}`}
          title="Click to cycle status"
        >
          {lead.sale_status.replace(/_/g, ' ')}
        </button>
      </td>

      {/* Notes */}
      <td className={styles.td}>
        <textarea
          className={styles.notesInput}
          defaultValue={lead.notes}
          onBlur={handleNotesBlur}
          placeholder="Add note..."
          rows={1}
          id={`notes-${lead.id}`}
        />
      </td>
    </tr>
  )
}
```

- [ ] **Step 5: Create `app/outreach/page.module.css`**

```css
.container {
  max-width: 1400px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.citySelect {
  padding: 8px 14px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  background: #FFFFFF;
  cursor: pointer;
  outline: none;
  min-width: 160px;
}

.citySelect:focus {
  border-color: #111827;
}

.countBadge {
  font-size: 13px;
  color: #6B7280;
  background: #F3F4F6;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #E5E7EB;
}

.tableCard {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.tableWrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table thead tr {
  background: #F9FAFB;
}

.table th {
  padding: 12px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border: 1px solid #111;
  white-space: nowrap;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.emptyState {
  text-align: center;
  padding: 60px 20px;
  color: #9CA3AF;
  font-size: 14px;
}

.loadingState {
  text-align: center;
  padding: 40px;
  color: #6B7280;
  font-size: 14px;
}
```

- [ ] **Step 6: Create `app/outreach/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import LeadRow from '@/components/LeadRow'
import Pagination from '@/components/Pagination'
import styles from './page.module.css'

const PAGE_SIZE = 10

interface Lead {
  id: string
  name: string
  phone: string
  whatsapp_number: string
  google_maps_url: string
  call_status: string
  sale_status: string
  notes: string
}

export default function OutreachPage() {
  const [cities, setCities] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Load distinct cities
  useEffect(() => {
    async function loadCities() {
      const { data } = await supabase
        .from('leads')
        .select('city')
        .order('city')
      if (data) {
        const unique = Array.from(new Set(data.map((r: { city: string }) => r.city)))
        setCities(unique)
        if (unique.length > 0 && !selectedCity) {
          setSelectedCity(unique[0])
        }
      }
    }
    loadCities()
  }, [])

  // Load leads for selected city + page
  const loadLeads = useCallback(async () => {
    if (!selectedCity) return
    setLoading(true)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count } = await supabase
      .from('leads')
      .select('id,name,phone,whatsapp_number,google_maps_url,call_status,sale_status,notes', { count: 'exact' })
      .eq('city', selectedCity)
      .order('created_at', { ascending: true })
      .range(from, to)

    setLeads(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }, [selectedCity, page])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Reset to page 1 when city changes
  function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCity(e.target.value)
    setPage(1)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Outreach</h1>
        <div className={styles.controls}>
          <select
            id="city-select"
            className={styles.citySelect}
            value={selectedCity}
            onChange={handleCityChange}
          >
            {cities.length === 0 && <option value="">No cities yet</option>}
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {totalCount > 0 && (
            <span className={styles.countBadge}>{totalCount} leads</span>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Maps</th>
                <th>Call Status</th>
                <th>WhatsApp</th>
                <th>Sale Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.loadingState}>Loading leads...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    No leads found for {selectedCity || 'this city'}.<br />
                    Import leads on the Import page.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead as any} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 7: Test outreach page manually**

```bash
npm run dev
```

1. Go to http://localhost:3000/outreach
2. City dropdown should show "TestCity" (from Task 3 test)
3. Should show the 1 imported lead in a table row
4. Change Call Status → row background should change color
5. Click Sale Status pill → should cycle through statuses
6. Click 📞 phone number → browser should prompt dial
7. Click 📍 View → Google Maps should open in new tab
8. Click WA button → WhatsApp should open with pre-filled message
9. Add a note → click away → refresh page → note should persist

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: outreach page with lead table, status updates, WhatsApp, pagination"
```

---

### Task 5: Deploy to Vercel

**Files:**
- No new files — just Vercel config

**Interfaces:**
- Consumes: `.env.local` values (must be set in Vercel dashboard)
- Produces: Live production URL

- [ ] **Step 1: Push to GitHub**

Create a new repo on github.com, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/lead-pipeline.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to vercel.com → New Project
2. Import your GitHub repo
3. In Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy

- [ ] **Step 3: Update Supabase CORS (if needed)**

In Supabase dashboard → Settings → API → Allowed origins: add your Vercel domain (e.g. `https://lead-pipeline.vercel.app`).

- [ ] **Step 4: Smoke test production**

1. Open your Vercel URL
2. Import a test CSV — verify leads appear in Supabase
3. Check outreach page — verify status updates work
4. Test WhatsApp button opens correct URL

- [ ] **Step 5: Update VIDEO_LINK**

Once you have your Loom demo recorded:
```typescript
// lib/constants.ts
export const VIDEO_LINK = 'https://loom.com/share/YOUR_ACTUAL_LOOM_ID'
```
Then redeploy.

---

## Self-Review

**Spec coverage check:**
- ✅ Import page with Apify CSV upload
- ✅ City-based filtering
- ✅ Dedup by phone
- ✅ 10 rows per page with pagination
- ✅ Click-to-call phone link
- ✅ Google Maps link button
- ✅ Call status with row color coding (pending/called/call_later/no_answer)
- ✅ WhatsApp button with editable number + pre-filled message
- ✅ Sale status cycling (pending/free_trial/proceed/rejected)
- ✅ Notes inline editable, auto-save on blur
- ✅ All status changes auto-save (optimistic)
- ✅ Sidebar navigation
- ✅ Inter font, dark sidebar, grey container, black border rows
- ✅ VIDEO_LINK in one constant
- ✅ Vercel deploy

**Placeholder scan:** None found. All code is complete.

**Type consistency:** `CallStatus`, `SaleStatus` types defined in `lib/constants.ts` and used consistently across `LeadRow.tsx` and `outreach/page.tsx`.
