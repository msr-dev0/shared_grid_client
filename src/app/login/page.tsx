"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, syncAuthHeader } from "@/lib/api";
import { useGridStore } from "@/lib/store";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const persistSession = useGridStore((s) => s.persistSession);
  const setToast = useGridStore((s) => s.setToast);
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) { setError("Please enter your gamer tag"); setLoading(false); return; }
      const user = await loginUser({ name: trimmedName, password });
      persistSession(user);
      syncAuthHeader();
      setToast(`Welcome back, ${user.name}!`);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to your shared grid account</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Display Name
              </label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : "Sign In"}
          </motion.button>

          <div className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Go to Grid
            </Link>
          </div>
        </form>
      </motion.div>
    </main>
  );
}
