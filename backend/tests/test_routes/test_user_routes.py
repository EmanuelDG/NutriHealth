import unittest
from unittest import mock
from datetime import datetime
import sys
import os


sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.user_routes import router, map_user_to_profile_response


class TestUserRoutes(unittest.TestCase):
    
    def setUp(self):

        self.app = FastAPI()
        self.app.include_router(router)
        
        self.client = TestClient(self.app)
        
        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.name = "Test User"
        self.mock_user.username = "testuser"
        self.mock_user.email = "test@example.com"
        self.mock_user.phone_number = "1234567890"
        self.mock_user.gender = 1  # male
        self.mock_user.height = 175.0
        self.mock_user.weight = 70.0
        self.mock_user.smoking = False
        self.mock_user.alcohol = False
        self.mock_user.heart_disease = False
        self.mock_user.diabetes = False
        self.mock_user.updated_at = datetime.now()
        
        self.mock_db = mock.MagicMock()
        
        self.patcher_get_user = mock.patch('routes.user_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        
        self.patcher_get_db = mock.patch('routes.user_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
    
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
    
    def test_get_user_profile(self):
        expected_profile = map_user_to_profile_response(self.mock_user)
        
        mapped_user = map_user_to_profile_response(self.mock_user)
        self.assertEqual(mapped_user["id"], self.mock_user.id)
        self.assertEqual(mapped_user["name"], self.mock_user.name)
        self.assertEqual(mapped_user["username"], self.mock_user.username)
        self.assertEqual(mapped_user["email"], self.mock_user.email)
        self.assertEqual(mapped_user["phone_number"], self.mock_user.phone_number)
    
    def test_update_user_profile(self):
        update_data = {
            "name": "Updated Name",
            "phone_number": "9876543210",
            "height": 180.0,
            "weight": 75.5,
            "smoking_status": True
        }
        
        field_mapping = {
            "smoking_status": "smoking",
            "alcohol_consumption": "alcohol",
            "dietary_restriction": "restrictions",
            "food_allergies": "allergies"
        }
        
        for key, value in update_data.items():
            db_field = field_mapping.get(key, key)
            setattr(self.mock_user, db_field, value)
        
        profile = map_user_to_profile_response(self.mock_user)
        
        self.assertEqual(profile["name"], update_data["name"])
        self.assertEqual(profile["phone_number"], update_data["phone_number"])
        self.assertEqual(profile["height"], update_data["height"])
        self.assertEqual(profile["weight"], update_data["weight"])
        self.assertEqual(profile["smoking_status"], update_data["smoking_status"])
    
    def test_user_profile_validation(self):
        from schemas.user import UserProfileUpdate
        
        valid_data = UserProfileUpdate(
            name="Valid Name",
            height=180.0,
            weight=75.5,
            daily_physical_activity=30
        )
        
        self.assertEqual(valid_data.name, "Valid Name")
        self.assertEqual(valid_data.height, 180.0)
        self.assertEqual(valid_data.weight, 75.5)
        self.assertEqual(valid_data.daily_physical_activity, 30)
        
        extreme_data = UserProfileUpdate(
            height=300.0,  # Extremely tall
            weight=500.0,  # Extremely heavy
            daily_physical_activity=1440  # 24 hours (maximum possible)
        )
        
        self.assertEqual(extreme_data.height, 300.0)
        self.assertEqual(extreme_data.weight, 500.0)
        self.assertEqual(extreme_data.daily_physical_activity, 1440)
        
        from inspect import signature
        from typing import Optional
        
        sig = signature(UserProfileUpdate)
        self.assertEqual(sig.parameters['height'].annotation, Optional[float])
        self.assertEqual(sig.parameters['weight'].annotation, Optional[float])
        self.assertEqual(sig.parameters['daily_physical_activity'].annotation, Optional[int])


if __name__ == '__main__':
    unittest.main() 