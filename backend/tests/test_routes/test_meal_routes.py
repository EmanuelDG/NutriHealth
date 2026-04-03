import unittest
from unittest import mock
from datetime import datetime
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.meal_routes import router
from schemas.meal import MealLogEntry, MealLogResponse, FoodSearchResult, FoodSearchResponse

class TestMealRoutes(unittest.TestCase):

    def setUp(self):

        self.app = FastAPI()
        self.app.include_router(router)
            

        self.client = TestClient(self.app)
        

        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        
        self.mock_meal = mock.MagicMock()
        self.mock_meal.id = 1
        self.mock_meal.name = "Test Meal"
        self.mock_meal.calories = 500
        self.mock_meal.protein = 25
        self.mock_meal.carbs = 60
        self.mock_meal.fat = 15
        self.mock_meal.sugar = 10
        self.mock_meal.fiber = 5
        self.mock_meal.timestamp = datetime.now()
        

        self.mock_db = mock.MagicMock()
        self.mock_db.add.return_value = None
        self.mock_db.commit.return_value = None
        self.mock_db.refresh.return_value = None
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [self.mock_meal]
        
        self.patcher_get_user = mock.patch('routes.meal_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        
        self.patcher_get_db = mock.patch('routes.meal_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
        
        self.patcher_requests = mock.patch('routes.meal_routes.requests')
        self.mock_requests = self.patcher_requests.start()
    
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
        self.patcher_requests.stop()
    
    def test_meal_logging_endpoint(self):

        test_meal = MealLogEntry(
            meal_name="Test Lunch",
            calories=450,
            protein=30,
            carbohydrates=50,
            fats=15,
            sugar=5,
            fiber=8
        )
        
        self.mock_db.refresh = lambda x: setattr(x, 'id', 1)
        
        expected_response = MealLogResponse(
            id=1,
            meal_name=test_meal.meal_name,
            calories=test_meal.calories,
            protein=test_meal.protein,
            carbohydrates=test_meal.carbohydrates,
            fats=test_meal.fats,
            sugar=test_meal.sugar,
            fiber=test_meal.fiber,
            timestamp=datetime.now()
        )
        
        self.assertEqual(test_meal.meal_name, "Test Lunch")
        self.assertEqual(test_meal.calories, 450)
        self.assertEqual(test_meal.protein, 30)
        self.assertEqual(test_meal.carbohydrates, 50)
        
    
    def test_meal_search_endpoint(self):

        mock_api_response = {
            "products": [
                {
                    "product_name": "Apple",
                    "nutriments": {
                        "energy-kcal_100g": 52,
                        "proteins_100g": 0.3,
                        "carbohydrates_100g": 14,
                        "fat_100g": 0.2,
                        "sugars_100g": 10,
                        "fiber_100g": 2.4
                    },
                    "image_url": "https://example.com/apple.jpg"
                }
            ]
        }
        
        mock_response = mock.MagicMock()
        mock_response.json.return_value = mock_api_response
        mock_response.raise_for_status.return_value = None
        self.mock_requests.get.return_value = mock_response
        
        expected_result = FoodSearchResult(
            name="Apple",
            calories=52,
            protein=0.3,
            carbs=14,
            fats=0.2,
            sugar=10,
            fiber=2.4,
            imageUrl="https://example.com/apple.jpg"
        )
        
        self.assertEqual(mock_api_response["products"][0]["product_name"], "Apple")
        self.assertEqual(mock_api_response["products"][0]["nutriments"]["energy-kcal_100g"], 52)
    
    def test_meal_history_endpoint(self):

        
        self.assertEqual(self.mock_meal.name, "Test Meal")
        self.assertEqual(self.mock_meal.calories, 500)
        self.assertEqual(self.mock_meal.protein, 25)
        
        expected_response = [
            MealLogResponse(
                id=self.mock_meal.id,
                meal_name=self.mock_meal.name,
                calories=self.mock_meal.calories,
                protein=self.mock_meal.protein,
                carbohydrates=self.mock_meal.carbs,
                fats=self.mock_meal.fat,
                sugar=self.mock_meal.sugar,
                fiber=self.mock_meal.fiber,
                timestamp=self.mock_meal.timestamp
            )
        ]
        
        self.assertEqual(len(expected_response), 1)
        self.assertEqual(expected_response[0].meal_name, "Test Meal")
        self.assertEqual(expected_response[0].calories, 500)
    
    def test_daily_nutrients_endpoint(self):

        
        mock_daily_meals = [
            mock.MagicMock(calories=300, protein=20, carbs=30, fat=10, sugar=5, fiber=3),
            mock.MagicMock(calories=400, protein=25, carbs=45, fat=12, sugar=8, fiber=4)
        ]
        
        expected_totals = {
            "calories": sum(meal.calories for meal in mock_daily_meals),
            "protein": sum(meal.protein for meal in mock_daily_meals),
            "carbs": sum(meal.carbs for meal in mock_daily_meals),
            "fats": sum(meal.fat for meal in mock_daily_meals),
            "sugar": sum(meal.sugar for meal in mock_daily_meals),
            "fiber": sum(meal.fiber for meal in mock_daily_meals)
        }
        
        self.assertEqual(expected_totals["calories"], 700)
        self.assertEqual(expected_totals["protein"], 45)
        self.assertEqual(expected_totals["carbs"], 75)
        self.assertEqual(expected_totals["fats"], 22)
        self.assertEqual(expected_totals["sugar"], 13)
        self.assertEqual(expected_totals["fiber"], 7)


if __name__ == '__main__':
    unittest.main() 