# AI Chief of Staff

An AI system that reads a CEO's morning communications across **email, Slack, and
WhatsApp**, filters the noise, and hands back a calm, trustworthy picture of the day:

- **Triage** — every message classified **Ignore / Delegate / Decide**, each with a
  reason and a drafted response.
- **Flags** — the things the CEO should simply *know* (security, deadlines, conflicts).
- **Daily briefing** — one screen the CEO can read in **under two minutes**.

> Built for the Innate AI "AI Chief of Staff" assessment. Sample data is one real
> morning of 20 messages (`data/messages.json`).

---

## The core idea: don't triage 20 messages — reason about the *morning*

The naïve version of this task classifies 20 messages independently. But a CEO's inbox
isn't 20 independent items — it's a handful of **situations that evolve, contradict each
other, and resolve** over a few hours. The interesting signal lives in the *relationships
between* messages, not the messages themselves. In this dataset alone:

| What happens | Messages | Why it matters |
|---|---|---|
| **Escalation** | #2 → #9 → #16 | A routine "migration 60% done, no blockers" quietly becomes a **live payment outage** failing checkout for 3% of users, needing a decision within the hour. |
| **Retraction** | #3 → #10 | The COO asks to push the board deck, then takes it back. Triaging #3 on its own would surface a decision that **no longer exists**. |
| **Contradiction → resolution** | #5 vs #6 → #17 | Product says Horizon is "on track"; another lead says the timeline is oversold. The team then aligns — **the CEO should not be pulled in, but should know the first report was over-optimistic.** |
| **Deal erosion** | #12 → #19 | A 120k ARR win is halved to 60k by legal hours later. The *win* is noise; the *revised terms* need a same-day call. |
| **Phishing** | #4 | A credential-harvesting email dressed up as a security alert. |
| **Cross-channel + calendar clash** | #1, #18, #15, #20 | The same investor appears on email and WhatsApp; a Thursday 2pm double-booking quietly self-resolves. |

So this system threads messages into **situations**, tracks each thread's
`active / superseded / resolved` state, and shows the CEO the **net current reality** —
plus a short, urgency-ranked decision queue. That is where the "quality of thinking"
goes, and it's what makes the dashboard trustworthy rather than just a summary.

---

## Architecture: an *ingest-time* AI, a *deterministic* dashboard

The single most important design decision: **the LLM runs when messages arrive, not when
the page loads.**

```
                  analyze.py  ·OR·  POST /api/analyze  ("Re-run analysis" button)
                                    │   (the only LLM triggers — both explicit)
                                    ▼
data/messages.json ──► pipeline.py ──► Gemini (one batched call) ──► data/analysis.json
   (raw inbox)                          structured output              (read model)
                                                                            │
                                                     FastAPI  GET /api/analysis
                                                          (read-only, never calls LLM)
                                                                            │
                                                        React one-page dashboard
```

1. **Analysis pipeline (`backend/pipeline.py`)** — reads the messages, makes **one
   batched Gemini call** with the full set in view (this is what makes threading and
   contradiction-detection possible), validates against a Pydantic schema, recomputes
   the stats, and writes `data/analysis.json`. Triggered explicitly by the CLI
   (`analyze.py`) or the dashboard's **Re-run analysis** button (`POST /api/analyze`).
2. **Dashboard (FastAPI + React)** — `GET /api/analysis` only ever *reads* the committed
   file; it never calls the LLM, so a reload is **deterministic** and identical every time.

**Why this split matters.** A CEO reads this *instead of* their inbox. If an accidental
refresh re-shuffled messages between Decide / Delegate / Ignore, the tool would be
untrustworthy. So **page load never calls the LLM** — it always reads the committed file.

The LLM runs only on a **deliberate** request, through one of two equivalent paths:

- **CLI** — `python analyze.py`
- **`POST /api/analyze`** — the **"Re-run analysis"** button in the dashboard

