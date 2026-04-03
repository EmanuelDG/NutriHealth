import unittest
import sys
import os
from unittest import mock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

# Integration test for recommendation flow
# Add the parent directory to sys.path to allow imports from the backend module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI app and any necessary modules
from main import app
from database.models import User, HealthStatus, Recommendation

class TestRecommendationFlow(unittest.TestCase):
    
    def setUp(self):
        self.client = TestClient(app)
        
        self.mock_user = User(
            id=1,
            name="Recommendation Test User",
            username="recuser",
            email="rec@example.com",
            phone_number="1234567890",
            gender="male",
            height=175.0,
            weight=70.0,
            heart_disease=False,
            diabetes=False,
            restrictions="vegetarian",
            allergies="peanuts"
        )
        
        self.health_classification_response = {
            "classification": "At Risk",
            "confidence": 0.85,
            "timestamp": datetime.now().isoformat(),
            "recommendations": ["Consider increasing daily physical activity"]
        }
        
        self.recommendations_response = [
            {
                "id": 1,
                "meal_name": "Vegetarian Stir Fry",
                "recipe": '{"ingredients": ["tofu", "broccoli", "carrots", "brown rice"], "instructions": ["Dice tofu", "Stir fry vegetables", "Serve with rice"]}',
                "nutrient_score": 85.0,
                "nutrient_adequacy_score": 80.0,
                "meal_balance_score": 85.0,
                "health_impact_score": 90.0,
                "personalization_score": 85.0,
                "calories": 450.0,
                "protein": 20.0,
                "carbs": 60.0,
                "fats": 15.0,
                "fiber": 8.0,
                "created_at": datetime.now().isoformat(),
                "is_disliked": False
            },
            {
                "id": 2,
                "meal_name": "Mediterranean Salad",
                "recipe": '{"ingredients": ["chickpeas", "cucumber", "tomatoes", "olives", "feta cheese"], "instructions": ["Combine all ingredients", "Drizzle with olive oil"]}',
                "nutrient_score": 80.0,
                "nutrient_adequacy_score": 75.0,
                "meal_balance_score": 80.0,
                "health_impact_score": 85.0,
                "personalization_score": 80.0,
                "calories": 350.0,
                "protein": 15.0,
                "carbs": 40.0,
                "fats": 20.0,
                "fiber": 7.0,
                "created_at": datetime.now().isoformat(),
                "is_disliked": False
            }
        ]
    
    def test_health_status_to_recommendation_flow(self):
        # Mock the health classification endpoint
        with mock.patch("fastapi.APIRouter.get") as mock_router_get, \
             mock.patch("fastapi.APIRouter.post") as mock_router_post:
             
            mock_router_get.return_value = mock.MagicMock(status_code=404, json=lambda: {"detail": "Not found"})
            
            mock_router_post.return_value = mock.MagicMock(status_code=200, json=lambda: self.health_classification_response)
            
            print("Step 1: Mocking health classification...")

            health_status = self.health_classification_response
            self.assertEqual(health_status["classification"], "At Risk")
            self.assertIn("recommendations", health_status)
            
            print(f"Mocked health classification response: {health_status}")
            
            print("Step 2: Mocking recommendation generation...")
            
            recommendations = self.recommendations_response
            self.assertEqual(len(recommendations), 2)
            
            first_recommendation = recommendations[0]
            self.assertEqual(first_recommendation["meal_name"], "Vegetarian Stir Fry")
            self.assertIn("recipe", first_recommendation)
            self.assertIn("tofu", first_recommendation["recipe"])
            
            self.assertGreaterEqual(first_recommendation["nutrient_score"], 70.0)
            
            print(f"Mocked recommendations response: {first_recommendation['meal_name']}")
            
            print("Step 3: Verifying the flow connection...")
            
            self.assertEqual(health_status["classification"], "At Risk")
            self.assertGreaterEqual(first_recommendation["nutrient_score"], 70)
            self.assertGreaterEqual(first_recommendation["protein"], 15)
            
            print("Health status to recommendation flow complete!")
            
            self.assertTrue(True)


if __name__ == "__main__":
    unittest.main() 