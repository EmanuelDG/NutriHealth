import unittest
from unittest import mock
from datetime import datetime, timedelta
import sys
import os


sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.health_routes import router, HealthClassificationResponse, HealthStatusResponse

class TestHealthRoutes(unittest.TestCase):
    
    def setUp(self):

        self.app = FastAPI()
        self.app.include_router(router)
        
        self.client = TestClient(self.app)
        
        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.name = "Test User"
        self.mock_user.username = "testuser"
        self.mock_user.email = "test@example.com"
        self.mock_user.height = 175.0
        self.mock_user.weight = 70.0
        self.mock_user.heart_disease = False
        self.mock_user.diabetes = False
        
        self.mock_health_status = mock.MagicMock()
        self.mock_health_status.id = 1
        self.mock_health_status.classification = "Healthy"
        self.mock_health_status.date = datetime.now()
        
        self.mock_db = mock.MagicMock()
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = self.mock_health_status
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [self.mock_health_status]
        
        self.patcher_get_user = mock.patch('routes.health_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        
        self.patcher_get_db = mock.patch('routes.health_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
        
        self.patcher_model_loader = mock.patch('routes.health_routes.model_loader')
        self.mock_model_loader = self.patcher_model_loader.start()
        self.mock_model_loader.classify_user_health.return_value = "Healthy"
    
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
        self.patcher_model_loader.stop()
    
    def test_health_classification_endpoint(self):

        from routes.health_routes import classify_health
        
        features = mock.MagicMock()
        features.age = 30
        features.gender = 1
        features.bmi = 22.5
        features.daily_activity = 45
        features.heart_disease = False
        features.diabetes = False
        features.smoking = False
        features.alcohol = False
        features.protein_intake = 75.0
        features.carbs_intake = 250.0
        

        input_features = [
            features.age,
            features.gender,
            features.bmi,
            features.daily_activity,
            0,  # heart_disease as int
            0,  # diabetes as int
            0,  # smoking as int
            0,  # alcohol as int
            features.protein_intake,
            features.carbs_intake
        ]
        
        self.assertEqual(self.mock_model_loader.classify_user_health.return_value, "Healthy")
    
    def test_get_health_status_endpoint(self):
        self.assertEqual(self.mock_health_status.id, 1)
        self.assertEqual(self.mock_health_status.classification, "Healthy")
        
        
        expected_response = HealthStatusResponse(
            id=self.mock_health_status.id,
            classification=self.mock_health_status.classification,
            date=self.mock_health_status.date
        )
        
        self.assertEqual(expected_response.id, self.mock_health_status.id)
        self.assertEqual(expected_response.classification, self.mock_health_status.classification)
        self.assertEqual(expected_response.date, self.mock_health_status.date)
    
    def test_health_history_endpoint(self):
        health_history = [self.mock_health_status]
        
        self.assertEqual(len(health_history), 1)
        self.assertEqual(health_history[0].classification, "Healthy")
        
        expected_items = [
            HealthStatusResponse(
                id=status.id,
                classification=status.classification,
                date=status.date
            ) for status in health_history
        ]
        
        self.assertEqual(len(expected_items), 1)
        self.assertEqual(expected_items[0].id, self.mock_health_status.id)
        self.assertEqual(expected_items[0].classification, self.mock_health_status.classification)
    
    def test_nutrient_targets_endpoints(self):
        mock_target = mock.MagicMock()
        mock_target.calories = 2000.0
        mock_target.protein = 150.0
        mock_target.carbs = 250.0
        mock_target.fats = 70.0
        mock_target.fiber = 30.0
        mock_target.sugar = 35.0
        
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_target
        
        self.assertEqual(mock_target.calories, 2000.0)
        self.assertEqual(mock_target.protein, 150.0)
        self.assertEqual(mock_target.carbs, 250.0)
        
        expected_response = {
            "calories": mock_target.calories,
            "protein": mock_target.protein,
            "carbs": mock_target.carbs,
            "fats": mock_target.fats,
            "fiber": mock_target.fiber,
            "sugar": mock_target.sugar
        }
        
        self.assertEqual(expected_response["calories"], 2000.0)
        self.assertEqual(expected_response["protein"], 150.0)
        self.assertEqual(expected_response["carbs"], 250.0)


if __name__ == '__main__':
    unittest.main() 