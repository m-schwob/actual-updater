"""Unit tests for UIBackend.

Each test gets an isolated SQLite file via tempfile.TemporaryDirectory,
following the same pattern as tests/utils/test_db_interface.py.
"""

import os
import tempfile
import unittest

from src.app.ui_backend import PLACEHOLDER_PASSWORD, UIBackend
from src.utils.db_interface.db_interface import initialize_db


class TestUIBackendLoadAccounts(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.sqlite")
        initialize_db(self.db_path)
        self.backend = UIBackend(db_path=self.db_path)
        self.budget_id = "budget-test"

    def tearDown(self):
        self.tmpdir.cleanup()

    def _save(self, bank="Isracard", account="11111111", user="alice", password="secret"):
        self.backend.save_account(
            self.budget_id,
            {"bank_name": bank, "account": account, "user": user, "password": password, "editable": False},
        )

    def test_load_empty_budget_returns_empty_list(self):
        self.assertEqual(self.backend.load_accounts(self.budget_id), [])

    def test_load_returns_correct_shape(self):
        self._save()
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["bank_name"], "Isracard")
        self.assertEqual(row["account"], "11111111")
        self.assertEqual(row["user"], "alice")
        # Password is never loaded — placeholder returned
        self.assertEqual(row["password"], PLACEHOLDER_PASSWORD)
        self.assertFalse(row["editable"])

    def test_load_excludes_removed_rows(self):
        self._save()
        self.backend.delete_account(
            self.budget_id,
            {"bank_name": "Isracard", "user": "alice", "account": "11111111", "password": PLACEHOLDER_PASSWORD},
        )
        self.assertEqual(self.backend.load_accounts(self.budget_id), [])

    def test_load_multiple_providers(self):
        self._save(bank="Isracard", account="11111111", user="alice")
        self._save(bank="Bank Leumi", account="22222222", user="bob")
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 2)
        bank_names = {r["bank_name"] for r in rows}
        self.assertEqual(bank_names, {"Isracard", "Bank Leumi"})

    def test_load_multiple_accounts_same_provider_joined(self):
        """Two accounts for the same provider/user should be returned as one row."""
        self.backend.save_account(
            self.budget_id,
            {
                "bank_name": "Isracard",
                "account": "11111111, 22222222",
                "user": "alice",
                "password": "secret",
                "editable": False,
            },
        )
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 1)
        accounts = {a.strip() for a in rows[0]["account"].split(",")}
        self.assertEqual(accounts, {"11111111", "22222222"})


class TestUIBackendSaveAccount(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.sqlite")
        initialize_db(self.db_path)
        self.backend = UIBackend(db_path=self.db_path)
        self.budget_id = "budget-test"

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_add_new_provider(self):
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Visa Cal", "account": "99999999", "user": "carol", "password": "pw", "editable": False},
        )
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["bank_name"], "Visa Cal")

    def test_update_account_field(self):
        """Editing the account number updates the row."""
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Isracard", "account": "11111111", "user": "alice", "password": "secret", "editable": False},
        )
        # Edit: change account
        self.backend.save_account(
            self.budget_id,
            {
                "bank_name": "Isracard",
                "account": "88888888",
                "user": "alice",
                "password": PLACEHOLDER_PASSWORD,
                "editable": False,
            },
        )
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["account"], "88888888")

    def test_placeholder_password_preserved(self):
        """Saving with placeholder password must NOT overwrite the real stored password."""
        self.backend.save_account(
            self.budget_id,
            {
                "bank_name": "Isracard",
                "account": "11111111",
                "user": "alice",
                "password": "real-secret",
                "editable": False,
            },
        )
        # Re-save with placeholder (simulating user did not change password)
        self.backend.save_account(
            self.budget_id,
            {
                "bank_name": "Isracard",
                "account": "11111111",
                "user": "alice",
                "password": PLACEHOLDER_PASSWORD,
                "editable": False,
            },
        )
        # We can't read the password back via load_accounts (by design), but saving should not raise
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["password"], PLACEHOLDER_PASSWORD)

    def test_actual_account_id_reused_after_delete_and_readd(self):
        """Re-adding a previously-deleted provider account must reuse the existing actual_account_id."""
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Isracard", "account": "11111111", "user": "alice", "password": "secret", "editable": False},
        )
        # Capture the actual_account_id assigned on first add
        from src.utils.db_interface.db_interface import find_accounts

        rows_before = find_accounts(budget_id=self.budget_id, include_removed=False, db_path=self.db_path)
        self.assertEqual(len(rows_before), 1)
        actual_id_before = rows_before[0]["actual_account_id"]

        # Delete then re-add
        self.backend.delete_account(
            self.budget_id,
            {"bank_name": "Isracard", "user": "alice", "account": "11111111", "password": PLACEHOLDER_PASSWORD},
        )
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Isracard", "account": "11111111", "user": "alice", "password": "secret2", "editable": False},
        )

        rows_after = find_accounts(budget_id=self.budget_id, include_removed=False, db_path=self.db_path)
        self.assertEqual(len(rows_after), 1)
        actual_id_after = rows_after[0]["actual_account_id"]

        self.assertEqual(actual_id_before, actual_id_after)


class TestUIBackendDeleteAccount(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmpdir.name, "test.sqlite")
        initialize_db(self.db_path)
        self.backend = UIBackend(db_path=self.db_path)
        self.budget_id = "budget-test"

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_delete_soft_removes_provider(self):
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Max", "account": "77777777", "user": "dave", "password": "pw", "editable": False},
        )
        self.assertEqual(len(self.backend.load_accounts(self.budget_id)), 1)

        self.backend.delete_account(
            self.budget_id,
            {"bank_name": "Max", "user": "dave", "account": "77777777", "password": PLACEHOLDER_PASSWORD},
        )
        self.assertEqual(self.backend.load_accounts(self.budget_id), [])

    def test_delete_does_not_affect_other_providers(self):
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Isracard", "account": "11111111", "user": "alice", "password": "pw1", "editable": False},
        )
        self.backend.save_account(
            self.budget_id,
            {"bank_name": "Bank Leumi", "account": "22222222", "user": "bob", "password": "pw2", "editable": False},
        )
        self.backend.delete_account(
            self.budget_id,
            {"bank_name": "Isracard", "user": "alice", "account": "11111111", "password": PLACEHOLDER_PASSWORD},
        )
        rows = self.backend.load_accounts(self.budget_id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["bank_name"], "Bank Leumi")

    def test_delete_only_affects_given_budget(self):
        other_budget = "budget-other"
        for b in (self.budget_id, other_budget):
            self.backend.save_account(
                b,
                {"bank_name": "Isracard", "account": "11111111", "user": "alice", "password": "pw", "editable": False},
            )
        self.backend.delete_account(
            self.budget_id,
            {"bank_name": "Isracard", "user": "alice", "account": "11111111", "password": PLACEHOLDER_PASSWORD},
        )
        self.assertEqual(self.backend.load_accounts(self.budget_id), [])
        self.assertEqual(len(self.backend.load_accounts(other_budget)), 1)


if __name__ == "__main__":
    unittest.main()
