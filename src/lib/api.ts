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
  registrations_enabled: boolean;
  show_registration_count: boolean;
  registration_count: number | null;
  created_by: string | null;
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

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const {
    data: { session },
  } = await requireClient().auth.getSession();
  return session?.user?.id ?? null;
}

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
  starts_at: string | null;
  event_id?: string | null;
}): Promise<void> {
  const client = requireClient();
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in.");
  const { error } = await client.from("custom_events").insert({
    user_id: userId,
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
  event_id: string | null;
  event_title: string | null;
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
  return (data ?? []) as Highlight[];
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

export function subscribeToAllHighlights(onNew: (highlight: Highlight) => void): () => void {
  if (!isSupabaseConfigured) return () => undefined;
  const client = requireClient();
  const channel = client
    .channel("highlights:all")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "highlights" },
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

export type TicketView = {
  id: string;
  event_id: string;
  title: string;
  category: string;
  venue: string;
  starts_at: string | null;
  created_at: string;
};

export async function getMyTickets(): Promise<TicketView[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("tickets")
    .select("id, created_at, events!inner(id, title, category, venue, starts_at)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    created_at: string;
    events: {
      id: string;
      title: string;
      category: string;
      venue: string;
      starts_at: string | null;
    } | null;
  }>)
    .filter((t) => !!t.events)
    .map((t) => ({
      id: t.id,
      event_id: t.events!.id,
      title: t.events!.title,
      category: t.events!.category,
      venue: t.events!.venue,
      starts_at: t.events!.starts_at,
      created_at: t.created_at,
    }));
}

export type EventInput = {
  title: string;
  description: string;
  venue: string;
  category: string;
  starts_at: string | null;
  ends_at: string | null;
  capacity: number | null;
  image_url: string | null;
  is_ticketed: boolean;
  ticket_price: number;
  registrations_enabled: boolean;
  show_registration_count: boolean;
  registration_count: number | null;
};

export async function saveEvent(
  input: EventInput & { id?: string }
): Promise<void> {
  const client = requireClient();
  if (input.id) {
    const { error } = await client
      .from("events")
      .update({
        title: input.title,
        description: input.description,
        venue: input.venue,
        category: input.category,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        capacity: input.capacity,
        image_url: input.image_url,
        is_ticketed: input.is_ticketed,
        ticket_price: input.ticket_price,
        registrations_enabled: input.registrations_enabled,
        show_registration_count: input.show_registration_count,
        registration_count: input.registration_count,
      })
      .eq("id", input.id);
    if (error) throw error;
    return;
  }
  const {
    data: { session },
  } = await client.auth.getSession();
  const { error } = await client.from("events").insert({
    title: input.title,
    description: input.description,
    venue: input.venue,
    category: input.category,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    capacity: input.capacity,
    image_url: input.image_url,
    is_ticketed: input.is_ticketed,
    ticket_price: input.ticket_price,
    registrations_enabled: input.registrations_enabled,
    show_registration_count: input.show_registration_count,
    registration_count: input.registration_count,
    created_by: session?.user.id ?? null,
  });
  if (error) throw error;
}

export async function removeEvent(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function postAnnouncement(input: {
  title: string;
  body: string;
  author: string;
  event_id?: string | null;
}): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("announcements").insert({
    title: input.title,
    body: input.body,
    author: input.author,
    event_id: input.event_id ?? null,
  });
  if (error) throw error;
}

export async function removeAnnouncement(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

export async function postHighlight(input: {
  event_id: string;
  body: string;
}): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("highlights").insert({
    event_id: input.event_id,
    body: input.body,
  });
  if (error) throw error;
}

export async function getRecentHighlights(limit = 10): Promise<Highlight[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("highlights")
    .select("id, body, created_at, event_id, events(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    event_id: row.event_id,
    event_title: row.events?.title ?? null,
  }));
}

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

export async function getProfiles(): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured) return [];
  const client = requireClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, role")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function changeUserRole(
  userId: string,
  role: string
): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.rpc("set_user_role", {
    p_user: userId,
    p_role: role,
  });
  if (error) throw error;
  return (data as string) ?? "";
}

export async function getTheme(): Promise<string> {
  if (!isSupabaseConfigured) return "dark";
  const client = requireClient();
  const { data, error } = await client
    .from("site_settings")
    .select("value")
    .eq("key", "theme")
    .maybeSingle();
  if (error) throw error;
  return (data?.value as string) ?? "dark";
}

export async function setTheme(theme: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from("site_settings")
    .update({ value: theme })
    .eq("key", "theme");
  if (error) throw error;
}

import type { SitePalette } from "./palette";
import { DEFAULT_PALETTE } from "./palette";

const PALETTE_KEYS = Object.keys(DEFAULT_PALETTE) as (keyof SitePalette)[];

export async function getPalette(): Promise<SitePalette> {
  if (!isSupabaseConfigured) return DEFAULT_PALETTE;
  const client = requireClient();
  const { data, error } = await client
    .from("site_settings")
    .select("value")
    .eq("key", "colors")
    .maybeSingle();
  if (error) throw error;
  let stored: Partial<SitePalette> = {};
  if (typeof data?.value === "string") {
    try {
      const parsed = JSON.parse(data.value);
      if (parsed && typeof parsed === "object") stored = parsed;
    } catch {
      stored = {};
    }
  }
  for (const k of PALETTE_KEYS) {
    if (typeof stored[k] !== "string" || !/^#([0-9a-fA-F]{6})$/.test(stored[k] as string)) {
      stored[k] = DEFAULT_PALETTE[k];
    }
  }
  return { ...DEFAULT_PALETTE, ...stored } as SitePalette;
}

export async function setPalette(palette: SitePalette): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from("site_settings")
    .upsert({ key: "colors", value: JSON.stringify(palette) }, { onConflict: "key" });
  if (error) throw error;
}