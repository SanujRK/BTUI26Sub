export const categoryClasses: Record<string, string> = {
  Debate: "bg-debate/15 text-debate ring-debate/30",
  Sports: "bg-sports/15 text-sports ring-sports/30",
  Exhibition: "bg-exhibition/15 text-exhibition ring-exhibition/30",
  Culture: "bg-culture/15 text-culture ring-culture/30",
  Tech: "bg-tech/15 text-tech ring-tech/30",
  General: "bg-general/15 text-general ring-general/30",
};

export function categoryClass(category: string): string {
  return categoryClasses[category] ?? categoryClasses.General;
}

export const categoryColor: Record<string, string> = {
  Debate: "var(--color-debate)",
  Sports: "var(--color-sports)",
  Exhibition: "var(--color-exhibition)",
  Culture: "var(--color-culture)",
  Tech: "var(--color-tech)",
  General: "var(--color-general)",
};

export function categoryColorOf(category: string): string {
  return categoryColor[category] ?? categoryColor.General;
}