import { useState } from "react";
import { useUser } from "../hooks/useUser";
import {
  updateAccountName,
  updateAccountEmail,
  updateAccountPassword,
  setAccountPfp,
  deleteAccount,
} from "../lib/auth";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type RowProps = {
  title: string;
  hint?: string;
  children: React.ReactNode;
  message?: { ok: boolean; text: string } | null;
};

function Row({ title, hint, children, message }: RowProps) {
  return (
    <div className="rounded-2xl p-5 ring-1 ring-white/10">
      <h2 className="font-semibold text-white">{title}</h2>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      <div className="mt-4">{children}</div>
      {message && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ring-1 ${
            message.ok
              ? "bg-indigo-400/10 text-indigo-200 ring-indigo-400/40"
              : "bg-rose-400/10 text-rose-300 ring-rose-400/30"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export default function AccountSettings() {
  const { user } = useUser();
  const [name, setName] = useState(user?.fullName ?? "");
  const [pfp, setPfp] = useState(user?.pfp ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowMsg, setRowMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [dMsg, setDMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) {
    return (
      <div className="card card-ring mx-auto max-w-md rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-white">Account settings</h2>
        <p className="mt-2 text-sm text-slate-400">Sign in to manage your profile.</p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in
        </a>
      </div>
    );
  }

  const saveName = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateAccountName(name.trim());
      setRowMsg({ name: { ok: true, text: "Name updated." } });
    } catch (e) {
      setRowMsg({ name: { ok: false, text: (e as Error).message } });
    }
    setBusy(false);
  };

  const savePfp = async () => {
    setBusy(true);
    try {
      await setAccountPfp(pfp.trim());
      setRowMsg({ pfp: { ok: true, text: "Profile picture updated." } });
    } catch (e) {
      setRowMsg({ pfp: { ok: false, text: (e as Error).message } });
    }
    setBusy(false);
  };

  const saveEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setRowMsg({ email: { ok: false, text: "Enter a valid email address." } });
      return;
    }
    setBusy(true);
    try {
      await updateAccountEmail(email.trim());
      setRowMsg({ email: { ok: true, text: "Check your inbox to confirm the new email." } });
    } catch (e) {
      setRowMsg({ email: { ok: false, text: (e as Error).message } });
    }
    setBusy(false);
  };

  const savePassword = async () => {
    if (password.length < 6) {
      setRowMsg({ password: { ok: false, text: "Password must be at least 6 characters." } });
      return;
    }
    setBusy(true);
    try {
      await updateAccountPassword(password);
      setPassword("");
      setRowMsg({ password: { ok: true, text: "Password updated." } });
    } catch (e) {
      setRowMsg({ password: { ok: false, text: (e as Error).message } });
    }
    setBusy(false);
  };

  const saveDelete = async () => {
    if (confirm !== "DELETE") return;
    setBusy(true);
    try {
      await deleteAccount();
      window.location.assign("/");
    } catch (e) {
      setDMsg({ ok: false, text: (e as Error).message });
      setBusy(false);
    }
  };

  const fieldCls =
    "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400";
  const btnCls =
    "mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {user.pfp ? (
          <img
            src={user.pfp}
            alt="Profile"
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/20"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
            {initials(user.fullName || user.email)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight text-white">{user.fullName}</h1>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      <Row title="Profile picture" hint="Paste a link to an image to use as your avatar." message={rowMsg.pfp}>
        <div className="flex flex-wrap gap-2">
          <input
            type="url"
            value={pfp}
            onChange={(e) => setPfp(e.target.value)}
            placeholder="https://…"
            className={fieldCls}
          />
          <div className="w-full">
            <button onClick={() => savePfp()} disabled={busy} className={btnCls}>
              Save picture
            </button>
          </div>
        </div>
      </Row>

      <Row title="Name" hint="Your display name across the app." message={rowMsg.name}>
        <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
        <button onClick={() => saveName()} disabled={busy} className={btnCls}>
          Save name
        </button>
      </Row>

      <Row title="Email" hint="Changing this may require confirmation via email." message={rowMsg.email}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldCls}
        />
        <button onClick={() => saveEmail()} disabled={busy} className={btnCls}>
          Save email
        </button>
      </Row>

      <Row title="Password" hint="At least 6 characters." message={rowMsg.password}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className={fieldCls}
        />
        <button onClick={() => savePassword()} disabled={busy} className={btnCls}>
          Save password
        </button>
      </Row>

      <div className="rounded-2xl p-5 ring-1 ring-rose-400/30">
        <h2 className="font-semibold text-rose-300">Delete account</h2>
        <p className="text-sm text-slate-500">
          This permanently removes your profile, registrations, tickets, and calendar pins.
        </p>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          className={fieldCls}
        />
        <button
          onClick={() => saveDelete()}
          disabled={busy || confirm !== "DELETE"}
          className="mt-3 rounded-lg border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 disabled:opacity-50"
        >
          Delete my account
        </button>
        {dMsg && (
          <p className="mt-3 rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-400/30">
            {dMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}