"""Pipeline orchestration shared by the CLI (`analyze.py`) and the on-demand
`POST /api/analyze` endpoint, so the two can never drift.

It runs the single Gemini call, then enforces the invariants the dashboard relies on:
stats recomputed from the triage, a fresh `generated_at`, and every input message id
present exactly once. It also post-processes the AI output to replace message
references with the sender's name.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .cos import analyze
from .schema import Analysis, Stats

ROOT = Path(__file__).parent.parent
MESSAGES_PATH = ROOT / "data" / "messages.json"
ANALYSIS_PATH = ROOT / "data" / "analysis.json"

CEO = "ceo@company.com"


def load_messages(path: Path = MESSAGES_PATH) -> list[dict[str, Any]]:
    return json.loads(path.read_text())


def _morning_of(messages: list[dict[str, Any]]) -> str:
    """Derive the briefing date from the data, so new inboxes are labelled correctly."""
    stamps = sorted(m["timestamp"] for m in messages if m.get("timestamp"))
    return stamps[0][:10] if stamps else datetime.now(timezone.utc).date().isoformat()


def _short_name(sender: str) -> str:
    """'Sarah Chen <sarah@co.com>' → 'Sarah Chen'."""
    return sender.split("<")[0].strip() or sender.split("@")[0]


def _replace_msg_refs(text: str, name_by_id: dict[int, str]) -> str:
    """Replace '#N' references in AI-generated text with the sender's first name."""
    def _sub(m: re.Match) -> str:
        name = name_by_id.get(int(m.group(1)))
        return name or m.group(0)
    return re.sub(r"#(\d+)", _sub, text)


def _apply_to_strings(obj: Any, fn: Any) -> Any:
    """Recursively apply fn to every string value in a JSON-like structure."""
    if isinstance(obj, str):
        return fn(obj)
    if isinstance(obj, dict):
        return {k: _apply_to_strings(v, fn) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_apply_to_strings(item, fn) for item in obj]
    return obj


def generate_analysis(messages: list[dict[str, Any]], *, ceo: str = CEO) -> Analysis:
    """Run the LLM and apply the invariants. Raises on an inconsistent result."""
    analysis = analyze(messages, morning_of=_morning_of(messages), ceo=ceo)

    # Copy body and exact sender from source messages to the analysis result, so the dashboard can show them
    body_by_id = {m["id"]: m.get("body", "") for m in messages}
    from_by_id = {m["id"]: m.get("from", "") for m in messages}
    for m in analysis.messages:
        m.body = body_by_id.get(m.id)
        if from_by_id.get(m.id):
            m.sender = from_by_id[m.id]

    name_by_id = {m["id"]: _short_name(m["from"]) for m in messages}
    fn = lambda text: _replace_msg_refs(text, name_by_id)
    raw = analysis.model_dump(by_alias=True)
    raw = _apply_to_strings(raw, fn)
    analysis = Analysis.model_validate(raw)

    # Stats count
    sit_cats = Counter(s.category for s in analysis.situations)
    analysis.stats = Stats(
        total=len(messages),
        decide=sit_cats["decide"],
        delegate=sit_cats["delegate"],
        ignore=sit_cats["ignore"],
        flags=len(analysis.flags),
    )
    analysis.generated_at = datetime.now(timezone.utc).isoformat()

    ids = sorted(m.id for m in analysis.messages)
    expected = sorted(m["id"] for m in messages)
    if ids != expected:
        raise ValueError(f"Message id mismatch: got {ids}, expected {expected}")
    return analysis


def write_analysis(analysis: Analysis, path: Path = ANALYSIS_PATH) -> None:
    path.write_text(
        json.dumps(analysis.model_dump(by_alias=True), indent=2, ensure_ascii=False)
    )
