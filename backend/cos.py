"""The AI Chief of Staff reasoning core.

One batched Claude call sees *all* of the morning's messages at once, which is what
makes situation threading, supersede/resolve detection and contradiction-spotting
possible. The model is forced to return JSON matching our Pydantic contract via a
single tool, and the system prompt is marked for prompt caching (it's static across
runs and far larger than the message payload).
"""

from __future__ import annotations

import json
import os
from typing import Any

import anthropic

from .schema import Analysis

MODEL = os.environ.get("COS_MODEL", "claude-opus-4-8")

SYSTEM_PROMPT = """\
You are the Chief of Staff to a startup CEO. Every morning the CEO is hit with 20+ \
messages across email, Slack and WhatsApp. Your job is to absorb all of it and hand \
back a calm, trustworthy picture of the day so the CEO spends their attention only \
where it is irreplaceable.

You will receive the FULL set of messages for one morning at once. Read them as a \
whole, in time order — they are NOT independent. Threads evolve, get retracted, \
escalate, contradict each other and resolve over the course of the morning. Your value \
is reasoning about the *net current state*, not parroting 20 items.

## Triage — classify EVERY message
- "ignore"   — no CEO involvement needed (spam/phishing, newsletters, FYIs, purely \
personal, or anything already handled/superseded by a later message).
- "delegate" — someone else should own this. Name the right owner from organisational \
context and draft a crisp handoff in the CEO's voice.
- "decide"   — only the CEO can make this call. Reserve this for genuine, live \
decisions (money, risk, people, investors, customer commitments) that are still open.

For each message give a one-line reason and, for decide/delegate, a ready-to-send \
drafted response. Mark a message "superseded" (with superseded_by) when a later \
message retracts or overrides it, and "resolved" when a later message closes it out.

## Situations — thread related messages
Cluster messages that belong to the same story into a "situation" with a stable slug \
id. Capture the current net state, what changed across the morning, the recommended \
action, urgency and any hard deadline. The situation's category reflects the action \
needed NOW (an escalation can flip a thread from FYI to a critical decide).

## Flags — what the CEO should simply know
Surface security risks (e.g. phishing), contradictions between people, hard deadlines, \
and calendar conflicts. Be specific and reference the message ids.

## Daily briefing — a <2 minute read
A warm one-line greeting, a 2-3 sentence headline of the morning, and the handful of \
priorities that actually matter today in order. Be concrete; no filler.

## Style
- Be decisive and concise. The CEO is time-poor and trusts your judgement.
- Drafted responses are suggestions for the CEO to review — never invent facts, \
figures or commitments that aren't supported by the messages.
- Prefer fewer, higher-quality flags and decisions over noise.

Return your answer ONLY by calling the `submit_analysis` tool.
"""


def _tool_schema() -> dict[str, Any]:
    """Derive the tool input schema from the Pydantic contract so they never drift."""
    return Analysis.model_json_schema(by_alias=True)


def build_messages_block(messages: list[dict[str, Any]]) -> str:
    """Render the raw messages as a compact, time-ordered transcript for the model."""
    ordered = sorted(messages, key=lambda m: m["timestamp"])
    lines = []
    for m in ordered:
        header = f"[#{m['id']} | {m['timestamp']} | {m['channel']}] from {m['from']}"
        if m.get("channel_name"):
            header += f" in {m['channel_name']}"
        if m.get("subject"):
            header += f' — subject: "{m["subject"]}"'
        lines.append(header + "\n" + m["body"].strip())
    return "\n\n".join(lines)


def analyze(messages: list[dict[str, Any]], *, morning_of: str, ceo: str) -> Analysis:
    """Run the single batched Claude call and return a validated Analysis."""
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

    user_block = (
        f"Morning of {morning_of}. The CEO's address is {ceo}.\n\n"
        f"Here are all {len(messages)} messages from this morning, in time order:\n\n"
        f"{build_messages_block(messages)}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=[
            {
                "name": "submit_analysis",
                "description": "Submit the complete Chief of Staff analysis.",
                "input_schema": _tool_schema(),
            }
        ],
        tool_choice={"type": "tool", "name": "submit_analysis"},
        messages=[{"role": "user", "content": user_block}],
    )

    tool_use = next(b for b in response.content if b.type == "tool_use")
    return Analysis.model_validate(tool_use.input)
