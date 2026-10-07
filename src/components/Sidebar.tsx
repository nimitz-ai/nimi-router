"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/providers", label: "Providers", icon: "⛁" },
  { href: "/playground", label: "Playground", icon: "✎" },
  { href: "/keys", label: "API Keys", icon: "🔑" },
  { href: "/docs", label: "Docs", icon: "📖" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-panel p-4">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-lg font-black text-black">
          n
        </span>
        <span className="text-lg font-bold tracking-tight">
          nimi<span className="text-accent">-router</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`navlink ${pathname === item.href ? "navlink-active" : ""}`}
          >
            <span className="w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-2 flex items-center gap-2 px-2 text-xs text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          router online
        </div>
        <button onClick={logout} className="navlink w-full text-left">
          <span className="w-5 text-center">⏻</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
