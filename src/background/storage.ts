/// <reference types="chrome" />

export type TimeLog = Record<string, number>;

export interface TodoItem {
  id: string | number;
  text: string;
  completed: boolean;
}

export async function getTimeLog(): Promise<TimeLog> {
  const result = await chrome.storage.local.get("timeLog");

  return (result.timeLog ?? {}) as TimeLog;
}

export async function saveTimeChunk(url: string, ms: number): Promise<void> {
  const timeLog = await getTimeLog();

  timeLog[url] = (timeLog[url] || 0) + ms;

  await chrome.storage.local.set({
    timeLog,
  });
}

export async function getTodos(): Promise<TodoItem[]> {
  const result = await chrome.storage.local.get("todos");

  return (result.todos ?? []) as TodoItem[];
}
