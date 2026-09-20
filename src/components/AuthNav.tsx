import { signOut } from "../lib/auth";
import { isStaffRole } from "../lib/roles";
import { useUser } from "../hooks/useUser";

export default function AuthNav() {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="ml-2 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="ml-2 flex items-center gap-2 whitespace-nowrap">
      {isStaffRole(user.role) && (
        <a
          href="/admin"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 transition-colors hover:bg-white/5"
        >
          Admin
        </a>
      )}
      <span className="hidden rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 sm:inline-block">
        {user.fullName || user.email}
      </span>
      <a
        href="/dashboard"
        className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 transition-colors hover:bg-white/5"
      >
        Dashboard
      </a>
      <button
        onClick={() => signOut().then(() => window.location.assign("/"))}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/5"
      >
        Sign out
      </button>
    </div>
  );
}