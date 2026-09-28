import { useEffect } from "react";
import { getTheme, getPalette, getFont } from "../lib/api";
import { applyPalette, DEFAULT_PALETTE } from "../lib/palette";
import { applyFont, DEFAULT_FONT } from "../lib/fonts";

export default function ThemeApplier() {
  useEffect(() => {
    applyPalette(DEFAULT_PALETTE);
    applyFont(DEFAULT_FONT);
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
    getFont()
      .then((font) => applyFont(font))
      .catch(() => undefined);
  }, []);
  return null;
}
