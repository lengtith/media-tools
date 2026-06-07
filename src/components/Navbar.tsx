import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const TOOLS = [
  { label: "Download", icon: "↓", href: "/" },
  { label: "Convert", icon: "⇄", href: "/convert" },
  { label: "Split", icon: "⌿", href: "/split" },
  { label: "Merge", icon: "⊕", href: "/merge" },
];

export const Navbar = () => {
  const { pathname } = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <nav className="shrink-0 bg-zinc-900 border-b-2 border-zinc-800 relative z-40">
      <div className="flex items-center h-14 px-4">
        {/* Logo */}
        <Link href="/" className="text-white font-bold text-lg tracking-tight mr-auto">
          Media Tools
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {TOOLS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.label}
                href={t.href}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  active
                    ? "bg-indigo-500 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex flex-col justify-center gap-1.5 w-8 h-8 items-center"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-zinc-400 transition-transform duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-0.5 bg-zinc-400 transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-zinc-400 transition-transform duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile dropdown — absolutely positioned over content */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="sm:hidden fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="sm:hidden absolute top-full left-0 right-0 z-50 bg-zinc-900 border-b-2 border-zinc-800 shadow-2xl">
            {TOOLS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-colors border-b border-zinc-800 last:border-0 ${
                    active
                      ? "bg-indigo-500 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
};
