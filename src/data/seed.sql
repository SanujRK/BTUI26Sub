-- Seed/cleanup script — School Events Hub.
-- Run AFTER src/data/schema.sql. Assumes these demo accounts already exist
-- (sign up through the app first):
--   admin@admin.com (admin), test@test.com (student), test2@test.com (student),
--   teacher@teacher.com (teacher — promote via /admin -> Teachers, or update here)

-- Wipe everything first (dev only). Order matters for FKs.
truncate table public.registrations, public.tickets, public.custom_events,
     public.highlights, public.announcements, public.events cascade;

-- Events (all dates relative to "now" so the demo always looks current)
insert into public.events (title, description, starts_at, ends_at, venue, category, capacity, is_ticketed, ticket_price, created_by)
select seed.title, seed.description, seed.starts_at, seed.ends_at, seed.venue, seed.category,
       seed.capacity, seed.is_ticketed, seed.ticket_price, a.id
from (values
  ('Inter-House Debate Qualifiers',
   'Knockout rounds across the three houses. Two judges, no second chances. Register to grab your speaking slot.',
   now() + interval '4 days', now() + interval '4 days' + interval '4 hours',
   'Room 14', 'Debate', 90, false, 0),
  ('Half-Yearly Quiz Bowl',
   'General-knowledge quiz in teams of two. Ten rounds, sudden-death finale for the top two teams.',
   now() + interval '5 days', now() + interval '5 days' + interval '3 hours',
   'Library Hall', 'General', 150, false, 0),
  ('Winter Music Concert',
   'The annual music night — choir, jazz band, and solo acts. Tickets cover the hall pass.',
   now() + interval '7 days', now() + interval '7 days' + interval '3 hours',
   'Main Auditorium', 'Culture', 300, true, 10),
  ('Hack the Code Sprint',
   'A 24-hour mini-hackathon. Teams of four, any stack, one brief: make school life better.',
   now() + interval '10 days', now() + interval '11 days',
   'IT Lab', 'Tech', 120, false, 0),
  ('Chess Rapid Round-Robin',
   'Fifteen-minute rapid games, all-play-all. Top eight advance to the knockout.',
   now() + interval '12 days', now() + interval '12 days' + interval '6 hours',
   'Common Room', 'General', 4, false, 0),
  ('Battlebot Brawl',
   'Homemade battle robots, one-on-one in the arena. Bring your welder.',
   now() + interval '18 days', now() + interval '18 days' + interval '4 hours',
   'Workshop Shed', 'Tech', 2, true, 8),
  ('Science Exhibition 2026',
   'Student projects across robotics, chemistry, and sustainable energy.',
   now() + interval '21 days', now() + interval '21 days' + interval '6 hours',
   'Science Block', 'Exhibition', 220, false, 0),
  ('Cultural Fest Night',
   'Dances, short plays, and the fashion walk. One evening, every house on stage.',
   now() + interval '45 days', now() + interval '45 days' + interval '5 hours',
   'Gym 2', 'Culture', 350, false, 0),
  ('Art & Craft Mela',
   'Student stalls, live sketching, and the mural wall. Prizes for the loudest stall.',
   now() + interval '60 days', now() + interval '60 days' + interval '8 hours',
   'Quadrangle', 'Exhibition', 200, false, 0),
  ('Mock UN Session',
   'Simulate the UN General Assembly on climate action. Country assignments drop via announcement.',
   null, null,
   'Conference Room', 'Debate', 100, false, 0),
  ('Robotics Championship',
   'Autonomous bots run a maze course. Two dry runs, then the timed final.',
   null, null,
   'IT Lab', 'Tech', 60, true, 5),
  ('Inter-House Football Final',
   'The season ends tonight. Red House vs Blue House, trophies, and a full ground.',
   now() - interval '9 days', now() - interval '9 days' + interval '2 hours',
   'School Grounds', 'Sports', 600, false, 0),
  ('Parent-Teacher Open House',
   'Meet every subject teacher, collect the term report, and tour the new labs.',
   now() - interval '3 days', now() - interval '3 days' + interval '4 hours',
   'Main Hall', 'General', 800, false, 0)
) as seed(title, description, starts_at, ends_at, venue, category, capacity, is_ticketed, ticket_price)
cross join public.profiles a
where a.email = 'admin@admin.com';

