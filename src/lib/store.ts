import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import type { Block, LeaderboardEntry, User } from "./types";
import { syncAuthHeader, SESSION_KEY } from "./api";

interface JwtPayload {
  id: string;
  isGuest: boolean;
  name: string;
  color: string;
  score: number;
  iat: number;
  exp: number;
}

function sortLeaderboard(rows: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...rows].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

type GridState = {
  /* ── identity ── */
  user: User | null;

  /* ── grid data ── */
  blocksById: Record<number, Block>;
  gridSize: number;

  /* ── leaderboard ── */
  leaderboard: LeaderboardEntry[];

  /* ── UI state ── */
  pendingBlockId: number | null;
  toast: string | null;
  connected: boolean;
  bootstrapped: boolean;

  /* ── actions ── */
  hydrateSession: () => void;
  persistSession: (user: User) => void;
  clearSession: () => void;
  setUser: (user: User | null) => void;
  setBlocks: (blocks: Block[]) => void;
  setLeaderboard: (rows: LeaderboardEntry[]) => void;
  applyBlock: (block: Block) => void;
  applyScoreUpdate: (p: { userId: string; score: number; name: string; color: string }) => void;
  setPending: (id: number | null) => void;
  setToast: (msg: string | null) => void;
  setConnected: (v: boolean) => void;
  setBootstrapped: (v: boolean) => void;
};

function inferGridSize(blocks: Block[]): number {
  let max = 0;
  for (const b of blocks) {
    max = Math.max(max, b.x + 1, b.y + 1);
  }
  return max || 1;
}

export const useGridStore = create<GridState>((set, _get) => ({
  user: null,
  blocksById: {},
  gridSize: 1,
  leaderboard: [],
  pendingBlockId: null,
  toast: null,
  connected: false,
  bootstrapped: false,

  /**
   * On app load: restore user + token from localStorage.
   * If nothing is stored the caller (GridApp) will call createGuest().
   */
  hydrateSession: () => {
    try {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem(SESSION_KEY);
      if (!token) return;

      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded?.id) {
        set({
          user: {
            id: decoded.id,
            name: decoded.name,
            color: decoded.color,
            score: decoded.score,
            isGuest: decoded.isGuest,
            token: token,
          },
        });
        syncAuthHeader();
      }
    } catch {
      /* ignore corrupt data */
    }
  },

  /**
   * Saves user + token to localStorage and updates axios headers.
   */
  persistSession: (user) => {
    try {
      localStorage.setItem(SESSION_KEY, user.token);
    } catch {
      /* ignore */
    }
    set({ user });
    syncAuthHeader();
  },

  /**
   * Removes the session entirely (e.g. on token expiry).
   */
  clearSession: () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    set({ user: null });
  },

  setUser: (user) => set({ user }),

  setBlocks: (blocks) => {
    const map: Record<number, Block> = {};
    for (const b of blocks) {
      map[b.id] = b;
    }
    set({ blocksById: map, gridSize: inferGridSize(blocks) });
  },

  setLeaderboard: (rows) =>
    set((s) => {
      const sorted = sortLeaderboard(rows);
      let user = s.user;
      if (user) {
        const found = rows.find((r) => r.id === user!.id);
        if (found) {
          user = { ...user, name: found.name, color: found.color, score: found.score };
        }
      }
      return { leaderboard: sorted, user };
    }),

  applyBlock: (block) =>
    set((s) => ({
      blocksById: { ...s.blocksById, [block.id]: { ...block } },
    })),

  applyScoreUpdate: (p) =>
    set((s) => {
      const leaderboard = [...s.leaderboard];
      const i = leaderboard.findIndex((r) => r.id === p.userId);
      const entry: LeaderboardEntry = {
        id: p.userId,
        name: p.name,
        color: p.color,
        score: p.score,
      };
      if (i >= 0) leaderboard[i] = entry;
      else leaderboard.push(entry);

      // Keep local user in sync if it's us
      let user = s.user;
      if (user && user.id === p.userId) {
        user = { ...user, score: p.score, name: p.name, color: p.color };
      }
      return { leaderboard: sortLeaderboard(leaderboard), user };
    }),

  setPending: (id) => set({ pendingBlockId: id }),
  setToast: (msg) => set({ toast: msg }),
  setConnected: (v) => set({ connected: v }),
  setBootstrapped: (v) => set({ bootstrapped: v }),
}));
