import { useEffect, useState } from "react";
import { getMyRegistrations, type MyRegistration } from "../lib/api";
import { formatDate } from "../lib/format";
import { categoryClass } from "../lib/categories";

export default function MyRegistrations({ limit = 4 }: { limit?: number }) {
  const [items, setItems] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRegistrations()
      .then(setItems)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-6 text-center text-sm text-slate-500">Loading your events…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="card card-ring rounded-2xl p-6 text-center text-sm text-slate-500">
        You haven't registered for anything yet — pick an event and register.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.slice(0, limit).map((r) => (
        <a
          key={r.event_id}
          href={`/event?id=${r.event_id}`}
          className="card card-ring group rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
        >
          <span className={`category-chip ring-1 ${categoryClass(r.category)}`}>
            {r.category}
          </span>
          <h3 className="mt-2 font-semibold leading-snug text-slate-100 group-hover:text-white">
            {r.title}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {r.starts_at ? formatDate(r.starts_at) : "Date TBD"} · {r.venue}
          </p>
        </a>
      ))}
    </div>
  );
}