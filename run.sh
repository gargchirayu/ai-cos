#!/usr/bin/env bash
# Build the dashboard and serve everything from one process at http://localhost:8000
# (FastAPI serves the React build + the /api/analysis read model).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Installing Python deps"
pip install -q -r requirements.txt

echo "==> Building frontend"
( cd frontend && npm install && npm run build )

echo "==> Serving on http://localhost:8000"
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
