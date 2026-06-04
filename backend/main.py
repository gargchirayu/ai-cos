"""FastAPI app: serves the pre-computed read model and the built React dashboard.

This layer is intentionally read-only and deterministic — it never calls the LLM, so
the dashboard renders identically on every reload. (Re-analysis is the separate
`analyze.py` pipeline.)
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).parent.parent
ANALYSIS_PATH = ROOT / "data" / "analysis.json"
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="AI Chief of Staff", version="1.0.0")


@app.get("/api/analysis")
def get_analysis() -> JSONResponse:
    """Return the committed analysis read model."""
    if not ANALYSIS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="analysis.json not found — run `python analyze.py` first.",
        )
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
