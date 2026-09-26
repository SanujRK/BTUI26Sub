import { useEffect } from "react";
import { getTheme, getPalette } from "../lib/api";
import { applyPalette, DEFAULT_PALETTE } from "../lib/palette";

export default function ThemeApplier() {
  useEffect(() => {
    applyPalette(DEFAULT_PALETTE);
    getTheme()
      .then((theme) => {
        if (theme === "light") {
          document.documentElement.classList.add("light");
        }
      })
      .catch(() => undefined);
    getPalette()
      .then((p) => applyPalette(p))
      .catch(() => undefined);
  }, []);
  return null;
}