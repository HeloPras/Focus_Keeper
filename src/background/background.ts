/// <reference types="chrome" />

import {
  startSession,
  endSession,
  logChunk,
  setWindowFocused,
  setUserIdle,
  resetSessionBaseline,
  getCurrentSession,
  LOG_INTERVAL,
} from "./tracking";

import { refreshTodoState } from "./todos";

import { resetCategoryTimers } from "./categories";

// ============================================
// TODO CHANGES
// ============================================

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.todos) {
    refreshTodoState();
  }
});

// ============================================
// TAB ACTIVATED
// ============================================

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);

  startSession(activeInfo.tabId, tab.url);
});

// ============================================
// URL CHANGED
// ============================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    startSession(tabId, changeInfo.url);
  }
});

// ============================================
// SPA ROUTE CHANGED
// ============================================

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0 && getCurrentSession()?.tabId === details.tabId) {
    startSession(details.tabId, details.url);
  }
});

// ============================================
// WINDOW FOCUS
// ============================================

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    setWindowFocused(false);

    console.log("Window lost focus — flushing chunk");

    logChunk();

    return;
  }

  setWindowFocused(true);

  const [tab] = await chrome.tabs.query({
    active: true,
    windowId,
  });

  if (tab) {
    startSession(tab.id!, tab.url);
  }
});

// ============================================
// IDLE DETECTION
// ============================================

const IDLE_THRESHOLD_SECONDS = 30;

chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") {
    setUserIdle(false);

    if (getCurrentSession()) {
      resetSessionBaseline();
    }
  } else {
    console.log("User idle — flushing chunk");

    logChunk();

    setUserIdle(true);
  }
});

// ============================================
// TAB CLOSED
// ============================================

chrome.tabs.onRemoved.addListener((tabId) => {
  if (getCurrentSession()?.tabId === tabId) {
    endSession();
  }
});

// ============================================
// PERIODIC LOGGING
// ============================================

setInterval(logChunk, LOG_INTERVAL);

// ============================================
// MIDNIGHT RESET
// ============================================

function scheduleMidnightReset() {
  const now = new Date();

  const midnight = new Date(now);

  midnight.setHours(24, 0, 0, 0);

  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    resetCategoryTimers();

    scheduleMidnightReset();
  }, msUntilMidnight);
}

scheduleMidnightReset();

// ============================================
// SERVICE WORKER STARTUP
// ============================================

chrome.runtime.onStartup.addListener(async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  if (tab) {
    startSession(tab.id!, tab.url);
  }
});
