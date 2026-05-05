"use client";

import { useGridStore } from "@/lib/store";

export function LeaderboardPanel() {
  const leaderboard = useGridStore((s) => s.leaderboard);
  const user = useGridStore((s) => s.user);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="text-sm font-medium text-white">Leaderboard</div>
      <p className="mt-1 text-xs text-slate-400">Scores come from the database (owned blocks).</p>
      <ol className="mt-3 max-h-64 space-y-2 overflow-auto pr-1 text-sm">
        {leaderboard.length === 0 ? (
          <li className="text-slate-500">No players yet.</li>
        ) : (
          leaderboard.map((row, idx) => (
            <li
              key={row.id}
              className={`flex items-center justify-between rounded-md px-2 py-1 ${
                user?.id === row.id ? "bg-emerald-900/30 ring-1 ring-emerald-600/40" : "bg-slate-950/40"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 shrink-0 text-slate-500">{idx + 1}</span>
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-slate-600"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <span className="truncate font-medium text-slate-100">{row.name}</span>
              </div>
              <span className="shrink-0 font-mono text-slate-300">{row.score}</span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
