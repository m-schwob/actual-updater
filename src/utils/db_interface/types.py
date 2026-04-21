from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class AccountsLink:
    """Represents a mapping between actual account IDs and financial provider account IDs."""
    actual_account_id: str
    financial_provider_account_id: str


@dataclass(frozen=True)
class BudgetProvider:
    """Represents a row in the providers table.

    Notes:
        - financial_provider_password is expected to be already encrypted for storage.
        - Use the DB layer to handle encryption/decryption; this class is a simple data holder.
    """

    budget_id: str
    financial_provider: str
    financial_provider_username: str
    financial_provider_password: Optional[str]  # None means preserve the existing password in the DB
    accounts_mapping: list[AccountsLink]

