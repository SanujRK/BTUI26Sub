import { requireClient, isSupabaseConfigured } from "./supabase";

export type EventView = {
  id: string;
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string;
  category: string;
  capacity: number | null;
  image_url: string | null;
  is_ticketed: boolean;
  ticket_price: number;
  registrations: number;
  tickets: number;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  author: string;
  event_id: string | null;
  created_at: string;
};

const notConfigured = () =>
  "Supabase is not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.";

export async function getEvents(): Promise<EventView[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("get_public_events");
  if (error) throw new Error(error.message || notConfigured());
  return (data ?? []) as EventView[];
}

export async function getEvent(id: string): Promise<EventView | null> {
  if (!isSupabaseConfigured) return null;
  const client = requireClient();
  const { data, error } = await client.rpc("get_public_event", {
    p_event_id: id,
  });
  if (error) throw new Error(error.message || notConfigured());
  return (data as EventView) ?? null;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("announcements")
    .select("id, title, body, author, event_id, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export type CustomEventRow = {
  id: string;
  title: string;
  color: string;
  starts_at: string;
  event_id: string | null;
  notified_at: string | null;
  created_at: string;
};

export type TbdRegistration = {
  event_id: string;
  title: string;
};

export async function getCustomEvents(): Promise<CustomEventRow[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("custom_events")
    .select("id, title, color, starts_at, event_id, notified_at, created_at")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTbdPool(): Promise<TbdRegistration[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("registrations")
    .select("event_id, events!inner(id, title, starts_at, ends_at, category)");
  if (error) throw error;
  const registrations = (data ?? []) as {
    event_id: string;
    events: { id: string; title: string; starts_at: string | null } | null;
  }[];
  return registrations
    .map((r) => r.events)
    .filter((e): e is { id: string; title: string; starts_at: string | null } => !!e)
    .filter((e) => !e.starts_at)
    .map((e) => ({ event_id: e.id, title: e.title }));
}

export async function createCustomEvent(input: {
  title: string;
  color: string;
  starts_at: string;
  event_id?: string | null;
}): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("custom_events").insert({
    title: input.title,
    color: input.color,
    starts_at: input.starts_at,
    event_id: input.event_id ?? null,
  });
  if (error) throw error;
}

export async function updateCustomEvent(
  id: string,
  patch: Partial<{
    title: string;
    color: string;
    starts_at: string;
    notified_at: string;
  }>
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("custom_events").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCustomEvent(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("custom_events").delete().eq("id", id);
  if (error) throw error;
}

export type Highlight = {
  id: string;
  body: string;
  created_at: string;
};

export async function getHighlights(eventId: string): Promise<Highlight[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("highlights")
    .select("id, body, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function subscribeToHighlights(
  eventId: string,
  onNew: (highlight: Highlight) => void
): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const client = requireClient();
  const channel = client
    .channel(`highlights:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "highlights",
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => onNew(payload.new as Highlight)
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export async function registerForEvent(
  eventId: string
): Promise<{ ok: boolean; message: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc("register_for_event", {
    p_event_id: eventId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: (data as string) === "registered", message: (data as string) ?? "" };
}

export async function buyTicket(
  eventId: string
): Promise<{ ok: boolean; message: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc("buy_ticket", {
    p_event_id: eventId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: (data as string) === "ticket bought", message: (data as string) ?? "" };
}

export async function hasRegistration(userId: string, eventId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const client = requireClient();
  const { data, error } = await client
    .from("registrations")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function hasTicket(userId: string, eventId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const client = requireClient();
  const { data, error } = await client
    .from("tickets")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export type MyRegistration = {
  event_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string;
  category: string;
  created_at: string;
};

export async function getMyRegistrations(): Promise<MyRegistration[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("registrations")
    .select(
      "created_at, events!inner(id, title, starts_at, ends_at, venue, category)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<{
    created_at: string;
    events: {
      id: string;
      title: string;
      starts_at: string | null;
      ends_at: string | null;
      venue: string;
      category: string;
    } | null;
  }>)
    .filter((r) => !!r.events)
    .map((r) => ({
      event_id: r.events!.id,
      title: r.events!.title,
      starts_at: r.events!.starts_at,
      ends_at: r.events!.ends_at,
      venue: r.events!.venue,
      category: r.events!.category,
      created_at: r.created_at,
    }));
}