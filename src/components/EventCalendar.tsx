import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

import { useUser } from "../hooks/useUser";
import {
  getEvents,
  getCustomEvents,
  getTbdPool,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  type EventView,
  type CustomEventRow,
  type TbdRegistration,
} from "../lib/api";
import { categoryColorOf } from "../lib/categories";

const CATEGORIES = ["Debate", "Sports", "Exhibition", "Culture", "Tech", "General"];

const PALETTE = ["#818cf8", "#a78bfa", "#34d399", "#38bdf8", "#fb7185", "#22d3ee", "#fbbf24"];

type ModalState =
  | { kind: "create"; start: string }
  | { kind: "tbd"; eventId: string; title: string; start: string }
  | { kind: "edit"; id: string; title: string; color: string; start: string };

type AnnouncementNotice = { id: string; title: string; starts_at: string };

export default function EventCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const { user } = useUser();

  const [events, setEvents] = useState<EventView[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEventRow[]>([]);
  const [pool, setPool] = useState<TbdRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<AnnouncementNotice[] | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const [view, setView] = useState<string>(() =>
    isMobile ? "listMonth" : "dayGridMonth"
  );

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message));
    if (user) {
      Promise.all([getCustomEvents(), getTbdPool()])
        .then(([c, p]) => {
          setCustomEvents(c);
          setPool(p);
        })
        .catch((err) => setError(err.message));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(view);
  }, [view]);

  const eventById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events]
  );

  useEffect(() => {
    const announced = customEvents.filter((c) => {
      if (c.notified_at || !c.event_id) return false;
      const linked = eventById.get(c.event_id);
      return !!linked && !!linked.starts_at;
    });
    if (announced.length === 0) return;
    setNotice(
      announced.map((c) => ({
        id: c.id,
        title: eventById.get(c.event_id!)!.title,
        starts_at: eventById.get(c.event_id!)!.starts_at!,
      }))
    );
  }, [customEvents, eventById]);

  const refresh = async () => {
    if (!user) return;
    const [c, p] = await Promise.all([getCustomEvents(), getTbdPool()]);
    setCustomEvents(c);
    setPool(p);
  };

  const saveCustom = async (
    title: string,
    color: string,
    start: string,
    eventId: string | null
  ) => {
    await createCustomEvent({ title, color, starts_at: start, event_id: eventId });
    await refresh();
    setModal(null);
  };

  if (error) {
    return <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">{error}</p>;
  }

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading calendar…</p>;
  }

  const officialEvents = events
    .filter((e) => e.starts_at)
    .filter((e) => {
      if (category && e.category !== category) return false;
      if (query && !e.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      start: e.starts_at!,
      end: e.ends_at ?? undefined,
      editable: false,
      backgroundColor: categoryColorOf(e.category),
      borderColor: categoryColorOf(e.category),
      extendedProps: { url: `/event?id=${e.id}` },
    }));

  const reminderEvents = customEvents
    .filter((c) => c.starts_at)
    .map((c) => ({
      id: `custom-${c.id}`,
      title: c.title,
      start: c.starts_at,
      allDay: true,
      editable: true,
      backgroundColor: c.color,
      borderColor: c.color,
      extendedProps: { isCustom: true, customId: c.id },
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {(["dayGridMonth", "listMonth"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === v
                  ? "bg-indigo-600 text-white"
                  : "border border-white/15 text-slate-300 hover:bg-white/5"
              }`}
            >
              {v === "dayGridMonth" ? "Month" : "List"}
            </button>
          ))}
        </div>
        {user && (
          <button
            onClick={() => setModal({ kind: "create", start: new Date().toISOString() })}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            + Custom reminder
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events…"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`category-chip ring-1 ${
              category === ""
                ? "bg-indigo-400/25 text-indigo-200 ring-indigo-400/40"
                : "bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? "" : c)}
              className={`category-chip ring-1 ${
                category === c
                  ? "bg-indigo-400/25 text-indigo-200 ring-indigo-400/40"
                  : "bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="card card-ring overflow-hidden rounded-2xl p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={[...officialEvents, ...reminderEvents]}
            dayMaxEventRows={3}
            height="auto"
            droppable
            editable
            selectable
            select={(info) => {
              if (!user) return;
              setModal({ kind: "create", start: new Date(info.startStr + "T00:00:00").toISOString() });
            }}
            eventReceive={(info) => {
              const el = info.draggedEl;
              const eventId = el.dataset.eventId;
              if (!eventId) return;
              saveCustom(
                el.dataset.title ?? "Reminder",
                PALETTE[0],
                new Date(info.dateStr + "T00:00:00").toISOString(),
                eventId
              ).catch((err) => setError(err.message));
              info.event.remove();
            }}
            eventDrop={(info) => {
              const customId = info.event.extendedProps.customId;
              if (!customId || !info.event.start) return;
              updateCustomEvent(customId as string, { starts_at: info.event.start.toISOString() })
                .catch((err) => setError(err.message));
            }}
            eventClick={(info) => {
              if (info.event.extendedProps.isCustom) {
                const id = info.event.extendedProps.customId as string;
                setModal({
                  kind: "edit",
                  id,
                  title: info.event.title,
                  color: info.event.backgroundColor,
                  start: info.event.start?.toISOString() ?? "",
                });
                return;
              }
              window.location.assign(info.event.extendedProps.url);
            }}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            buttonText={{ today: "Today" }}
            locale="en"
          />
        </div>

        <aside className="card card-ring rounded-2xl p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Pin a TBD event
          </h2>
          {!user ? (
            <p className="mt-3 text-sm text-slate-500">
              Sign in to pin date-free events to your calendar.
            </p>
          ) : pool.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              TBD events you register for will appear here.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Drag onto a day, or tap to pick a date.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {pool.map((t) => (
              <div
                key={t.event_id}
                className="fc-event fc-draggable cursor-grab select-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
                data-event={JSON.stringify({ title: t.title })}
                data-event-id={t.event_id}
                data-title={t.title}
                onClick={() => {
                  if (!user) return;
                  setModal({
                    kind: "tbd",
                    eventId: t.event_id,
                    title: t.title,
                    start: new Date().toISOString(),
                  });
                }}
              >
                {t.title}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {modal && (
        <CustomModal
          modal={modal}
          defaultTitle={modal.kind === "edit" ? modal.title : modal.kind === "create" ? "" : modal.title}
          defaultColor={modal.kind === "edit" ? modal.color : PALETTE[0]}
          defaultStart={modal.start}
          showTitleField={modal.kind !== "tbd"}
          onClose={() => setModal(null)}
          onSave={async (title, color, start) => {
            if (modal.kind === "edit") {
              await updateCustomEvent(modal.id, { title, color, starts_at: start });
              await refresh();
              setModal(null);
            } else if (modal.kind === "tbd") {
              await saveCustom(title, color, start, modal.eventId);
            } else {
              await saveCustom(title, color, start, null);
            }
          }}
          onDelete={
            modal.kind === "edit"
              ? async () => {
                  await deleteCustomEvent(modal.id);
                  await refresh();
                  setModal(null);
                }
              : undefined
          }
        />
      )}

      {notice && notice.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card card-ring w-full max-w-md rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white">Official dates announced</h3>
            <div className="mt-3 space-y-2">
              {notice.map((n) => (
                <p key={n.id} className="text-sm text-slate-300">
                  <span className="font-semibold text-white">{n.title}</span> is now on{" "}
                  {new Date(n.starts_at).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  .
                </p>
              ))}
            </div>
            <button
              onClick={async () => {
                await Promise.all(
                  notice.map((n) =>
                    updateCustomEvent(n.id, { notified_at: new Date().toISOString() })
                  )
                );
                setNotice(null);
              }}
              className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type CustomModalProps = {
  modal: ModalState;
  defaultTitle: string;
  defaultColor: string;
  defaultStart: string;
  showTitleField: boolean;
  onClose: () => void;
  onSave: (title: string, color: string, start: string) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function CustomModal({
  modal,
  defaultTitle,
  defaultColor,
  defaultStart,
  showTitleField,
  onClose,
  onSave,
  onDelete,
}: CustomModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [color, setColor] = useState(defaultColor);
  const [start, setStart] = useState(defaultStart.slice(0, 10));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSave(
        title.trim(),
        color,
        new Date(start.slice(0, 10) + "T00:00:00").toISOString()
      );
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card card-ring w-full max-w-md rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white">
          {modal.kind === "edit" ? "Edit reminder" : modal.kind === "tbd" ? `Pin "${modal.title}"` : "New reminder"}
        </h3>
        {modal.kind === "tbd" && (
          <p className="mt-1 text-xs text-slate-500">
            We'll keep it linked to the official event and tell you when its date is set.
          </p>
        )}
        {showTitleField && (
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-400">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="e.g. Bring water bottle"
            />
          </div>
        )}
        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-400">Date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          />
        </div>
        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-400">Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition-transform ${
                  color === c ? "scale-110 ring-2 ring-white" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {onDelete && (
            <button
              onClick={() => onDelete()}
              className="rounded-lg border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10"
            >
              Delete
            </button>
          )}
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}