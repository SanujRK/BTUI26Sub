import { signOut } from "../lib/auth";
import { isStaffRole } from "../lib/roles";
import { useUser } from "../hooks/useUser";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AuthNav({ variant = "cluster" }: { variant?: "cluster" | "bar" }) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="ms-auto whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Sign in
      </a>
    );
  }

  if (variant === "bar") {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <a
          href="/account"
          className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-slate-200 transition-colors hover:text-white"
          title="Account settings"
        >
          {user.fullName || user.email}
        </a>
        <button
          onClick={() => signOut().then(() => window.location.assign("/"))}
          title="Sign out"
          aria-label="Sign out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 text-slate-300 transition-colors hover:bg-white/5 hover:text-rose-400"
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
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isStaffRole(user.role) && (
        <a
          href="/admin"
          title="Admin panel"
          aria-label="Admin panel"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
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
            <path d="M12 2l8 3.5v5.5c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5.5z" />
          </svg>
        </a>
      )}
      <a
        href="/account"
        title={user.fullName || user.email}
        aria-label="Account settings"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white"
      >
        {user.pfp ? (
          <img src={user.pfp} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(user.fullName || user.email)
        )}
      </a>
    </div>
  );
}