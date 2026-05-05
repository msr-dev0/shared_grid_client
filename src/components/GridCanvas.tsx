"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Block } from "@/lib/types";

const DEFAULT_CELL = "#1e293b";

type Props = {
  gridSize: number;
  blocksById: Record<number, Block>;
  disabled: boolean;
  pendingBlockId: number | null;
  currentUserId: string | null;
  onPickBlock: (blockId: number) => void;
  onUnclaimBlock: (blockId: number) => void;
};

export function GridCanvas({ gridSize, blocksById, disabled, pendingBlockId, currentUserId, onPickBlock, onUnclaimBlock }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordToIdRef = useRef<Map<string, number>>(new Map());

  const coordMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of Object.values(blocksById)) {
      m.set(`${b.x},${b.y}`, b.id);
    }
    return m;
  }, [blocksById]);

  useEffect(() => {
    coordToIdRef.current = coordMap;
  }, [coordMap]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = Math.floor(Math.min(cssW, cssH) / gridSize);
    if (cell < 1) return;

    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, cssW, cssH);

    for (const b of Object.values(blocksById)) {
      const isPending = pendingBlockId === b.id;
      const isOwned = currentUserId != null && b.ownerId === currentUserId;
      ctx.fillStyle = b.ownerColor ?? DEFAULT_CELL;
      if (isPending) {
        ctx.globalAlpha = 0.65;
      }
      ctx.fillRect(b.x * cell, b.y * cell, cell - 0.5, cell - 0.5);
      ctx.globalAlpha = 1;

      // Draw a small diamond marker on blocks owned by the current user
      if (isOwned && !isPending) {
        const cx = b.x * cell + cell / 2;
        const cy = b.y * cell + cell / 2;
        const r = Math.max(2, cell * 0.12);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = "rgba(148,163,184,0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      const p = i * cell;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, gridSize * cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(gridSize * cell, p);
      ctx.stroke();
    }
  }, [blocksById, gridSize, pendingBlockId, currentUserId]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    const el = canvasRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const cell = Math.floor(Math.min(cssW, cssH) / gridSize);
      if (cell < 1) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      if (gx < 0 || gy < 0 || gx >= gridSize || gy >= gridSize) return;

      const id = coordToIdRef.current.get(`${gx},${gy}`);
      if (typeof id === "number") {
        const block = blocksById[id];
        if (block?.ownerId && currentUserId && block.ownerId === currentUserId) {
          onUnclaimBlock(id);
        } else {
          onPickBlock(id);
        }
      }
    },
    [disabled, gridSize, blocksById, currentUserId, onPickBlock, onUnclaimBlock],
  );

  const busy = pendingBlockId !== null;

  return (
    <canvas
      ref={canvasRef}
      className={`h-[min(72vw,72vh)] w-[min(72vw,72vh)] rounded-lg border border-slate-700 bg-slate-950 shadow-lg ${
        busy ? "cursor-wait" : disabled ? "cursor-not-allowed opacity-90" : "cursor-crosshair"
      }`}
      onClick={handleClick}
      aria-label="Pixel grid"
    />
  );
}
