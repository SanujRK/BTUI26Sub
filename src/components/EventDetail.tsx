import { useEffect, useState } from "react";
import { useUser } from "../hooks/useUser";
import {
  getEvent,
  getHighlights,
  registerForEvent,
  buyTicket,
  hasRegistration,
  hasTicket,
  subscribeToHighlights,
  type EventView,
  type Highlight,
} from "../lib/api";
import { categoryClass } from "../lib/categories";
import Countdown from "./Countdown";

export default function EventDetail() {
  const { user } = useUser();
  const [id] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("id") ?? ""
  );
  const [event, setEvent] = useState<EventView | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [ticketed, setTicketed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) {
      setError("No event selected.");
      setLoading(false);
      return;
    }
    getEvent(id)
      .then((e) => {
        setEvent(e);
        setError(e ? "" : "Event not found.");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getHighlights(id)
      .then(setHighlights)
      .catch(() => undefined);
    return subscribeToHighlights(id, (h) =>
      setHighlights((prev) => {
        if (prev.some((p) => p.id === h.id)) return prev;
        return [h, ...prev];
      })
    );
  }, [id]);

  useEffect(() => {
    if (!user || !event) return;
    Promise.all([hasRegistration(user.id, event.id), hasTicket(user.id, event.id)])
      .then(([r, t]) => {
        setRegistered(r);
        setTicketed(t);
      })
      .catch(() => undefined);
  }, [user, event]);

  if (loading) {
    return <p className="py-20 text-center text-slate-500">Loading event…</p>;
  }

  if (error || !event) {
    return <p className="card card-ring rounded-2xl p-8 text-center text-slate-400">{error || "Event not found."}</p>;
  }

  const capacity = event.capacity;
  const count = capacity != null ? event.registration_count ?? event.registrations : null;
  const full = capacity != null && count != null && count >= capacity;
  const percent = capacity && count != null ? Math.min(100, Math.round((count / capacity) * 100)) : 0;
  const registrationsOpen = event.registrations_enabled !== false;
  const showCount = event.show_registration_count !== false;
  const price =
    event.is_ticketed && event.ticket_price > 0
      ? event.ticket_price % 1 === 0
        ? `$${event.ticket_price}`
        : `$${event.ticket_price.toFixed(2)}`
      : "";

  const act = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    const res = await fn();
    setMessage(res.message);
    setBusy(false);
    if (res.ok || res.message === "already registered" || res.message === "ticket already owned") {
      const fresh = await getEvent(event.id);
      if (fresh) setEvent(fresh);
      setRegistered(true);
      setTicketed(event.is_ticketed);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`category-chip rounded-full px-3 py-1 text-xs font-bold ring-1 ${categoryClass(event.category)}`}>
            {event.category}
          </span>
          {event.capacity != null && showCount && (
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400 ring-1 ring-white/10">
              {capacity! - (event.registration_count ?? event.registrations)} spots left
            </span>
          )}
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{event.title}</h1>

        <div className="mt-4 space-y-2 text-slate-300">
          {event.starts_at ? (
            <>
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                {new Date(event.starts_at).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {new Date(event.starts_at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {event.ends_at && (
                  <>
                    {" – "}
                    {new Date(event.ends_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Date to be announced — register to pin it
            </p>
          )}
          {event.venue && (
            <p className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {event.venue}
            </p>
          )}
        </div>

        {event.starts_at && (
          <div className="mt-6">
            <Countdown target={event.starts_at} label="This event has started" />
          </div>
        )}

        <p className="mt-6 text-slate-300">{event.description}</p>

        {capacity != null && showCount && (
          <div className="card card-ring mt-6 rounded-2xl p-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-slate-300">
                Capacity: {count} / {capacity}
              </span>
              <span className={`font-bold ${full ? "text-rose-400" : "text-emerald-400"}`}>
                {full ? "Full" : `${percent}% filled`}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${full ? "bg-rose-500" : "bg-indigo-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="card card-ring mt-6 rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Live highlights
          </h2>
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
            {highlights.length === 0 && (
              <p className="text-sm text-slate-500">
                No highlights yet — the organizing team posts live updates here during the event.
              </p>
            )}
            {highlights.map((h) => (
              <div key={h.id} className="border-l-2 border-indigo-400/60 pl-3">
                <p className="text-sm text-slate-300">{h.body}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(h.created_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="card card-ring rounded-2xl p-5">
          {!user && (
            <>
              <a
                href="/login"
                className="block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Sign in to{" "}
                {event.is_ticketed
                  ? "buy a ticket"
                  : registrationsOpen
                    ? "register"
                    : "follow this event"}
              </a>
            </>
          )}

          {user && !event.is_ticketed && registered && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              You're registered
            </div>
          )}

          {user && !event.is_ticketed && !registered && registrationsOpen && (
            <button
              onClick={() => act(() => registerForEvent(event.id))}
              disabled={busy || full}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {full ? "Event is full" : "Register"}
            </button>
          )}

          {user && !event.is_ticketed && !registered && !registrationsOpen && (
            <p className="rounded-lg bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-400 ring-1 ring-white/10">
              Registrations are closed
            </p>
          )}

          {user && event.is_ticketed && ticketed && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Ticket owned
              <a href="/tickets" className="underline decoration-emerald-400/50 underline-offset-2">
                View
              </a>
            </div>
          )}

          {user && event.is_ticketed && !ticketed && (
            <button
              onClick={() => act(() => buyTicket(event.id))}
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {price ? `Buy ticket · ${price}` : "Get a ticket"}
            </button>
          )}

          {message && (
            <p className="mt-3 text-center text-xs font-medium text-slate-400">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}