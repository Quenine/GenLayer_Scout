"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpenText,
  FileOutput,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Radar,
  Target,
  ShieldCheck,
  X
} from "lucide-react";
import { useState } from "react";
import { APP_VERSION } from "@/lib/app-metadata";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/runs", label: "Experiments", icon: FlaskConical },
  { href: "/verify", label: "Verify", icon: ShieldCheck },
  { href: "/opportunities", label: "Contribution lanes", icon: Target },
  { href: "/evidence", label: "Evidence pack", icon: FileOutput },
  { href: "/build-log", label: "Build log", icon: BookOpenText }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-moss-400/30 bg-moss-400/10 text-moss-300">
          <Radar size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-white">
            GenLayer Scout
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Local builder workspace
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {navigation.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon size={17} />
              {item.label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-moss-300" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
          <Activity size={14} className="text-moss-300" />
          Local workspace
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Data stays in this browser. Verification uses only the RPC endpoint you provide.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 bg-ink shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line/80 bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-line bg-white p-2 text-slate-600 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            v{APP_VERSION} - local-first + read-only RPC
          </div>
          <div className="ml-auto rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
            No wallet signing
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
