import { useUser } from "../hooks/useUser";

const HOME = { href: "/", label: "Home", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" };
const DASHBOARD = {
  href: "/dashboard",
  label: "Dashboard",
  icon: "M3 3h9v9H3zM12 3h9v5h-9zM12 12h9v9h-9zM3 16h9v5H3z",
};
const CALENDAR = {
  href: "/events",
  label: "Calendar",
  icon: "M8 2v4M16 2v4M3 10h18M4 4h16a1 1 0 011 1v15a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z",
};
const ANNOUNCEMENTS = {
  href: "/announcements",
  label: "Announcements",
  icon: "M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6",
};
const TICKETS = {
  href: "/tickets",
  label: "Tickets",
  icon: "M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2zM13 5v2M13 17v2M13 11v2",
};

const GUEST_LINKS = [HOME, CALENDAR, ANNOUNCEMENTS, TICKETS, DASHBOARD];
const USER_LINKS = [DASHBOARD, CALENDAR, ANNOUNCEMENTS, TICKETS];

export default function NavLinks({ variant }: { variant: "sidebar" | "bar" }) {
  const { user } = useUser();
  const links = user ? USER_LINKS : GUEST_LINKS;
  const path = typeof window !== "undefined" ? window.location.pathname : "";

  if (variant === "bar") {
    return (
      <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-sm font-medium text-slate-300">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-2.5 text-sm font-medium text-slate-300">
      {links.map((link) => {
        const isActive =
          link.href === "/" ? path === "/" : path.startsWith(link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-xl border px-4 py-3 transition-colors ${isActive
              ? "border-indigo-400/60 bg-white/5 text-white"
              : "border-white/10 text-slate-300 hover:border-white/25 hover:bg-white/5 hover:text-white"}`}
          >
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d={link.icon} />
            </svg>
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}