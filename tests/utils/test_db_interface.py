import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from src.utils.db_interface.db_interface import (
    initialize_db,
    store_provider_accounts,
    load_accounts,
    remove_account,
    delete_account,
    find_accounts,
)
from src.utils.constants import (
    ACCOUNTS_TABLE,
    PROVIDERS_TABLE,
    BUDGET_ID,
    ACTUAL_ACCOUNT_ID,
    FINANCIAL_PROVIDER,
    FINANCIAL_PROVIDER_ACCOUNT,
    FINANCIAL_PROVIDER_USERNAME,
    FINANCIAL_PROVIDER_PASSWORD,
    REMOVED,
)
from src.utils.db_interface.types import AccountsLink, BudgetProvider


class TestDbInterface(unittest.TestCase):
    def setUp(self) -> None:
        # Create a temporary sqlite DB file per test
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.sqlite")
        # Initialize schema
        initialize_db(self.db_path)

        # Sample fixtures
        self.budget_id = "budget-123"
        self.provider = "isracard"
        self.username = "user@example.com"
        self.account_num = "12345678"
        self.password = "secret-password"
        self.actual_account_id = "acc-001"

    def tearDown(self) -> None:
        # Cleanup temporary directory
        self.tmpdir.cleanup()

    def test_initialize_db_idempotent(self):
        # Should not throw when called again
        initialize_db(self.db_path)
        # Verify tables exist
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN (?, ?)",
                (ACCOUNTS_TABLE, PROVIDERS_TABLE),
            )
            names = {row[0] for row in cur.fetchall()}
            self.assertIn(ACCOUNTS_TABLE, names)
            self.assertIn(PROVIDERS_TABLE, names)

    def test_store_and_load_accounts(self):
        # Store one account
        provider = BudgetProvider(
            budget_id=self.budget_id,
            financial_provider=self.provider,
            financial_provider_username=self.username,
            financial_provider_password=self.password,
            accounts_mapping=[
                AccountsLink(
                    actual_account_id=self.actual_account_id,
                    financial_provider_account_id=self.account_num
                )
            ]
        )
        store_provider_accounts(provider, db_path=self.db_path)

        # Load it back (without passwords)
        rows = load_accounts(self.budget_id, db_path=self.db_path)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row[ACTUAL_ACCOUNT_ID], self.actual_account_id)

        # Load it back (without passwords)
        rows = load_accounts(self.budget_id, db_path=self.db_path)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row[ACTUAL_ACCOUNT_ID], self.actual_account_id)
        self.assertEqual(row[FINANCIAL_PROVIDER], self.provider)
        self.assertEqual(row[FINANCIAL_PROVIDER_ACCOUNT], self.account_num)
        self.assertEqual(row[FINANCIAL_PROVIDER_USERNAME], self.username)


    def test_provider_password_encrypted_in_providers_table(self):
        # Store one account (writes providers row)
        budget_provider = BudgetProvider(
            budget_id=self.budget_id,
            financial_provider=self.provider,
            financial_provider_username=self.username,
                financial_provider_password=self.password,
                accounts_mapping=[
                    AccountsLink(
                        actual_account_id=self.actual_account_id,
                        financial_provider_account_id=self.account_num
                    )
                ])
        store_provider_accounts(
            budget_provider,
            db_path=self.db_path
            )

        # Verify the providers table has an encrypted password (not equal to plain)
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT {FINANCIAL_PROVIDER_PASSWORD}
                FROM {PROVIDERS_TABLE}
                WHERE {BUDGET_ID} = ? AND {FINANCIAL_PROVIDER} = ? AND {FINANCIAL_PROVIDER_USERNAME} = ?
                """,
                (self.budget_id, self.provider, self.username),
            )
            enc = cur.fetchone()[0]
            self.assertIsNotNone(enc)
            self.assertNotEqual(enc, self.password)

    def test_remove_and_delete_account(self):
        # Insert then soft-delete

        budget_provider = BudgetProvider(
            budget_id=self.budget_id,
            financial_provider=self.provider,
            financial_provider_username=self.username,
            financial_provider_password=self.password,
            accounts_mapping=[
                AccountsLink(
                    actual_account_id=self.actual_account_id,
                    financial_provider_account_id=self.account_num
                )
            ]
        )
        store_provider_accounts(
            budget_provider,
            db_path=self.db_path
        )

        removed = remove_account(self.budget_id, self.actual_account_id, db_path=self.db_path)
        self.assertTrue(removed)

        # load_accounts shouldn’t return removed rows
        self.assertEqual(load_accounts(self.budget_id, db_path=self.db_path), [])

        # find_accounts with include_removed should include it
        removed_rows = find_accounts(
            budget_id=self.budget_id,
            actual_account_id=self.actual_account_id,
            include_removed=True,
            db_path=self.db_path,
        )
        self.assertEqual(len(removed_rows), 1)
        self.assertTrue(removed_rows[0][REMOVED])

        # Now hard delete
        deleted = delete_account(self.budget_id, self.actual_account_id, db_path=self.db_path)
        self.assertTrue(deleted)
        self.assertEqual(
            find_accounts(budget_id=self.budget_id, actual_account_id=self.actual_account_id, include_removed=True, db_path=self.db_path),
            [],
        )

    def test_find_accounts_filters(self):
        # Insert two accounts under same provider with different account numbers/ids
        for idx in range(2):
            accounts_mapping=[
                    AccountsLink(
                        actual_account_id=f"{self.actual_account_id}-{i}",
                        financial_provider_account_id=f"{self.account_num}-{i}"
                    ) for i in range(idx+1)
                ]
            budget_provider = BudgetProvider(
                budget_id=self.budget_id,
                financial_provider=self.provider,
                financial_provider_username=self.username,
                financial_provider_password=self.password,
                accounts_mapping=accounts_mapping
            )
            store_provider_accounts(
                budget_provider,
                db_path=self.db_path
            )

        # Filter by provider
        rows = find_accounts(budget_id=self.budget_id, financial_provider=self.provider, db_path=self.db_path)
        self.assertEqual(len(rows), 2)

        # Filter by specific actual account id
        one = find_accounts(budget_id=self.budget_id, actual_account_id=f"{self.actual_account_id}-1", db_path=self.db_path)
        self.assertEqual(len(one), 1)
        self.assertEqual(one[0][ACTUAL_ACCOUNT_ID], f"{self.actual_account_id}-1")

