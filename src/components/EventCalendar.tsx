import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";

import { useUser } from "../hooks/useUser";
import {
  getEvents,
  getCustomEvents,
  getTbdPool,
  getMyRegistrations,
  getMyTickets,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,
  type EventView,
  type CustomEventRow,
  type TbdRegistration,
  type MyRegistration,
  type TicketView,
} from "../lib/api";
import { categoryColorOf, CATEGORIES } from "../lib/categories";
import { contrastText } from "../lib/palette";

const PALETTE = ["#818cf8", "#a78bfa", "#34d399", "#38bdf8", "#fb7185", "#22d3ee", "#fbbf24"];

function dateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function timeOnly(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function coversDay(startIso: string, endIso: string | null | undefined, day: string): boolean {
  const startDay = dateOnly(new Date(startIso));
  const endDay = endIso ? dateOnly(new Date(endIso)) : startDay;
  return day >= startDay && day <= endDay;
}

function rangeLabel(startIso: string, endIso: string | null | undefined): string {
  const startDay = dateOnly(new Date(startIso));
  const endDay = endIso ? dateOnly(new Date(endIso)) : startDay;
  if (endDay === startDay) return timeOnly(new Date(startIso));
  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  return `${fmt(startDay)} – ${fmt(endDay)}`;
}

type ModalState =
  | { kind: "create"; start: string }
  | { kind: "tbd"; eventId: string; title: string; start: string }
  | { kind: "edit"; id: string; title: string; color: string; start: string };

type AnnouncementNotice = { id: string; title: string; starts_at: string };

const ELLIPSIS = "…";

let measureCtx: CanvasRenderingContext2D | null = null;

function textWidth(text: string, font: string): number {
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d");
  }
  if (!measureCtx) return text.length * 6;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function cssFontOf(el: HTMLElement): string {
  const s = getComputedStyle(el);
  return `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
}

function fitTitle(label: string, avail: number, font: string): string {
  if (avail <= 0) return label;
  if (textWidth(label, font) <= avail) return label;
  let lo = 0;
  let hi = label.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (textWidth(label.slice(0, mid) + ELLIPSIS, font) <= avail) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? ELLIPSIS : label.slice(0, lo) + ELLIPSIS;
}

export default function EventCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const fitTitles = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.querySelectorAll<HTMLElement>("[data-fc-label]").forEach((node) => {
      const label = node.dataset.fcLabel || "";
      if (!label) return;
      const parent = node.parentElement;
      if (!parent) return;
      const s = getComputedStyle(node);
      const padX = (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0);
      const avail = parent.clientWidth - padX - 1;
      if (avail <= 20) return;
      const next = fitTitle(label, avail, cssFontOf(node));
      if (node.textContent !== next) node.textContent = next;
    });
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    let queued = 0;
    const schedule = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        fitTitles();
      });
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(shell);
    const mo = new MutationObserver(schedule);
    mo.observe(shell, { childList: true, subtree: true });
    schedule();
    return () => {
      ro.disconnect();
      mo.disconnect();
      if (queued) cancelAnimationFrame(queued);
    };
  }, [fitTitles]);
  const poolDraggables = useRef(new Map<string, { destroy: () => void }>());
  const panelDraggables = useRef(new Map<string, { destroy: () => void }>());
  const { user, loading: authLoading } = useUser();

  const [events, setEvents] = useState<EventView[]>([]);
  const [myRegs, setMyRegs] = useState<MyRegistration[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEventRow[]>([]);
  const [pool, setPool] = useState<TbdRegistration[]>([]);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<AnnouncementNotice[] | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const [view, setView] = useState<string>("dayGridMonth");

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message));
    if (user) {
      Promise.all([getCustomEvents(), getTbdPool(), getMyRegistrations(), getMyTickets()])
        .then(([c, p, r, t]) => {
          setCustomEvents(c);
          setPool(p);
          setMyRegs(r);
          setTickets(t);
        })
        .catch((err) => setError(err.message));
    } else {
      setMyRegs([]);
      setPool([]);
      setTickets([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(view);
  }, [view]);

  useEffect(() => {
    return () => {
      poolDraggables.current.forEach((d) => d.destroy());
      poolDraggables.current.clear();
      panelDraggables.current.forEach((d) => d.destroy());
      panelDraggables.current.clear();
    };
  }, []);

  const eventById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events]
  );

  const pinnedEventIds = useMemo(() => {
    const minValid = new Date("2000-01-01T00:00:00Z").getTime();
    const ids = new Set<string>();
    for (const c of customEvents) {
      if (!c.event_id) continue;
      if (c.starts_at) {
        const t = new Date(c.starts_at).getTime();
        if (!Number.isNaN(t) && t < minValid) continue;
      }
      ids.add(c.event_id);
    }
    return ids;
  }, [customEvents]);

  const myEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of myRegs) ids.add(r.event_id);
    for (const t of tickets) ids.add(t.event_id);
    return ids;
  }, [myRegs, tickets]);

  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return [
      ...events
        .filter((e) => e.starts_at && myEventIds.has(e.id))
        .filter((e) => e.starts_at && coversDay(e.starts_at, e.ends_at, selectedDate))
        .sort(
          (a, b) =>
            new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime()
        )
        .map((e) => ({
          type: "event" as const,
          id: e.id,
          title: e.title,
          color: categoryColorOf(e.category),
          time: rangeLabel(e.starts_at!, e.ends_at),
          url: `/event?id=${e.id}`,
          startIso: e.starts_at!,
        })),
      ...customEvents
        .filter((c) => c.starts_at && dateOnly(new Date(c.starts_at)) === selectedDate)
        .sort(
          (a, b) =>
            new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime()
        )
        .map((c) => ({
          type: "pin" as const,
          id: c.id,
          title: c.title,
          color: c.color,
          time: timeOnly(new Date(c.starts_at!)),
          startIso: c.starts_at!,
        })),
    ];
  }, [selectedDate, events, customEvents, myEventIds]);

  useEffect(() => {
    const live = new Set(
      dayEvents.map((ev) => (ev.type === "pin" ? `custom-${ev.id}` : `event-${ev.id}`))
    );
    panelDraggables.current.forEach((d, key) => {
      if (!live.has(key)) {
        d.destroy();
        panelDraggables.current.delete(key);
      }
    });
  }, [dayEvents]);

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
    setFlash({
      msg: `Pinned ${title} to ${new Date(start).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      })}.`,
      ok: true,
    });
    setModal(null);
  };

  if (error) {
    return <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">{error}</p>;
  }

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading calendar…</p>;
  }

  const officialEvents = events
    .filter((e) => e.starts_at && myEventIds.has(e.id))
    .filter((e) => {
      if (category && e.category !== category) return false;
      if (query && !e.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      start: e.starts_at!,
      end: isMobile ? (e.ends_at ?? undefined) : undefined,
      editable: false,
      backgroundColor: categoryColorOf(e.category),
      borderColor: categoryColorOf(e.category),
      extendedProps: { url: `/event?id=${e.id}` },
    }));

  const reminderEvents = customEvents
    .filter((c) => c.starts_at)
    .map((c) => {
      const d = new Date(c.starts_at);
      return {
        id: `custom-${c.id}`,
        title: c.title,
        start: dateOnly(d),
        allDay: true,
        editable: true,
        backgroundColor: c.color,
        borderColor: c.color,
        extendedProps: {
          isCustom: true,
          customId: c.id,
          timeStr: timeOnly(d),
          startIso: c.starts_at,
        },
      };
    });

  const poolToShow = pool.filter((t) => !pinnedEventIds.has(t.event_id));

  const showPool = !!user && poolToShow.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {flash && (
        <p
          onClick={() => setFlash(null)}
          className={`cursor-pointer rounded-lg px-3 py-2 text-sm ring-1 ${flash.ok
            ? "bg-indigo-400/10 text-indigo-200 ring-indigo-400/40"
            : "bg-rose-400/10 text-rose-300 ring-rose-400/30"}`}
        >
          {flash.msg} <span className="opacity-70">(click to dismiss)</span>
        </p>
      )}
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

      {!authLoading && !user && (
        <p className="rounded-lg bg-indigo-400/10 px-3 py-2 text-sm text-indigo-200 ring-1 ring-indigo-400/40">
          Sign in to fill this calendar with the events you register for.
        </p>
      )}

      <div
        className={showPool ? "grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]" : "grid grid-cols-1 gap-4"}
      >
        <div
          ref={shellRef}
          className={`card card-ring overflow-hidden rounded-2xl p-4 ${isMobile ? "calendar-mobile" : ""}`}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={1}
            events={[...officialEvents, ...reminderEvents]}
            dayMaxEventRows={isMobile ? 6 : 3}
            moreLinkClick={(info) => {
              if (!isMobile) return;
              const day = info.dateStr.slice(0, 10);
              setSelectedDate(day);
            }}
            height="auto"
            droppable
            editable
            selectable
            dateClick={(info) => {
              if (!isMobile) return;
              const day = info.dateStr.slice(0, 10);
              setSelectedDate((cur) => (cur === day ? null : day));
            }}
            dayCellClassNames={(arg) =>
              isMobile && selectedDate && arg.dateStr === selectedDate ? ["selected-day"] : []
            }
            select={(info) => {
              if (!user) return;
              setModal({ kind: "create", start: `${info.startStr}T12:00:00` });
            }}
            eventReceive={(info) => {
              const ext = info.event.extendedProps as Record<string, string | undefined>;
              const dragType = ext.dragType;
              const customId = ext.customId;
              const tbdEventId = ext.tbdEventId;
              const linkEventId = ext.linkEventId;
              const eventId = tbdEventId || linkEventId || info.event.id || undefined;
              let date = info.date instanceof Date ? info.date : null;
              if (!date) {
                date =
                  parseDateStr(info.dateStr) ??
                  parseDateStr(info.event.startStr) ??
                  calendarRef.current?.getApi().getDate() ??
                  null;
              }
              const title =
                info.event.title || (ext.title as string | undefined) || "Reminder";
              info.event.remove();
              if (!date) {
                setFlash({ msg: "Could not read the drop date.", ok: false });
                return;
              }
              if (dragType === "pin" && customId) {
                const timeStr = ext.timeStr || (info.event.start ? timeOnly(info.event.start) : "12:00");
                updateCustomEvent(customId, {
                  starts_at: new Date(`${dateOnly(date)}T${timeStr}:00`).toISOString(),
                })
                  .then(refresh)
                  .then(() =>
                    setFlash({
                      msg: `Moved ${title} to ${new Date(dateOnly(date) + "T12:00:00").toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                      })}.`,
                      ok: true,
                    })
                  )
                  .catch((err) => setFlash({ msg: err.message, ok: false }));
                return;
              }
              if (!eventId) {
                setFlash({ msg: "Could not identify the pinned event.", ok: false });
                return;
              }
              setModal({
                kind: "tbd",
                eventId,
                title,
                start: `${dateOnly(date)}T12:00:00`,
              });
            }}
            eventDrop={(info) => {
              const customId = info.event.extendedProps.customId;
              if (!customId || !info.event.start) return;
              const moved = info.event.start;
              const timeStr =
                (info.event.extendedProps.timeStr as string) || timeOnly(moved);
              updateCustomEvent(customId as string, {
                starts_at: new Date(`${dateOnly(moved)}T${timeStr}:00`).toISOString(),
              }).catch((err) => setFlash({ msg: err.message, ok: false }));
            }}
            eventContent={(arg) => {
              if (!isMobile) {
                const span = document.createElement("span");
                const label = arg.event.title || "";
                span.textContent = label;
                span.dataset.fcLabel = label;
                span.style.display = "block";
                span.style.width = "100%";
                span.style.maxWidth = "100%";
                span.style.boxSizing = "border-box";
                span.style.overflow = "hidden";
                span.style.textOverflow = "ellipsis";
                span.style.whiteSpace = "nowrap";
                const bg = arg.event.backgroundColor;
                if (bg) {
                  span.style.padding = "0 6px";
                  span.style.borderRadius = "5px";
                  span.style.backgroundColor = bg;
                  span.style.color = contrastText(bg);
                }
                return { domNodes: [span] };
              }
              const bar = document.createElement("div");
              bar.style.width = "calc(100% - 6px)";
              bar.style.minWidth = "0";
              bar.style.height = "4px";
              bar.style.margin = "1px 3px 0";
              bar.style.borderRadius = "2px";
              bar.style.backgroundColor = arg.event.backgroundColor || "var(--fc-event-bg-color)";
              return { domNodes: [bar] };
            }}
            eventClick={(info) => {
              if (isMobile) return;
              if (info.event.extendedProps.isCustom) {
                const id = info.event.extendedProps.customId as string;
                const startIso =
                  (info.event.extendedProps.startIso as string) ||
                  info.event.start?.toISOString() ||
                  "";
                setModal({
                  kind: "edit",
                  id,
                  title: info.event.title,
                  color: info.event.backgroundColor,
                  start: startIso,
                });
                return;
              }
              window.location.assign(info.event.extendedProps.url);
            }}
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            buttonText={{ today: "Today" }}
            locale="en"
          />
          {isMobile && view === "dayGridMonth" && selectedDate && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-300">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Close
                </button>
              </div>
              {dayEvents.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No events on this day.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {dayEvents.map((ev) => {
                    const dragKey = ev.type === "pin" ? `custom-${ev.id}` : `event-${ev.id}`;
                    return (
                    <li key={dragKey}>
                      <button
                        ref={(node) => {
                          if (!node || panelDraggables.current.has(dragKey)) return;
                          panelDraggables.current.set(
                            dragKey,
                            new Draggable(node, {
                              longPressDelay: 200,
                              eventData:
                                ev.type === "pin"
                                  ? { dragType: "pin", customId: ev.id, title: ev.title, timeStr: ev.time }
                                  : { dragType: "link", linkEventId: ev.id, title: ev.title },
                            })
                          );
                        }}
                        onClick={() =>
                          ev.type === "event"
                            ? window.location.assign(ev.url)
                            : setModal({
                                kind: "edit",
                                id: ev.id,
                                title: ev.title,
                                color: ev.color,
                                start: ev.startIso,
                              })
                        }
                        className="flex w-full cursor-grab touch-none items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm active:cursor-grabbing"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: ev.color }}
                        />
                        <span className="text-xs text-slate-500">{ev.time}</span>
                        <span className="truncate font-medium text-slate-200">{ev.title}</span>
                      </button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {showPool && (
          <aside className="card card-ring rounded-2xl p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Pin a TBD event
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Drag onto a day, or tap to pick a date.
            </p>
            <div className="mt-3 space-y-2">
              {poolToShow.map((t) => (
                <div
                  key={t.event_id}
                  ref={(node) => {
                    if (!node || poolDraggables.current.has(t.event_id)) return;
                    poolDraggables.current.set(
                      t.event_id,
                      new Draggable(node, {
                        eventData: { title: t.title, tbdEventId: t.event_id },
                      })
                    );
                  }}
                  className="fc-event cursor-grab select-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
                  onClick={() => {
                    if (!user) return;
                    setModal({
                      kind: "tbd",
                      eventId: t.event_id,
                      title: t.title,
                      start: new Date(dateOnly(new Date()) + "T12:00:00").toISOString(),
                    });
                  }}
                >
                  {t.title}
                </div>
              ))}
            </div>
          </aside>
        )}
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
  const [time, setTime] = useState(() => {
    const d = new Date(defaultStart);
    return Number.isNaN(d.getTime()) ? "12:00" : timeOnly(d);
  });
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    const t = /^\d{2}:\d{2}$/.test(time.trim()) ? time.trim() : "12:00";
    setBusy(true);
    setErrorMsg("");
    try {
      await onSave(
        title.trim(),
        color,
        new Date(start.slice(0, 10) + "T" + t + ":00").toISOString()
      );
    } catch (e) {
      setErrorMsg((e as Error)?.message ?? "Save failed. Try again.");
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
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-400">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-400">Date</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-400">Color</label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
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
            <label
              title="Custom color"
              className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-2 transition-transform hover:scale-105"
              style={{
                backgroundColor: color,
                boxShadow: color.startsWith("#") && !PALETTE.includes(color) ? "0 0 0 2px var(--accent-soft)" : undefined,
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Custom color"
              />
            </label>
          </div>
        </div>
        {errorMsg && (
          <p className="mt-4 rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/30">
            {errorMsg}
          </p>
        )}
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