-- Announcements (author is free text; event_id linked where relevant)
insert into public.announcements (title, body, author, event_id)
select seed.title, seed.body, seed.author, e.id
from (values
  ('Assembly on Friday',
   'Full-school assembly at 8:00 sharp in the Main Hall. House points announced.',
   'Ms. Nair', null),
  ('Hack the Code Sprint — teams needed',
   'We still need three teams of four. Last week to sign up, prizes plus a field trip for the winners.',
   'Mr. Pinto', 'Hack the Code Sprint'),
  ('Mock UN — country assignments out',
   'Head over to the event page; pitch to argue for a country before registration closes.',
   'Mr. Pinto', 'Mock UN Session'),
  ('Concert tickets now on sale',
   'Tickets are live. Grab one early — the hall always sells out.',
   'Ms. Nair', 'Winter Music Concert'),
  ('Battlebot Brawl — last bot confirmed',
   'Fight night locked in. Come watch the arena duels in the Workshop Shed.',
   'Mr. Pinto', 'Battlebot Brawl'),
  ('Term 2 begins Monday',
   'Books and timetables are on the portal. New arrivals report to the office.',
   'School Office', null),
  ('Science Exhibition volunteers',
   'Volunteer for the expo and get a first look before doors open.',
   'Ms. D''Souza', 'Science Exhibition 2026')
) as seed(title, body, author, event_title)
left join public.events e on e.title = seed.event_title;

-- Highlights (broadcast-style updates for the live feeds)
insert into public.highlights (event_id, body, created_at)
select e.id, seed.body, seed.created_at
from (values
  ('Inter-House Debate Qualifiers', 'Round 1 done — Blue House leads on points.', now() - interval '2 hours'),
  ('Inter-House Debate Qualifiers', 'Motion 2 starts in five minutes. The crowd is loud.', now() - interval '1 hour'),
  ('Winter Music Concert', 'Sound check complete. Doors at 6, front row everyone.', now() - interval '90 minutes'),
  ('Hack the Code Sprint', 'The brief is out — mentors are already in the IT Lab.', now() - interval '45 minutes'),
  ('Inter-House Football Final', 'Full time: 3-2 to Red House. Trophy stays on the Red side!', now() - interval '4 hours')
) as seed(event_title, body, created_at)
join public.events e on e.title = seed.event_title;

-- Registrations (fills dashboards + the "date TBD" pool)
insert into public.registrations (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email in ('test@test.com', 'test2@test.com')
where (p.email = 'test@test.com' and e.title in (
  'Inter-House Debate Qualifiers', 'Winter Music Concert', 'Hack the Code Sprint',
  'Mock UN Session', 'Science Exhibition 2026'
))
or (p.email = 'test2@test.com' and e.title in (
  'Half-Yearly Quiz Bowl', 'Battlebot Brawl', 'Mock UN Session',
  'Art & Craft Mela', 'Parent-Teacher Open House'
))
on conflict (event_id, user_id) do nothing;

-- Tickets: both students hold a concert ticket; Battlebot (cap 2) sold out
insert into public.tickets (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email in ('test@test.com', 'test2@test.com')
where (e.title = 'Winter Music Concert' and p.email in ('test@test.com', 'test2@test.com'))
   or (e.title = 'Battlebot Brawl' and p.email in ('test@test.com', 'test2@test.com'))
   or (e.title = 'Robotics Championship' and p.email = 'test2@test.com')
on conflict (event_id, user_id) do nothing;

-- Custom reminders: one TBD-linked + standalone pins per student
insert into public.custom_events (user_id, title, color, starts_at, event_id)
select p.id, seed.title, seed.color, seed.starts_at, e.id
from (values
  ('test@test.com', 'Mock UN prep — read the press kit', '#a78bfa', now() + interval '12 days', 'Mock UN Session'),
  ('test@test.com', 'Buy fabric for the concert', '#fb7185', now() + interval '7 days', null),
  ('test2@test.com', 'Print science project board', '#38bdf8', now() + interval '20 days', null),
  ('test2@test.com', 'Football semis — team briefing', '#34d399', now() + interval '2 days', null)
) as seed(email, title, color, starts_at, event_title)
join public.profiles p on p.email = seed.email
left join public.events e on e.title = seed.event_title;