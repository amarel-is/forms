# FormCraft

A minimal, beautiful forms & surveys platform built with Next.js 16, Supabase, and shadcn/ui.

## Features

- **Form Builder** — drag-and-drop field reordering, live panel editor
- **Field types** — Text, Dropdown (single-select), Multi-select
- **Publish/Draft** — toggle visibility with a single click
- **Public fill page** — shareable link, no login required
- **Results dashboard** — response table + per-field stats with bar charts
- **Auth** — email/password via Supabase Auth

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database & Auth | Supabase |
| UI Components | shadcn/ui (New York style) |
| Styling | Tailwind CSS v4 |
| Drag-and-drop | @dnd-kit |
| Form state | React Hook Form |

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the schema

In your Supabase SQL Editor, run the contents of [`supabase/schema.sql`](./supabase/schema.sql).

### 3. Configure environment variables

Edit `.env.local` with your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase project → **Settings → API**.

### 4. Run the dev server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App Routes

| Route | Description |
|-------|-------------|
| `/login` | Sign in / Sign up |
| `/dashboard` | Your forms grid |
| `/forms/new` | Create a new form |
| `/forms/[id]` | Edit form (builder) |
| `/forms/[id]/results` | View responses & stats |
| `/f/[id]` | Public form fill page |

## Database Schema

### `forms`
```
id, user_id, name, description, fields (jsonb), settings (jsonb), is_published, created_at, updated_at
```

### `responses`
```
id, form_id, data (jsonb), submitted_at
```

### Field JSON shape
```ts
{
  id: string
  type: "text" | "dropdown" | "multiselect"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]   // for dropdown/multiselect
}
```
