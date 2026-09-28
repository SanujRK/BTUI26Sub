import { useUser } from "../hooks/useUser";
import type { Role } from "../lib/auth";

interface Props {
  roles: Role[];
  children: React.ReactNode;
}

export default function Guard({ roles, children }: Props) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="card card-ring flex min-h-[40vh] items-center justify-center text-slate-400">
        Checking access…
      </div>
    );
  }

  if (!user) {
    return (
      <section className="card card-ring flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Sign in to continue</h2>
        <p className="text-slate-400">You need an account to open this area.</p>
        <a href="/login" className="btn-primary">
          Go to sign in
        </a>
      </section>
    );
  }

  if (!roles.includes(user.role)) {
    return (
      <section className="card card-ring flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Not for your role</h2>
        <p className="text-slate-400">This area is limited to selected accounts.</p>
      </section>
    );
  }

  return <>{children}</>;
}