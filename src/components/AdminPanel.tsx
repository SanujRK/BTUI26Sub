import { useEffect, useState } from "react";
import Guard from "./Guard";
import { useUser } from "../hooks/useUser";
import {
  getEvents,
  getAnnouncements,
  getRecentHighlights,
  saveEvent,
  removeEvent,
  postAnnouncement,
  removeAnnouncement,
  postHighlight,
  type EventView,
  type Announcement,
  type Highlight,
} from "../lib/api";
import { categoryClass } from "../lib/categories";

const CATEGORIES = ["Debate", "Sports", "Exhibition", "Culture", "Tech", "General"];

type FormState = {
  title: string;
  description: string;
  venue: string;
  category: string;
  starts_at: string;
  ends_at: string;
  capacity: string;
  image_url: string;
  is_ticketed: boolean;
  ticket_price: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  venue: "",
  category: "Debate",
  starts_at: "",
  ends_at: "",
  capacity: "",
  image_url: "",
  is_ticketed: false,
  ticket_price: "0",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminPanel() {
  const { user } = useUser();
  const [events, setEvents] = useState<EventView[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ id?: string } | null>(null);
  const [annForm, setAnnForm] = useState({ title: "", body: "", event_id: "" });
  const [hiForm, setHiForm] = useState({ event_id: "", body: "" });
  const [feedback, setFeedback] = useState("");

  const refresh = async () => {
    setEvents(await getEvents());
  };

  const refreshAll = async () => {
    const [ev, ann, hi] = await Promise.all([
      getEvents(),
      getAnnouncements(),
      getRecentHighlights(),
    ]);
    setEvents(ev);
    setAnnouncements(ann);
    setHighlights(hi);
  };

  useEffect(() => {
    getEvents()
      .then((ev) => {
        setEvents(ev);
        return Promise.all([getAnnouncements(), getRecentHighlights()]);
      })
      .then(([ann, hi]) => {
        setAnnouncements(ann);
        setHighlights(hi);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const submitAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.body.trim() || !user) return;
    try {
      await postAnnouncement({
        title: annForm.title.trim(),
        body: annForm.body.trim(),
        author: user.fullName,
        event_id: annForm.event_id || null,
      });
      setAnnForm({ title: "", body: "", event_id: "" });
      setFeedback("Announcement posted.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post announcement.");
    }
  };

  const submitHighlight = async () => {
    if (!hiForm.event_id || !hiForm.body.trim()) return;
    try {
      await postHighlight({ event_id: hiForm.event_id, body: hiForm.body.trim() });
      setHiForm({ event_id: "", body: "" });
      setFeedback("Highlight broadcast live.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post highlight.");
    }
  };

  return (
    <Guard roles={["teacher", "admin"]}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">Admin</h1>
          <button
            onClick={() => setModal({})}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            + New event
          </button>
        </div>

        {error && (
          <p className="card card-ring rounded-2xl p-4 text-center text-sm text-slate-400">
            {error}
          </p>
        )}
        {feedback && (
          <p className="card card-ring rounded-2xl border-emerald-400/30 p-4 text-center text-sm font-medium text-emerald-300">
            {feedback}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="card card-ring rounded-2xl p-5">
            <h2 className="text-lg font-bold tracking-tight">Post announcement</h2>
            <p className="mt-1 text-xs text-slate-500">
              Shows up on the home page, dashboard, and the announcements feed.
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={annForm.title}
                onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              />
              <textarea
                value={annForm.body}
                onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="What everyone should know…"
                className="min-h-24 w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              />
              <select
                value={annForm.event_id}
                onChange={(e) => setAnnForm((f) => ({ ...f, event_id: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              >
                <option value="" className="bg-[#0d0f18]">
                  No linked event
                </option>
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#0d0f18]">
                    {e.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => submitAnnouncement()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Publish announcement
              </button>
            </div>
            {announcements.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                {announcements.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{a.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {a.author} · {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeAnnouncement(a.id)
                          .then(refreshAll)
                          .catch((err) => setError(err.message))
                      }
                      className="rounded-lg px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-400/10"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card card-ring rounded-2xl p-5">
            <h2 className="text-lg font-bold tracking-tight">Live highlight</h2>
            <p className="mt-1 text-xs text-slate-500">
              Broadcasts instantly to the event's detail page via Supabase Realtime.
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={hiForm.event_id}
                onChange={(e) => setHiForm((f) => ({ ...f, event_id: e.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              >
                <option value="" className="bg-[#0d0f18]">
                  Choose an event
                </option>
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#0d0f18]">
                    {e.title}
                  </option>
                ))}
              </select>
              <textarea
                value={hiForm.body}
                onChange={(e) => setHiForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="e.g. Intense final round — the crowd is in! 🔥"
                className="min-h-20 w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              />
              <button
                onClick={() => submitHighlight()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
              >
                Broadcast now
              </button>
            </div>
            {highlights.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                {highlights.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border-l-2 border-violet-400/60 bg-white/5 px-3 py-2"
                  >
                    <p className="text-sm text-slate-200">{h.body}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(h.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight">Manage events</h2>
          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="text-slate-500">No events yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="card card-ring flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`category-chip ring-1 ${categoryClass(e.category)}`}>
                        {e.category}
                      </span>
                      {e.is_ticketed && (
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/30">
                          Ticketed
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 truncate font-semibold text-slate-100">{e.title}</h3>
                    <p className="truncate text-sm text-slate-400">
                      {e.starts_at
                        ? new Date(e.starts_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Date TBD"}{" "}
                      · {e.venue} · {e.registrations}
                      {e.capacity ? `/${e.capacity}` : ""} registered
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setModal({
                          id: e.id,
                        })
                      }
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${e.title}"? This cannot be undone.`)) {
                          removeEvent(e.id)
                            .then(refresh)
                            .catch((err) => setError(err.message));
                        }
                      }}
                      className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {modal && (
        <EventModal
          key={modal.id ?? "new"}
          event={modal.id ? events.find((e) => e.id === modal.id) ?? null : null}
          onClose={() => setModal(null)}
          onDone={async () => {
            await refresh();
            setModal(null);
          }}
          onError={(msg) => setError(msg)}
        />
      )}
    </Guard>
  );
}

function EventModal({
  event,
  onClose,
  onDone,
  onError,
}: {
  event: EventView | null;
  onClose: () => void;
  onDone: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<FormState>(
    event
      ? {
          title: event.title,
          description: event.description,
          venue: event.venue,
          category: event.category,
          starts_at: toLocalInput(event.starts_at),
          ends_at: toLocalInput(event.ends_at),
          capacity: event.capacity != null ? String(event.capacity) : "",
          image_url: event.image_url ?? "",
          is_ticketed: event.is_ticketed,
          ticket_price: String(event.ticket_price),
        }
      : emptyForm
  );
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await saveEvent({
        title: form.title.trim(),
        description: form.description,
        venue: form.venue,
        category: form.category,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        image_url: form.image_url || null,
        is_ticketed: form.is_ticketed,
        ticket_price: Number(form.ticket_price) || 0,
        id: event?.id,
      });
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const input =
    "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400";
  const label = "text-sm font-semibold text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card card-ring w-full max-w-2xl rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white">
          {event ? "Edit event" : "New event"}
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Title</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={input}
              placeholder="e.g. National Debate Finals"
            />
          </div>
          <div>
            <label className={label}>Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={input}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#0d0f18]">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Venue</label>
            <input
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
              className={input}
              placeholder="Gym 2"
            />
          </div>
          <div>
            <label className={label}>Starts (blank = date TBD)</label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set("starts_at", e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Ends (optional)</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => set("ends_at", e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Capacity (blank = unlimited)</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              className={input}
              placeholder="e.g. 50"
            />
          </div>
          <div>
            <label className={label}>Image URL (optional)</label>
            <input
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              className={input}
              placeholder="https://…"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${input} min-h-24 resize-y`}
              placeholder="What students should know about this event…"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_ticketed}
              onChange={(e) => set("is_ticketed", e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            <label className="text-sm font-semibold text-slate-300">Ticketed event</label>
            {form.is_ticketed && (
              <div className="ml-auto w-40">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.ticket_price}
                  onChange={(e) => set("ticket_price", e.target.value)}
                  className={input}
                  placeholder="Price"
                />
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => submit()}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : event ? "Save changes" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}