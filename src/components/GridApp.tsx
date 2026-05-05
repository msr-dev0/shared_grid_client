"use client";

import { useCallback, useEffect, useRef } from "react";
import { createGuest, fetchBlocks, fetchLeaderboard, getToken, syncAuthHeader } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useGridStore } from "@/lib/store";
import type { Block } from "@/lib/types";
import { GridCanvas } from "./GridCanvas";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { RegisterPanel } from "./RegisterPanel";

const THROTTLE_MS = 500;

export function GridApp() {
  const hydrateSession = useGridStore((s) => s.hydrateSession);
  const persistSession = useGridStore((s) => s.persistSession);
  const setBlocks = useGridStore((s) => s.setBlocks);
  const setLeaderboard = useGridStore((s) => s.setLeaderboard);
  const applyBlock = useGridStore((s) => s.applyBlock);
  const applyScoreUpdate = useGridStore((s) => s.applyScoreUpdate);
  const setPending = useGridStore((s) => s.setPending);
  const setToast = useGridStore((s) => s.setToast);
  const setConnected = useGridStore((s) => s.setConnected);
  const setBootstrapped = useGridStore((s) => s.setBootstrapped);
  const user = useGridStore((s) => s.user);

  const blocksById = useGridStore((s) => s.blocksById);
  const gridSize = useGridStore((s) => s.gridSize);
  const pendingBlockId = useGridStore((s) => s.pendingBlockId);
  const bootstrapped = useGridStore((s) => s.bootstrapped);
  const connected = useGridStore((s) => s.connected);

  const lastEmitRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── 1. Hydrate session or create guest ─── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try to restore from localStorage
      hydrateSession();
      const existing = useGridStore.getState().user;

      if (existing) return; // already have a session

      // No session → create a guest
      try {
        const guest = await createGuest();
        if (cancelled) return;
        persistSession(guest);
      } catch (e) {
        console.error("Guest creation failed:", e);
        if (!cancelled) {
          setToast("Could not create session. Is the server running?");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateSession, persistSession, setToast]);

  /* ─── 2. Fetch initial grid + leaderboard once we have a token ─── */
  useEffect(() => {
    if (!user?.token) return; // wait until we have a session

    let cancelled = false;
    (async () => {
      try {
        syncAuthHeader();
        const [b, lb] = await Promise.all([fetchBlocks(), fetchLeaderboard()]);
        if (cancelled) return;
        setBlocks(b.blocks);
        setLeaderboard(lb.leaderboard);
        setBootstrapped(true);
      } catch (e) {
        console.error(e);
        setToast("Could not load grid. Is the API running?");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, setBlocks, setLeaderboard, setBootstrapped, setToast]);

  /* ─── 3. Socket listeners ─── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onBlock = (payload: { block: Block }) => {
      try {
        if (payload?.block) {
          applyBlock(payload.block);
          const pending = useGridStore.getState().pendingBlockId;
          if (pending !== null && payload.block.id === pending) {
            setPending(null);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const onScore = (payload: { userId: string; score: number; name: string; color: string }) => {
      try {
        if (payload?.userId && typeof payload.score === "number") {
          applyScoreUpdate({
            userId: payload.userId,
            score: payload.score,
            name: payload.name,
            color: payload.color,
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    const onClaimError = (payload: { message?: string }) => {
      setPending(null);
      setToast(payload?.message ?? "Could not claim that block");
    };

    const onUnclaimError = (payload: { message?: string }) => {
      setPending(null);
      setToast(payload?.message ?? "Could not unclaim that block");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("block_updated", onBlock);
    socket.on("score_update", onScore);
    socket.on("claim_error", onClaimError);
    socket.on("unclaim_error", onUnclaimError);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("block_updated", onBlock);
      socket.off("score_update", onScore);
      socket.off("claim_error", onClaimError);
      socket.off("unclaim_error", onUnclaimError);
    };
  }, [applyBlock, applyScoreUpdate, setConnected, setPending, setToast]);

  /* ─── helpers ─── */
  const showToast = useCallback(
    (msg: string | null) => {
      setToast(msg);
    },
    [setToast],
  );

  /* ─── 4. Claim block (click on unclaimed) ─── */
  const onPickBlock = useCallback(
    (blockId: number) => {
      const state = useGridStore.getState();
      if (!state.user) {
        showToast("Session not ready — please wait.");
        return;
      }
      if (state.pendingBlockId !== null) {
        return;
      }
      const block = state.blocksById[blockId];
      if (block?.ownerId) {
        showToast("Block already taken.");
        return;
      }
      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) {
        showToast("Too fast, slow down!");
        return;
      }
      lastEmitRef.current = now;

      const socket = getSocket();
      if (!socket?.connected) {
        showToast("Not connected — wait for live sync.");
        return;
      }

      setPending(blockId);
      try {
        socket.emit("claim_block", { blockId, token: getToken() });
      } catch (e) {
        console.error(e);
        setPending(null);
        showToast("Network error — try again.");
      }
    },
    [setPending, showToast],
  );

  /* ─── 5. Unclaim block (click on own block) ─── */
  const onUnclaimBlock = useCallback(
    (blockId: number) => {
      const state = useGridStore.getState();
      if (!state.user) {
        showToast("Session not ready — please wait.");
        return;
      }
      if (state.pendingBlockId !== null) {
        return;
      }
      const block = state.blocksById[blockId];
      if (!block?.ownerId || block.ownerId !== state.user.id) {
        showToast("You can only unclaim your own blocks.");
        return;
      }
      const now = Date.now();
      if (now - lastEmitRef.current < THROTTLE_MS) {
        showToast("Too fast, slow down!");
        return;
      }
      lastEmitRef.current = now;

      const socket = getSocket();
      if (!socket?.connected) {
        showToast("Not connected — wait for live sync.");
        return;
      }

      setPending(blockId);
      try {
        socket.emit("unclaim_block", { blockId, token: getToken() });
      } catch (e) {
        console.error(e);
        setPending(null);
        showToast("Network error — try again.");
      }
    },
    [setPending, showToast],
  );

  /* ─── Toast auto-dismiss ─── */
  const toast = useGridStore((s) => s.toast);

  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4200);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toast, setToast]);

  const interactionLocked = pendingBlockId !== null || !bootstrapped;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              connected ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-200"
            }`}
          >
            {connected ? "Live" : "Connecting…"}
          </span>
          {user?.isGuest && (
            <span className="rounded-full bg-amber-900/30 px-2 py-0.5 font-medium text-amber-300">
              Guest
            </span>
          )}
          {!bootstrapped ? <span>Loading grid…</span> : <span>{Object.keys(blocksById).length} blocks</span>}
        </div>
        <GridCanvas
          gridSize={gridSize}
          blocksById={blocksById}
          disabled={interactionLocked}
          pendingBlockId={pendingBlockId}
          currentUserId={user?.id ?? null}
          onPickBlock={onPickBlock}
          onUnclaimBlock={onUnclaimBlock}
        />
        {toast ? (
          <div className="max-w-md rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-center text-sm text-slate-100 shadow">
            {toast}
          </div>
        ) : null}
      </div>
      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <RegisterPanel />
        <LeaderboardPanel />
      </aside>
    </div>
  );
}
