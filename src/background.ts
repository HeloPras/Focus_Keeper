//still type error
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

const LOG_INTERVAL_MS = 5000;
const IDLE_THRESHOLD_SECONDS = 30; // chrome.idle minimum is 15s

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

// Initialize on service worker startup (e.g. browser restart, worker respawn)
chrome.runtime.onStartup.addListener(async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab) startSession(tab.id!, tab.url);
});
