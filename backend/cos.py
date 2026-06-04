"""The AI Chief of Staff reasoning core (Google Gemini, free tier).

One batched Gemini call sees *all* of the morning's messages at once, which is what
makes situation threading, supersede/resolve detection and contradiction-spotting
possible. Gemini is asked for structured JSON whose schema is our Pydantic `Analysis`
model, and the result is re-validated with Pydantic so the model's output and the app's
contract can never drift.

The provider lives behind one function (`analyze`); swapping to another LLM only means
changing this file — the schema, the dashboard and the rest of the pipeline are untouched.
"""

from __future__ import annotations

import os
from typing import Any

from google import genai
from google.genai import types

from .schema import Analysis

MODEL = os.environ.get("COS_MODEL", "gemini-2.5-flash")

SYSTEM_PROMPT = """\
You are the AI Chief of Staff to a startup CEO. Every morning the CEO receives 20+ \
messages across email, Slack and WhatsApp. Your job is to absorb all of it and hand \
back a calm, trustworthy picture of the day so they spend their attention only where \
it is irreplaceable.

You will receive the FULL set of messages for one morning at once. Read them as a \
whole, in time order — they are NOT independent. Threads evolve, get retracted, \
escalate, contradict each other and resolve over the course of the morning. Your value \
is reasoning about the *net current state*, not parroting 20 items.

## Triage — classify EVERY message
- "ignore"   — no involvement needed (spam/phishing, newsletters, FYIs, purely \
personal, or anything already handled/superseded by a later message).
- "delegate" — someone else should own this. Name the right owner and draft a crisp \
handoff.
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

## Flags — what the CEO should know
Surface security risks (e.g. phishing), contradictions between people, hard deadlines, \
and calendar conflicts. In flag detail and recommendation text, be specific but concise \
(1-2 sentences max). Name senders by name, not by message number.

## Daily briefing — a <2 minute read
A warm one-line greeting, a 2-3 sentence headline of the morning, and the handful of \
priorities that actually matter today in order. Be concrete; no filler.

## Voice and style
- Write in the second person — address the CEO as "you" and "your", not "the CEO". \
The dashboard is personalised for them. Write as if briefing them directly.
- Be decisive and concise. They are time-poor and trust your judgement.
- In drafted responses, write in the CEO's voice (first person, "I").
- Never invent facts, figures or commitments not in the messages.
- Prefer fewer, higher-quality flags and decisions over noise.
- Every message id from the input must appear exactly once in `messages`.
"""


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


class MissingApiKey(RuntimeError):
    """Raised when no Gemini key is configured (so callers can report it cleanly)."""


def _client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise MissingApiKey(
            "Set GEMINI_API_KEY (free key from https://aistudio.google.com/apikey)."
        )
    return genai.Client(api_key=api_key)


def analyze(messages: list[dict[str, Any]], *, morning_of: str, ceo: str) -> Analysis:
    """Run the single batched Gemini call and return a validated Analysis."""
    user_block = (
        f"Morning of {morning_of}. The CEO's address is {ceo}.\n\n"
        f"Here are all {len(messages)} messages from this morning, in time order:\n\n"
        f"{build_messages_block(messages)}"
    )

    # Bind the client to a local: if left as a temporary, CPython can garbage-collect
    # it mid-request and its finalizer closes the httpx transport ("client has been
    # closed"). Holding the reference until the call returns avoids that.
    client = _client()
    response = client.models.generate_content(
        model=MODEL,
        contents=user_block,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=Analysis,
            temperature=0.2,
        ),
    )

    # populate_by_name on the models lets validation accept Gemini's field names.
    return Analysis.model_validate_json(response.text)
