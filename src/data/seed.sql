-- Run AFTER src/data/schema.sql and AFTER creating the demo accounts:
--   admin@school.edu, teacher@school.edu, parent@school.edu, student@school.edu

-- Events (skips if the set already exists; safe to re-run)
insert into public.events (title, description, starts_at, ends_at, venue, category, capacity, is_ticketed, ticket_price, created_by)
select seed.title, seed.description, seed.starts_at, seed.ends_at, seed.venue, seed.category, seed.capacity, seed.is_ticketed, seed.ticket_price,
       (select id from auth.users where email = 'admin@school.edu')
from (values
  ('Inter-House Debate Qualifiers',
   'Knockout rounds across the three houses. Two judges, no second chances. Register to grab your speaking slot.',
   now() + interval '4 days', now() + interval '4 days' + interval '4 hours',
   'Room 14', 'Debate', 90, false, 0),
  ('Half-Yearly Quiz Bowl',
   'General-knowledge quiz in teams of two. Ten rounds, sudden-death finale for the top two teams.',
   now() + interval '5 days', now() + interval '5 days' + interval '3 hours',
   'Library Hall', 'General', 150, false, 0),
  ('Hack the Code Sprint',
   'A 24-hour mini-hackathon. Teams of four, any stack, one brief: make school life better.',
   now() + interval '10 days', now() + interval '11 days',
   'IT Lab', 'Tech', 120, false, 0),
  ('Chess Rapid Round-Robin',
   'Fifteen-minute rapid games, all-play-all. Top eight advance to the knockout.',
   now() + interval '12 days', now() + interval '12 days' + interval '6 hours',
   'Common Room', 'General', 4, false, 0),
  ('Winter Music Concert',
   'The annual music night — choir, jazz band, and solo acts. Tickets cover the hall pass.',
   now() + interval '7 days', now() + interval '7 days' + interval '3 hours',
   'Main Auditorium', 'Culture', 300, true, 10),
  ('Cultural Fest Night',
   'Dances, short plays, and the fashion walk. One evening, every house on stage.',
   now() + interval '45 days', now() + interval '45 days' + interval '5 hours',
   'Gym 2', 'Culture', 350, false, 0),
  ('Battlebot Brawl',
   'Homemade battle robots, one-on-one in the arena. Bring your welder.',
   now() + interval '18 days', now() + interval '18 days' + interval '4 hours',
   'Workshop Shed', 'Tech', 2, true, 8),
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
   'Main Hall', 'General', 800, false, 0),
  ('Science Exhibition 2026',
   'Student projects across robotics, chemistry, and sustainable energy.',
   now() + interval '21 days', now() + interval '21 days' + interval '6 hours',
   'Science Block', 'Exhibition', 220, false, 0)
) as seed(title, description, starts_at, ends_at, venue, category, capacity, is_ticketed, ticket_price)
where not exists (select 1 from public.events where title = 'Cultural Fest Night');

-- Announcements (skip duplicates by title)
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
  ('Term 2 begins Monday',
   'Books and timetables are on the portal. New arrivals report to the office.',
   'School Office', null),
  ('Science Exhibition volunteers',
   'Volunteer for the expo and get a first look before doors open.',
   'Ms. D''Souza', 'Science Exhibition 2026')
) as seed(title, body, author, event_title)
left join public.events e on e.title = seed.event_title
where not exists (select 1 from public.announcements where title = 'Assembly on Friday')
on conflict do nothing;

-- Highlights (skip duplicates by body)
insert into public.highlights (event_id, body, created_at)
select e.id, seed.body, seed.created_at
from (values
  ('Annual Debate Championship', 'Round 1 done — Blue House leads on points.', now() - interval '2 hours'),
  ('Annual Debate Championship', 'Motion 2 starts in five minutes. The crowd is loud.', now() - interval '1 hour'),
  ('Winter Music Concert', 'Sound check complete. Doors at 6, front row everyone.', now() - interval '90 minutes'),
  ('Inter-House Football Final', 'Full time: 3-2 to Red House. Trophy stays on the Red side!', now() - interval '4 hours'),
  ('Science Exhibition 2026', 'Best-in-show goes to Team Kinetix for their wind turbine.', now() - interval '30 minutes')
) as seed(event_title, body, created_at)
join public.events e on e.title = seed.event_title
where not exists (select 1 from public.highlights where body = 'Round 1 done — Blue House leads on points.');

-- Registrations for the demo student and parent (dashboard, day bar, TBD pool)
insert into public.registrations (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email in ('student@school.edu', 'parent@school.edu')
where (p.email = 'student@school.edu' and e.title in (
  'Annual Debate Championship', 'Winter Music Concert', 'Hack the Code Sprint',
  'Mock UN Session', 'Chess Rapid Round-Robin', 'Science Exhibition 2026'
))
or (p.email = 'parent@school.edu' and e.title in (
  'Spring Athletics Meet', 'Science Exhibition 2026', 'Parent-Teacher Open House'
))
on conflict (event_id, user_id) do nothing;

-- Tickets: demo student wallet + fill Battlebot Brawl to sold out
insert into public.tickets (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email = 'student@school.edu'
where e.title in ('Winter Music Concert', 'Robotics Championship')
on conflict (event_id, user_id) do nothing;

insert into public.tickets (event_id, user_id)
select e.id, p.id
from public.events e
join public.profiles p on p.email in ('student@school.edu', 'parent@school.edu')
where e.title = 'Battlebot Brawl'
on conflict (event_id, user_id) do nothing;

-- Custom reminders: one linked to the TBD Mock UN event, two standalone
insert into public.custom_events (user_id, title, color, starts_at, event_id)
select p.id, seed.title, seed.color, seed.starts_at, e.id
from (values
  ('student@school.edu', 'Mock UN prep — read the press kit', '#a78bfa', now() + interval '12 days', 'Mock UN Session'),
  ('student@school.edu', 'Buy fabric for the concert', '#fb7185', now() + interval '7 days', null),
  ('parent@school.edu', 'Pick up report cards', '#34d399', now() + interval '5 days', null)
) as seed(email, title, color, starts_at, event_title)
join public.profiles p on p.email = seed.email
left join public.events e on e.title = seed.event_title
on conflict do nothing;