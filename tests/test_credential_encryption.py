import unittest
from unittest.mock import patch
from io import StringIO
from src.utils.credential_encryption import encrypt_password, decrypt_password, main
from cryptography.fernet import InvalidToken


class TestCredentialEncryption(unittest.TestCase):

    def setUp(self):
        self.key_id = 'test-budget-123'
        self.password = 'securepassword'

    def test_encrypt_decrypt_password(self):
        # Test encryption and decryption with the same key_id
        cipher = encrypt_password(self.password, self.key_id)
        decrypted_password = decrypt_password(cipher, self.key_id)
        self.assertEqual(self.password, decrypted_password)

    def test_decrypt_with_wrong_key(self):
        # Test decryption with a wrong key_id
        cipher = encrypt_password(self.password, self.key_id)
        wrong_key_id = 'wrong-budget-456'
        with self.assertRaises(InvalidToken):
            decrypt_password(cipher, wrong_key_id)

    @patch('sys.argv', ['main', 'encrypt', 'test-budget-123', 'securepassword'])
    @patch('sys.stdout', new_callable=StringIO)
    def test_main_encrypt(self, mock_stdout):
        main()
        output = mock_stdout.getvalue().strip()
        self.assertTrue(output)  # Ensure some output is produced

    @patch('sys.argv', ['main', 'decrypt', 'test-budget-123', 'invalidcipher'])
    @patch('sys.stderr', new_callable=StringIO)
    def test_main_decrypt_invalid_cipher(self, mock_stderr):
        with self.assertRaises(SystemExit) as cm:
            main()
        self.assertEqual(cm.exception.code, 2)  # Invalid cipher exit code
        error_output = mock_stderr.getvalue().strip()
        self.assertIn('Invalid cipher or wrong key.', error_output)
