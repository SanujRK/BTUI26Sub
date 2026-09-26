import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AuthNav from "./AuthNav";
import NavLinks from "./NavLinks";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open || typeof document === "undefined") {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 text-slate-200 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    );
  }

  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b1121] lg:hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <a
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 font-bold tracking-tight"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white">
                SEH
              </span>
              <span className="text-slate-100">School Events Hub</span>
            </a>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6" onClick={() => setOpen(false)}>
            <NavLinks variant="sidebar" />
          </nav>

          <div className="border-t border-white/10 px-4 py-4">
            <AuthNav />
          </div>
        </div>
      )}
    </>,
    document.body
  );
}