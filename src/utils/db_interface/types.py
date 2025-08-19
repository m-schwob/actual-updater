from dataclasses import dataclass


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
    financial_provider_password: str  # encrypted string as stored in DB
    accounts_mapping: list[AccountsLink]

@dataclass(frozen=True)
class AccountsLink:
    """Represents a mapping between actual account IDs and financial provider account IDs."""
    actual_account_id: str
    financial_provider_account_id: str
