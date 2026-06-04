# AI Chief of Staff

An AI system that processes a CEO's morning messages across email, Slack, and WhatsApp and produces a clean, actionable briefing — so the CEO reads one dashboard instead of 20+ messages. It triages every message, surfaces critical flags, and delivers a daily briefing readable in under 2 minutes.

---

## Features

- **Tabbed dashboard** — Brief, Flags, Decide, Delegate, Review, and Others tabs keep sections focused and scannable
- **Daily briefing** — a 2–3 sentence summary of the morning with an interactive priority checklist (tick off tasks as you go)
- **Situation threading** — related messages are grouped into evolving stories; the system tracks which messages supersede, escalate, or resolve each other
- **Message triage** — every message classified as Ignore / Delegate / Decide, each with a one-line reason
- **Flags** — security risks, missed deadlines, contradictions, and calendar conflicts surfaced with a specific recommended action
- **Drafted replies** — editable draft responses for every Decide and Delegate item, with a direct "Reply via Mail" or "Open in WhatsApp" button
- **Read original messages** — expand any situation to read the actual source messages, not just the AI's summary
- **Review tab** — team-handled situations shown with a note box to draft a response if still needed
- **Refresh inbox** — re-run the AI analysis over a new `messages.json` at any time from the dashboard

---

## How to run

**Prerequisites:** Python 3.11+, Node.js 18+

### One-command shortcut

```bash
./run.sh    # installs deps, builds frontend, starts the server — all in one
```
### Detailed steps:
### 1. Clone and install

```bash
git clone https://github.com/gargchirayu/ai-cos.git
cd ai-cos
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
```

### 2. Run the app

```bash
uvicorn backend.main:app --port 8000
```

Open **http://localhost:8000** in your browser.

The app ships with a pre-analysed `data/analysis.json`, so it loads immediately — no API key needed just to view the dashboard.

### 3. Run a live AI analysis (optional — needs a free API key)

Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), then:

```bash
cp .env.example .env
# Open .env and add your key: GEMINI_API_KEY=your_key_here
```

Then, rerun the server, click **Refresh inbox** in the dashboard — it runs the pipeline live.

**To test with different messages:** replace `data/messages.json` with your own file in the same format, then run `python analyze.py` or click Refresh inbox.

---

## How I approached this

The brief asks for triage, flags, and a daily briefing. The obvious implementation would classify each of the 20 messages one by one and produce three lists. I didn't think that was the interesting problem.

The interesting problem is that a CEO's inbox on any given morning isn't 20 independent items — it's a handful of *situations* unfolding in real time. A Slack message at 8am saying "API migration is 60% done, no blockers" and a Slack message at 11:45am saying "live checkout is failing for 3% of users, need a decision in the next hour" are not two separate things to triage. They're one escalating situation, and the CEO needs to see the arc — not two items in a list.

So the design question I started with wasn't *how do I classify messages* but *how do I show someone the net state of their morning after 20 messages have already happened*. That led to situation threading as the core abstraction: cluster related messages, track whether each thread is active, superseded, or resolved, and show the CEO what's true right now — not a replay of everything that arrived.

From there, a few things followed naturally. The AI needed to see all 20 messages at once (a single batched call) rather than per-message — otherwise it can't detect that message 3 was retracted by message 10, or that messages 2, 9, and 16 are the same escalating incident. The dashboard needed to be deterministic — a CEO tool that reshuffles decisions on accidental reload isn't trustworthy. And the UX needed to be tab-based and compact, because a time-poor person isn't going to scroll through a long page to find what they need to act on.

The "Reply via Mail" and "Open in WhatsApp" buttons were a deliberate product decision. The point was to show that a real Chief of Staff doesn't just tell you what to do — they hand you a pre-written response and remove as much friction from acting on it as possible. The draft is editable, the reply button is wired to the right channel and recipient, and the whole thing is meant to feel like a handoff, not a report.

---

## Assumptions

- Messages are loaded from a static JSON file; there is no live connection to email, Slack, or WhatsApp in this version. A live production-ready build would scrape messages from different platforms first and then run the analysis.
- New messages are manually loaded into `messages.json` — there is no background polling or webhook to capture incoming messages automatically
- The CEO's identity and team roles are inferred from message content; no org chart or contact directory is provided
- Drafted responses are suggestions for the CEO to review before sending — the system never sends anything automatically
- Deadline countdowns are calculated relative to the time the analysis was generated, assuming that it will be done first thing in the morning
- No authentication — this is a single-user local tool, meant for the CEO only; the API key is also read from the environment directly. In a prodction-ready build, there should be an authentication for the user and the LLM API call.

## Limitations

- **Re-running on the same messages may produce a different analysis** — this is an inherent LLM non-determinism issue. For a production system, messages that have already been analysed would be stored with their triage result and not re-fed to the model; only genuinely new messages would trigger a new call
- **Email and WhatsApp reply buttons are integrated to demonstrate the product vision** — the mailto: and WhatsApp Web links work, but a polished production version would use the Gmail API, Slack Web API, and WhatsApp Business API to send directly, with OAuth authentication and sent-message tracking
- **A single LLM call processes the entire inbox** — this works well for a morning's worth of messages but would need rethinking at scale (e.g. hundreds of messages, or a multi-day backlog)
- **Situation threading quality depends on prompt and model** — the groupings and supersede/resolve detection are generally strong but can occasionally be over- or under-grouped; a production system would include a feedback mechanism for the CEO to correct the AI's judgment