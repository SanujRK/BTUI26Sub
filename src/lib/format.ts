const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Date TBD";
  return dateTimeFmt.format(new Date(iso));
}

export function isUpcoming(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}