import { requireClient, isSupabaseConfigured } from "./supabase";

export type Role = "student" | "parent" | "teacher" | "admin";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user) return null;
  return profileFor(session.user.id, session.user.email ?? "");
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
    cb(user);
  });
  return () => data.subscription.unsubscribe();
}