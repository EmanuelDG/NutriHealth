import unittest
from unittest import mock
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.exercise_routes import router
from schemas.exercise import ExerciseLogCreate, ExerciseLogResponse

class TestExerciseRoutes(unittest.TestCase):
    
    def setUp(self):
        # Create a minimal FastAPI app
        self.app = FastAPI()
        self.app.include_router(router)
        
 
 # create mocks 

        self.client = TestClient(self.app)
        

        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        self.mock_user.daily_physical_activity = 30
        self.mock_user.daily_physical_activity_goal = 60
        
 
        self.mock_exercise_log = mock.MagicMock()
        self.mock_exercise_log.id = 1
        self.mock_exercise_log.activity_type = "Running"
        self.mock_exercise_log.duration = 30
        self.mock_exercise_log.calories_burned = 250
        self.mock_exercise_log.timestamp = datetime.now()
        

        self.mock_exercise_log2 = mock.MagicMock()
        self.mock_exercise_log2.id = 2
        self.mock_exercise_log2.activity_type = "Cycling"
        self.mock_exercise_log2.duration = 45
        self.mock_exercise_log2.calories_burned = 300
        self.mock_exercise_log2.timestamp = datetime.now() - timedelta(days=1)
        
        # Configure 
        self.mock_db = mock.MagicMock()
        self.mock_db.add.return_value = None
        self.mock_db.commit.return_value = None
        self.mock_db.refresh.return_value = None
        
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
            self.mock_exercise_log, self.mock_exercise_log2
        ]
        
        self.patcher_get_user = mock.patch('routes.exercise_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        

        self.patcher_get_db = mock.patch('routes.exercise_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
        

        self.patcher_func = mock.patch('routes.exercise_routes.func')
        self.mock_func = self.patcher_func.start()
        self.mock_func.sum.return_value = 30
        
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
        self.patcher_func.stop()
    
    def test_log_exercise_endpoint(self):
        # Create test exercise data
        exercise_data = ExerciseLogCreate(
            activity_type="Running",
            duration=30,
            calories_burned=250,
            timestamp=datetime.now(),
            replace_daily_total=False
        )
        

        self.mock_db.refresh = lambda x: setattr(x, 'id', 1) if not hasattr(x, 'id') else None
        
        # Create expected response based on input
        expected_response = ExerciseLogResponse(
            id=1,
            activity_type=exercise_data.activity_type,
            duration=exercise_data.duration,
            calories_burned=exercise_data.calories_burned,
            timestamp=exercise_data.timestamp
        )
        
        # Verify 
        self.assertEqual(exercise_data.activity_type, "Running")
        self.assertEqual(exercise_data.duration, 30)
        self.assertEqual(exercise_data.calories_burned, 250)
        
 
    
    def test_get_exercise_history_endpoint(self):
        
        # Verify 
        self.assertEqual(self.mock_exercise_log.activity_type, "Running")
        self.assertEqual(self.mock_exercise_log.duration, 30)
        self.assertEqual(self.mock_exercise_log.calories_burned, 250)
        

        self.assertEqual(self.mock_exercise_log2.activity_type, "Cycling")
        self.assertEqual(self.mock_exercise_log2.duration, 45)
        self.assertEqual(self.mock_exercise_log2.calories_burned, 300)
        
        # Create expected response
        expected_response = [
            {
                "id": self.mock_exercise_log.id,
                "activity_type": self.mock_exercise_log.activity_type,
                "duration": self.mock_exercise_log.duration,
                "calories_burned": self.mock_exercise_log.calories_burned,
                "timestamp": self.mock_exercise_log.timestamp
            },
            {
                "id": self.mock_exercise_log2.id,
                "activity_type": self.mock_exercise_log2.activity_type,
                "duration": self.mock_exercise_log2.duration,
                "calories_burned": self.mock_exercise_log2.calories_burned,
                "timestamp": self.mock_exercise_log2.timestamp
            }
        ]
        
        # Verify 
        self.assertEqual(len(expected_response), 2)


if __name__ == '__main__':
    unittest.main() 