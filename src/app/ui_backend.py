import uuid
from os import PathLike
from typing import Dict, List, Optional

from src.utils.constants import (
    DB_PATH,
    FINANCIAL_PROVIDER,
    FINANCIAL_PROVIDER_ACCOUNT,
    FINANCIAL_PROVIDER_USERNAME,
)
from src.utils.db_interface.db_interface import (
    get_account_mappings,
    load_accounts as load_accounts_from_db,
    remove_provider_accounts,
    store_provider_accounts,
)
from src.utils.db_interface.types import AccountsLink, BudgetProvider

_BANK_NAME = "bank_name"
_ACCOUNT = "account"  # comma-separated financial_provider_account IDs shown in the UI
_USER = "user"
_PASSWORD = "password"

# Shown in the UI instead of the real password (security measure — password is never loaded from DB)
PLACEHOLDER_PASSWORD = "••••••••"


def _create_actual_account(budget_id: str, financial_provider_account: str) -> str:
    """Create a new Actual Budget account for a previously-unseen provider account.

    TODO: Implement via the Actual Budget API once account creation is available.
          The returned ID must be a real Actual account ID for the service to function correctly.
          For now this stub returns a fake UUID so that UI/DB integration can be tested in isolation.
    """
    # TODO: call Actual Budget API to create account and return its ID
    return f"actual-{uuid.uuid4()}"


class UIBackend:
    """Handles all database operations for AccountsManagerUI.

    Translates between the UI's flat per-provider view (bank_name, comma-separated accounts,
    user, password) and the DB schema where each account mapping is a separate row.
    """

    def __init__(self, db_path: PathLike = DB_PATH) -> None:
        self.db_path = db_path

    def load_accounts(self, budget_id: str) -> List[Dict]:
        """Load non-removed providers for a budget as UI-formatted dicts.

        Each provider becomes one row with its accounts joined as a comma-separated string.
        Password is intentionally not loaded — the UI displays the placeholder instead.

        TODO: Validate that each actual_account_id still exists in Actual Budget.
              If an account no longer exists, call remove_account() on that mapping and
              optionally prompt the user to decide whether to create a replacement.
        """
        rows = load_accounts_from_db(budget_id=budget_id, db_path=self.db_path)

        # Group per-account rows by (financial_provider, financial_provider_username)
        grouped: Dict[tuple, Dict] = {}
        for row in rows:
            key = (row[FINANCIAL_PROVIDER], row[FINANCIAL_PROVIDER_USERNAME])
            if key not in grouped:
                grouped[key] = {
                    _BANK_NAME: row[FINANCIAL_PROVIDER],
                    _USER: row[FINANCIAL_PROVIDER_USERNAME],
                    "_provider_accounts": [],
                    _PASSWORD: PLACEHOLDER_PASSWORD,
                    "editable": False,
                }
            grouped[key]["_provider_accounts"].append(row[FINANCIAL_PROVIDER_ACCOUNT])

        result = []
        for entry in grouped.values():
            entry[_ACCOUNT] = ", ".join(entry.pop("_provider_accounts"))
            result.append(entry)
        return result

    def save_account(self, budget_id: str, entry: Dict) -> None:
        """Save (add or update) a provider entry from the UI.

        Password handling:
            If the UI shows the placeholder, the existing DB password is preserved.
            Only a real password typed by the user triggers a password update.

        Account ID resolution:
            For each provider account in the entry, the existing actual_account_id is reused
            (including previously-removed mappings) so Actual Budget accounts are never duplicated.
            Brand-new provider accounts get a new Actual account via _create_actual_account().
        """
        financial_provider = entry.get(_BANK_NAME, "")
        financial_provider_username = entry.get(_USER, "")
        raw_password = entry.get(_PASSWORD, "")

        # Parse comma-separated provider account IDs (strip whitespace around commas)
        provider_accounts = [a.strip() for a in entry.get(_ACCOUNT, "").split(",") if a.strip()]

        # Resolve password: None tells store_provider_accounts to preserve the existing DB value.
        # A ValueError is raised by the DB layer if there is no existing provider to inherit a password from.
        password: Optional[str] = None if raw_password == PLACEHOLDER_PASSWORD else raw_password

        # Reuse existing actual_account_ids (get_account_mappings includes removed rows)
        existing_mappings = get_account_mappings(
            db_path=self.db_path,
            budget_id=budget_id,
            financial_provider=financial_provider,
            financial_provider_username=financial_provider_username,
            accounts=provider_accounts,
        )
        # Map financial_provider_account → actual_account_id
        existing: Dict[str, str] = {fp_acct: actual_id for actual_id, fp_acct in existing_mappings}

        accounts_mapping = []
        for fp_account in provider_accounts:
            actual_id = existing.get(fp_account) or _create_actual_account(budget_id, fp_account)
            accounts_mapping.append(
                AccountsLink(
                    actual_account_id=actual_id,
                    financial_provider_account_id=fp_account,
                )
            )

        provider = BudgetProvider(
            budget_id=budget_id,
            financial_provider=financial_provider,
            financial_provider_username=financial_provider_username,
            financial_provider_password=password,
            accounts_mapping=accounts_mapping,
        )
        store_provider_accounts(provider=provider, db_path=self.db_path)

    def delete_account(self, budget_id: str, entry: Dict) -> None:
        """Soft-delete all accounts for a provider (mark as removed).

        Provider and account rows are retained in the DB so that re-adding the same
        provider account can reuse the existing actual_account_id without creating a
        duplicate Actual Budget account.
        """
        remove_provider_accounts(
            budget_id=budget_id,
            financial_provider=entry.get(_BANK_NAME, ""),
            financial_provider_username=entry.get(_USER, ""),
            db_path=self.db_path,
        )
