import unittest
import jwt
from datetime import datetime, timedelta
from unittest import mock
from auth.auth_utils import get_password_hash, verify_password, create_access_token, create_refresh_token
from auth.auth_utils import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

# Integration test for authentication
class TestAuthentication(unittest.TestCase):

    def test_password_hashing_and_verification(self):
        password = "TestPassword123!"
        
        hashed_password = get_password_hash(password)

        self.assertNotEqual(password, hashed_password)
        
        self.assertTrue(verify_password(password, hashed_password))
        
        wrong_password = "WrongPassword123!"
        self.assertFalse(verify_password(wrong_password, hashed_password))
        
    @mock.patch('auth.auth_utils.datetime')
    def test_access_token_generation(self, mock_datetime):
        mock_now = datetime(2023, 1, 1, 12, 0, 0)
        mock_datetime.utcnow.return_value = mock_now
        
        username = "testuser"
        
        token = create_access_token(data={"sub": username})
        
        self.assertIsNotNone(token)
        
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={"verify_exp": False}
        )
        
        self.assertEqual(payload["sub"], username)
        self.assertIn("exp", payload)
        
        expected_exp = int((mock_now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())
        self.assertAlmostEqual(payload["exp"], expected_exp, delta=7200)
        
        self.assertEqual(payload["type"], "access")
        self.assertIn("iat", payload)
        self.assertIn("nbf", payload)
        
    @mock.patch('auth.auth_utils.datetime')
    def test_refresh_token_generation(self, mock_datetime):
        mock_now = datetime(2023, 1, 1, 12, 0, 0)
        mock_datetime.utcnow.return_value = mock_now
        
        username = "testuser"
    
        token = create_refresh_token(data={"sub": username})
        
        self.assertIsNotNone(token)
        
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={"verify_exp": False}
        )
        
        self.assertEqual(payload["sub"], username)
        self.assertIn("exp", payload)
        
        expected_exp = int((mock_now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).timestamp())
        self.assertAlmostEqual(payload["exp"], expected_exp, delta=7200)
        
        self.assertEqual(payload["type"], "refresh")
        
    def test_token_with_custom_expiry(self):
        username = "testuser"
        expires_delta = timedelta(hours=2)
        
        with mock.patch('auth.auth_utils.datetime') as mock_datetime:
            mock_now = datetime(2023, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = mock_now
            
            token = create_access_token(
                data={"sub": username}, 
                expires_delta=expires_delta
            )
            
            payload = jwt.decode(
                token, 
                SECRET_KEY, 
                algorithms=[ALGORITHM],
                options={"verify_exp": False}
            )
            
            expected_exp = int((mock_now + expires_delta).timestamp())
            self.assertAlmostEqual(payload["exp"], expected_exp, delta=7200)

if __name__ == '__main__':
    unittest.main() 