# SSCalendar

A minimal, collaborative Instagram Stories planner. Black & white. Real-time. No login.

## Stack

- **React 18** — UI
- **Supabase** — Database + real-time subscriptions
- **Vite** — Build tool
- **vite-plugin-pwa** — PWA / installable on mobile

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Open **SQL Editor** and run the contents of `supabase_schema.sql`
3. Copy your **Project URL** and **anon/public API key** from:
   `Project Settings → API`

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Install & run

```bash
npm install
npm run dev
```

### 4. Build for production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## PWA Icons

Generate PNG icons from `public/icons/icon.svg`:

**Option A — Online:**
1. Open `public/icons/icon.svg` in a browser
2. Screenshot and export at 192×192 and 512×512
3. Save as `public/icons/icon-192.png` and `public/icons/icon-512.png`

**Option B — CLI (requires sharp or Inkscape):**
```bash
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-192.png resize 192 192
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-512.png resize 512 512
```

**Option C — realfavicongenerator.net:**
Upload `icon.svg` → download PNG package → place icons in `public/icons/`

---

## Features

- **Monthly calendar overview** with per-day story progress
- **Day view** with story editor, categories, drag-to-reorder
- **Real-time sync** — all users see changes instantly via Supabase channels
- **No authentication** — just enter your name once (saved in localStorage)
- **"Last edited by"** on every story card
- **PWA** — installable on iOS/Android from browser

---

## Project Structure

```
sscalendar/
├── public/
│   └── icons/
│       ├── icon.svg         ← source icon
│       ├── icon-192.png     ← generate from SVG
│       └── icon-512.png     ← generate from SVG
├── src/
│   ├── main.jsx             ← React entry point
│   ├── App.jsx              ← entire app (single file)
│   └── supabaseClient.js    ← Supabase singleton
├── .env.example             ← copy to .env and fill in
├── supabase_schema.sql      ← run in Supabase SQL editor
├── vite.config.js
├── index.html
└── package.json
```

---

## Supabase Real-time Notes

The app subscribes to two channels:
- `month-YYYY-MM` — tracks inserts/updates/deletes for the whole month (updates day card progress)
- `day-YYYY-MM-DD` — fine-grained updates inside the day view

Text edits are debounced 600ms before hitting Supabase to avoid flooding.
A subtle pulsing dot appears on a story card while its save is in flight.
