import { MemorySessionStorage } from "./toolkit/index.js";
import type { StorageAdapter } from "grammy";

// ── Data types ──────────────────────────────────────────────────────

export interface Feedback {
  id: string;
  text: string;
  timestamp: number;
  submitter_id?: number;
  anonymous: boolean;
  read_flag: boolean;
  tags: string[];
}

export interface UserPrefs {
  telegram_id: number;
  anonymity_preference: boolean;
}

export interface AdminSettings {
  telegram_id: number;
  notifications_enabled: boolean;
  daily_summary_enabled: boolean;
  retention_days: number;
}

// ── Injectable clock ────────────────────────────────────────────────

let clockFn: () => number = () => Date.now();

export function now(): number {
  return clockFn();
}

export function setClock(fn: () => number): void {
  clockFn = fn;
}

// ── Storage instances (prefixed MemorySessionStorage) ────────────────

const feedbackStore = new MemorySessionStorage<Feedback>();
const userStore = new MemorySessionStorage<UserPrefs>();
const adminStore = new MemorySessionStorage<AdminSettings>();
const indexStore = new MemorySessionStorage<Record<string, unknown>>();

// ── ID generator ────────────────────────────────────────────────────

let counter = 0;
export function nextId(prefix: string): string {
  return `${prefix}_${++counter}`;
}

// ── Feedback helpers ────────────────────────────────────────────────

export async function saveFeedback(fb: Feedback): Promise<void> {
  await feedbackStore.write(fb.id, fb);
  const idx = (await indexStore.read("feedback_ids")) as { ids: string[] } | undefined;
  const ids = idx?.ids ?? [];
  ids.push(fb.id);
  await indexStore.write("feedback_ids", { ids });
}

export async function getFeedback(id: string): Promise<Feedback | undefined> {
  return feedbackStore.read(id);
}

export async function listFeedback(limit = 20): Promise<Feedback[]> {
  const idx = (await indexStore.read("feedback_ids")) as { ids: string[] } | undefined;
  const ids = idx?.ids ?? [];
  const recent = ids.slice(-limit).reverse();
  const items: Feedback[] = [];
  for (const id of recent) {
    const fb = await feedbackStore.read(id);
    if (fb) items.push(fb);
  }
  return items;
}

export async function markFeedbackRead(id: string): Promise<void> {
  const fb = await feedbackStore.read(id);
  if (fb) {
    fb.read_flag = true;
    await feedbackStore.write(id, fb);
  }
}

export async function tagFeedback(id: string, tag: string): Promise<void> {
  const fb = await feedbackStore.read(id);
  if (fb && !fb.tags.includes(tag)) {
    fb.tags.push(tag);
    await feedbackStore.write(id, fb);
  }
}

// ── User helpers ────────────────────────────────────────────────────

export async function getUserPrefs(telegramId: number): Promise<UserPrefs | undefined> {
  return userStore.read(String(telegramId));
}

export async function saveUserPrefs(prefs: UserPrefs): Promise<void> {
  await userStore.write(String(prefs.telegram_id), prefs);
}

// ── Admin helpers ───────────────────────────────────────────────────

function parseAdminIds(): number[] {
  const raw = process.env.ADMIN_IDS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

export async function isAdmin(telegramId: number): Promise<boolean> {
  const settings = await adminStore.read(String(telegramId));
  if (settings) return true;
  return parseAdminIds().includes(telegramId);
}

export async function getAdminIds(): Promise<number[]> {
  const idx = (await indexStore.read("admin_ids")) as { ids: number[] } | undefined;
  const stored = idx?.ids ?? [];
  const envIds = parseAdminIds();
  const all = new Set([...envIds, ...stored]);
  return [...all];
}

export async function addAdmin(telegramId: number): Promise<void> {
  const idx = (await indexStore.read("admin_ids")) as { ids: number[] } | undefined;
  const ids = idx?.ids ?? [];
  if (!ids.includes(telegramId)) {
    ids.push(telegramId);
    await indexStore.write("admin_ids", { ids });
  }
  const existing = await adminStore.read(String(telegramId));
  if (!existing) {
    await adminStore.write(String(telegramId), {
      telegram_id: telegramId,
      notifications_enabled: true,
      daily_summary_enabled: false,
      retention_days: 90,
    });
  }
}

export async function getAdminSettings(telegramId: number): Promise<AdminSettings | undefined> {
  return adminStore.read(String(telegramId));
}

export async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  await adminStore.write(String(settings.telegram_id), settings);
}
