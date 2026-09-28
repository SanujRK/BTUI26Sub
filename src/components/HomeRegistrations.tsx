import { useUser } from "../hooks/useUser";
import MyRegistrations from "./MyRegistrations";

export default function HomeRegistrations() {
  const { user, loading } = useUser();

  if (loading || !user) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">My registrations</h2>
        <a href="/dashboard" className="text-sm text-indigo-300 hover:text-indigo-200">
          Go to dashboard →
        </a>
      </div>
      <MyRegistrations limit={4} />
    </section>
  );
}