from os import PathLike
import sqlite3
from typing import List, Dict, Optional
import json
from src.utils.db_interface.credential_encryption import encrypt_password, decrypt_password
from src.utils.constants import (
    DB_PATH,
    BUDGET_ID,
    ACTUAL_ACCOUNT_ID,
    FINANCIAL_PROVIDER_ACCOUNT,
    REMOVED,
    FINANCIAL_PROVIDER,
    FINANCIAL_PROVIDER_USERNAME,
    FINANCIAL_PROVIDER_PASSWORD,
    ACCOUNTS,
    ACCOUNTS_TABLE,
    PROVIDERS_TABLE,
)
from src.utils.db_interface.types import BudgetProvider


def _process_account_rows(cursor: sqlite3.Cursor, budget_id: Optional[str] = None) -> List[Dict[str, str]]:
    """Helper function to process cursor results into account dictionaries using column descriptions.

    Args:
        cursor: SQLite cursor after executing query
        budget_id: Budget ID for password decryption (if None, will use budget_id from each row)

    Returns:
        List of account dictionaries
    """
    # Get column names from cursor description
    columns = [desc[0] for desc in cursor.description]
    results = cursor.fetchall()

    accounts = []
    for row in results:
        # Create dictionary from column names and row values
        account = dict(zip(columns, row))

        # Handle password decryption if present
        if FINANCIAL_PROVIDER_PASSWORD in account:
            # Determine budget_id for decryption
            decrypt_budget_id = budget_id if budget_id is not None else account.get(BUDGET_ID)
            if decrypt_budget_id is None:
                raise KeyError(f"Missing '{BUDGET_ID}' for password decryption in account row")
            account[FINANCIAL_PROVIDER_PASSWORD] = decrypt_password(
                account[FINANCIAL_PROVIDER_PASSWORD], decrypt_budget_id
            )

        # Convert removed field to boolean if present
        if REMOVED in account:
            account[REMOVED] = account[REMOVED] == 1 or account[REMOVED] == '1'

        accounts.append(account)

    return accounts


