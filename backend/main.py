"""FastAPI app: serves the read model + the built dashboard, and exposes one explicit,
on-demand LLM trigger.

Loading the dashboard is read-only and deterministic — `GET /api/analysis` never calls
the LLM, so the briefing renders identically on every reload. The LLM runs only when a
human deliberately asks for it: `POST /api/analyze` (the "Re-run analysis" button).`
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .cos import MissingApiKey
from .pipeline import ANALYSIS_PATH, generate_analysis, load_messages, write_analysis

ROOT = Path(__file__).parent.parent
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="AI Chief of Staff", version="1.0.0")


@app.get("/api/analysis")
def get_analysis() -> JSONResponse:
    """Return the committed analysis read model. Never calls the LLM."""
    if not ANALYSIS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="No analysis yet — run `python analyze.py` or use Re-run analysis.",
        )
    return JSONResponse(json.loads(ANALYSIS_PATH.read_text()))


@app.post("/api/analyze")
def run_analysis() -> JSONResponse:
    """Explicitly re-run the LLM over the current data/messages.json and persist it.

    This is the only endpoint that calls the LLM, and only on a deliberate request —
    never on page load. It powers the "test it with new data" flow: drop in a new
    messages.json, trigger this, and the dashboard rebuilds from a live Gemini call.
    """
    try:
        analysis = generate_analysis(load_messages())
        write_analysis(analysis)
    except MissingApiKey as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="data/messages.json not found.")
    except Exception as e:  # noqa: BLE001 — surface any LLM/validation failure to the UI
        raise HTTPException(status_code=502, detail=f"Analysis failed: {e}")
    return JSONResponse(json.loads(ANALYSIS_PATH.read_text()))


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Serve the built single-page app (after `npm run build`). In dev, the Vite server
# proxies /api to this backend instead — see frontend/vite.config.ts.
if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}")
    def spa(full_path: str) -> FileResponse:
        index = FRONTEND_DIST / "index.html"
        if not index.exists():
            raise HTTPException(status_code=404, detail="Frontend not built.")
        return FileResponse(index)
