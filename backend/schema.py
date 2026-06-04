"""Pydantic models that define the data contract between the analysis pipeline
(`analyze.py`) and the dashboard (FastAPI API + React SPA).

This schema is the single source of truth. The LLM is forced to emit JSON matching
it (via tool-use / structured output), the result is validated here, and the frontend
TypeScript types in `frontend/src/types.ts` mirror it exactly.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Channel = Literal["email", "slack", "whatsapp"]
Category = Literal["ignore", "delegate", "decide"]
Status = Literal["active", "superseded", "resolved"]
Urgency = Literal["critical", "high", "medium", "low"]
FlagType = Literal["security", "contradiction", "deadline", "conflict", "escalation"]
Severity = Literal["high", "medium", "low"]


class Briefing(BaseModel):
    """The <2-minute morning read — the headline of the CEO's day."""

    greeting: str
    summary: str = Field(description="2-3 sentence headline of the morning")
    top_priorities: list[str] = Field(
        description="The handful of things that actually matter today, in priority order"
    )
    read_time_seconds: int = Field(description="Estimated read time of this briefing")


class Situation(BaseModel):
    """A thread of related messages reasoned about as one evolving story.

    This is the intelligence layer: instead of 20 isolated items, the CEO sees the
    *net current state* of each situation after accounting for updates, retractions,
    contradictions and resolutions across the morning.
    """

    id: str = Field(description="slug, e.g. 'payment-outage'")
    title: str
    status: Status
    category: Category = Field(description="Overall action the situation needs")
    urgency: Urgency
    deadline: Optional[str] = Field(
        default=None, description="ISO timestamp of any hard deadline, else null"
    )
    summary: str = Field(description="The current net state in 1-2 sentences")
    what_changed: Optional[str] = Field(
        default=None, description="How the situation evolved across messages"
    )
    recommendation: str = Field(description="What the CEO should do")
    drafted_response: Optional[str] = Field(
        default=None, description="Ready-to-send draft for decide/delegate situations"
    )
    delegate_to: Optional[str] = Field(default=None, description="Owner if delegated")
    message_ids: list[int] = Field(description="Source messages in this thread")


class MessageTriage(BaseModel):
    """Every individual message, classified — satisfies the literal brief."""

    id: int
    channel: Channel
    sender: str = Field(alias="from")
    subject: Optional[str] = None
    timestamp: str
    category: Category
    reasoning: str = Field(description="Why this category")
    drafted_response: Optional[str] = None
    delegate_to: Optional[str] = None
    situation_id: Optional[str] = None
    status: Status = "active"
    superseded_by: Optional[int] = Field(
        default=None, description="id of the message that overrides this one, if any"
    )

    model_config = {"populate_by_name": True}


class Flag(BaseModel):
    """Anything the CEO should know about — security, conflicts, hard deadlines."""

    id: str
    type: FlagType
    severity: Severity
    title: str
    detail: str
    message_ids: list[int]
    recommendation: str


class Stats(BaseModel):
    total: int
    decide: int
    delegate: int
    ignore: int
    flags: int


class Analysis(BaseModel):
    """Root document — the read model the dashboard renders."""

    morning_of: str
    ceo: str
    generated_at: str
    stats: Stats
    briefing: Briefing
    situations: list[Situation]
    messages: list[MessageTriage]
    flags: list[Flag]
