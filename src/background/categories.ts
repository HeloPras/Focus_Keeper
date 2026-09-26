/// <reference types="chrome" />

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.EXTENSION_PUBLIC_GEMINI_API_KEY,
});

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

Your task is to categorize a website based on a URL. You MUST return exactly ONE lowercase word from this list, with no other text:

productivity
entertainment
social
information
shopping
other

STEP-BY-STEP METHOD (follow in order):

1. Extract the root domain from the URL (e.g. from "https://www.youtube.com/watch?v=abc123&list=xyz&utm_source=email" the root domain is "youtube.com"). Ignore "www.", protocol, and case.
2. Identify the KNOWN PRIMARY PURPOSE of that root domain based on general knowledge of the service/company (e.g. youtube.com = video streaming/entertainment; github.com = software development/productivity; amazon.com = shopping).
3. Treat everything after the domain — path segments, query parameters, tracking codes, session IDs, anchors, random-looking strings — as IRRELEVANT NOISE. Do not let unfamiliar or messy-looking path/query content push you toward "other." A URL like "youtube.com/watch?v=xJ2k9_ZqLq&feature=share&t=42" is still just YouTube.
4. Only consider the subdomain if it clearly indicates a genuinely different product line from the same company (e.g. "mail.google.com" is productivity/communication even though "google.com" itself is information/search; "business.instagram.com" may differ from "instagram.com").
5. Classify by the SITE'S overall purpose, not the specific page, action, or content on that page. Do not try to interpret what the path "means" — you are not analyzing page content, only identifying which known service the domain belongs to.
6. Only return "other" if:
   - The root domain is genuinely unrecognized/ambiguous AND gives no clue via its name, OR
   - It's a URL shortener, redirect service, or IP address with no identifiable destination, OR
   - It plausibly serves multiple unrelated purposes with no dominant one.
   Do NOT return "other" just because the path/query string looks unfamiliar or complex — that is expected and normal for real-world URLs.

CATEGORY DEFINITIONS:
- productivity: work, coding, development, project management, office/productivity tools, education, learning, research, writing, cloud storage, email, calendars.
- entertainment: video streaming, music, movies, TV, gaming, memes, comics, sports highlights/entertainment.
- social: social media, forums, communities, messaging/chat apps, dating apps.
- information: news, search engines, reference sites, encyclopedias, blogs, documentation, weather, maps.
- shopping: e-commerce, online stores, marketplaces, food delivery, travel/hotel/flight booking, classifieds.
- other: anything that doesn't clearly fit above, or unidentifiable/ambiguous domains.

OUTPUT RULES:
- Output ONLY the category word, lowercase, nothing else.
- No punctuation, no quotes, no explanation, no JSON, no markdown.
- Never output more than one word.

EXAMPLES:
https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=15s → entertainment
https://github.com/anthropics/claude?tab=readme-ov-file → productivity
https://en.wikipedia.org/wiki/Machine_learning → information
https://www.amazon.com/gp/product/B08N5WRWNW/ref=abc123 → shopping
https://mail.google.com/mail/u/0/#inbox → productivity
https://www.reddit.com/r/programming/comments/xyz123/ → social
https://bit.ly/3xK9zQp → other
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

// This is not used
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
