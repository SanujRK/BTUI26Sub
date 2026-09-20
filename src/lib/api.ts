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