import type { Analysis } from "./types";

export async function fetchAnalysis(): Promise<Analysis> {
  const res = await fetch("/api/analysis");
  if (!res.ok) {
    throw new Error(`Failed to load analysis (${res.status})`);
  }
  return res.json();
}
