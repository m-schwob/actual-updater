# App Component — Developer Guide

## UI Backend

### Backend Logic

The `UIBackend` class (`src/app/ui_backend.py`) is the single translation layer between the `AccountsManagerUI` and the SQLite database. All DB calls from the UI flow through this class. It translates between the UI's flat per-provider view (one row per provider) and the DB schema (one row per account mapping).

---

#### Loading the UI

When `AccountsManagerUI.__init__()` is called, it immediately loads the accounts for the default budget by calling `UIBackend.load_accounts(budget_id)`.

`load_accounts` does the following:

1. Calls `db_interface.load_accounts()` to fetch all **non-removed** account rows for the budget. Each row represents one `(financial_provider, financial_provider_username, financial_provider_account)` mapping.
2. Groups rows by `(financial_provider, financial_provider_username)` — this is the "provider identity".
3. Joins all `financial_provider_account` values for the same provider into a single comma-separated string.
4. Returns one dict per provider group: `{ bank_name, account, user, password, editable }`.
5. The `password` field is **always** set to the placeholder `••••••••`. The real password is never loaded from the DB into the UI.

> **TODO (not implemented):** After loading, each `actual_account_id` should be validated against the live Actual Budget server. If an account no longer exists there, `remove_account()` should be called on that mapping and the user should be prompted to decide whether to create a replacement.

---

#### Adding a New Provider Row

The add-row form at the bottom of the table requires all fields (bank name, account IDs, username, password). The password placeholder is **not accepted** — a real password is always required for new rows.

When the user clicks the add (+) button, `UIBackend.save_account()` is called with the new entry:

1. The comma-separated account field is split into individual `financial_provider_account` IDs.
2. `get_account_mappings()` is called to look up existing `actual_account_id` values for those provider accounts — **including removed rows**. This means that if the same provider+username combination existed in the DB before (even as removed), the existing `actual_account_id` values are reused so no duplicate Actual Budget accounts are created.
3. For provider accounts with no existing mapping, `_create_actual_account()` is called.

   > **TODO (not implemented):** `_create_actual_account()` is currently a stub that returns a fake UUID (`actual-<uuid4>`). It must be replaced with a real call to the Actual Budget API that creates an account and returns its ID. Until this is implemented, the service scraping logic will not function correctly for new accounts.

4. A `BudgetProvider` object is built with the real password and the resolved account mappings.
5. `store_provider_accounts()` is called:
   - The provider row is inserted or replaced in the `providers` table (password is encrypted).
   - All existing account rows for this provider identity are set `removed=TRUE`.
   - Each account in the new entry is then set `removed=FALSE` (upserted).

This means accounts that were present before but are not in the new entry remain soft-deleted rather than hard-deleted.

---

#### Editing an Existing Provider Row

Clicking the edit button on a row:

1. Stores a `_original` backup copy of the row dict in `accounts[index]['_original']`.
2. Sets `editable=True` on the row and re-renders the table with input fields.
3. The row shows **Save** and **Cancel** buttons; Edit and Delete buttons are hidden.

**Constraints in edit mode:**

- **Bank name is immutable** once a row has been created. The bank name is part of the provider identity (primary key). Changing it would create a new, different provider. In edit mode the bank name is displayed as a read-only label (not a selector).

- **Username can be changed**, but the new combination of `(bank_name, username)` is a new provider identity. The DB layer will reject it unless a real password is supplied (the UPDATE WHERE `old_username` finds no match → `ValueError: Password is required when adding a new provider`). This error surfaces to the user as a save error notification, and the row stays in edit mode for correction.

- **Password field shows the placeholder** `••••••••`. If the user leaves it unchanged, `UIBackend.save_account()` passes `password=None` to the DB layer, which preserves the existing encrypted password. If the user types a new password, it replaces the existing one.

When the user clicks **Save**:

1. `save_row()` reads the current input values and calls `UIBackend.save_account()` — same logic as adding a new row, but with `password=None` when the placeholder is unchanged.
2. On success, the in-memory row is updated and the table re-renders.
3. On error (e.g. `ValueError` for missing password or DB error), `ui.notify()` shows the error and the row stays in edit mode so the user can correct and retry.

When the user clicks **Cancel**:

1. `cancel_edit()` restores the `_original` backup, discarding all edits.
2. No DB call is made.

---

#### Deleting a Provider Row

Clicking the delete button on a non-editing row calls `UIBackend.delete_account()`:

1. Calls `remove_provider_accounts()` on the DB layer.
2. This sets `removed=TRUE` on **all** account rows for that `(budget_id, financial_provider, financial_provider_username)` combination — a **soft delete**.
3. The provider row itself and the account rows are **retained** in the DB. This is intentional: if the same provider is added again later, `get_account_mappings()` will find the old rows (including removed ones) and reuse the same `actual_account_id` values, preventing duplicate Actual Budget accounts.
4. On success, the row is removed from `self.accounts` in memory and the table re-renders.
5. On error, `ui.notify()` shows the error and the in-memory list is not modified.

---

#### Switching Budgets

The budget dropdown in the header calls `change_budget()` when changed:

1. Updates `self.current_budget`.
2. Reloads `self.accounts` from the DB for the new budget.
3. Re-renders the table.

> **Implemented:** When the user switches budget while a row is in edit mode, a warning notification is shown (`'Unsaved edits will be discarded when switching budget.'`). The switch proceeds immediately regardless — the user is informed but not blocked.

---

#### Password Security Summary

| Situation | Behavior |
|---|---|
| Loading the UI | Real password never read from DB; placeholder shown always |
| Editing a row, password unchanged | `password=None` passed to DB layer; existing encrypted password preserved |
| Editing a row, user types new password | New password encrypted and stored |
| Adding a new row | Real password always required; placeholder rejected at UI level |
| Re-adding a previously removed provider | Same as adding — real password always required |
| Changing username on an existing row | Treated as new identity; real password required |

Passwords are encrypted at rest via `credential_encryption.py` using a per-budget key derived from `<budget-id>`. The `BudgetProvider.financial_provider_password = None` value is the signal to the DB layer to preserve the existing password (only valid for an identity that already exists in the `providers` table).

---

#### Class-Level DB Instance

`AccountsManagerUI` holds the `UIBackend` as a **class-level variable**:

```python
class AccountsManagerUI:
    db: UIBackend = UIBackend(DB_PATH)
```

This means all instances share the same backend by default. In the dev entrypoint (`tests/app/dev_main.py`) and in tests, this is overridden at class level before any instance is created:

```python
AccountsManagerUI.db = UIBackend(_FAKE_DB_PATH)
```
