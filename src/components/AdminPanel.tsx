import { useEffect, useState } from "react";
import Guard from "./Guard";
import { useUser } from "../hooks/useUser";
import {
  getEvents,
  getRecentHighlights,
  getProfiles,
  changeUserRole,
  getTheme,
  setTheme,
  getPalette,
  setPalette,
  saveEvent,
  removeEvent,
  postHighlight,
  type EventView,
  type Highlight,
  type ProfileRow,
} from "../lib/api";
import { categoryClass } from "../lib/categories";
import { applyPalette, DEFAULT_PALETTE, PALETTE_FIELDS, type SitePalette } from "../lib/palette";

const CATEGORIES = ["Debate", "Sports", "Exhibition", "Culture", "Tech", "General"];

const TAB_ICONS: Record<string, string> = {
  Events: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  Highlights: "M13 10V3L4 14h7v7l9-11h-7z",
  Appearance: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 0l2 2-1 3h-2l-1-3 2-2zm0 6a3 3 0 110 6 3 3 0 010-6z",
  Teachers: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11-2h-6m3 3V6",
};

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
  registrations_enabled: boolean;
  show_registration_count: boolean;
  registration_count: string;
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
  registrations_enabled: true,
  show_registration_count: true,
  registration_count: "",
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
  const isAdmin = user?.role === "admin";
  const tabs = isAdmin
    ? ["Events", "Highlights", "Appearance", "Teachers"]
    : ["Events", "Highlights"];
  const [tab, setTab] = useState<string>(tabs[0]);
  const [events, setEvents] = useState<EventView[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ id?: string } | null>(null);
  const [hiForm, setHiForm] = useState({ event_id: "", body: "" });
  const [eventQuery, setEventQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [palette, setPaletteState] = useState<SitePalette>(DEFAULT_PALETTE);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roleBusy, setRoleBusy] = useState("");
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setEvents(await getEvents());
  };

  const refreshAll = async () => {
    const [ev, hi] = await Promise.all([getEvents(), getRecentHighlights()]);
    setEvents(ev);
    setHighlights(hi);
  };

  useEffect(() => {
    getEvents()
      .then((ev) => {
        setEvents(ev);
        return Promise.all([
          getRecentHighlights(),
          getTheme(),
          getProfiles(),
          getPalette(),
        ]);
      })
      .then(([hi, t, prof, pal]) => {
        setHighlights(hi);
        setThemeState((t as "dark" | "light") ?? "dark");
        setProfiles(prof);
        setPaletteState(pal);
        applyPalette(pal);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const applyTheme = async (next: "dark" | "light") => {
    setThemeState(next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    try {
      await setTheme(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme.");
    }
  };

  const saveColours = async () => {
    try {
      await setPalette(palette);
      applyPalette(palette);
      setFeedback("Colours saved across the whole site.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save colours.");
    }
  };

  const resetColours = async () => {
    applyPalette(DEFAULT_PALETTE);
    setPaletteState(DEFAULT_PALETTE);
    try {
      await setPalette(DEFAULT_PALETTE);
      setFeedback("Colours reset to the defaults.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset colours.");
    }
  };

  const flipRole = async (p: ProfileRow) => {
    const next = p.role === "teacher" ? "student" : "teacher";
    setRoleBusy(p.id);
    try {
      const msg = await changeUserRole(p.id, next);
      if (msg !== "role updated") {
        setError(msg || "Failed to update role.");
      } else {
        setProfiles((list) =>
          list.map((x) => (x.id === p.id ? { ...x, role: next } : x))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
    setRoleBusy("");
  };

  const submitHighlight = async () => {
    if (!hiForm.event_id || !hiForm.body.trim()) return;
    try {
      await postHighlight({ event_id: hiForm.event_id, body: hiForm.body.trim() });
      setHiForm({ event_id: "", body: "" });
      setEventQuery("");
      setFeedback("Highlight broadcast live.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post highlight.");
    }
  };

  const input = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400";

  const matches = search.trim()
    ? profiles.filter(
        (p) =>
          (p.full_name || "").toLowerCase().includes(search.trim().toLowerCase()) ||
          p.email.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const filteredEvents = eventQuery.trim()
    ? events.filter((e) =>
        e.title.toLowerCase().includes(eventQuery.trim().toLowerCase())
      )
    : events;

  const now = Date.now();
  const eventSuggestions = eventQuery.trim()
    ? [...events]
        .filter((e) =>
          e.title.toLowerCase().includes(eventQuery.trim().toLowerCase())
        )
        .filter((e) => isAdmin || e.created_by === user?.id)
        .sort((a, b) => {
          const da = a.starts_at
            ? Math.abs(new Date(a.starts_at).getTime() - now)
            : Infinity;
          const db = b.starts_at
            ? Math.abs(new Date(b.starts_at).getTime() - now)
            : Infinity;
          return da - db;
        })
        .slice(0, 8)
    : [];

  const teachers = profiles.filter((p) => p.role === "teacher");

  return (
    <Guard roles={["teacher", "admin"]}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">Admin</h1>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d={TAB_ICONS[t]} />
              </svg>
              {t}
            </button>
          ))}
        </nav>

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

        {tab === "Events" && (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight">Manage events</h2>
              <div className="flex items-center gap-2">
                <input
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder="Search events…"
                  className="w-56 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => setModal({})}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  + New event
                </button>
              </div>
            </div>
            {loading ? (
              <p className="py-8 text-center text-slate-500">Loading events…</p>
            ) : filteredEvents.length === 0 ? (
              <p className="text-slate-500">
                {eventQuery.trim() ? "No events match your search." : "Every event is an announcement — create one and it shows up on the home feed and calendar automatically."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredEvents.map((e) => (
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
                        {e.registrations_enabled === false && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-white/10">
                            Registrations off
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
                        · {e.venue}
                        {e.show_registration_count !== false &&
                          ` · ${e.registration_count ?? e.registrations}${e.capacity ? `/${e.capacity}` : ""} registered`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(isAdmin || e.created_by === user?.id) && (
                        <>
                          <button
                            onClick={() => setModal({ id: e.id })}
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
                        </>
                      )}
                      {!isAdmin && e.created_by !== user?.id && (
                        <span className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-500">
                          Created by a colleague
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "Highlights" && (
          <section className="card card-ring rounded-2xl p-5">
            <h2 className="text-lg font-bold tracking-tight">Live highlight</h2>
            <p className="mt-1 text-xs text-slate-500">
              Broadcasts instantly to the event's detail page via Supabase Realtime.
            </p>
            <div className="mt-4 space-y-3">
              {hiForm.event_id ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {events.find((e) => e.id === hiForm.event_id)?.title ?? "Choose an event"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {events.find((e) => e.id === hiForm.event_id)?.starts_at
                        ? new Date(events.find((e) => e.id === hiForm.event_id)!.starts_at!).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "Date TBD"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setHiForm((f) => ({ ...f, event_id: "" }));
                      setEventQuery("");
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={eventQuery}
                    onChange={(e) => setEventQuery(e.target.value)}
                    placeholder="Search event…"
                    className={input}
                    autoFocus
                  />
                  {eventQuery.trim() && (
                    <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-(--bg-page) p-1 shadow-lg">
                      {eventSuggestions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-slate-500">
                          No events match “{eventQuery.trim()}”.
                        </p>
                      ) : (
                        eventSuggestions.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => {
                              setHiForm((f) => ({ ...f, event_id: e.id }));
                              setEventQuery("");
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-slate-100">
                              {e.title}
                            </span>
                            <span className="shrink-0 text-xs text-slate-500">
                              {e.starts_at
                                ? new Date(e.starts_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Date TBD"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <textarea
                value={hiForm.body}
                onChange={(e) => setHiForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="e.g. Intense final round — the crowd is in! 🔥"
                className={`${input} min-h-20 resize-y`}
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
        )}

        {isAdmin && tab === "Appearance" && (
          <section className="card card-ring rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Site-wide theme</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => applyTheme("dark")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    theme === "dark"
                      ? "bg-slate-200 text-slate-900"
                      : "border border-white/15 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => applyTheme("light")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    theme === "light"
                      ? "bg-slate-200 text-slate-900"
                      : "border border-white/15 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-base font-bold tracking-tight">Colour palette</h3>
              <p className="mt-1 text-xs text-slate-500">
                Every visitor sees these colours across the whole site. Pick, then save.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {PALETTE_FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-sm font-semibold text-slate-400">{f.label}</span>
                    {f.hint && <span className="block text-xs text-slate-600">{f.hint}</span>}
                    <input
                      type="color"
                      value={palette[f.key]}
                      onChange={(e) =>
                        setPaletteState((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                      className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-white/5"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => saveColours()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  Save colours
                </button>
                <button
                  onClick={() => resetColours()}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && tab === "Teachers" && (
          <section className="card card-ring rounded-2xl p-5">
            <h2 className="text-lg font-bold tracking-tight">Teachers</h2>
            <p className="mt-1 text-xs text-slate-500">
              All teachers here can post events and broadcast highlights. Search to promote a
              student.
            </p>
            <div className="mt-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email to promote…"
                className={input}
              />
            </div>

            {!search.trim() ? (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  All teachers ({teachers.length})
                </h3>
                <div className="mt-2 space-y-2">
                  {teachers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No teachers yet — search above and promote someone.
                    </p>
                  ) : (
                    teachers.map((p) => (
                      <TeacherRow
                        key={p.id}
                        profile={p}
                        currentUserId={user?.id}
                        busy={roleBusy === p.id}
                        onFlip={() => flipRole(p)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : matches.length === 0 ? (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Search results ({matches.length})
                </h3>
                <p className="mt-2 text-sm text-slate-500">No users match “{search.trim()}”.</p>
              </div>
            ) : (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Search results ({matches.length})
                </h3>
                <div className="mt-2 space-y-2">
                  {matches.map((p) => (
                    <TeacherRow
                      key={p.id}
                      profile={p}
                      currentUserId={user?.id}
                      busy={roleBusy === p.id}
                      onFlip={() => flipRole(p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
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

function TeacherRow({
  profile,
  currentUserId,
  busy,
  onFlip,
}: {
  profile: ProfileRow;
  currentUserId?: string;
  busy: boolean;
  onFlip: () => void;
}) {
  const p = profile;
  const actionable = p.role !== "admin" && p.id !== currentUserId;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-200">{p.full_name || "Unnamed"}</p>
        <p className="truncate text-xs text-slate-500">{p.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
            p.role === "admin"
              ? "bg-amber-400/15 text-amber-300 ring-amber-400/30"
              : p.role === "teacher"
                ? "bg-indigo-400/15 text-indigo-300 ring-indigo-400/30"
                : "bg-white/5 text-slate-400 ring-white/10"
          }`}
        >
          {p.role}
        </span>
        {actionable && (
          <button
            onClick={onFlip}
            disabled={busy}
            className="rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? "…" : p.role === "teacher" ? "Demote" : "Promote"}
          </button>
        )}
      </div>
    </div>
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
          registrations_enabled: event.registrations_enabled !== false,
          show_registration_count: event.show_registration_count !== false,
          registration_count:
            event.registration_count != null ? String(event.registration_count) : "",
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
        registrations_enabled: form.registrations_enabled,
        show_registration_count: form.show_registration_count,
        registration_count: form.registration_count
          ? Number(form.registration_count)
          : null,
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
                <option key={c} value={c} className="bg-(--bg-page)">
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
          <div className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.registrations_enabled}
              onChange={(e) => set("registrations_enabled", e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            <div>
              <label className="text-sm font-semibold text-slate-300">Enable registrations</label>
              <p className="text-xs text-slate-500">
                Turn off to post it as a plain announcement — no one can register.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-300">Show registration count</span>
            <div className="flex rounded-lg border border-white/15 p-0.5">
              <button
                onClick={() => set("show_registration_count", true)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  form.show_registration_count
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => set("show_registration_count", false)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  !form.show_registration_count
                    ? "bg-rose-500/20 text-rose-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                No
              </button>
            </div>
            {form.show_registration_count && (
              <div className="ml-auto w-36">
                <input
                  type="number"
                  min={0}
                  value={form.registration_count}
                  onChange={(e) => set("registration_count", e.target.value)}
                  className={input}
                  placeholder="Amount"
                  title="Leave blank to show the real headcount"
                />
                <p className="mt-0.5 text-xs text-slate-600">Blank = real headcount</p>
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