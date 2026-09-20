# School Events Hub

A digital command center for school events — announcements, an interactive
calendar, registrations, and tickets, all in one place with live updates.

Built with **Astro** (static output) + **React islands** + **Tailwind CSS v4**,
backed by **Supabase** (Postgres, Auth, Row-Level Security, Realtime),
hosted on **Cloudflare Pages**.

## Features

- **Home** — hero with countdown to the next event, featured event cards,
  announcements preview, and your registrations at a glance.
- **Calendar** — switchable month/list view, per-category filter and search,
  custom personal reminders you can drag onto a day, and a sidebar pool of
  "date TBD" events you registered for — drag one onto the calendar and we
  keep it linked, so when the official date is announced you get a one-time
  reminder popup.
- **Event pages** — category, date/venue, countdown, live capacity bar,
  register or ticket CTA, and a **Realtime**-powered live-highlights feed.
- **Announcements** — a feed posted by teachers and admins, with links to
  related events.
- **Tickets** — buyable ticketed events (simulated) and your ticket wallet,
  each with a scannable QR code.
- **Dashboard** — a personalized week view: welcome message, day-of-week bar
  that defaults to the day of your next registered event, up to three
  registered-event cards per day with "show more", and the latest
  announcements.
- **Admin** — role-gated control room: teachers manage events, post
  announcements, and broadcast live highlights; admins additionally manage
  teachers and control the site-wide dark/light theme.

## Roles

Open sign-up whitelists **student** and **parent** accounts. **Teacher** and
**admin** roles are assigned by an admin after sign-up (via the admin panel or
SQL Editor) — no user data is ever seeded through SQL.

## Stack

| Layer    | Choice |
|----------|--------|
| Framework | Astro 7 (static output) + React 19 islands |
| Styling   | Tailwind CSS v4 |
| Calendar  | FullCalendar 6 (day grid, list view, external drag-and-drop) |
| Backend   | Supabase — Postgres, email/password auth, RLS, Realtime |
| QR codes  | `qrcode.react` (client-side) |
| Hosting   | Cloudflare Pages |

## Getting started

### 1. Supabase

1. Create a project and enable **email/password** auth. Leave email
   confirmation **off** for demo simplicity.
2. Open the SQL Editor and run the whole file:
   `src/data/schema.sql` — creates tables, indexes, RLS policies, RPCs
   (`register_for_event`, `buy_ticket`, `set_user_role`, …), Realtime
   publication for `highlights`, and a small seed of events/announcements.
3. Sign up through the site (student/parent). To create teachers and admins,
   promote them from the admin panel (after signing in as an admin) or via SQL:
   ```sql
   select public.set_user_role('<user-uuid>', 'admin');
   ```

### 2. Local development

```sh
npm install
PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
PUBLIC_SUPABASE_ANON_KEY=<your-anon-key> \
npm run dev
```

Build output goes to `dist/`:

```sh
npm run build
```

### 3. Deploy to Cloudflare Pages

1. Push the repo to GitHub (or connect it directly).
2. In Cloudflare Pages: **Create project** → connect the repo.
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Set the environment variables `PUBLIC_SUPABASE_URL` and
   `PUBLIC_SUPABASE_ANON_KEY` (your anon key is safe to expose client-side;
   all authority is enforced by Row-Level Security in Postgres).
5. Deploy. `public/_redirects` rewrites the query-driven `/event` page so our
   `/event?id=…` links always resolve to `event/index.html`.

## Notes

- Capacity and ticket limits are enforced **in the database** inside
  `register_for_event` / `buy_ticket` (with row locks) — never client-side.
- Role changes go through the security-definer `set_user_role` RPC, so a user
  can never escalate their own role.
- Live highlights stream to open event pages over Supabase Realtime.