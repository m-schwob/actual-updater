"""Utility that creates and seeds a SQLite database with realistic test fixtures.

Usage (standalone):
    python -m tests.sources.utils.fake_db          # writes to DEFAULT_FAKE_DB_PATH
    python -m tests.sources.utils.fake_db /tmp/my.db
"""

from __future__ import annotations

import os
import sys
from os import PathLike

from src.utils.db_interface.db_interface import initialize_db, store_provider_accounts
from src.utils.db_interface.types import AccountsLink, BudgetProvider

DEFAULT_FAKE_DB_PATH: str = "/tmp/fake_dev.db"

# ---------------------------------------------------------------------------
# Seed data – mirrors the fixture style used in test_db_interface.py
# ---------------------------------------------------------------------------

_SEED: list[BudgetProvider] = [
    # Budget A – two providers
    BudgetProvider(
        budget_id="budget-alice",
        financial_provider="Isracard",
        financial_provider_username="alice@example.com",
        financial_provider_password="alice-secret",
        accounts_mapping=[
            AccountsLink(actual_account_id="acc-alice-001", financial_provider_account_id="11111111"),
            AccountsLink(actual_account_id="acc-alice-002", financial_provider_account_id="22222222"),
        ],
    ),
    BudgetProvider(
        budget_id="budget-alice",
        financial_provider="Bank Leumi",
        financial_provider_username="alice_leumi",
        financial_provider_password="leumi-pass",
        accounts_mapping=[
            AccountsLink(actual_account_id="acc-alice-003", financial_provider_account_id="33333333"),
        ],
    ),
    # Budget B – one provider with two accounts
    BudgetProvider(
        budget_id="budget-bob",
        financial_provider="Visa Cal",
        financial_provider_username="bob@example.com",
        financial_provider_password="cal-pass-bob",
        accounts_mapping=[
            AccountsLink(actual_account_id="acc-bob-001", financial_provider_account_id="44444444"),
            AccountsLink(actual_account_id="acc-bob-002", financial_provider_account_id="55555555"),
        ],
    ),
    BudgetProvider(
        budget_id="budget-bob",
        financial_provider="Max",
        financial_provider_username="bob_max",
        financial_provider_password="max-secret",
        accounts_mapping=[
            AccountsLink(actual_account_id="acc-bob-003", financial_provider_account_id="66666666"),
        ],
    ),
]


def create_fake_db(db_path: PathLike = DEFAULT_FAKE_DB_PATH) -> str:
    """Create and seed a SQLite DB at *db_path* with test data.

    If the file already exists it is left untouched so that manual UI changes
    (e.g. deletions) survive uvicorn reloads. Delete the file to get a fresh seed.

    Args:
        db_path: Filesystem path for the SQLite file.

    Returns:
        The resolved db_path as a string.
    """
    db_path = str(db_path)
    already_exists = os.path.exists(db_path)
    # Always ensure schema exists (CREATE TABLE IF NOT EXISTS is idempotent)
    initialize_db(db_path)
    if already_exists:
        print(f"[fake_db] Using existing DB at {db_path} (delete it to re-seed)")
        return db_path
    for provider in _SEED:
        store_provider_accounts(provider, db_path=db_path)
    print(f"[fake_db] Seeded {len(_SEED)} providers into {db_path}")
    return db_path


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FAKE_DB_PATH
    create_fake_db(path)
