import Link from "next/link";

export const Navbar = () => {
  return (
    <nav className="shrink-0 h-14 flex items-center px-6 bg-zinc-900 border-b-2 border-zinc-800">
      <Link href="/" className="text-white font-bold text-lg tracking-tight">
        Media Tools
      </Link>
    </nav>
  );
};
