import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";

import { getEvents, type EventView } from "../lib/api";
import { categoryColorOf } from "../lib/categories";

export default function EventCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<EventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

  const [view, setView] = useState<string>(() =>
    isMobile ? "listMonth" : "dayGridMonth"
  );

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(view);
  }, [view]);

  if (error) {
    return <p className="card card-ring rounded-2xl p-6 text-center text-slate-400">{error}</p>;
  }

  if (loading) {
    return <p className="py-16 text-center text-slate-500">Loading calendar…</p>;
  }

  const calendarEvents = events
    .filter((e) => e.starts_at)
    .map((e) => ({
      id: e.id,
      title: e.title,
      start: e.starts_at!,
      end: e.ends_at ?? undefined,
      className: "fc-event-clickable",
      backgroundColor: categoryColorOf(e.category),
      borderColor: categoryColorOf(e.category),
      extendedProps: { url: `/event?id=${e.id}` },
    }));

  return (
    <div className="flex flex-col gap-4">
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

      <div className="card card-ring overflow-hidden rounded-2xl p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          dayMaxEventRows={3}
          height="auto"
          eventClick={(info) => {
            window.location.assign(info.event.extendedProps.url);
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{ today: "Today" }}
          locale="en"
        />
      </div>
    </div>
  );
}