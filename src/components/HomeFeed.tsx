import { useEffect, useState } from "react";
import { getEvents, getAnnouncements, type EventView, type Announcement } from "../lib/api";
import { formatDate, formatDateTime, isUpcoming } from "../lib/format";
import { categoryClass } from "../lib/categories";
import Countdown from "./Countdown";

type State = {
  loading: boolean;
  error: string;
  events: EventView[];
  announcements: Announcement[];
};

export default function HomeFeed() {
  const [state, setState] = useState<State>({
    loading: true,
    error: "",
    events: [],
    announcements: [],
  });

  useEffect(() => {
    Promise.all([getEvents(), getAnnouncements()])
      .then(([events, announcements]) =>
        setState({ loading: false, error: "", events, announcements })
      )
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.message }))
      );
  }, []);

  if (state.loading) {
    return <p className="py-16 text-center text-slate-500">Loading…</p>;
  }

  if (state.error) {
    return (
      <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">
        {state.error}
      </p>
    );
  }

  const upcoming = state.events
    .filter((e) => isUpcoming(e.starts_at))
    .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!));
  const next = upcoming[0] ?? null;
  const featured = upcoming
    .filter((e) => e.id !== next?.id)
    .slice(0, 6)
    .concat(state.events.filter((e) => !isUpcoming(e.starts_at)).slice(0, 2));

  return (
    <div className="flex flex-col gap-10">
      {next && <NextEventHero event={next} />}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Up next</h2>
          <a href="/events" className="text-sm text-indigo-300 hover:text-indigo-200">
            Open calendar →
          </a>
        </div>
        {featured.length === 0 ? (
          <p className="text-slate-500">Nothing scheduled yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Announcements</h2>
          <a href="/announcements" className="text-sm text-indigo-300 hover:text-indigo-200">
            View all →
          </a>
        </div>
        {state.announcements.length === 0 ? (
          <p className="text-slate-500">No announcements yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {state.announcements.slice(0, 4).map((a) => (
              <article key={a.id} className="card card-ring rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className="text-xs text-slate-500">{formatDate(a.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{a.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NextEventHero({ event }: { event: EventView }) {
  const spots = event.capacity ? `${event.registrations} / ${event.capacity}` : `${event.registrations} joined`;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white sm:p-8">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <span className="category-chip bg-white/15 text-white ring-white/25">{event.category}</span>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{event.title}</h2>
          <p className="mt-2 text-indigo-100">
            {formatDateTime(event.starts_at)} · {event.venue} · {spots}
          </p>
          <div className="mt-5">
            <Countdown target={event.starts_at!} />
          </div>
        </div>
        <a
          href={`/event?id=${event.id}`}
          className="rounded-xl bg-white px-5 py-3 text-center font-bold text-indigo-700 shadow-lg transition-transform hover:scale-[1.02]"
        >
          Register now
        </a>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: EventView }) {
  const spots = event.capacity
    ? `${event.registrations} / ${event.capacity}`
    : `${event.registrations} joined`;
  return (
    <a
      href={`/event?id=${event.id}`}
      className="card card-ring group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
    >
      <div className="flex items-center justify-between">
        <span className={`category-chip ring-1 ${categoryClass(event.category)}`}>
          {event.category}
        </span>
        <span className="text-xs text-slate-500">{spots}</span>
      </div>
      <h3 className="mt-3 font-semibold leading-snug text-slate-100 group-hover:text-white">
        {event.title}
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        {event.starts_at ? formatDate(event.starts_at) : "Date TBD"} · {event.venue}
      </p>
      {isUpcoming(event.starts_at) ? (
        <div className="mt-3">
          <Countdown target={event.starts_at!} label="Today" />
        </div>
      ) : (
        <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Date to be announced</p>
      )}
    </a>
  );
}