import type { Analysis } from "./types";

export async function fetchAnalysis(): Promise<Analysis> {
  const res = await fetch("/api/analysis");
  if (!res.ok) {
    throw new Error(`Failed to load analysis (${res.status})`);
  }
  return res.json();
}

/** Explicitly re-run the LLM over the current messages.json (the "Re-run analysis"
 *  button / "test with new data" flow). The only call that invokes the LLM. */
export async function runAnalysis(): Promise<Analysis> {
  const res = await fetch("/api/analyze", { method: "POST" });
  if (!res.ok) {
    let detail = `Analysis failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* keep the default */
    }
    throw new Error(detail);
  }
  return res.json();
}
