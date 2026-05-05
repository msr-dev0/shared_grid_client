"use client";

import { useState } from "react";
import { registerUser, syncAuthHeader } from "@/lib/api";
import { useGridStore } from "@/lib/store";
import Link from "next/link";
import { motion } from "framer-motion";

const PRESETS = ["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#ec4899", "#14b8a6", "#ef4444"];

export function RegisterPanel() {
  const user = useGridStore((s) => s.user);
  const persistSession = useGridStore((s) => s.persistSession);
  const setToast = useGridStore((s) => s.setToast);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESETS[0]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Registered user: show identity card ──
  if (user && !user.isGuest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200"
      >
        <div className="font-medium text-white">Playing as</div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded border border-slate-600"
            style={{ backgroundColor: user.color }}
            aria-hidden
          />
          <span className="font-semibold">{user.name}</span>
        </div>
        <div className="mt-1 text-slate-400">Score (blocks owned): {user.score}</div>
      </motion.div>
    );
  }

  // ── Guest: show upgrade form ──
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) { setToast("Please enter a display name"); return; }
      if (password.length < 6) { setToast("Password must be at least 6 characters"); return; }
      const normalizedColor = color.trim().toLowerCase();
      const registered = await registerUser({ name: trimmedName, color: normalizedColor, password });
      persistSession(registered);
      syncAuthHeader();
      setToast("Registered! Your blocks are saved permanently.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200"
    >
      <div className="font-medium text-white">
        {user?.isGuest ? "Upgrade to save progress" : "Register to claim"}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {user?.isGuest
          ? "Guest sessions expire after 1 hour. Register to keep your blocks permanently."
          : "Names and colors must be unique in this room."}
      </p>

      <label className="mt-3 block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Display name</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring-2 transition-shadow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          autoComplete="username"
          placeholder="Pick a unique name"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Password</span>
        <input
          type="password"
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-500/40 focus:ring-2 transition-shadow"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
        />
      </label>

      <div className="mt-3">
        <span className="text-xs uppercase tracking-wide text-slate-500">Color</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((c) => (
            <motion.button
              key={c}
              type="button"
              className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? "border-white scale-110" : "border-transparent hover:scale-105"}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              whileTap={{ scale: 0.9 }}
              aria-label={`Pick color ${c}`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={color.length === 7 ? color : "#22c55e"}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-slate-950 p-0"
            aria-label="Custom color"
          />
          <span className="font-mono text-xs text-slate-400">{color}</span>
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="mt-4 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving…" : user?.isGuest ? "Register & upgrade" : "Save profile"}
      </motion.button>

      {user?.isGuest && (
        <>
          <p className="mt-2 text-center text-xs text-slate-500">
            You&apos;re playing as <span className="font-medium text-slate-300">{user.name}</span> — blocks you
            claim are yours until you register or the guest session expires.
          </p>
          <div className="mt-4 border-t border-slate-800 pt-4 text-center">
            <span className="text-xs text-slate-400">Already have an account? </span>
            <Link href="/login" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Login here
            </Link>
          </div>
        </>
      )}
    </motion.form>
  );
}
