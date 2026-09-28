-- ============================================================
-- School Events Hub — demo data
-- Run AFTER src/data/schema.sql, in the Supabase SQL Editor.
--
-- This is the ONLY place demo data lives. schema.sql is schema
-- + RLS + RPCs only.
--
-- Requires these accounts to already exist (see README):
--   admin@admin.com     (admin)     password Admin123
--   teacher@teacher.com (teacher)   password Teacher
--   student@student.com (student)   password Student
-- Supabase stores emails lowercased, so they are matched lowercased here.
-- The teacher must already be promoted to 'teacher' via /admin -> Teachers.
--
-- ⚠ DESTRUCTIVE: truncates all event data before inserting. Dev/demo only.
--   public.profiles and public.site_settings are NOT touched, so accounts
--   and the theme palette survive.
-- ============================================================

-- ------------------- 1. wipe -------------------
-- Order matters: children before parents.

truncate table
  public.highlights,
  public.registrations,
  public.tickets,
  public.custom_events,
  public.announcements,
  public.events
cascade;

-- ============================================================
-- TIME HANDLING — read this before changing the timestamps.
--
-- Events and reminder pins are *scheduled at a wall-clock time in the
-- school's timezone*. Two separate bugs came from writing them as
-- `now() + interval '3 days'`:
--
--   1. It inherits the time of day of whoever runs the script. An event
--      seeded at 23:00 lands at 23:00, and a 2-hour evening event then
--      crosses midnight and renders across TWO calendar days.
--   2. `::date` resolves against the *session* timezone, which on Supabase
--      is UTC. So "today" could be yesterday in Colombo, and a bare
--      `time '17:00'` means 17:00 UTC — 22:30 for the students.
--
-- Fix: pick a fixed base date in Asia/Colombo, add a whole-day offset, add a
-- time-of-day, then label it Asia/Colombo. Every timestamp below is therefore
-- independent of when the script runs, of the server timezone, and of DST.
--
--   (base.today + day_offset)::timestamp + starts   -- naive local wall clock
--     at time zone 'Asia/Colombo'                   -- label it as Colombo
-- ============================================================

-- ------------------- 2. events -------------------
-- day_offset is relative to today in Asia/Colombo: negative = already happened.
-- Ordering: past, upcoming, then date-TBD (day_offset null).

