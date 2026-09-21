//still type error
//
//
//
/// <reference types="chrome" />

interface Session {
  tabId: number;
  url: string;
  startTime: number;
  accumulatedMs: number; // time already logged for this session
}

type TimeLog = Record<string, number>;

let currentSession: Session | null = null;
let windowFocused = true;
let userIdle = false;
let hasPendingTodos = true;

const LOG_INTERVAL_MS = 5000;
const IDLE_THRESHOLD_SECONDS = 30; // chrome.idle minimum is 15s

// --- Category configuration ---
// Map domains to categories. Extend this as needed, or load from storage
// so users can customize it via an options page.
const DOMAIN_CATEGORY_MAP: Record<string, string> = {
  "youtube.com": "entertainment",
  "netflix.com": "entertainment",
  "twitch.tv": "entertainment",
  "reddit.com": "entertainment",
  "instagram.com": "entertainment",
  "tiktok.com": "entertainment",
  "facebook.com": "social",
  "twitter.com": "social",
  "x.com": "social",
  "linkedin.com": "social",
  "github.com": "work",
  "stackoverflow.com": "work",
  "docs.google.com": "work",
  "notion.so": "work",
};

// --- To-do list gating ---
// Assumes chrome.storage.local has a "todos" key: an array of
// { id, text, completed: boolean } objects. Adjust the field names
// below if your existing to-do list uses a different shape/key.
interface TodoItem {
  id: string | number;
  text: string;
  completed: boolean;
}

async function refreshTodoState(): Promise<void> {
  const { todos = [] } = await chrome.storage.local.get("todos");
  console.log(todos);
  const wasPending = hasPendingTodos;
  hasPendingTodos = (todos as TodoItem[]).some((t) => !t.completed);

  // If todos just became fully complete while a session was running, flush and pause.
  if (wasPending && !hasPendingTodos) {
    logChunk();
  }
  // If todos just went from none-pending to pending again, resume tracking cleanly.
  if (!wasPending && hasPendingTodos && currentSession) {
    currentSession.startTime = Date.now();
    currentSession.accumulatedMs = 0;
  }
}

// React immediately whenever the to-do list changes (checked/unchecked/added/removed)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.todos) {
    refreshTodoState();
  }
});

// Per-category alert thresholds (in ms). Only categories listed here get popups.
const CATEGORY_THRESHOLDS_MS: Record<string, number> = {
  entertainment: 15 * 60 * 1000, // 15 min
};

// Tracks accumulated time per category since last reset/alert
const categoryTimers: Record<string, number> = {};
// Tracks whether we've already alerted for a category in its current "run"
const alertedCategories: Set<string> = new Set();

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getCategory(domain: string): string {
  return DOMAIN_CATEGORY_MAP[domain] || "uncategorized";
}

// --- Notification popup ---
function showThresholdPopup(category: string, ms: number) {
  chrome.notifications.create(`threshold-${category}-${Date.now()}`, {
    type: "basic",
    iconUrl: "icon128.png", // replace with your extension's icon path
    title: "Time check",
    message: `You've spent ${Math.round(ms / 60000)} min on ${category} sites.`,
    priority: 2,
  });
}

function checkCategoryThreshold(category: string) {
  const threshold = CATEGORY_THRESHOLDS_MS[category];
  if (!threshold) return; // no alerting configured for this category

  const total = categoryTimers[category] || 0;

  if (total >= threshold && !alertedCategories.has(category)) {
    showThresholdPopup(category, total);
    alertedCategories.add(category);
    // Optional: reset the timer so the next alert fires after another 15 min
    // categoryTimers[category] = 0;
  }
}

// Only "attentive" when window is focused AND user isn't idle
function isAttentive(): boolean {
  return windowFocused && !userIdle;
}

function logChunk() {
  if (currentSession && isAttentive()) {
    const now = Date.now();
    const elapsed =
      now - currentSession.startTime - currentSession.accumulatedMs;
    currentSession.accumulatedMs += elapsed;

    console.log(
      `[attention] ${currentSession.url} — +${(elapsed / 1000).toFixed(1)}s (total ${(currentSession.accumulatedMs / 1000).toFixed(1)}s)`,
    );

    saveTimeChunk(currentSession.url, elapsed);
  }
}

async function saveTimeChunk(url: string, ms: number) {
  // const { timeLog = {} as Record<string, number> } = await chrome.storage.local.get("timeLog");
  const result = await chrome.storage.local.get("timeLog");

  const timeLog: TimeLog = (result.timeLog ?? {}) as TimeLog;

  timeLog[url] = (timeLog[url] || 0) + ms;
  await chrome.storage.local.set({ timeLog });
}

function endSession() {
  if (currentSession) {
    console.log("Session Ended Chunk load");
    logChunk(); // flush any remaining un-logged time
  }
  currentSession = null;
}

function startSession(tabId: number, url: string | undefined) {
  if (!url) return;
  endSession();
  currentSession = {
    tabId,
    url,
    startTime: Date.now(),
    accumulatedMs: 0,
  };
}

// --- Tab switched ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  startSession(activeInfo.tabId, tab.url);
});

// --- URL changed within the active tab ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    startSession(tabId, changeInfo.url);
  }
});

// --- SPA route changes (URL changes without full page load) ---
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0 && currentSession?.tabId === details.tabId) {
    startSession(details.tabId, details.url);
  }
});

// --- Browser window focus/blur (switching to another app) ---
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    windowFocused = false;
    console.log("Window Focus changed Chunk logged");
    logChunk(); // flush before pausing
  } else {
    windowFocused = true;
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      startSession(tab.id!, tab.url);
    }
  }
});

// --- Idle detection (AFK) ---
chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") {
    userIdle = false;
    if (currentSession) {
      currentSession.startTime =
        Date.now() - (Date.now() - currentSession.startTime); // no-op, reset baseline below
      currentSession.startTime = Date.now();
      currentSession.accumulatedMs = 0;
    }
  } else {
    // "idle" or "locked"
    console.log("State Changed Chunk Logged:");
    logChunk(); // flush before pausing
    userIdle = true;
  }
});

// --- Tab closed ---
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentSession?.tabId === tabId) {
    endSession();
  }
});

// --- Periodic logging every 5s ---
// NOTE: MV3 service workers can be killed after ~30s idle. setInterval alone
// is not reliable long-term — pair with chrome.alarms (min 1 min in production,
// shorter intervals only work in unpacked/dev mode) if you need guaranteed
// wake-ups. This interval works while the worker is alive (e.g. during an
// active session with recent tab/nav activity keeping it awake).
setInterval(logChunk, LOG_INTERVAL_MS);

// --- Reset category timers at midnight (optional daily reset) ---
function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    for (const key in categoryTimers) categoryTimers[key] = 0;
    alertedCategories.clear();
    scheduleMidnightReset(); // reschedule for next day
  }, msUntilMidnight);
}
scheduleMidnightReset();

// Initialize on service worker startup (e.g. browser restart, worker respawn)
chrome.runtime.onStartup.addListener(async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab) startSession(tab.id!, tab.url);
});
