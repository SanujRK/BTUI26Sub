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

function defaultTime() {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return { date: d, time: hm };
}

export default function AnnouncementsFeed() {
  const { user } = useUser();
  const [items, setItems] = useState<Announcement[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [pins, setPins] = useState<CustomEventRow[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [pinModal, setPinModal] = useState<Announcement | null>(null);
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

  const isAdded = (a: Announcement) =>
    a.event_id ? pinnedIds.has(a.event_id) : savedIds.has(a.id);

  const pinEvent = async (a: Announcement) => {
    if (pinnedIds.has(a.event_id!)) return;
    const ev = await getEvent(a.event_id!).catch(() => null);
    if (!ev?.starts_at) return;
    await createCustomEvent({
      title: a.title,
      color: "#818cf8",
      starts_at: ev.starts_at,
      event_id: a.event_id,
    });
    setPins(await getCustomEvents());
  };

  const pinNoEvent = async (title: string, start: string) => {
    if (!pinModal) return;
    await createCustomEvent({ title, color: "#818cf8", starts_at: start });
    setSavedIds((s) => new Set(s).add(pinModal.id));
    setPinModal(null);
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
            {user && (
              <button
                onClick={() => (a.event_id ? pinEvent(a) : setPinModal(a))}
                disabled={isAdded(a)}
                aria-label={isAdded(a) ? "Added to calendar" : "Add to calendar"}
                title={isAdded(a) ? "Added to calendar" : "Add to calendar"}
                className={`ml-auto flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-colors disabled:cursor-default sm:h-6 sm:w-6 sm:text-sm ${
                  isAdded(a)
                    ? "bg-indigo-400/20 text-indigo-200 ring-1 ring-indigo-400/40"
                    : "bg-white/10 text-slate-200 ring-1 ring-white/20 hover:bg-indigo-500 hover:text-white"
                }`}
              >
                {isAdded(a) ? "✓" : "+"}
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
      {pinModal && (
        <DateTimeModal
          title={pinModal.title}
          onClose={() => setPinModal(null)}
          onSave={(s) => pinNoEvent(pinModal.title, s)}
        />
      )}
    </div>
  );
}

function DateTimeModal({
  title,
  onClose,
  onSave,
}: {
  title: string;
  onClose: () => void;
  onSave: (start: string) => Promise<void>;
}) {
  const init = defaultTime();
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setBusy(true);
    setErrorMsg("");
    try {
      await onSave(new Date(`${date}T${time || "12:00"}:00`).toISOString());
    } catch (e) {
      setErrorMsg((e as Error)?.message ?? "Save failed. Try again.");
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 [color-scheme:dark]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card card-ring w-full max-w-md rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white">Pin "{title}"</h3>
        <p className="mt-1 text-xs text-slate-500">
          Add this as a reminder on your calendar.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-400">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-400">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </div>
        </div>
        {errorMsg && (
          <p className="mt-4 rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/30">
            {errorMsg}
          </p>
        )}
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
            Add to calendar
          </button>
        </div>
      </div>
    </div>
  );
}