with base as (
  select (now() at time zone 'Asia/Colombo')::date as today
),
src (
  title, description, day_offset, starts, ends, venue, category,
  capacity, is_ticketed, ticket_price,
  registrations_enabled, show_registration_count
) as values
  -- ---- past: registration closed ----
  ('Inter-House Football Final',
   'Red vs Blue. The final ends with the trophy presentation and the house chant.',
   -10, time '17:00', time '20:00',
   'Football Ground', 'Sports', null, false, 0, false, true),
  ('Parent-Teacher Open House',
   'Department booths, report cards, and a short address from the principal.',
   -14, time '17:00', time '19:00',
   'Main Auditorium', 'General', null, false, 0, false, true),

  -- ---- upcoming ----
  ('Winter Music Concert',
   'Choir, orchestra, and the senior soloists. Doors at 16:30.',
   3, time '17:00', time '20:00',
   'Main Auditorium', 'Culture', 300, false, 0, true, true),
  ('Half-Yearly Quiz Bowl',
   'Teams of four, 15-minute rounds, one buzzer. Prelims from 17:00.',
   5, time '17:00', time '19:30',
   'Library Annex', 'Academic', 100, false, 0, true, true),
  ('Chess Rapid Round-Robin',
   'Swiss format, 10+5 rapid. All grades welcome, no entry fee.',
   5, time '17:00', time '21:00',
   'Library Annex', 'Academic', 40, false, 0, true, true),
  ('Inter-House Debate Qualifiers',
   'Top two speakers from each house advance to the championship final.',
   7, time '17:00', time '20:00',
   'Main Auditorium', 'Debate', 200, false, 0, true, true),
  ('Literary Fest',
   'Poetry slam, storytelling circles, and a creative writing workshop.',
   7, time '17:00', time '21:00',
   'Library Annex', 'Culture', 120, false, 0, true, true),
  ('Robotics Workshop',
   'Build a line-following bot with school kits. Open to grades 9-12.',
   9, time '17:00', time '22:00',
   'Innovation Lab', 'Tech', 40, false, 0, true, false),
  ('Battlebot Brawl',
   'Weight-limited bots, ten-minute rounds, live commentary. Seats fill fast.',
   10, time '17:00', time '20:00',
   'Innovation Lab', 'Tech', 1, true, 15.00, true, true),
  ('Hack the Code Sprint',
   'Twelve teams, 24 hours, one very tired demo session on Sunday afternoon.',
   12, time '17:00', time '23:00',
   'Innovation Lab', 'Tech', 80, false, 0, true, true),
  ('Art & Craft Mela',
   'Forty-plus stalls, a hand-puppet workshop, and the inter-house mural vote.',
   14, time '17:00', time '20:00',
   'Open-Air Stage', 'Culture', 250, false, 0, true, true),
  ('Annual Debate Championship',
   'Inter-house finals. Three motions, three judges, one champion house.',
   14, time '17:00', time '20:00',
   'Main Auditorium', 'Debate', 240, false, 0, true, true),
  ('Cultural Fest Night',
   'Food, music, and dance from every house and both senior cohorts.',
   18, time '17:00', time '23:00',
   'Open-Air Stage', 'Culture', 400, false, 0, true, true),
  ('Science Exhibition 2026',
   'Robotics, chemistry, and sustainable energy. Best-in-show per department.',
   21, time '17:00', time '23:00',
   'Physics Lab Block', 'Exhibition', 200, false, 0, true, true),
  ('Spring Gala',
   'An evening of music. Proceeds go to the library fund. Reserved seating.',
   26, time '17:00', time '21:00',
   'Great Hall', 'Culture', 200, false, 0, true, true),
  ('Spring Athletics Meet',
   'Long jump, sprints, relays, and shot put. Registration closes two days before.',
   30, time '17:00', time '20:00',
   'School Grounds', 'Sports', 500, false, 0, true, true),
  ('Alumni Meet 2026',
   'Refreshments and a short program in the quad. Former students and families.',
   34, time '17:00', time '20:00',
   'School Quad', 'General', 300, true, 10.00, true, true),
  ('Inter-House Football Cup',
   'Round-robin league across the four houses, finishing with a knockout final.',
   45, time '17:00', time '20:00',
   'Football Ground', 'Sports', null, false, 0, true, true),
  ('Annual Day & Cultural Night',
   'The flagship evening: plays, dance, choir, and the awards ceremony. Parents invited.',
   60, time '17:00', time '23:00',
   'Open-Air Stage', 'Culture', 1000, false, 0, true, true),

  -- ---- date TBD (day_offset null) — these feed the "date TBD" dashboard card ----
  ('Mock UN Session',
   'Full committee session on regional water rights. Date to be announced.',
   null, null, null,
   'Library Annex', 'Academic', 150, false, 0, true, true),
  ('Robotics Championship',
   'Regional qualifier. Only teams registered at the workshop may enter.',
   null, null, null,
   'Innovation Lab', 'Tech', 100, false, 0, true, true),
  ('Music Night Auditions',
   'Open auditions for solo and group acts. Date to be announced.',
   null, null, null,
   'Music Room', 'Culture', 150, false, 0, true, true),
  ('Photography Walk',
   'A guided walk through the heritage quarter. Date to be announced.',
   null, null, null,
   'Heritage Quarter', 'Exhibition', 60, false, 0, true, true)
insert into public.events (
  title, description, starts_at, ends_at, venue, category,
  capacity, is_ticketed, ticket_price,
  registrations_enabled, show_registration_count,
  created_by
)
select
  s.title,
  s.description,
  ((b.today + s.day_offset)::timestamp + s.starts) at time zone 'Asia/Colombo',
  ((b.today + s.day_offset)::timestamp + s.ends)   at time zone 'Asia/Colombo',
  s.venue,
  s.category,
  s.capacity,
  s.is_ticketed,
  s.ticket_price,
  s.registrations_enabled,
  s.show_registration_count,
  (select id from public.profiles where email = 'teacher@teacher.com')
from src s
cross join base b;
-- Every event is owned by the teacher, which is the point of demoing a
-- non-admin staff account: created_by is what the RLS policies check, so this
-- is what grants the teacher event editing and highlight posting. Admins keep
-- their own access via is_admin(), which short-circuits those same policies.
-- The sync_event_announcement trigger fires on insert, so each mirrored
-- announcement picks up the teacher's name as its author.

