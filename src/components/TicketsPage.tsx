import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "../hooks/useUser";
import {
  getEvents,
  getMyTickets,
  buyTicket,
  type EventView,
  type TicketView,
} from "../lib/api";
import { categoryClass } from "../lib/categories";

export default function TicketsPage() {
  const { user } = useUser();
  const [events, setEvents] = useState<EventView[]>([]);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = async () => {
    const [ev, t] = await Promise.all([getEvents(), getMyTickets()]);
    setEvents(ev);
    setTickets(t);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([getEvents(), getMyTickets()])
      .then(([ev, t]) => {
        setEvents(ev);
        setTickets(t);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading tickets…</p>;
  }

  if (error) {
    return <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">{error}</p>;
  }

  if (!user) {
    return (
      <div className="card card-ring mx-auto max-w-md rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-white">Sign in to see your tickets</h2>
        <p className="mt-2 text-sm text-slate-400">
          Buy tickets for ticketed events and keep them in your pocket.
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

  const buyable = events.filter((e) => e.is_ticketed);
  const priceOf = (e: EventView) =>
    e.ticket_price > 0
      ? e.ticket_price % 1 === 0
        ? `$${e.ticket_price}`
        : `$${e.ticket_price.toFixed(2)}`
      : "Free";

  const act = async (e: EventView) => {
    setBusy(e.id);
    setMessage("");
    const res = await buyTicket(e.id);
    setMessage(res.message);
    setBusy("");
    if (res.ok || res.message === "ticket already owned") {
      await refresh();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Ticketed events</h2>
        {buyable.length === 0 ? (
          <p className="text-slate-500">Nothing here yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buyable.map((e) => {
              const owned = tickets.some((t) => t.event_id === e.id);
              return (
                <div key={e.id} className="card card-ring flex flex-col rounded-2xl p-5">
                  <span className={`category-chip ring-1 ${categoryClass(e.category)}`}>
                    {e.category}
                  </span>
                  <h3 className="mt-2 font-semibold text-slate-100">{e.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {e.starts_at
                      ? new Date(e.starts_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "Date TBD"}{" "}
                    · {e.venue}
                  </p>
                  <div className="mt-auto pt-4">
                    {owned ? (
                      <span className="block rounded-lg bg-emerald-500/15 px-4 py-2 text-center text-sm font-semibold text-emerald-300">
                        Ticket owned
                      </span>
                    ) : (
                      <button
                        onClick={() => act(e)}
                        disabled={busy === e.id}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {busy === e.id ? "Buying…" : `Buy · ${priceOf(e)}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {message && <p className="mt-3 text-sm text-slate-400">{message}</p>}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">My tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-slate-500">
            No tickets yet — buy one above and its QR code lands here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((t) => (
              <div key={t.id} className="card card-ring rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`category-chip ring-1 ${categoryClass(t.category)}`}>
                      {t.category}
                    </span>
                    <h3 className="mt-2 font-semibold text-slate-100">{t.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {t.starts_at
                        ? new Date(t.starts_at).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                          })
                        : "Date TBD"}{" "}
                      · {t.venue}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-1.5">
                    <QRCodeSVG value={`SEH-TICKET:${t.id}`} size={72} />
                  </div>
                </div>
                <p className="mt-3 truncate rounded bg-white/5 px-2 py-1 text-center text-[11px] font-mono text-slate-500">
                  {t.id}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}