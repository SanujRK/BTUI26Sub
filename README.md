# School Events Hub

A single place for every school event — browse the calendar, register for events, buy
tickets, and follow announcements and event highlights as they are posted.

## Purpose and objectives

The project exists to remove the scattered-signup problem: event notices, sign-up sheets,
and timetables normally live in different places, so students miss events and staff
chase registrations manually.

Objectives:

- **One calendar for everything.** Every event in a single month or list view, filterable
  by category, with your own reminder pins that you can drag to any date.
- **Self-service registration.** Students and parents register themselves; capacity is
  enforced in the database, not the UI, so it cannot be bypassed.
- **Ticketing where needed.** Ticketed events support purchases, and each issued ticket
  renders as a scannable QR code.
- **Announcements and highlights.** Every event's announcements and staff-posted
  highlights appear on the event page, and admins can broadcast to the feed.
- **Reminders without clutter.** Any user can pin a reminder to their own calendar;
  personal pins stay private to that user.
- **Staff tooling.** One panel for events, announcements, and highlights,
  plus site-wide appearance (theme, accent palette, typeface) for admins.

## Usage Guide

The Hosted Site is at https://btui26sub.pages.dev/

There are 3 pre-created accounts,
| Email | Password | Role |
|---|---|---|
| Student@student.com | Student | Student/Parent |
| Teacher@Teacher.com | Teacher | Teacher |
| Admin@admin.com | Admin123 | Admin |

Use these accounts for a pre configured experience of the site. (You can create your own and test as well. This is only for convenience.)

Theme, accent palette, and font can be edited from **Admin → Appearance**.

### User roles

| Role | Can do |
|------|--------|
| `student` | Normal student stuff |
| `parent` | Same as student, Doesn't count towards signup goals |
| `teacher` | create, edit, and delete their **own** events; post announcements; post highlights for their own events |
| `admin` | Everything above, plus edit or delete any event, manage user roles, post any highlight, and change site settings and appearance |

New signups default to `student` or `parent` — a signup can never self-assign a staff
role. Promote someone to teacher from the admin panel.

## Technologies and frameworks

| Layer | Choice |
|-------|--------|
| Framework | Astro 7 with React 19 islands |
| Styling | Tailwind CSS v4 (via Vite) |
| Calendar | FullCalendar 6 |
| Backend / DB | Supabase |
| QR codes | `qrcode.react` (client-side) |
| Language | TypeScript, React JSX, Astro |
| Hosting | Cloudflare Pages |
| Toolchain | Node.js >= 22.12.0, npm, Vite |

## Running the project locally

### Prerequisites

- Node.js **22.12.0 or newer** (check with `node --version`)
- npm (ships with Node)
- A free [Supabase](https://supabase.com) project

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database schema

In your Supabase project, open **SQL Editor** and run the whole contents of
[`src/data/schema.sql`](src/data/schema.sql) once.

It creates everything the app needs:
- Tables: `profiles`, `events`, `announcements`, `registrations`, `tickets`,
  `custom_events`, `highlights`, `site_settings`
- Row Level Security policies on all of them
- Helper functions `is_admin()` and `is_staff()`
- A trigger that creates a `profiles` row on every new auth signup
- A trigger that mirrors events into `announcements` automatically
- RPCs: `register_for_event`, `buy_ticket`, `get_event_stats`, `get_public_events`,
  `get_public_event`, `set_user_role`, `delete_account`
- Realtime publication for `highlights`

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```bash
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Start the dev server

```bash
npm run dev
```

Then open the URL Astro prints, usually <http://localhost:4321>.

Hot reload is enabled — edits to `.astro`, `.tsx`, and `.css` files apply immediately.

### 5. Create your first admin

Sign up through the app's `/login` page (it creates a `student` profile automatically),
then promote that account by running this in the Supabase SQL editor, substituting the
user's email:

```sql
select public.set_user_role(
  (select id from auth.users where email = '<Email>'),
  'admin'
);
```
Log in again and thr `admin` page becomes available.
