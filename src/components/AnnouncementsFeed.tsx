import { useEffect, useState } from "react";
import { getAnnouncements, type Announcement } from "../lib/api";

export default function AnnouncementsFeed() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnnouncements()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="mx-auto max-w-3xl space-y-4">
      {items.map((a) => (
        <article key={a.id} className="card card-ring rounded-2xl p-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-indigo-300">{a.author}</span>
            <span>·</span>
            <time dateTime={a.created_at}>
              {new Date(a.created_at).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </time>
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