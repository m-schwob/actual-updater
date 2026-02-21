#!/usr/bin/env python3
"""CLI interface for database operations.

This script provides command-line access to database functions
for use by TypeScript services.
"""

import argparse
import json
import sys


from src.utils.db_interface.db_interface import load_accounts
from src.utils.constants import DB_PATH


def handle_load_accounts(args) -> None:
    """Handle the load_accounts function call."""
    accounts = load_accounts(
        budget_id=args.budget_id,
        actual_account_ids=args.actual_account_ids,
        return_passwords=True,
        db_path=args.db_path,
    )

    # Output as JSON
    if args.pretty:
        print(json.dumps(accounts, indent=2))
    else:
        print(json.dumps(accounts))


def main() -> None:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="CLI interface for database operations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Add common arguments
    parser.add_argument('--db-path', default=DB_PATH, help=f'Database path (default: {DB_PATH})')

    # Create subparsers for different functions
    subparsers = parser.add_subparsers(dest='command', help='Available database operations')
    subparsers.required = True

    # load_accounts subcommand
    load_parser = subparsers.add_parser(
        'load_accounts',
        help='Load accounts with decrypted passwords',
        description='Load non-removed accounts for a specific budget with decrypted passwords',
    )
    load_parser.add_argument('--budget-id', '-b', required=True, help='Budget ID to filter by')
    load_parser.add_argument(
        '--actual-account-ids', '-a', nargs='+', required=True, help='List of Actual account IDs to load'
    )
    load_parser.add_argument('--pretty', action='store_true', help='Pretty print JSON output')
    load_parser.set_defaults(func=handle_load_accounts)

    args = parser.parse_args()

    try:
        # Execute the function associated with the subcommand
        args.func(args)

    except Exception as e:
        # Output error as JSON to stderr for consistent parsing
        error_output = {"error": str(e), "type": type(e).__name__}
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
