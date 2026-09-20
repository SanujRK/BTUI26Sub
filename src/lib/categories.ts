export const categoryClasses: Record<string, string> = {
  Debate: "bg-violet-400/15 text-violet-300 ring-violet-400/30",
  Sports: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  Exhibition: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  Culture: "bg-rose-400/15 text-rose-300 ring-rose-400/30",
  Tech: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/30",
  General: "bg-indigo-400/15 text-indigo-300 ring-indigo-400/30",
};

export function categoryClass(category: string): string {
  return categoryClasses[category] ?? categoryClasses.General;
}

export const categoryColor: Record<string, string> = {
  Debate: "#a78bfa",
  Sports: "#34d399",
  Exhibition: "#38bdf8",
  Culture: "#fb7185",
  Tech: "#22d3ee",
  General: "#818cf8",
};

export function categoryColorOf(category: string): string {
  return categoryColor[category] ?? categoryColor.General;
}