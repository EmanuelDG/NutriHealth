import unittest
import sys
import os
from unittest import mock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database.models import User, MealLog
from middleware.auth_middleware import get_current_active_user
from schemas.meal import MealLogResponse

# Integration test for health classification flow
class TestHealthFlow(unittest.TestCase):
    
    def setUp(self):
        self.client = TestClient(app)
        
        self.mock_user = User(
            id=1,
            name="Health Test User",
            username="healthuser",
            email="health@example.com",
            phone_number="1234567890",
            gender="male",
            height=175.0,
            weight=70.0,
            heart_disease=False,
            diabetes=False
        )
        
        self.test_meal = {
            "meal_name": "Test Chicken Salad",
            "calories": 450,
            "protein": 35,
            "carbohydrates": 30,
            "fats": 20,
            "sugar": 5,
            "fiber": 8
        }
        
        self.health_features = {
            "age": 30,
            "gender": 1,
            "bmi": 22.9,
            "daily_activity": 30,
            "heart_disease": False,
            "diabetes": False,
            "high_blood_pressure": False,
            "smoking": False,
            "alcohol": False,
            "protein_intake": 35,
            "carbs_intake": 30,
            "update_health_status": True,
            "include_insights": True
        }
    
    def test_meal_logging_health_classification_flow(self):
        # Mock database and dependencies
        mock_db = mock.MagicMock()
        
        mock_db.query.return_value.filter.return_value.all.return_value = []
        
        current_time = datetime.now()
        
        mock_meal = MealLog(
            id=1,
            user_id=self.mock_user.id,
            name=self.test_meal["meal_name"],
            calories=self.test_meal["calories"],
            protein=self.test_meal["protein"],
            carbs=self.test_meal["carbohydrates"],
            fat=self.test_meal["fats"],
            sugar=self.test_meal["sugar"],
            fiber=self.test_meal["fiber"],
            timestamp=current_time,
            meal_type="lunch",
            description="Mock meal for testing"
        )
        
        def mock_add_func(obj):
            if isinstance(obj, MealLog):
                obj.id = 1
                obj.timestamp = current_time
            return None
            
        mock_db.add.side_effect = mock_add_func
        mock_db.commit.return_value = None
        mock_db.refresh.side_effect = lambda x: None
        
        three_days_ago = datetime.now() - timedelta(days=3)
        recent_meals = [mock_meal]
        
        original_deps = app.dependency_overrides.copy()
        
        try:
            from database.database import get_db
            app.dependency_overrides[get_db] = lambda: mock_db
            
            app.dependency_overrides[get_current_active_user] = lambda: self.mock_user
            
            meal_log_response = MealLogResponse(
                id=1,
                meal_name=self.test_meal["meal_name"],
                calories=self.test_meal["calories"],
                protein=self.test_meal["protein"],
                carbohydrates=self.test_meal["carbohydrates"],
                fats=self.test_meal["fats"],
                sugar=self.test_meal["sugar"],
                fiber=self.test_meal["fiber"],
                timestamp=current_time
            )
            
            with mock.patch("routes.meal_routes.log_meal", return_value=meal_log_response):
                meal_response = self.client.post(
                    "/meals/log",
                    json=self.test_meal
                )
                
                print(f"Meal logging response: {meal_response.status_code} - {meal_response.text}")
                
                self.assertEqual(meal_response.status_code, 200)
                meal_data = meal_response.json()
                self.assertIn("id", meal_data)
                self.assertEqual(meal_data["meal_name"], self.test_meal["meal_name"])
                
            mock_db.query.return_value.filter.return_value.all.return_value = recent_meals
            
            health_classification_response = {
                "id": 1,
                "user_id": self.mock_user.id,
                "classification": "Healthy",
                "bmi": 22.9,
                "recommendations": ["Maintain your healthy diet", "Try to increase protein intake"],
                "created_at": datetime.now().date().isoformat()
            }
            
            with mock.patch("routes.health_routes.classify_health", return_value=health_classification_response):
                health_response = self.client.post(
                    "/health/classify",
                    json=self.health_features
                )
                
                print(f"Health classification response: {health_response.status_code} - {health_response.text}")
                
                self.assertEqual(health_response.status_code, 200)
                health_data = health_response.json()
                self.assertIn("classification", health_data)
                
                self.assertEqual(health_data["classification"], "Healthy")
                
        finally:
            app.dependency_overrides = original_deps


if __name__ == "__main__":
    unittest.main() 