-- ------------------- 3. live highlights -------------------
-- highlights has only (event_id, body) — there is no title column.
-- created_at stays deliberately relative: "posted 2 hours ago" is real feed
-- recency, not a scheduled wall-clock time, so it is NOT anchored like events.

insert into public.highlights (event_id, body, created_at)
select e.id, h.body, now() - h.ago
from (values
  ('Winter Music Concert',
   'The choir opened to a full house. The encore was a three-choir mashup.',
   interval '3 hours'),
  ('Battlebot Brawl',
   'Quarterfinals are done. The arena bot needed a last-minute wheel swap.',
   interval '9 hours'),
  ('Art & Craft Mela',
   'Over forty stalls this year, including a new hand-puppet stall.',
   interval '1 day'),
  ('Hack the Code Sprint',
   'Twelve teams checked in. The 24-hour track starts after the keynote.',
   interval '1 day'),
  ('Science Exhibition 2026',
   'Robotics and sustainable energy swept the best-in-show awards.',
   interval '2 days'),
  ('Cultural Fest Night',
   'Food stalls sold out by 19:00. Arrive early next year.',
   interval '2 days'),
  ('Annual Day & Cultural Night',
   'Rehearsals start this week. Cast and crew: check your slot in the quad.',
   interval '4 days'),
  ('Spring Gala',
   'Seating is reserved and the library fund is already ahead of last year.',
   interval '5 days')
) as h(event_title, body, ago)
join public.events e on e.title = h.event_title;

-- ------------------- 4. standalone announcements -------------------
-- sync_event_announcement already mirrors one announcement per event, so only
-- site-wide posts belong here.

insert into public.announcements (title, body, author)
select
  s.title,
  s.body,
  (select full_name from public.profiles where email = 'admin@admin.com')
from (values
  ('Event command center is live',
   'All events for the year are now on the calendar. Set reminders, register online, and follow live updates as they happen.'),
  ('Registration is open for the Spring Athletics Meet',
   'Sign up early — spots are limited per event. The deadline is two days before the meet.'),
  ('New: live updates on event pages',
   'Any event page now shows live highlights posted by the organising team, without a refresh.'),
  ('Set a reminder on anything you care about',
   'Reminders show up as pins on your own dashboard and stay put even when the event date is still TBD.')
) s(title, body);

-- ------------------- 5. reminder pins -------------------
-- Same anchoring rule as events, at 10:00 because a reminder is a morning thing.

with base as (
  select (now() at time zone 'Asia/Colombo')::date as today
),
src (title, color, day_offset, event_title) as values
  ('Football semis — team briefing', '#34d399',  2, null),
  ('Buy fabric for the concert',      '#fb7185',  7, null),
  ('Return the library book',         '#f59e0b',  9, null),
  ('Mock UN prep — read the press kit','#a78bfa', 12, 'Mock UN Session'),
  ('Bake something for the mela',     '#f472b6', 14, 'Art & Craft Mela'),
  ('Print the science project board', '#38bdf8', 20, null)
insert into public.custom_events (user_id, title, color, starts_at, event_id)
select
  p.id,
  s.title,
  s.color,
  (((b.today + s.day_offset)::timestamp + time '10:00') at time zone 'Asia/Colombo'),
  e.id
from src s
cross join base b
join public.profiles p on p.email = 'student@student.com'
left join public.events e on e.title = s.event_title;

-- ------------------- 6. student registrations -------------------
-- The README documents a single student account, so every registration and
-- ticket below belongs to student@student.com. The two TBD events are
-- registered on purpose: that is what fills the "date TBD" dashboard card.

insert into public.registrations (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email = 'student@student.com'
where e.title in (
  'Inter-House Debate Qualifiers',
  'Half-Yearly Quiz Bowl',
  'Winter Music Concert',
  'Hack the Code Sprint',
  'Chess Rapid Round-Robin',
  'Battlebot Brawl',
  'Science Exhibition 2026',
  'Cultural Fest Night',
  'Art & Craft Mela',
  'Mock UN Session',
  'Robotics Championship'
)
on conflict (event_id, user_id) do nothing;

-- ------------------- 7. student tickets -------------------
-- Battlebot has capacity 1 and the demo student holds the only ticket, so the
-- "sold out" state stays visible with just one student account.

insert into public.tickets (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email = 'student@student.com'
where e.title in ('Winter Music Concert', 'Battlebot Brawl', 'Robotics Championship')
on conflict (event_id, user_id) do nothing;
