import { useEffect, useState } from "react";
import {
  getAnnouncements,
  getEvents,
  getMyRegistrations,
  getEvent,
  getCustomEvents,
  createCustomEvent,
  type Announcement,
  type CustomEventRow,
  type EventView,
} from "../lib/api";
import { useUser } from "../hooks/useUser";

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementsFeed() {
  const { user } = useUser();
  const [items, setItems] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventView[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [pins, setPins] = useState<CustomEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getAnnouncements(), getEvents()])
      .then(([a, e]) => {
        setItems(a);
        setEvents(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setRegisteredIds(new Set());
      setPins([]);
      return;
    }
    Promise.all([getMyRegistrations(), getCustomEvents()])
      .then(([regs, pinRows]) => {
        setRegisteredIds(new Set(regs.map((r) => r.event_id)));
        setPins(pinRows);
      })
      .catch(() => undefined);
  }, [user]);

  const pinnedIds = new Set(pins.map((p) => p.event_id).filter((id): id is string => !!id));

  const pinEvent = async (a: Announcement) => {
    if (!a.event_id || pinnedIds.has(a.event_id)) return;
    const ev = await getEvent(a.event_id).catch(() => null);
    if (!ev?.starts_at) return;
    await createCustomEvent({
      title: a.title,
      color: "#818cf8",
      starts_at: ev.starts_at,
      event_id: a.event_id,
    });
    setPins(await getCustomEvents());
  };

  const pinOfficial = async (ev: EventView) => {
    if (pinnedIds.has(ev.id) || !ev.starts_at) return;
    await createCustomEvent({
      title: ev.title,
      color: "#818cf8",
      starts_at: ev.starts_at,
      event_id: ev.id,
    });
    setPins(await getCustomEvents());
  };

  const dated = events
    .filter((e) => e.starts_at)
    .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!));
  const tbd = events.filter((e) => !e.starts_at);

  const PinButton = ({ pinned, onPin }: { pinned: boolean; onPin: () => void }) =>
    user ? (
      <button
        onClick={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!pinned) onPin();
        }}
        aria-label={pinned ? "Added to calendar" : "Add to calendar"}
        title={pinned ? "Added to calendar" : "Add to calendar"}
        className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold transition-colors ${
          pinned
            ? "bg-indigo-400/20 text-indigo-200 ring-1 ring-indigo-400/40"
            : "bg-white/10 text-slate-200 ring-1 ring-white/20 hover:bg-indigo-500 hover:text-white"
        }`}
      >
        {pinned ? "✓" : "+"}
      </button>
    ) : null;

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading…</p>;
  }

  if (error) {
    return <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">{error}</p>;
  }

  if (dated.length === 0 && tbd.length === 0 && items.length === 0) {
    return (
      <p className="card card-ring rounded-2xl p-8 text-center text-slate-500">
        No events or announcements yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {(dated.length > 0 || tbd.length > 0) && (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">Events</h2>
          {dated.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dated.map((e) => (
                <a
                  key={e.id}
                  href={`/event?id=${e.id}`}
                  className="card card-ring group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-white/10">
                      {e.category}
                    </span>
                    {PinButton({ pinned: pinnedIds.has(e.id), onPin: () => pinOfficial(e) })}
                  </div>
                  <h3 className="mt-3 font-semibold leading-snug text-slate-100 group-hover:text-white">
                    {e.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {e.starts_at ? formatDate(e.starts_at) : ""} · {e.venue}
                  </p>
                  {registeredIds.has(e.id) && (
                    <span className="mt-2 inline-block rounded-md bg-indigo-400/10 px-2 py-0.5 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/40">
                      Registered
                    </span>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No events with dates yet.</p>
          )}
          {tbd.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tbd.map((e) => (
                <a
                  key={e.id}
                  href={`/event?id=${e.id}`}
                  className="card card-ring group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-white/10">
                      {e.category}
                    </span>
                    {PinButton({ pinned: pinnedIds.has(e.id), onPin: () => undefined })}
                  </div>
                  <h3 className="mt-3 font-semibold leading-snug text-slate-100 group-hover:text-white">
                    {e.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">Date TBD · {e.venue}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {items.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">Announcements</h2>
          <div className="space-y-4">
      {items.map((a) => (
        <article key={a.id} className="card card-ring rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-indigo-300">{a.author}</span>
            <span>·</span>
            <time dateTime={a.created_at}>
              {new Date(a.created_at).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </time>
            {user && a.event_id && (
              <button
                onClick={() => pinEvent(a)}
                disabled={pinnedIds.has(a.event_id)}
                aria-label={pinnedIds.has(a.event_id) ? "Added to calendar" : "Add to calendar"}
                title={pinnedIds.has(a.event_id) ? "Added to calendar" : "Add to calendar"}
                className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold transition-colors disabled:cursor-default ${
                  pinnedIds.has(a.event_id)
                    ? "bg-indigo-400/20 text-indigo-200 ring-1 ring-indigo-400/40"
                    : "bg-white/10 text-slate-200 ring-1 ring-white/20 hover:bg-indigo-500 hover:text-white"
                }`}
              >
                {pinnedIds.has(a.event_id) ? "✓" : "+"}
              </button>
            )}
            {user && a.event_id && registeredIds.has(a.event_id) && (
              <span className="rounded-full bg-indigo-400/20 px-2.5 py-0.5 font-semibold text-indigo-200 ring-1 ring-indigo-400/40">
                Registered
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white">{a.title}</h2>
          <p className="mt-2 whitespace-pre-line text-slate-300">{a.body}</p>
          {a.event_id && (
            <a
              href={`/event?id=${a.event_id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Event details
              <span aria-hidden="true">→</span>
            </a>
          )}
        </article>
      ))}
    </div>
        </section>
      )}
    </div>
  );
}