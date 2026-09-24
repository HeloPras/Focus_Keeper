/// <reference types="chrome" />

import { saveTimeChunk } from "./storage";
import {
  getCategory,
  addCategoryTime,
  checkCategoryThreshold,
} from "./categories";

export interface Session {
  tabId: number;
  url: string;
  startTime: number;
  accumulatedMs: number;
}

let currentSession: Session | null = null;

let windowFocused = true;
let userIdle = false;

const LOG_INTERVAL_MS = 5000;

export function isAttentive(): boolean {
  return windowFocused && !userIdle;
}

export function setWindowFocused(focused: boolean) {
  windowFocused = focused;
}

export function setUserIdle(idle: boolean) {
  userIdle = idle;
}

export function getCurrentSession(): Session | null {
  return currentSession;
}

export async function logChunk() {
  if (!currentSession || !isAttentive()) {
    return;
  }

  const now = Date.now();

  const elapsed = now - currentSession.startTime - currentSession.accumulatedMs;

  if (elapsed <= 0) {
    return;
  }

  currentSession.accumulatedMs += elapsed;

  console.log(
    `[attention] ${currentSession.url} — +${(elapsed / 1000).toFixed(
      1,
    )}s (total ${(currentSession.accumulatedMs / 1000).toFixed(1)}s)`,
  );

  // Save URL time
  saveTimeChunk(currentSession.url, elapsed);

  // Save category time
  const category = await getCategoryFromUrl(currentSession.url);

  addCategoryTime(category, elapsed);
  checkCategoryThreshold(category);
}

async function getCategoryFromUrl(url: string): Promise<string> {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    return await getCategory(hostname);
  } catch {
    return "uncategorized";
  }
}

export function endSession() {
  if (currentSession) {
    console.log("Session ended — flushing remaining time");

    logChunk();
  }

  currentSession = null;
}

export function startSession(tabId: number, url: string | undefined) {
  if (!url) {
    return;
  }

  endSession();

  currentSession = {
    tabId,
    url,
    startTime: Date.now(),
    accumulatedMs: 0,
  };

  console.log("Session started:", url);
}

export function resetSessionBaseline() {
  if (!currentSession) {
    return;
  }

  currentSession.startTime = Date.now();
  currentSession.accumulatedMs = 0;
}

export const LOG_INTERVAL = LOG_INTERVAL_MS;
