"use client";

import Link from "next/link";
import { useGridStore } from "@/lib/store";
import { motion } from "framer-motion";

export function Header() {
  const user = useGridStore((s) => s.user);
  const connected = useGridStore((s) => s.connected);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Shared Grid</h1>
          <p className="text-sm text-slate-400">
            Real-time pixel board — register to claim blocks; everyone sees updates instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              connected
                ? "bg-emerald-900/40 text-emerald-300"
                : "bg-amber-900/40 text-amber-200"
            }`}
          >
            <motion.span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />
            {connected ? "Live" : "Connecting…"}
          </span>

          {(!user || user.isGuest) && (
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
            >
              Login
            </Link>
          )}
          {user && !user.isGuest && (
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: user.color }} />
              <span className="text-sm font-medium text-slate-200">{user.name}</span>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
