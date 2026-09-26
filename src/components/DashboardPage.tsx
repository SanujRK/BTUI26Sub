import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "../hooks/useUser";
import {
  getMyRegistrations,
  getCustomEvents,
  getEvents,
  getMyTickets,
  getRecentHighlights,
  buyTicket,
  createCustomEvent,
  subscribeToAllHighlights,
  type MyRegistration,
  type EventView,
  type CustomEventRow,
  type TicketView,
  type Highlight,
} from "../lib/api";
import { formatDate } from "../lib/format";
import { categoryClass } from "../lib/categories";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toWeekIndex = (d: string) => (new Date(d).getDay() + 6) % 7;

type DayEvent = {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  venue: string;
  color?: string;
  pinned?: boolean;
  ticket?: boolean;
};

function greetingFor(hour: number, firstName: string) {
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

const timeStr = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Countdown({ at }: { at: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = new Date(at).getTime() - now;
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return <span className="text-xs tabular-nums text-slate-500">Started</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return <span className="text-xs tabular-nums text-violet-300/90">{label} left</span>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [items, setItems] = useState<MyRegistration[]>([]);
  const [events, setEvents] = useState<EventView[]>([]);
  const [pins, setPins] = useState<CustomEventRow[]>([]);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<number>(() =>
    typeof window === "undefined" ? -1 : (new Date().getDay() + 6) % 7
  );
  const [expanded, setExpanded] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");
  const [ticketBusy, setTicketBusy] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    let alive = true;
    getRecentHighlights(40)
      .then((h) => alive && setHighlights(h))
      .catch(() => undefined);
    const unsub = subscribeToAllHighlights((h) =>
      setHighlights((prev) => [h, ...prev].slice(0, 40))
    );
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const [, setMinutesTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setMinutesTick((n) => n + 1), 60000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([getMyRegistrations(), getCustomEvents(), getEvents(), getMyTickets()])
      .then(([regs, cst, evs, tks]) => {
        setItems(regs);
        setPins(cst);
        setEvents(evs);
        setTickets(tks);
        const next = regs
          .filter((r) => r.starts_at && new Date(r.starts_at).getTime() >= Date.now() - 86400000)
          .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))[0];
        if (next?.starts_at) setDay((new Date(next.starts_at).getDay() + 6) % 7);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user]);

  const dayEvents = useMemo<DayEvent[]>(() => {
    const official: DayEvent[] = items
      .filter((r) => r.starts_at)
      .map((r) => ({
        id: r.event_id,
        title: r.title,
        category: r.category,
        starts_at: r.starts_at!,
        venue: r.venue,
      }));
    const custom: DayEvent[] = pins
      .filter((p) => p.starts_at)
      .map((p) => ({
        id: `pin-${p.id}`,
        title: p.title,
        category: "Custom",
        starts_at: p.starts_at!,
        venue: "Custom pin",
        color: p.color,
        pinned: true,
      }));
    const ticketed: DayEvent[] = tickets
      .filter((t) => t.starts_at)
      .map((t) => ({
        id: t.event_id,
        title: t.title,
        category: t.category,
        starts_at: t.starts_at!,
        venue: t.venue,
        ticket: true,
      }));
    return [...official, ...custom, ...ticketed];
  }, [items, pins, tickets]);

  const byDay = useMemo(() => {
    const map: Record<number, DayEvent[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const e of dayEvents) {
      if (!e.starts_at) continue;
      const idx = toWeekIndex(e.starts_at);
      map[idx].push(e);
    }
    for (const k of Object.keys(map)) {
      map[Number(k)].sort((a, b) =>
        a.starts_at === b.starts_at ? 0 : a.starts_at!.localeCompare(b.starts_at!)
      );
    }
    return map;
  }, [dayEvents]);

  const pinnedIds = useMemo(
    () => new Set(pins.map((p) => p.event_id).filter((id): id is string => !!id)),
    [pins]
  );

  const tbd = items.filter((r) => !r.starts_at && !pinnedIds.has(r.event_id));
  const selected = byDay[day] ?? [];
  const shown = expanded ? selected : selected.slice(0, 3);

  const registeredIds = useMemo(() => new Set(items.map((r) => r.event_id)), [items]);

  const myHighlight = highlights.find(
    (h) => h.event_id && registeredIds.has(h.event_id)
  );

  const pinEvent = async (e: EventView) => {
    if (pinnedIds.has(e.id) || !e.starts_at) return;
    try {
      await createCustomEvent({
        title: e.title,
        color: "#818cf8",
        starts_at: e.starts_at,
        event_id: e.id,
      });
      setPins(await getCustomEvents());
    } catch {
      /* ignore */
    }
  };

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.starts_at && new Date(e.starts_at).getTime() >= Date.now() - 86400000)
        .filter((e) => !registeredIds.has(e.id))
        .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))
        .slice(0, 6),
    [events, registeredIds]
  );

  const ownedEventIds = useMemo(() => new Set(tickets.map((t) => t.event_id)), [tickets]);
  const buyable = events.filter((e) => e.is_ticketed && !ownedEventIds.has(e.id));

  const priceOf = (e: EventView) =>
    e.ticket_price > 0
      ? e.ticket_price % 1 === 0
        ? `$${e.ticket_price}`
        : `$${e.ticket_price.toFixed(2)}`
      : "Free";

  const buy = async (e: EventView) => {
    setTicketBusy(e.id);
    setTicketMsg("");
    const res = await buyTicket(e.id);
    setTicketMsg(res.message);
    setTicketBusy("");
    if (res.ok || res.message === "ticket already owned") {
      setTickets(await getMyTickets());
    }
  };

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
        {myHighlight && (
          <a
            href={myHighlight.event_id ? `/event?id=${myHighlight.event_id}` : undefined}
            className="card card-ring group flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
          >
            <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm leading-snug text-slate-200 group-hover:text-white">
                {myHighlight.body}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {myHighlight.event_title && (
                  <span className="font-semibold text-indigo-300">{myHighlight.event_title}</span>
                )}
                {myHighlight.event_title && <span> · </span>}
                {timeAgo(myHighlight.created_at)}
              </span>
            </span>
          </a>
        )}
      </div>

      <section className="card card-ring rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Your week</h2>
          <span className="text-xs text-slate-500">Pick a day</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
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
                <span className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">{name}</span>
                <span className={`text-base leading-none ${active ? "text-[#0d0f18]" : count > 0 ? "text-violet-300" : "text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t border-white/10" aria-hidden="true" />
        <div className="mt-4">
          {shown.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              No events on {DAY_NAMES[day]}s yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((e) =>
                e.pinned ? (
                  <div
                    key={e.id}
                    className="card card-ring rounded-xl bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#0f172a]"
                        style={{ backgroundColor: e.color ?? "#818cf8" }}
                      >
                        Custom
                      </span>
                      <span className="text-xs text-slate-500">{timeStr(e.starts_at)}</span>
                    </div>
                    <h3 className="mt-3 truncate font-semibold leading-snug text-slate-100">
                      {e.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDate(e.starts_at)} · {e.venue}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="inline-block rounded-md bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/40">
                        Pinned
                      </span>
                      <Countdown at={e.starts_at} />
                    </div>
                  </div>
                ) : (
                  <a
                    key={e.id}
                    href={`/event?id=${e.id}`}
                    className="card card-ring group rounded-xl bg-white/[0.04] p-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`category-chip shrink-0 ring-1 ${categoryClass(e.category)}`}>
                        {e.category}
                      </span>
                      <span className="text-xs text-slate-500">{timeStr(e.starts_at)}</span>
                    </div>
                    <h3 className="mt-3 truncate font-semibold leading-snug text-slate-100 group-hover:text-white">
                      {e.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDate(e.starts_at)} · {e.venue}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {registeredIds.has(e.id) ? (
                        <span className="inline-block rounded-md bg-indigo-400/10 px-2 py-0.5 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/40">
                          Registered
                        </span>
                      ) : e.ticket ? (
                        <span className="inline-block rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                          Ticket
                        </span>
                      ) : (
                        <span></span>
                      )}
                      <Countdown at={e.starts_at} />
                    </div>
                  </a>
                )
              )}
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
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Live updates</h2>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>
        </div>
        {highlights.length === 0 ? (
          <p className="text-slate-500">No live updates yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.slice(0, 4).map((h) => {
              const card = (
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-slate-200">{h.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {h.event_title && (
                        <span className="font-semibold text-indigo-300">{h.event_title}</span>
                      )}
                      {h.event_title && <span> · </span>}
                      {timeAgo(h.created_at)}
                    </p>
                  </div>
                </div>
              );
              return h.event_id ? (
                <a
                  key={h.id}
                  href={`/event?id=${h.event_id}`}
                  className="card card-ring group rounded-xl bg-white/[0.04] p-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                >
                  {card}
                </a>
              ) : (
                <div key={h.id} className="card card-ring rounded-xl bg-white/[0.04] p-4">
                  {card}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Announcements</h2>
          <a href="/events" className="text-sm text-indigo-300 hover:text-indigo-200">
            View all →
          </a>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-slate-500">Nothing scheduled yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <a
                key={e.id}
                href={`/event?id=${e.id}`}
                className="card card-ring group rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <span className={`category-chip ring-1 ${categoryClass(e.category)}`}>
                    {e.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {e.starts_at
                        ? new Date(e.starts_at).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                    <button
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        pinEvent(e);
                      }}
                      aria-label={pinnedIds.has(e.id) ? "Added to calendar" : "Add to calendar"}
                      title={pinnedIds.has(e.id) ? "Added to calendar" : "Add to calendar"}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-colors sm:h-6 sm:w-6 sm:text-sm ${
                        pinnedIds.has(e.id)
                          ? "bg-indigo-400/20 text-indigo-200 ring-1 ring-indigo-400/40"
                          : "bg-white/10 text-slate-200 ring-1 ring-white/20 hover:bg-indigo-500 hover:text-white"
                      }`}
                    >
                      {pinnedIds.has(e.id) ? "✓" : "+"}
                    </button>
                  </div>
                </div>
                <h3 className="mt-3 font-semibold leading-snug text-slate-100 group-hover:text-white">
                  {e.title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {e.starts_at ? formatDate(e.starts_at) : ""} · {e.venue}
                </p>
                {e.starts_at && <Countdown at={e.starts_at} />}
                {registeredIds.has(e.id) && (
                  <span className="mt-2 inline-block rounded-md bg-indigo-400/10 px-2 py-0.5 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/40">
                    Registered
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Tickets</h2>
          <a href="/tickets" className="text-sm text-indigo-300 hover:text-indigo-200">
            All tickets →
          </a>
        </div>

        {tickets.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">
              Owned
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="card card-ring flex items-center justify-between gap-3 rounded-xl p-4"
                >
                  <div className="min-w-0">
                    <span className={`category-chip ring-1 ${categoryClass(t.category)}`}>
                      {t.category}
                    </span>
                    <p className="mt-1.5 truncate font-semibold text-slate-100">{t.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {t.starts_at
                        ? new Date(t.starts_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "Date TBD"}{" "}
                      · {t.venue}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-white p-1">
                    <QRCodeSVG value={`SEH-TICKET:${t.id}`} size={56} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          Available
        </h3>
        {buyable.length === 0 ? (
          <p className="text-sm text-slate-500">
            {tickets.length > 0
              ? "You already own tickets to every ticketed event."
              : "No ticketed events up for grabs right now."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buyable.map((e) => (
              <div key={e.id} className="card card-ring flex flex-col rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className={`category-chip ring-1 ${categoryClass(e.category)}`}>
                    {e.category}
                  </span>
                  <span className="text-xs text-slate-500">{priceOf(e)}</span>
                </div>
                <h4 className="mt-2 truncate font-semibold text-slate-100">{e.title}</h4>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {e.starts_at
                    ? new Date(e.starts_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "Date TBD"}{" "}
                  · {e.venue}
                </p>
                <div className="mt-auto pt-3">
                  <button
                    onClick={() => buy(e)}
                    disabled={ticketBusy === e.id}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {ticketBusy === e.id ? "Buying…" : "Buy ticket"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {ticketMsg && <p className="mt-3 text-sm text-slate-400">{ticketMsg}</p>}
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
    </div>
  );
}