import { useEffect, useMemo, useState } from "react";
import { useUser } from "../hooks/useUser";
import {
  getMyRegistrations,
  getAnnouncements,
  type MyRegistration,
  type Announcement,
} from "../lib/api";
import { formatDate } from "../lib/format";
import { categoryClass } from "../lib/categories";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toWeekIndex = (d: string) => (new Date(d).getDay() + 6) % 7;

function greetingFor(hour: number, firstName: string) {
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [items, setItems] = useState<MyRegistration[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<number>(() =>
    typeof window === "undefined" ? -1 : (new Date().getDay() + 6) % 7
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([getMyRegistrations(), getAnnouncements()])
      .then(([regs, anns]) => {
        setItems(regs);
        setAnnouncements(anns);
        const next = regs
          .filter((r) => r.starts_at && new Date(r.starts_at).getTime() >= Date.now() - 86400000)
          .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))[0];
        if (next?.starts_at) setDay((new Date(next.starts_at).getDay() + 6) % 7);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user]);

  const byDay = useMemo(() => {
    const map: Record<number, MyRegistration[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const r of items) {
      if (!r.starts_at) continue;
      const idx = toWeekIndex(r.starts_at);
      map[idx].push(r);
    }
    for (const k of Object.keys(map)) {
      map[Number(k)].sort((a, b) =>
        a.starts_at === b.starts_at ? 0 : a.starts_at!.localeCompare(b.starts_at!)
      );
    }
    return map;
  }, [items]);

  const tbd = items.filter((r) => !r.starts_at);
  const selected = byDay[day] ?? [];
  const shown = expanded ? selected : selected.slice(0, 3);

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading dashboard…</p>;
  }

  if (!user) {
    return (
      <div className="card card-ring mx-auto max-w-md rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-white">Your dashboard is waiting</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to see your week at a glance — your events, chosen day, and announcements.
        </p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in
        </a>
      </div>
    );
  }

  const firstName = user.fullName.split(" ")[0] || "friend";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white">
          {greetingFor(new Date().getHours(), firstName)}
          <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wider text-slate-500">
            {tbd.length > 0 && `${tbd.length} event${tbd.length === 1 ? "" : "s"} waiting on dates`}
          </span>
        </h1>
      </div>

      <section className="card card-ring rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Your week</h2>
          <span className="text-xs text-slate-500">Pick a day</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {DAY_NAMES.map((name, i) => {
            const count = byDay[i].length;
            const active = day === i;
            return (
              <button
                key={name}
                onClick={() => {
                  setDay(i);
                  setExpanded(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-3 text-sm font-bold transition-all ${
                  active
                    ? "bg-violet-400 text-[#0d0f18] shadow-lg shadow-violet-400/25"
                    : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">{name}</span>
                <span className={`text-base leading-none ${active ? "text-[#0d0f18]" : count > 0 ? "text-violet-300" : "text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          {DAY_NAMES[day]}
          {selected.length > 0 && (
            <span className="ml-2 text-sm font-medium text-slate-500">
              {selected.length} registered event{selected.length === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        {shown.length === 0 ? (
          <p className="card card-ring rounded-2xl p-6 text-center text-sm text-slate-500">
            Nothing registered on {DAY_NAMES[day]}s yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => (
              <a
                key={r.event_id}
                href={`/event?id=${r.event_id}`}
                className="card card-ring group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <span className={`category-chip ring-1 ${categoryClass(r.category)}`}>
                    {r.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.starts_at
                      ? new Date(r.starts_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "TBD"}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold leading-snug text-slate-100 group-hover:text-white">
                  {r.title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {r.starts_at ? formatDate(r.starts_at) : "Date TBD"} · {r.venue}
                </p>
              </a>
            ))}
          </div>
        )}
        {selected.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
          >
            {expanded ? "Show less" : `Show more (${selected.length - 3} more)`}
          </button>
        )}
      </section>

      {tbd.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">No date yet</h2>
          <div className="card card-ring rounded-2xl p-5">
            <p className="text-sm text-slate-400">
              These events haven't announced their dates. Registering is done — when a date is
              set, we'll remind you.
            </p>
            <div className="mt-4 space-y-2">
              {tbd.map((r) => (
                <a
                  key={r.event_id}
                  href={`/event?id=${r.event_id}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition-colors hover:bg-white/10"
                >
                  <span className="font-medium text-slate-200">{r.title}</span>
                  <span className="text-xs text-slate-500">Date TBD →</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Announcements</h2>
          <a href="/announcements" className="text-sm text-indigo-300 hover:text-indigo-200">
            View all →
          </a>
        </div>
        {announcements.length === 0 ? (
          <p className="text-slate-500">Nothing announced yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {announcements.slice(0, 4).map((a) => (
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