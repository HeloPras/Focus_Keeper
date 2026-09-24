/// <reference types="chrome" />

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

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

const Media_Category = [
  "productivity",
  "entertainment",
  "social",
  "information",
  "shopping",
  "other",
];

const CATEGORY_THRESHOLDS_MS: Record<string, number> = {
  entertainment: 15 * 60 * 1000,
};

const categoryTimers: Record<string, number> = {};

const alertedCategories = new Set<string>();

export async function getCategory(domain: string): Promise<string> {
  return DOMAIN_CATEGORY_MAP[domain] || "uncategorized";

  const interaction = await ai.interactions.create({
    model: "gemini-3.8-flash",
    input: "Explain how AI works in a few words",
  });
}

export function addCategoryTime(category: string, ms: number) {
  categoryTimers[category] = (categoryTimers[category] || 0) + ms;
}

export function getCategoryTime(category: string): number {
  return categoryTimers[category] || 0;
}

export function checkCategoryThreshold(category: string) {
  const threshold = CATEGORY_THRESHOLDS_MS[category];

  if (!threshold) {
    return;
  }

  const total = categoryTimers[category] || 0;

  if (total >= threshold && !alertedCategories.has(category)) {
    showThresholdPopup(category, total);

    alertedCategories.add(category);
  }
}

function showThresholdPopup(category: string, ms: number) {
  chrome.notifications.create(`threshold-${category}-${Date.now()}`, {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Time check",
    message: `You've spent ${Math.round(ms / 60000)} min on ${category} sites.`,
    priority: 2,
  });
}

export function resetCategoryTimers() {
  for (const key in categoryTimers) {
    categoryTimers[key] = 0;
  }

  alertedCategories.clear();
}