Both go through `backend/pipeline.py`. This is the difference between a *passive* trigger
(a reload — which we forbid) and an *explicit* one (a click — which is fine, and which the
brief's "we test it with new data" step needs). To test with a fresh inbox: drop a new
`data/messages.json` in, click **Re-run analysis**, and the dashboard rebuilds from a live
Gemini call. (See [Production roadmap](#production-roadmap) for doing this *incrementally*
rather than recomputing the whole morning.)

---

## Running it

The dashboard ships with a pre-computed `data/analysis.json`, so **you can run the UI
without an API key.**

### Quick start (one command)

```bash
./run.sh          # installs deps, builds the frontend, serves on http://localhost:8000
```

Then open **http://localhost:8000**.

### Manual

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
uvicorn backend.main:app --port 8000
```

### Dev mode (hot reload)

```bash
# terminal 1 — API
uvicorn backend.main:app --reload --port 8000
# terminal 2 — Vite dev server (proxies /api to :8000)
cd frontend && npm run dev          # http://localhost:5173
```

### Running a live analysis (needs a free API key)

Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then
trigger the LLM either way:

```bash
cp .env.example .env && echo "GEMINI_API_KEY=..." >> .env
export $(cat .env | xargs)

python analyze.py                   # CLI, or…
```

…or just click **Re-run analysis** in the dashboard (it needs the same key set in the
backend's environment). **Testing with new data:** replace `data/messages.json`, click
**Re-run analysis**, and the briefing rebuilds from a live Gemini call.

---

## Project structure

```
analyze.py            # CLI entry point for the pipeline
backend/
  main.py             # FastAPI: GET /api/analysis (read), POST /api/analyze (LLM), SPA
  pipeline.py         # orchestration shared by the CLI + the endpoint
  cos.py              # system prompt + the single batched Gemini call
  schema.py           # Pydantic models — the data contract
data/
  messages.json       # input: 20 messages from one morning
  analysis.json       # committed, pre-computed read model
frontend/
  src/App.tsx         # dashboard layout
  src/components/*     # Briefing, Flags, SituationCard, Handled, Header…
  src/types.ts        # TS mirror of schema.py
run.sh                # build + serve in one command
```

---

## How the dashboard is laid out (UX for a time-poor reader)

Most important first, everything at a glance:

1. **Header** — date + live counts (Decide / Delegate / Ignore / Flags) + read time.
2. **Daily Briefing** — greeting, a 2–3 sentence headline, and the handful of priorities
   that actually matter, in order. The <2-minute deliverable.
3. **Flags** — security, deadlines, contradictions, conflicts; each with a recommendation.
4. **Needs your decision** — Decide situations as cards, urgency-ranked, with deadline
   countdowns, a recommendation, and a **copy-ready drafted reply**.
5. **Delegate** — who should own it + a drafted hand-off.
6. **Handled by the team** — situations that resolved themselves (e.g. the Horizon
   timeline) so the CEO can stay informed without acting.
7. **Filtered out** — the full ledger of everything triaged as Ignore (noise, FYIs,
   superseded, personal), collapsed. Expand any situation to see its **message timeline**
   and how it evolved — the AI's reasoning, made inspectable.

---

## How the AI is prompted

- **One batched call** with all messages in time order — full context is what enables
  threading, supersede/resolve detection, and contradiction-spotting.
- **Structured output** — Gemini is given our Pydantic `Analysis` model directly as its
  `response_schema` (`backend/cos.py` → `backend/schema.py`), so the model's output and
  the app's contract can't drift. The JSON is re-validated with Pydantic on the way in.
- **`stats` are recomputed in code** from the triaged messages after the call, so the
  headline counts can never disagree with the list.
- **Provider-agnostic by design** — the LLM lives behind one `analyze()` function;
  switching to OpenAI/Anthropic/Groq is a one-file change, schema and UI untouched.
- Model: `gemini-2.5-flash` by default (free tier, fast, strong reasoning for a
  once-per-morning job); override with `COS_MODEL` (e.g. `gemini-2.5-pro`).

---

## Assumptions

- A static, single-morning dataset; "today" is **Wednesday 18 March 2026** (the date in
  the data). Deadline countdowns are relative to the moment the briefing was generated.
- Analysis is **pre-computed and committed**; the dashboard is read-only and
  deterministic. Re-analysis is an explicit pipeline step, never triggered by page load.
- The CEO is `ceo@company.com`; senders' names and roles are inferred from message content.
- Delegate owners are inferred from organisational signals in the messages.
- **Drafted responses are suggestions for the CEO to review and send — never auto-sent**,
  and the model is instructed not to invent facts or commitments not in the messages.
- No auth / single user (local demo). The API key is only needed to re-run the pipeline
  and is read from the environment — never committed.

## Key decisions

- **Reason about situations, not isolated messages** — the threading/supersede/resolve
  layer is the product, on top of the literal per-message triage the brief asks for.
- **Ingest-time AI + deterministic read model** — the right production shape, and the
  reason an accidental reload can't destabilise the CEO's view.
- **One batched LLM call** for full cross-message context (vs. lossy per-message calls).
- **Schema-first** (Pydantic ⇄ tool schema ⇄ TS types) for reliable, type-safe rendering.
- **Python (FastAPI) + React (Vite/Tailwind)** — a clean AI backend and a polished,
  compact single-page UI.

## Production roadmap

This is a 60-minute build; a production version would add:

- **Incremental ingest** — an endpoint that classifies *only newly arrived* messages and
  merges them into existing situations, rather than recomputing the morning. New mail
  updates a thread's state (e.g. flips it to `resolved`) without re-shuffling settled
  triage — the natural extension of the pipeline/dashboard split.
- **Real connectors** — Gmail / Slack / WhatsApp Business APIs in place of the static file.
- **Actions from the dashboard** — send a draft, create a calendar hold, assign a delegate.
- **Feedback loop** — let the CEO correct a triage and feed it back as few-shot guidance.
- **Confidence + provenance** — surface model confidence and link every claim to its
  source message; human-in-the-loop on low-confidence Decides.
- **Eval harness** — a labelled set so prompt/model changes can be regression-tested.
