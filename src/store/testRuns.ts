import type { TestRun } from "../types";

// In-memory store for test runs created from the Test Bench
const newTestRuns: Map<string, TestRun> = new Map();

export function addTestRun(run: TestRun): void {
  newTestRuns.set(run.id, run);
}

export function updateTestRun(id: string, updates: Partial<TestRun>): void {
  const existing = newTestRuns.get(id);
  if (existing) {
    newTestRuns.set(id, { ...existing, ...updates });
  }
}

export function getAllTestRuns(): TestRun[] {
  return Array.from(newTestRuns.values());
}

export function getTestRun(id: string): TestRun | undefined {
  return newTestRuns.get(id);
}