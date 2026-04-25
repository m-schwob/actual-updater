"""pytest fixtures for the app test suite.

NiceGUI's testing plugin (which provides `user`, `create_user`, and
`nicegui_reset_globals` fixtures) is activated at the root conftest.py
because pytest 9.x requires pytest_plugins to be declared at the root level.
"""

import os
import tempfile

import pytest

from src.app.ui import AccountsManagerUI
from src.app.ui_backend import UIBackend
from src.utils.db_interface.db_interface import initialize_db
from tests.sources.utils.fake_db import _SEED, create_fake_db


@pytest.fixture
def seeded_db(tmp_path):
    """A temporary SQLite database seeded with fake provider data.

    Yields the db_path string. Cleaned up automatically after each test.
    """
    db_path = str(tmp_path / "test_ui.sqlite")
    # create_fake_db seeds the _SEED providers when the file doesn't exist yet
    create_fake_db(db_path)
    yield db_path


@pytest.fixture
def account_page(seeded_db):
    """Register a NiceGUI page that renders AccountsManagerUI against the seeded test DB.

    Must be used alongside the `user` fixture from NiceGUI's plugin.
    The class-level `db` attribute is restored after each test.
    """
    from nicegui import ui

    original_db = AccountsManagerUI.db
    AccountsManagerUI.db = UIBackend(db_path=seeded_db)

    @ui.page("/")
    def _page():
        user_data = {
            "name": "Test User",
            "budgets": ["budget-alice", "budget-bob"],
            "default_budget": "budget-alice",
        }
        AccountsManagerUI(user_data=user_data).start_ui()

    yield seeded_db

    AccountsManagerUI.db = original_db
