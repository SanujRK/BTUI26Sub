export type SitePalette = {
  bgPage: string;
  surface: string;
  border: string;
  accent: string;
  accentHover: string;
  accentText: string;
  debate: string;
  sports: string;
  exhibition: string;
  culture: string;
  tech: string;
  general: string;
};

export const DEFAULT_PALETTE: SitePalette = {
  bgPage: "#0c0e1a",
  surface: "#161a2c",
  border: "#ffffff",
  accent: "#6366f1",
  accentHover: "#4f46e5",
  accentText: "#a5b4fc",
  debate: "#a78bfa",
  sports: "#34d399",
  exhibition: "#38bdf8",
  culture: "#fb7185",
  tech: "#22d3ee",
  general: "#818cf8",
};

export const PALETTE_FIELDS: { key: keyof SitePalette; label: string; hint?: string }[] = [
  { key: "bgPage", label: "Page background" },
  { key: "surface", label: "Card / surface" },
  { key: "border", label: "Borders", hint: "Light color, used with low opacity" },
  { key: "accent", label: "Accent (buttons, links)" },
  { key: "accentHover", label: "Accent hover" },
  { key: "accentText", label: "Accent text", hint: "For accent-tinted text" },
  { key: "debate", label: "Debate" },
  { key: "sports", label: "Sports" },
  { key: "exhibition", label: "Exhibition" },
  { key: "culture", label: "Culture" },
  { key: "tech", label: "Tech" },
  { key: "general", label: "General" },
];

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function contrastText(hex: string): string {
  return isLightColor(hex) ? "#141414" : "#ffffff";
}

export function applyPalette(p: Partial<SitePalette>): void {
  const pal: SitePalette = { ...DEFAULT_PALETTE, ...p };
  const root = document.documentElement;
  root.style.setProperty("--bg-page", pal.bgPage);
  root.style.setProperty("--bg-side", pal.bgPage);
  root.style.setProperty("--bg-header", pal.bgPage);
  root.style.setProperty("--card-bg", pal.surface);
  root.style.setProperty("--border-soft", hexToRgba(pal.border, 0.08));
  root.style.setProperty("--border-mid", hexToRgba(pal.border, 0.15));
  root.style.setProperty("--accent", pal.accent);
  root.style.setProperty("--accent-hover", pal.accentHover);
  root.style.setProperty("--accent-soft", pal.accentText);
  root.style.setProperty(
    "--accent-fg",
    contrastText(pal.accent)
  );
  for (const n of ["400", "500", "600"]) {
    root.style.setProperty(`--color-indigo-${n}`, pal.accent);
  }
  for (const n of ["400", "500", "600"]) {
    root.style.setProperty(`--color-violet-${n}`, pal.accent);
  }
  for (const n of ["200", "300"]) {
    root.style.setProperty(`--color-indigo-${n}`, pal.accentText);
    root.style.setProperty(`--color-violet-${n}`, pal.accentText);
  }
  root.style.setProperty("--color-debate", pal.debate);
  root.style.setProperty("--color-sports", pal.sports);
  root.style.setProperty("--color-exhibition", pal.exhibition);
  root.style.setProperty("--color-culture", pal.culture);
  root.style.setProperty("--color-tech", pal.tech);
  root.style.setProperty("--color-general", pal.general);
}

export function resetPalette(): void {
  applyPalette(DEFAULT_PALETTE);
}