from os import PathLike
import sqlite3
from typing import List, Dict, Optional
from src.utils.db_interface.credential_encryption import encrypt_password, decrypt_password
from src.utils.constants import DB_PATH


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
        if 'password' in account:
            # Determine budget_id for decryption
            decrypt_budget_id = budget_id if budget_id is not None else account.get('budget_id')
            if decrypt_budget_id is None:
                raise KeyError("Missing 'budget_id' for password decryption in account row")
            account['password'] = decrypt_password(account['password'], decrypt_budget_id)

        # Convert removed field to boolean if present
        if 'removed' in account:
            account['removed'] = account['removed'] == 1 or account['removed'] == '1'

        accounts.append(account)

    return accounts


def initialize_db(db_path: PathLike = DB_PATH) -> None:
    """Initialize the SQLite database schema according to the design specification."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()

        # Create accounts table according to design schema
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS accounts (
                budget_id TEXT NOT NULL,
                financial_provider TEXT NOT NULL,
                financial_provider_account TEXT NOT NULL,
                password TEXT NOT NULL,
                actual_account_id TEXT NOT NULL,
                removed BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (budget_id, actual_account_id)
            )
        '''
        )

        conn.commit()


def store_account(
    budget_id: str,
    financial_provider: str,
    financial_provider_account: str,
    password: str,
    actual_account_id: str,
    db_path: PathLike = DB_PATH,
) -> None:
    """Store a single account for a specific budget with encrypted password.

    This will create a new account or replace the old one if it already exists (upsert).
    """
    encrypted_password = encrypt_password(password, budget_id)

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT OR REPLACE INTO accounts 
            (budget_id, financial_provider, financial_provider_account, password, actual_account_id, removed)
            VALUES (?, ?, ?, ?, ?, FALSE)
            ''',
            (budget_id, financial_provider, financial_provider_account, encrypted_password, actual_account_id),
        )
        conn.commit()


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

        params = [budget_id]

        if actual_account_ids:
            # Filter by specific actual account IDs using simple IN clause
            placeholders = ', '.join(['?'] * len(actual_account_ids))
            where_clause = f"WHERE budget_id = ? AND actual_account_id IN ({placeholders}) AND removed = FALSE"
            params.extend([actual_id for actual_id in actual_account_ids])
        else:
            # Return all accounts for the budget
            where_clause = "WHERE budget_id = ? AND removed = FALSE"
        
        cursor.execute(
            f'''
            SELECT actual_account_id, financial_provider, financial_provider_account{", password" if return_passwords else ""}
            FROM accounts
            {where_clause}
            ''',
            params,
        )

        return _process_account_rows(cursor, budget_id=budget_id)


def remove_account(budget_id: str, actual_account_id: str, db_path: PathLike = DB_PATH) -> bool:
    """Mark an account as removed (soft delete) using the primary key."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''
            UPDATE accounts 
            SET removed = TRUE
            WHERE budget_id = ? AND actual_account_id = ?
            ''',
            (budget_id, actual_account_id),
        )

        return cursor.rowcount > 0


def delete_account(budget_id: str, actual_account_id: str, db_path: PathLike = DB_PATH) -> bool:
    """Permanently delete an account from the database using the primary key."""
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''
            DELETE FROM accounts 
            WHERE budget_id = ? AND actual_account_id = ?
            ''',
            (budget_id, actual_account_id),
        )

        return cursor.rowcount > 0


def find_accounts(
    budget_id: Optional[str] = None,
    financial_provider: Optional[str] = None,
    financial_provider_account: Optional[str] = None,
    actual_account_id: Optional[str] = None,
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
            conditions.append("budget_id = ?")
            params.append(budget_id)
        if financial_provider is not None:
            conditions.append("financial_provider = ?")
            params.append(financial_provider)
        if financial_provider_account is not None:
            conditions.append("financial_provider_account = ?")
            params.append(financial_provider_account)
        if actual_account_id is not None:
            conditions.append("actual_account_id = ?")
            params.append(actual_account_id)
        if not include_removed:
            conditions.append("removed = FALSE")

        if not conditions:
            return []  # No filters provided, return empty list

        cursor.execute(
            f'''
            SELECT budget_id, actual_account_id, financial_provider, financial_provider_account, {"password," if return_password else ""} removed
            FROM accounts
            WHERE {' AND '.join(conditions)}
            ''',
            params,
        )

        return _process_account_rows(cursor, budget_id=budget_id)
