/// <reference types="chrome" />

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  // return DOMAIN_CATEGORY_MAP[domain] || "uncategorized";

  const interaction = await ai.interactions.create({
    model: "gemini-3.8-flash",
    system_instruction: `

You are a website categorization system.

Your task is to categorize a website based on the URL provided as input.

You MUST return exactly ONE of the following categories:

* productivity
* entertainment
* social
* information
* shopping
* other

Rules:

1. Analyze the domain and URL to determine the website's primary purpose.
2. Return only the category name.
3. Use lowercase.
4. Do not return explanations, punctuation, JSON, markdown, or additional text.
5. If the website does not clearly fit any category, return "other".
6. Choose the category based on the website's primary purpose, not a specific page or URL path.

Category definitions:

* productivity: Work, coding, development, project management, office tools, education, learning, research, writing, and other productivity-focused websites.
* entertainment: Video streaming, music, movies, TV, gaming, memes, and other entertainment-focused websites.
* social: Social media, forums, communities, messaging, and other platforms primarily focused on social interaction.
* information: News, search engines, reference sites, encyclopedias, blogs, documentation, and websites primarily intended for obtaining information.
* shopping: E-commerce, online stores, marketplaces, food delivery, travel booking, and websites primarily focused on purchasing products or services.
* other: Websites that do not clearly belong to any of the categories above.

Output ONLY one of these exact strings:

"productivity"
"entertainment"
"social"
"information"
"shopping"
"other"
	`,
    input: domain,
  });

  if (!interaction.output_text) {
    return "uncategorized";
  }

  return interaction.output_text;
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
