import { useUser } from "../hooks/useUser";
import { isStaffRole } from "../lib/roles";

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
const ADMIN = {
  href: "/admin",
  label: "Admin",
  icon: "M12 2l8 3.5v5.5c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5.5z",
};

const GUEST_LINKS = [HOME, CALENDAR, ANNOUNCEMENTS, TICKETS, DASHBOARD];
const USER_LINKS = [DASHBOARD, CALENDAR, ANNOUNCEMENTS, TICKETS];

export default function NavLinks({ variant }: { variant: "sidebar" | "menu" }) {
  const { user, loading } = useUser();
  const links = user ? USER_LINKS : GUEST_LINKS;
  const visible = user && isStaffRole(user.role) ? [...links, ADMIN] : links;
  const path = typeof window !== "undefined" ? window.location.pathname : "";

  if (loading) return null;

  const isMenu = variant === "menu";
  const rowShape = isMenu
    ? "gap-3 px-3 py-3"
    : "gap-2.5 px-3 py-2.5";
  const rowTone = (active: boolean) =>
    active
      ? "border-indigo-400/60 bg-indigo-500/15 text-white"
      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white";

  return (
    <nav
      className={
        isMenu
          ? "menu-nav flex flex-col gap-2 text-slate-300"
          : "sidebar-nav flex min-h-0 flex-1 flex-col gap-1.5 text-slate-300"
      }
    >
      {visible.map((link) => {
        const isActive =
          link.href === "/" ? path === "/" : path.startsWith(link.href);
        return (
          <a
            key={link.href}
            href={link.href}
            title={link.label}
            aria-current={isActive ? "page" : undefined}
            className={`flex w-full items-center rounded-xl border text-left transition-colors ${rowShape} ${rowTone(isActive)}`}
          >
            <svg
              className="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d={link.icon} />
            </svg>
            <span className="nav-label">{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
