import { useEffect, useState } from "react";
import {
  getAnnouncements,
  getMyRegistrations,
  getEvent,
  getCustomEvents,
  createCustomEvent,
  type Announcement,
  type CustomEventRow,
} from "../lib/api";
import { useUser } from "../hooks/useUser";

export default function AnnouncementsFeed() {
  const { user } = useUser();
  const [items, setItems] = useState<Announcement[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [pins, setPins] = useState<CustomEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnnouncements()
      .then(setItems)
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

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading announcements…</p>;
  }

  if (error) {
    return <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="card card-ring rounded-2xl p-8 text-center text-slate-500">
      No announcements yet.
    </p>;
  }

  return (
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
  );
}