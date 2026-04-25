"""Development entrypoint – runs the UI against a pre-seeded in-memory fake database.

Bypasses OIDC and seeds a SQLite file so you can work on the UI without a running
Authelia instance or real bank credentials.

The DB path defaults to DEFAULT_FAKE_DB_PATH but can be overridden via the
FAKE_DB_PATH environment variable — used by Phase 3b Playwright tests to get
a fresh, isolated DB without affecting the developer's manual testing DB.

Run with:
    uvicorn tests.app.dev_main:app --reload
"""

import os
from fastapi import FastAPI, Request
from nicegui import ui
from starlette.middleware.sessions import SessionMiddleware

from src.app.ui import AccountsManagerUI
from src.app.ui_backend import UIBackend
from tests.sources.utils.fake_db import DEFAULT_FAKE_DB_PATH, create_fake_db

# ---------------------------------------------------------------------------
# Seed the fake database once at import time
# ---------------------------------------------------------------------------
_FAKE_DB_PATH = create_fake_db(os.getenv("FAKE_DB_PATH", DEFAULT_FAKE_DB_PATH))

# Override the shared DB backend to point at the fake database
AccountsManagerUI.db = UIBackend(_FAKE_DB_PATH)

# Fake user / budgets  – mirror the seed data in fake_db.py
_FAKE_USER = {"name": "Dev User"}
_FAKE_BUDGETS = ["budget-alice", "budget-bob"]
_FAKE_DEFAULT_BUDGET = _FAKE_BUDGETS[0]

# ---------------------------------------------------------------------------
# FastAPI + NiceGUI setup (no OIDC)
# ---------------------------------------------------------------------------
app = FastAPI()

ui.run_with(app)
app.add_middleware(SessionMiddleware, secret_key="dev-session-secret")


@ui.page("/")
def update_page(request: Request) -> None:
    user_data = {
        "name": _FAKE_USER["name"],
        "budgets": _FAKE_BUDGETS,
        "default_budget": _FAKE_DEFAULT_BUDGET,
    }
    AccountsManagerUI(user_data=user_data).start_ui()
