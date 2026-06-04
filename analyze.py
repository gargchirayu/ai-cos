#!/usr/bin/env python3
"""AI Chief of Staff — analysis pipeline (ingest-time, run once).

Reads the morning's raw messages, runs them through Claude in a single batched call,
validates the structured result against the Pydantic contract, and writes the
read model the dashboard serves.

    ANTHROPIC_API_KEY=... python analyze.py

This is deliberately a separate, explicit step — NOT something the dashboard triggers
on page load. The committed `data/analysis.json` is the stable artifact the CEO reads;
re-running this is how new analysis is produced (see README "production roadmap").
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from backend.cos import analyze
from backend.schema import Stats

ROOT = Path(__file__).parent
MESSAGES_PATH = ROOT / "data" / "messages.json"
OUTPUT_PATH = ROOT / "data" / "analysis.json"

MORNING_OF = "2026-03-18"  # the date stamped on the provided dataset
CEO = "ceo@company.com"


def main() -> None:
    messages = json.loads(MESSAGES_PATH.read_text())
    print(f"Loaded {len(messages)} messages from {MESSAGES_PATH.name}")
    print(f"Calling Claude for analysis (this is the only LLM call)...")

    analysis = analyze(messages, morning_of=MORNING_OF, ceo=CEO)

    # Recompute stats from the triaged messages so they can never disagree with the UI.
    cats = [m.category for m in analysis.messages]
    analysis.stats = Stats(
        total=len(analysis.messages),
        decide=cats.count("decide"),
        delegate=cats.count("delegate"),
        ignore=cats.count("ignore"),
        flags=len(analysis.flags),
    )
    analysis.generated_at = datetime.now(timezone.utc).isoformat()

    # Sanity check: every message id present exactly once.
    ids = sorted(m.id for m in analysis.messages)
    expected = sorted(m["id"] for m in messages)
    if ids != expected:
        raise SystemExit(f"Message id mismatch: got {ids}, expected {expected}")

    OUTPUT_PATH.write_text(
        json.dumps(analysis.model_dump(by_alias=True), indent=2, ensure_ascii=False)
    )
    s = analysis.stats
    print(
        f"Wrote {OUTPUT_PATH.name}: {s.decide} decide, {s.delegate} delegate, "
        f"{s.ignore} ignore, {len(analysis.situations)} situations, {s.flags} flags"
    )


if __name__ == "__main__":
    main()