def initialize_db(db_path: PathLike = DB_PATH) -> None:
    """Initialize the SQLite database schema according to the design specification."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        create_providers_table(cursor)
        create_accounts_table(cursor)
        conn.commit()

def create_providers_table(cursor: sqlite3.Cursor) -> None:
    cursor.execute(
            f'''
            CREATE TABLE IF NOT EXISTS {PROVIDERS_TABLE} (
                {BUDGET_ID} TEXT NOT NULL,
                {FINANCIAL_PROVIDER} TEXT NOT NULL,
                {FINANCIAL_PROVIDER_USERNAME} TEXT NOT NULL,
                {FINANCIAL_PROVIDER_PASSWORD} TEXT NOT NULL,
                {ACCOUNTS} TEXT,
                PRIMARY KEY ({BUDGET_ID}, {FINANCIAL_PROVIDER}, {FINANCIAL_PROVIDER_USERNAME})
            )
            '''
        )

def create_accounts_table(cursor: sqlite3.Cursor) -> None:
    cursor.execute(
            f'''
            CREATE TABLE IF NOT EXISTS {ACCOUNTS_TABLE} (
                {ACTUAL_ACCOUNT_ID} TEXT NOT NULL,
                {FINANCIAL_PROVIDER_ACCOUNT} TEXT NOT NULL,
                {REMOVED} BOOLEAN NOT NULL DEFAULT FALSE,
                {BUDGET_ID} TEXT NOT NULL,
                {FINANCIAL_PROVIDER} TEXT NOT NULL,
                {FINANCIAL_PROVIDER_USERNAME} TEXT NOT NULL,
                FOREIGN KEY ({BUDGET_ID}, {FINANCIAL_PROVIDER}, {FINANCIAL_PROVIDER_USERNAME}) 
                    REFERENCES {PROVIDERS_TABLE}({BUDGET_ID}, {FINANCIAL_PROVIDER}, {FINANCIAL_PROVIDER_USERNAME})
                    ON DELETE CASCADE
            )
            '''
        )


def get_account_mappings(
    db_path: PathLike,
    budget_id: str,
    financial_provider: str,
    financial_provider_username: str,
    accounts: List[str]
) -> List[tuple]:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        placeholders = ','.join('?' * len(accounts))
        cursor.execute(
            f'''
            SELECT {ACTUAL_ACCOUNT_ID}, {FINANCIAL_PROVIDER_ACCOUNT}
            FROM {ACCOUNTS_TABLE}
            WHERE {BUDGET_ID} = ? 
            AND {FINANCIAL_PROVIDER} = ? 
            AND {FINANCIAL_PROVIDER_USERNAME} = ?
            AND {FINANCIAL_PROVIDER_ACCOUNT} IN ({placeholders})
            ''',
            (budget_id, financial_provider, financial_provider_username, *accounts)
        )
        return cursor.fetchall()


def store_provider_accounts(
    provider: BudgetProvider,
    db_path: PathLike = DB_PATH,
) -> None:
    """Store a provider and all its associated account mappings for a specific budget, with encrypted password.

    This will create or update the provider and all its accounts (upsert), replacing old records if they already exist.
    """
    encrypted_password = encrypt_password(provider.financial_provider_password, provider.budget_id)
    budget_id = provider.budget_id
    financial_provider = provider.financial_provider
    financial_provider_username = provider.financial_provider_username
    financial_provider_accounts = [account.financial_provider_account_id for account in provider.accounts_mapping]

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        # Upsert provider record (password stored in providers table)
        update_providers_table(encrypted_password, budget_id, financial_provider, financial_provider_username, financial_provider_accounts, cursor)
        # We set all account rows to removed=True, so that if they are not given by user, removed will be True
        set_provider_accounts_to_removed(budget_id, financial_provider, financial_provider_username, cursor)
        for account_link in provider.accounts_mapping:
            # Upsert account record (no password column in accounts table)
            # Any row given here is updated to removed=False
            update_account_row(budget_id, financial_provider, financial_provider_username, cursor, account_link.actual_account_id, account_link.financial_provider_account_id)
        conn.commit()

def update_account_row(
    budget_id: str,
    financial_provider: str,
    financial_provider_username: str,
    cursor: sqlite3.Cursor,
    actual_account_id: str,
    financial_provider_account: str
) -> None:
    cursor.execute(
        f'''
        INSERT OR REPLACE INTO {ACCOUNTS_TABLE}
        ({ACTUAL_ACCOUNT_ID}, {FINANCIAL_PROVIDER_ACCOUNT}, {BUDGET_ID}, {FINANCIAL_PROVIDER}, {FINANCIAL_PROVIDER_USERNAME}, {REMOVED})
        VALUES (?, ?, ?, ?, ?, FALSE)
        ''',
        (actual_account_id, financial_provider_account, budget_id, financial_provider, financial_provider_username)
    )

def set_provider_accounts_to_removed(
    budget_id: str,
    financial_provider: str,
    financial_provider_username: str,
    cursor: sqlite3.Cursor
) -> None:
    cursor.execute(
        f'''
        UPDATE {ACCOUNTS_TABLE}
        SET {REMOVED} = TRUE
        WHERE {BUDGET_ID} = ? AND {FINANCIAL_PROVIDER} = ? AND {FINANCIAL_PROVIDER_USERNAME} = ?
        ''',
        (budget_id, financial_provider, financial_provider_username)
    )

def update_providers_table(
    encrypted_password: str,
    budget_id: str,
    financial_provider: str,
    financial_provider_username: str,
    financial_provider_accounts: List[str],
    cursor: sqlite3.Cursor
) -> None:
    cursor.execute(
        f'''
        INSERT OR REPLACE INTO {PROVIDERS_TABLE}
        ({BUDGET_ID}, {FINANCIAL_PROVIDER}, {FINANCIAL_PROVIDER_USERNAME}, {FINANCIAL_PROVIDER_PASSWORD}, {ACCOUNTS})
        VALUES (?, ?, ?, ?, ?)
        ''',
        (budget_id, financial_provider, financial_provider_username, encrypted_password, json.dumps(financial_provider_accounts))
    )


def load_accounts(
    budget_id: str,
    actual_account_ids: Optional[List[str]] = None,
    return_passwords: bool = False,
    db_path: PathLike = DB_PATH,
) -> List[Dict[str, str]]:
    """Load non-removed accounts for a specific budget with decrypted passwords.

    Args:
        budget_id: The budget ID to filter by
        actual_account_ids: Optional list of Actual account IDs to filter by. If None, returns all accounts for the budget.
        return_passwords: Whether to include decrypted passwords in results (default: False)
        db_path: Database path

    Returns:
        List of account dictionaries with decrypted passwords (if requested)
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        fields_to_select = [ACTUAL_ACCOUNT_ID, FINANCIAL_PROVIDER, FINANCIAL_PROVIDER_ACCOUNT, FINANCIAL_PROVIDER_USERNAME]
        if return_passwords:
            fields_to_select.append(FINANCIAL_PROVIDER_PASSWORD)

        where_clause = f"WHERE {BUDGET_ID}='{budget_id}' AND {REMOVED} = FALSE"
        if actual_account_ids:
            # Filter by specific actual account IDs using simple IN clause
            where_clause += f"AND {ACTUAL_ACCOUNT_ID} IN ({actual_account_ids})"
        cursor.execute(
            f'''
            SELECT {",".join(fields_to_select)}
            FROM {ACCOUNTS_TABLE}
            {where_clause}
            '''
        )

        return _process_account_rows(cursor, budget_id=budget_id)


