import { requireClient, isSupabaseConfigured } from "./supabase";

export type Role = "student" | "parent" | "teacher" | "admin";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  pfp?: string | null;
};

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) return null;
  const user = await profileFor(session.user.id, session.user.email ?? "");
  if (!user) return null;
  return { ...user, pfp: (session.user.user_metadata?.pfp as string) || null };
}

async function profileFor(userId: string, email: string): Promise<User | null> {
  const client = requireClient();
  const { data: p } = await client
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (!p) return null;
  return {
    id: userId,
    email: p.email || email,
    fullName: p.full_name,
    role: (p.role as Role) ?? "student",
  };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: "student" | "parent"
): Promise<{ user: User | null; error?: string }> {
  if (!isSupabaseConfigured) return { user: null, error: "Not configured." };
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) return { user: null, error: error.message };
  if (!data.user) {
    if (data.session) {
      await client.auth.setSession(data.session);
      return { user: await getCurrentUser() };
    }
    return { user: null, error: "Check your email." };
  }
  return { user: await getCurrentUser() };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error?: string }> {
  if (!isSupabaseConfigured) return { user: null, error: "Not configured." };
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Sign in failed." };
  }
  return { user: await getCurrentUser() };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await requireClient().auth.signOut();
}

export function onAuthStateChange(cb: (user: User | null) => void): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const client = requireClient();
  const { data } = client.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      cb(null);
      return;
    }
    const user = await profileFor(session.user.id, session.user.email ?? "");
    cb(user ? { ...user, pfp: (session.user.user_metadata?.pfp as string) || null } : null);
  });
  return () => data.subscription.unsubscribe();
}

async function sessionUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await requireClient().auth.getSession();
  return session?.user?.id ?? null;
}

export async function updateAccountName(fullName: string): Promise<void> {
  const client = requireClient();
  const uid = await sessionUserId();
  if (!uid) throw new Error("Not signed in.");
  const { error } = await client
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", uid);
  if (error) throw new Error(error.message);
  const { error: e2 } = await client.auth.updateUser({ data: { full_name: fullName } });
  if (e2) throw new Error(e2.message);
}

export async function updateAccountEmail(email: string): Promise<void> {
  const { error } = await requireClient().auth.updateUser({ email });
  if (error) throw new Error(error.message);
}

export async function updateAccountPassword(password: string): Promise<void> {
  const { error } = await requireClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function setAccountPfp(url: string): Promise<void> {
  const { error } = await requireClient().auth.updateUser({
    data: { pfp: url },
  });
  if (error) throw new Error(error.message);
}

export async function deleteAccount(): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("delete_account");
  if (error) throw new Error(error.message);
  await client.auth.signOut();
}