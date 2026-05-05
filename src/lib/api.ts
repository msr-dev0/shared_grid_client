import axios, { type AxiosRequestConfig } from "axios";
import type { ApiResponse } from "./api-response";
import type { Block, LeaderboardEntry, User } from "./types";

const SESSION_KEY = "shared_grid_session_v2";

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Reads the stored token and sets it as the default Authorization header
 * for all subsequent axios requests. Called once on bootstrap and after
 * guest creation / registration.
 */
export function syncAuthHeader(): void {
  try {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      http.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    /* ignore */
  }
}

/**
 * Returns the stored token string, or empty string if none exists.
 */
export function getToken(): string {
  try {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

function assertSuccess<T>(body: ApiResponse<T>): asserts body is ApiResponse<T> & { success: true; data: T } {
  if (!body.success || body.data === null) {
    throw new Error(body.error || body.message || "Request failed");
  }
}

function toError(e: unknown): Error {
  if (axios.isAxiosError(e)) {
    const payload = e.response?.data as ApiResponse<unknown> | undefined;
    if (payload && typeof payload === "object" && payload.success === false) {
      return new Error(payload.error || payload.message || e.message);
    }
    return new Error(e.message || "Network error");
  }
  return e instanceof Error ? e : new Error("Request failed");
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request<ApiResponse<T>>(config);
    assertSuccess(res.data);
    return res.data.data;
  } catch (e) {
    throw toError(e);
  }
}

/* ────────────────────────── API calls ────────────────────────── */

export type BlocksPayload = { blocks: Block[] };
export type LeaderboardPayload = { leaderboard: LeaderboardEntry[] };

export async function fetchBlocks(): Promise<BlocksPayload> {
  return request<BlocksPayload>({ method: "GET", url: "/blocks" });
}

export async function fetchLeaderboard(): Promise<LeaderboardPayload> {
  return request<LeaderboardPayload>({ method: "GET", url: "/leaderboard" });
}

/**
 * POST /guest — creates an anonymous guest session.
 * Returns a User (with token) that can immediately interact with the grid.
 */
export async function createGuest(): Promise<User> {
  const data = await request<{
    id: string;
    name: string;
    color: string;
    score: number;
    isGuest: boolean;
    token: string;
  }>({ method: "POST", url: "/guest" });

  const user: User = {
    id: data.id,
    name: data.name,
    color: data.color,
    score: data.score,
    isGuest: data.isGuest,
    token: data.token,
  };
  return user;
}

/**
 * POST /register — upgrades a guest or creates a new registered user.
 * Sends the current JWT in the Authorization header so the server can
 * detect guest upgrades.
 */
export async function registerUser(body: {
  name: string;
  color: string;
  password: string;
}): Promise<User> {
  const data = await request<{
    id: string;
    name: string;
    color: string;
    score: number;
    isGuest: boolean;
    token: string;
  }>({ method: "POST", url: "/register", data: body });

  const user: User = {
    id: data.id,
    name: data.name,
    color: data.color,
    score: data.score,
    isGuest: data.isGuest,
    token: data.token,
  };
  return user;
}

/**
 * POST /login — authenticates a registered user.
 */
export async function loginUser(body: {
  name: string;
  password: string;
}): Promise<User> {
  const data = await request<{
    id: string;
    name: string;
    color: string;
    score: number;
    isGuest: boolean;
    token: string;
  }>({ method: "POST", url: "/login", data: body });

  const user: User = {
    id: data.id,
    name: data.name,
    color: data.color,
    score: data.score,
    isGuest: data.isGuest,
    token: data.token,
  };
  return user;
}

export { http, SESSION_KEY };
export type { ApiResponse } from "./api-response";
