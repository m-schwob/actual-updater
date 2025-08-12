import sys
import keyring
import argparse
from cryptography.fernet import Fernet, InvalidToken

from src.utils.constants import SERVICE_NAME


def get_fernet(key_id: str) -> Fernet:
    """Retrieve or generate the Fernet key from OS keyring."""
    key = keyring.get_password(SERVICE_NAME, key_id)
    if key is None:
        key = Fernet.generate_key().decode()
        keyring.set_password(SERVICE_NAME, key_id, key)
    return Fernet(key.encode())

def encrypt_password(password: str, key_id: str) -> str:
    '''
    Encrypt a password string.

    Args:
        password (str): The plaintext password to encrypt.
        key_id (str): The key ID to use for encryption. The format should be <budget file name>-<budget file id>.

    Returns:
        str: The encrypted password as a cipher string.
    '''
    fernet = get_fernet(key_id)
    return fernet.encrypt(password.encode()).decode()

def decrypt_password(cipher: str, key_id: str) -> str:
    '''
    Decrypt a password cipher.

    Args:
        cipher (str): The encrypted cipher to decrypt.
        key_id (str): The key ID to use for decryption. The format should be <budget file name>-<budget file id>.

    Returns:
        str: The decrypted plaintext password.
    '''
    fernet = get_fernet(key_id)
    return fernet.decrypt(cipher.encode()).decode()

def main() -> None:
    """CLI for encrypting or decrypting passwords."""
    parser = argparse.ArgumentParser(description='Encrypt or decrypt passwords using a specified key ID.')
    subparsers = parser.add_subparsers(dest='command', required=True)

    encrypt_parser = subparsers.add_parser('encrypt', help='Encrypt a plaintext password.')
    encrypt_parser.add_argument('key_id', type=str, help='The key ID to use for encryption. Format: <budget file name>-<budget file id>.')
    encrypt_parser.add_argument('password', type=str, help='The plaintext password to encrypt.')

    decrypt_parser = subparsers.add_parser('decrypt', help='Decrypt an encrypted password.')
    decrypt_parser.add_argument('key_id', type=str, help='The key ID to use for decryption. Format: <budget file name>-<budget file id>.')
    decrypt_parser.add_argument('cipher', type=str, help='The encrypted password to decrypt.')

    args = parser.parse_args()

    try:
        if args.command == 'encrypt':
            print(encrypt_password(args.password, args.key_id))
        elif args.command == 'decrypt':
            print(decrypt_password(args.cipher, args.key_id))
    except InvalidToken:
        print('Invalid cipher or wrong key.', file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(3)

if __name__ == '__main__':
    main()
