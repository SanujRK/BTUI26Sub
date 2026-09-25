import { useEffect, useState } from "react";
import { getAnnouncements, getMyRegistrations, type Announcement } from "../lib/api";
import { useUser } from "../hooks/useUser";

export default function AnnouncementsFeed() {
  const { user } = useUser();
  const [items, setItems] = useState<Announcement[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
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
      return;
    }
    getMyRegistrations()
      .then((regs) => setRegisteredIds(new Set(regs.map((r) => r.event_id))))
      .catch(() => undefined);
  }, [user]);

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
            {user && a.event_id && registeredIds.has(a.event_id) && (
              <span className="ml-auto rounded-full bg-indigo-400/20 px-2.5 py-0.5 font-semibold text-indigo-200 ring-1 ring-indigo-400/40">
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