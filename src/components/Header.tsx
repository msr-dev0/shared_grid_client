"use client";

import Link from "next/link";
import { useGridStore } from "@/lib/store";

export function Header() {
  const user = useGridStore((s) => s.user);

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Shared Grid</h1>
          <p className="text-sm text-slate-400">
            Real-time pixel board — register to claim blocks; everyone sees updates instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(!user || user.isGuest) && (
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
            >
              Login
            </Link>
          )}
          {user && !user.isGuest && (
            <div className="flex items-center gap-2 rounded-full bg-slate-800/50 border border-slate-700 px-3 py-1.5">
              <span 
                className="h-2 w-2 rounded-full" 
                style={{ backgroundColor: user.color }}
              />
              <span className="text-sm font-medium text-slate-200">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
