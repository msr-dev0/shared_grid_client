"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Block } from "@/lib/types";

const DEFAULT_CELL = "#1e293b";
const MIN_SCALE = 0.3;
const MAX_SCALE = 8;
const ZOOM_SENSITIVITY = 0.0012;

type Props = {
  gridSize: number;
  blocksById: Record<number, Block>;
  disabled: boolean;
  pendingBlockId: number | null;
  currentUserId: string | null;
  onPickBlock: (blockId: number) => void;
  onUnclaimBlock: (blockId: number) => void;
};

export function GridCanvas({
  gridSize,
  blocksById,
  disabled,
  pendingBlockId,
  currentUserId,
  onPickBlock,
  onUnclaimBlock,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordToIdRef = useRef<Map<string, number>>(new Map());

  // ── Zoom / pan state ──
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

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

  // ── Draw ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const baseCell = Math.floor(Math.min(cssW, cssH) / gridSize);
    if (baseCell < 1) return;
    const cell = baseCell * scale;

    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offset.x, offset.y);

    for (const b of Object.values(blocksById)) {
      const isPending = pendingBlockId === b.id;
      const isOwned = currentUserId != null && b.ownerId === currentUserId;

      ctx.globalAlpha = isPending ? 0.65 : 1;
      ctx.fillStyle = b.ownerColor ?? DEFAULT_CELL;
      ctx.fillRect(b.x * cell, b.y * cell, cell - 0.5, cell - 0.5);
      ctx.globalAlpha = 1;

      // Diamond marker for current user's blocks
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

    // Grid lines (fade out when zoomed very far out)
    if (cell >= 4) {
      const alpha = Math.min(0.2, (cell - 3) / 20);
      ctx.strokeStyle = `rgba(148,163,184,${alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        const p = i * cell;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, gridSize * cell); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(gridSize * cell, p); ctx.stroke();
      }
    }

    ctx.restore();
  }, [blocksById, gridSize, pendingBlockId, currentUserId, scale, offset]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    const el = canvasRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  // Centre grid on first load
  useEffect(() => {
    if (gridSize < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cssW = canvas.clientWidth || 600;
    const cssH = canvas.clientHeight || 600;
    const baseCell = Math.floor(Math.min(cssW, cssH) / gridSize);
    const total = gridSize * baseCell * scale;
    setOffset({ x: (cssW - total) / 2, y: (cssH - total) / 2 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize]);

  // ── Wheel zoom ──
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (1 + delta)));
      const ratio = newScale / scale;
      setOffset((prev) => ({
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
      }));
      setScale(newScale);
    },
    [scale],
  );

  // ── Pan ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Shift + left-click to pan
      if (e.button === 0 && e.shiftKey) {
        setIsPanning(true);
        panStartRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
        e.preventDefault();
      }
    },
    [offset],
  );

  const handleMiddleDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1) {
        setIsPanning(true);
        panStartRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
        e.preventDefault();
      }
    },
    [offset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPanning || !panStartRef.current) return;
      setOffset({
        x: panStartRef.current.ox + (e.clientX - panStartRef.current.mx),
        y: panStartRef.current.oy + (e.clientY - panStartRef.current.my),
      });
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  // ── Touch pinch/pan ──
  const touchesRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const lastPinchDistRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchesRef.current = Array.from(e.touches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    if (e.touches.length === 2) lastPinchDistRef.current = null;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const ts = Array.from(e.touches);
      if (ts.length === 2) {
        e.preventDefault();
        const dx = ts[0].clientX - ts[1].clientX;
        const dy = ts[0].clientY - ts[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDistRef.current !== null) {
          const ratio = dist / lastPinchDistRef.current;
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * ratio));
          const cx = (ts[0].clientX + ts[1].clientX) / 2;
          const cy = (ts[0].clientY + ts[1].clientY) / 2;
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const mx = cx - rect.left;
            const my = cy - rect.top;
            const r = newScale / scale;
            setOffset((prev) => ({ x: mx - (mx - prev.x) * r, y: my - (my - prev.y) * r }));
          }
          setScale(newScale);
        }
        lastPinchDistRef.current = dist;
      } else if (ts.length === 1 && touchesRef.current.length === 1) {
        const prev = touchesRef.current[0];
        setOffset((o) => ({ x: o.x + ts[0].clientX - prev.x, y: o.y + ts[0].clientY - prev.y }));
        touchesRef.current = [{ id: ts[0].identifier, x: ts[0].clientX, y: ts[0].clientY }];
      }
    },
    [scale],
  );

  const handleTouchEnd = useCallback(() => {
    lastPinchDistRef.current = null;
    touchesRef.current = [];
  }, []);

  // ── Reset view ──
  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setScale(1);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const baseCell = Math.floor(Math.min(cssW, cssH) / gridSize);
    const total = gridSize * baseCell;
    setOffset({ x: (cssW - total) / 2, y: (cssH - total) / 2 });
  }, [gridSize]);

  // ── Canvas click ──
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled || isPanning) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const baseCell = Math.floor(Math.min(canvas.clientWidth, canvas.clientHeight) / gridSize);
      const cell = baseCell * scale;
      if (cell < 1) return;
      const gx = Math.floor((e.clientX - rect.left - offset.x) / cell);
      const gy = Math.floor((e.clientY - rect.top - offset.y) / cell);
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
    [disabled, isPanning, gridSize, scale, offset, blocksById, currentUserId, onPickBlock, onUnclaimBlock],
  );

  const busy = pendingBlockId !== null;
  const cursorClass = isPanning
    ? "cursor-grabbing"
    : busy
    ? "cursor-wait"
    : disabled
    ? "cursor-not-allowed opacity-90"
    : "cursor-crosshair";

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Canvas wrapper */}
      <div
        className={`relative h-[min(72vw,72vh)] w-[min(72vw,72vh)] overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-lg ${cursorClass}`}
        onWheel={handleWheel}
        onMouseDown={(e) => { handleMouseDown(e); handleMiddleDown(e); }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          onClick={handleClick}
          aria-label="Pixel grid — scroll to zoom, shift+drag or pinch to pan"
        />

        {/* Pending badge */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="absolute left-2 top-2 rounded-full bg-slate-800/90 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-slate-700"
            >
              Claiming…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zoom controls */}
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {[
          { label: "+", title: "Zoom in", action: () => setScale((s) => Math.min(MAX_SCALE, s * 1.35)) },
          { label: "⊙", title: "Reset view", action: resetView },
          { label: "−", title: "Zoom out", action: () => setScale((s) => Math.max(MIN_SCALE, s / 1.35)) },
        ].map(({ label, title, action }) => (
          <motion.button
            key={label}
            onClick={action}
            title={title}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-sm font-bold text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {label}
          </motion.button>
        ))}
        <div className="mt-0.5 text-center text-[9px] font-mono text-slate-600">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Hint */}
      <p className="mt-2 text-center text-[11px] text-slate-600">
        Scroll to zoom · Shift+drag or pinch to pan
      </p>
    </motion.div>
  );
}
