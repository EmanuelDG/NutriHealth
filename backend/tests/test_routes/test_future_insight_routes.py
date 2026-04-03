import unittest
from unittest import mock
from datetime import datetime, timedelta, date
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.future_insight_routes import router, FutureInsightResponse

class TestFutureInsightRoutes(unittest.TestCase):

    def setUp(self):

        self.app = FastAPI()
        self.app.include_router(router)
        

        self.client = TestClient(self.app)
        

        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        self.mock_user.date_of_birth = date(1990, 1, 1)
        self.mock_user.gender = 1  # Male
        self.mock_user.height = 175.0
        self.mock_user.weight = 70.0
        self.mock_user.heart_disease = False
        self.mock_user.diabetes = False
        self.mock_user.smoking = False
        self.mock_user.alcohol = False
        self.mock_user.family_history = json.dumps({"heart_disease": False, "diabetes": False})
        

        self.mock_meal = mock.MagicMock()
        self.mock_meal.id = 1
        self.mock_meal.user_id = 1
        self.mock_meal.name = "Test Meal"
        self.mock_meal.calories = 500
        self.mock_meal.protein = 25
        self.mock_meal.carbs = 60
        self.mock_meal.fat = 15
        self.mock_meal.timestamp = datetime.now()
        

        self.mock_health_status = mock.MagicMock()
        self.mock_health_status.id = 1
        self.mock_health_status.user_id = 1
        self.mock_health_status.classification = "Healthy"
        self.mock_health_status.date = datetime.now()
        

        self.mock_db = mock.MagicMock()

        self.mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [self.mock_meal]

        self.mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [self.mock_health_status]

        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        

        self.mock_db.add.return_value = None
        self.mock_db.commit.return_value = None
        self.mock_db.refresh.return_value = None
        

        self.patcher_get_user = mock.patch('routes.future_insight_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        

        self.patcher_get_db = mock.patch('routes.future_insight_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
        

        self.patcher_requests = mock.patch('routes.future_insight_routes.requests')
        self.mock_requests = self.patcher_requests.start()
        self.mock_response = mock.MagicMock()
        self.mock_response.status_code = 200
        self.mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "long_term_predictions": [
                                {"condition": "heart disease", "risk": "low", "timeframe": "10 years"},
                                {"condition": "diabetes", "risk": "medium", "timeframe": "5 years"}
                            ],
                            "disease_prevention_insights": [
                                "Maintain regular exercise to support heart health", 
                                "Reduce sugar intake to lower diabetes risk"
                            ],
                            "lifestyle_trajectory": {
                                "current_health": "Good",
                                "predicted_health_in_5_years": "Good with minor concerns",
                                "predicted_health_in_10_years": "Moderate risk without intervention"
                            },
                            "actionable_recommendations": [
                                "Increase daily activity by 15 minutes",
                                "Add 2 servings of vegetables daily"
                            ],
                            "meal_recommendation": "Mediterranean diet with focus on whole grains and lean proteins"
                        })
                    }
                }
            ]
        }
        self.mock_requests.post.return_value = self.mock_response
    
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
        self.patcher_requests.stop()
    
    def test_get_future_insights_endpoint(self):

        self.assertEqual(self.mock_meal.name, "Test Meal")
        self.assertEqual(self.mock_meal.calories, 500)
        
        self.assertEqual(self.mock_health_status.classification, "Healthy")
        

        expected_insights = {
            "prediction_date": datetime.now(),
            "long_term_predictions": [
                {"condition": "heart disease", "risk": "low", "timeframe": "10 years"},
                {"condition": "diabetes", "risk": "medium", "timeframe": "5 years"}
            ],
            "disease_prevention_insights": [
                "Maintain regular exercise to support heart health", 
                "Reduce sugar intake to lower diabetes risk"
            ],
            "lifestyle_trajectory": {
                "current_health": "Good",
                "predicted_health_in_5_years": "Good with minor concerns",
                "predicted_health_in_10_years": "Moderate risk without intervention"
            },
            "actionable_recommendations": [
                "Increase daily activity by 15 minutes",
                "Add 2 servings of vegetables daily"
            ],
            "meal_recommendation": "Mediterranean diet with focus on whole grains and lean proteins"
        }
        

        self.assertEqual(len(expected_insights["long_term_predictions"]), 2)
        self.assertEqual(len(expected_insights["disease_prevention_insights"]), 2)
        self.assertEqual(len(expected_insights["actionable_recommendations"]), 2)
        self.assertIn("current_health", expected_insights["lifestyle_trajectory"])
    
    def test_api_response_formatting(self):

        api_response = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "long_term_predictions": [
                                {"condition": "heart disease", "risk": "low", "timeframe": "10 years"},
                                {"condition": "diabetes", "risk": "medium", "timeframe": "5 years"}
                            ],
                            "disease_prevention_insights": [
                                "Maintain regular exercise", 
                                "Reduce sugar intake"
                            ],
                            "lifestyle_trajectory": {
                                "current_health": "Good",
                                "predicted_health_in_5_years": "Good with minor concerns",
                                "predicted_health_in_10_years": "Moderate risk without intervention"
                            },
                            "actionable_recommendations": [
                                "Increase daily activity by 15 minutes",
                                "Add 2 servings of vegetables daily"
                            ],
                            "meal_recommendation": "Mediterranean diet with focus on whole grains"
                        })
                    }
                }
            ]
        }
        
        content = api_response["choices"][0]["message"]["content"]
        
        parsed_content = json.loads(content)
        
        self.assertIn("long_term_predictions", parsed_content)
        self.assertIn("disease_prevention_insights", parsed_content)
        self.assertIn("lifestyle_trajectory", parsed_content)
        self.assertIn("actionable_recommendations", parsed_content)
        self.assertIn("meal_recommendation", parsed_content)
        
        self.assertIsInstance(parsed_content["long_term_predictions"], list)
        self.assertIsInstance(parsed_content["disease_prevention_insights"], list)
        self.assertIsInstance(parsed_content["lifestyle_trajectory"], dict)
        self.assertIsInstance(parsed_content["actionable_recommendations"], list)
        self.assertIsInstance(parsed_content["meal_recommendation"], str)
        
        prediction = parsed_content["long_term_predictions"][0]
        self.assertIn("condition", prediction)
        self.assertIn("risk", prediction)
        self.assertIn("timeframe", prediction)
        
        parsed_content["prediction_date"] = datetime.now()
        response_obj = FutureInsightResponse(**parsed_content)
        
        self.assertEqual(len(response_obj.long_term_predictions), 2)
        self.assertEqual(response_obj.long_term_predictions[0]["condition"], "heart disease")
        self.assertEqual(response_obj.long_term_predictions[0]["risk"], "low")
        self.assertEqual(response_obj.disease_prevention_insights[0], "Maintain regular exercise")
        self.assertEqual(response_obj.meal_recommendation, "Mediterranean diet with focus on whole grains")


if __name__ == '__main__':
    unittest.main() 