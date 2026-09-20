import { useState } from "react";
import { signIn, signUp } from "../lib/auth";

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, fullName, role);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <div className="card card-ring w-full max-w-md px-8 py-8">
      <h2 className="text-2xl font-bold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create an account"}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {mode === "signin"
          ? "Sign in to register for events and grab tickets."
          : "Takes about ten seconds. See you at the next event!"}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-300">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-indigo-400"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </label>

        {mode === "signup" && (
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-300">I am a…</span>
            <div className="flex gap-2">
              {(["student", "parent"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-lg border px-3 py-2 capitalize transition-colors ${
                    role === r
                      ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary mt-2 disabled:opacity-60"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
        }}
        className="mt-4 text-sm text-indigo-300 hover:text-indigo-200"
      >
        {mode === "signin" ? "Don't have an account? Create one" : "Have an account? Sign in"}
      </button>
    </div>
  );
}