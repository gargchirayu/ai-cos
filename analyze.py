#!/usr/bin/env python3
"""AI Chief of Staff — analysis pipeline (ingest-time).

Reads the morning's raw messages, runs them through Gemini in a single batched call,
validates the structured result, and writes the read model the dashboard serves.

    GEMINI_API_KEY=... python analyze.py

This is the same code path as the dashboard's "Re-run analysis" button
(`POST /api/analyze`) — both go through backend/pipeline.py. The committed
`data/analysis.json` is the stable artifact the CEO reads; regenerating it is an
explicit action, never a side effect of loading the page.
"""

from __future__ import annotations

from backend.pipeline import (
    ANALYSIS_PATH,
    MESSAGES_PATH,
    generate_analysis,
    load_messages,
    write_analysis,
)


def main() -> None:
    messages = load_messages()
    print(f"Loaded {len(messages)} messages from {MESSAGES_PATH.name}")
    print("Calling Gemini for analysis (this is the only LLM call)...")

    analysis = generate_analysis(messages)
    write_analysis(analysis)

    s = analysis.stats
    print(
        f"Wrote {ANALYSIS_PATH.name}: {s.decide} decide, {s.delegate} delegate, "
        f"{s.ignore} ignore, {len(analysis.situations)} situations, {s.flags} flags"
    )


if __name__ == "__main__":
    main()