def remove_account(budget_id: str, actual_account_id: str, db_path: PathLike = DB_PATH) -> bool:
    """Mark an account as removed (soft delete) using the primary key."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            f'''
            UPDATE {ACCOUNTS_TABLE} 
            SET {REMOVED} = TRUE
            WHERE {BUDGET_ID} = ? AND {ACTUAL_ACCOUNT_ID} = ?
            ''',
            (budget_id, actual_account_id)
        )

        return cursor.rowcount > 0


def delete_account(budget_id: str, actual_account_id: str, db_path: PathLike = DB_PATH) -> bool:
    """Permanently delete an account from the database using the primary key."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            f'''
            DELETE FROM {ACCOUNTS_TABLE} 
            WHERE {BUDGET_ID} = ? AND {ACTUAL_ACCOUNT_ID} = ?
            ''',
            (budget_id, actual_account_id)
        )

        return cursor.rowcount > 0


def find_accounts(
    budget_id: Optional[str] = None,
    financial_provider: Optional[str] = None,
    financial_provider_account: Optional[str] = None,
    actual_account_id: Optional[str] = None,
    financial_provider_username: Optional[str] = None,
    include_removed: bool = False,
    return_password: bool = False,
    db_path: PathLike = DB_PATH,
) -> List[Dict[str, str]]:
    """Find accounts by any combination of parameters.

    Args:
        budget_id: Filter by budget ID
        financial_provider: Filter by financial provider
        financial_provider_account: Filter by financial provider account
        actual_account_id: Filter by actual account ID
        financial_provider_username: Filter by financial provider username
        include_removed: Whether to include removed accounts (default: False)
        return_password: Whether to include decrypted passwords (default: False)
        db_path: Database path

    Returns:
        List of matching account dictionaries
    """
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()

        conditions = []
        params = []

        if budget_id is not None:
            conditions.append(f"{BUDGET_ID} = ?")
            params.append(budget_id)
        if financial_provider is not None:
            conditions.append(f"{FINANCIAL_PROVIDER} = ?")
            params.append(financial_provider)
        if financial_provider_account is not None:
            conditions.append(f"{FINANCIAL_PROVIDER_ACCOUNT} = ?")
            params.append(financial_provider_account)
        if actual_account_id is not None:
            conditions.append(f"{ACTUAL_ACCOUNT_ID} = ?")
            params.append(actual_account_id)
        if financial_provider_username is not None:
            conditions.append(f"{FINANCIAL_PROVIDER_USERNAME} = ?")
            params.append(financial_provider_username)
        if not include_removed:
            conditions.append(f"{REMOVED} = FALSE")

        if not conditions:
            return []  # No filters provided, return empty list

        cursor.execute(
            f'''
            SELECT {BUDGET_ID}, {ACTUAL_ACCOUNT_ID}, {FINANCIAL_PROVIDER}, {FINANCIAL_PROVIDER_ACCOUNT}, {FINANCIAL_PROVIDER_USERNAME}, {FINANCIAL_PROVIDER_PASSWORD + "," if return_password else ""} {REMOVED}
            FROM {ACCOUNTS_TABLE}
            WHERE {' AND '.join(conditions)}
            ''',
            params,
        )

        return _process_account_rows(cursor, budget_id=budget_id)
