import unittest
import sys
import os
from unittest import mock
from fastapi.testclient import TestClient
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database.models import User
from auth.auth_utils import create_access_token

# Integration test for authentication flow using mocked responses

class TestAuthFlow(unittest.TestCase):
    
    def setUp(self):
        self.client = TestClient(app)
        
        self.test_user = {
            "id": 1,
            "name": "Integration Test User",
            "username": "integrationuser",
            "email": "integration@example.com",
            "phone_number": "1234567890",
            "password": "TestPassword123!"
        }
        
        self.updated_profile = {
            "name": "Updated User",
            "phone_number": "9876543210",
            "age": 30,
            "gender": 1,
            "height": 175.5,
            "weight": 70.2
        }
        
        self.mock_user = User(
            id=self.test_user["id"],
            name=self.test_user["name"],
            username=self.test_user["username"],
            email=self.test_user["email"],
            phone_number=self.test_user["phone_number"]
        )
    
    def test_complete_auth_flow(self):
        
        mock_db = mock.MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.side_effect = lambda user: setattr(user, 'id', self.test_user["id"])
        
        original_deps = app.dependency_overrides.copy()
        
        try:
            from database.database import get_db
            app.dependency_overrides[get_db] = lambda: mock_db
            
            from middleware.auth_middleware import get_current_active_user
            app.dependency_overrides[get_current_active_user] = lambda: self.mock_user
            
            signup_response = self.client.post(
                "/auth/signup",
                json=self.test_user
            )
            
            print(f"Signup response: {signup_response.status_code} - {signup_response.text}")
            
            self.assertIn(signup_response.status_code, [200, 201], f"Signup failed with code {signup_response.status_code}")
            
            signup_data = signup_response.json()
            self.assertIn("user_id", signup_data)
            
            profile_response = self.client.get("/users/profile")
           

            profile_response = self.client.get("/users/profile")
            
            print(f"Profile response: {profile_response.status_code} - {profile_response.text}")
            
            self.assertEqual(profile_response.status_code, 200)
            
            update_response = self.client.post(
                "/users/profile",
                json=self.updated_profile
            )
            
            print(f"Update response: {update_response.status_code} - {update_response.text}")
            
            self.assertEqual(update_response.status_code, 200)
            
            self.mock_user.name = self.updated_profile["name"]
            self.mock_user.phone_number = self.updated_profile["phone_number"]
            self.mock_user.gender = self.updated_profile["gender"]
            self.mock_user.age = self.updated_profile["age"]
            self.mock_user.height = self.updated_profile["height"]
            self.mock_user.weight = self.updated_profile["weight"]
            
            verify_response = self.client.get("/users/profile")
            
            print(f"Verify response: {verify_response.status_code} - {verify_response.text}")
            
            self.assertEqual(verify_response.status_code, 200)
            
        finally:
            app.dependency_overrides = original_deps


if __name__ == "__main__":
    unittest.main() 