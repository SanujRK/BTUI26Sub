import { useEffect } from "react";
import { getTheme } from "../lib/api";

export default function ThemeApplier() {
  useEffect(() => {
    getTheme()
      .then((theme) => {
        if (theme === "light") {
          document.documentElement.classList.add("light");
        }
      })
      .catch(() => undefined);
  }, []);
  return null;
}