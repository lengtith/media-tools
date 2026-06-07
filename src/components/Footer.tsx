import Link from "next/link";
import { useRouter } from "next/router";

const TOOLS = [
  { label: "Download", icon: "↓", href: "/" },
  { label: "Convert", icon: "⇄", href: "/convert" },
  { label: "Split", icon: "⌿", href: "/split" },
  { label: "Merge", icon: "⊕", href: "/merge" },
];

export const Footer = () => {
  const { pathname } = useRouter();

  return (
    <footer className="shrink-0 h-16 grid grid-cols-4 bg-zinc-900 border-t-2 border-zinc-800">
      {TOOLS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.label}
            href={t.href}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              active
                ? "bg-indigo-500 text-white"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
          </Link>
        );
      })}
    </footer>
  );
};
