import { signOut } from "../lib/auth";
import { useUser } from "../hooks/useUser";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AuthNav({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        {compact ? (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
          </svg>
        ) : (
          "Sign in"
        )}
      </a>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <a
        href="/account"
        title={user.fullName || user.email}
        aria-label="Account settings"
        className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white"
      >
        {user.pfp ? (
          <img src={user.pfp} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(user.fullName || user.email)
        )}
      </a>
{!compact && (
        <>
          <a
            href="/account"
            title="Account settings"
            className="min-w-0 flex-1 truncate rounded-lg px-1 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}