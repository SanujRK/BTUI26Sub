import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/outfit/wght.css";

export const FONT_OPTIONS = [
  { id: "system", label: "System", hint: "Native OS stack, zero download" },
  { id: "inter", label: "Inter", hint: "Neutral, crisp at small sizes" },
  { id: "dm-sans", label: "DM Sans", hint: "Geometric and friendly, compact" },
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    hint: "Warm humanist, tight spacing",
  },
  { id: "manrope", label: "Manrope", hint: "Geometric with character" },
  { id: "outfit", label: "Outfit", hint: "Round geometric, widest" },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]["id"];

export const DEFAULT_FONT: FontId = "system";

const SYSTEM_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const STACKS: Record<FontId, string> = {
  system: SYSTEM_STACK,
  inter: `"Inter Variable", ${SYSTEM_STACK}`,
  "dm-sans": `"DM Sans Variable", ${SYSTEM_STACK}`,
  "plus-jakarta-sans": `"Plus Jakarta Sans Variable", ${SYSTEM_STACK}`,
  manrope: `"Manrope Variable", ${SYSTEM_STACK}`,
  outfit: `"Outfit Variable", ${SYSTEM_STACK}`,
};

export function fontStack(id: string): string {
  const key = (FONT_OPTIONS.find((f) => f.id === id)?.id ??
    DEFAULT_FONT) as FontId;
  return STACKS[key];
}

export function applyFont(id: string): FontId {
  const key = (FONT_OPTIONS.find((f) => f.id === id)?.id ??
    DEFAULT_FONT) as FontId;
  document.documentElement.setAttribute("data-font", key);
  return key;
}
