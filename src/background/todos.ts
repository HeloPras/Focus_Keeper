/// <reference types="chrome" />

import { getTodos } from "./storage";

import { logChunk, getCurrentSession, resetSessionBaseline } from "./tracking";

let hasPendingTodos = true;

export function hasPendingTodoItems(): boolean {
  return hasPendingTodos;
}

export async function refreshTodoState(): Promise<void> {
  const todos = await getTodos();

  console.log(todos);

  const wasPending = hasPendingTodos;

  hasPendingTodos = todos.some((todo) => !todo.completed);

  // Todos were completed
  if (wasPending && !hasPendingTodos) {
    logChunk();
  }

  // A new pending todo appeared
  if (!wasPending && hasPendingTodos && getCurrentSession()) {
    resetSessionBaseline();
  }
}
