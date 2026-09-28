/// <reference types="chrome" />

import { getCurrentSession } from "./tracking.ts";

// const LIMIT_MS = 30 * 60 * 1000;
const LIMIT_MS = 5000;

export function scheduleLimitAlarm() {
  const session = getCurrentSession();

  if (!session) return;

  const remainingMs = LIMIT_MS - session.accumulatedMs;

  if (remainingMs <= 0) {
    return;
  }

  chrome.alarms.create("time-limit", {
    when: Date.now() + remainingMs,
  });

  console.log(`Limit alarm scheduled in ${remainingMs / 1000} seconds`);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "time-limit") {
    return;
  }

  const session = getCurrentSession();

  if (!session || session.limitReached) {
    return;
  }

  const elapsed = Date.now() - session.startTime;

  const total = session.accumulatedMs + elapsed;

  if (total >= LIMIT_MS) {
    session.limitReached = true;

    console.log(`🚨 Time limit reached for ${session.url}`);

    // Show popup/notification here
  }
});
