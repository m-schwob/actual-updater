import sqlite3
from src.utils.credential_encryption import encrypt_password
from src.utils.constants import DB_PATH

def initialize_db() -> None:
    """Initialize the SQLite database schema."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        # Create budgets table with a default_account_id field
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                budget_id TEXT NOT NULL UNIQUE,
                default_account_id INTEGER,
                FOREIGN KEY (default_account_id) REFERENCES accounts (id) ON DELETE SET NULL
            )
        ''')

        # Create accounts table with a foreign key to budgets.id
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                financial_provider TEXT NOT NULL,
                account TEXT NOT NULL,
                password TEXT NOT NULL,
                FOREIGN KEY (budget_id) REFERENCES budgets (id) ON DELETE CASCADE
            )
        ''')

        conn.commit()

def store_account(budget_id: str, financial_provider: str, account: str, password: str) -> None:
    """Store a single account for a specific budget."""
    encrypted_password = encrypt_password(password)
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            f'''
            INSERT INTO accounts (budget_id, financial_provider, account, password)
            VALUES ({budget_id}, {financial_provider}, {account}, {encrypted_password})
            ''')
        conn.commit()

def load_accounts(budget_id: str) -> list:
    """Load accounts for a specific budget."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            f'''
            SELECT financial_provider, account FROM accounts
            WHERE budget_id = {budget_id}
            ''')
        return cursor.fetchall()

