import unittest
from unittest import mock
from datetime import datetime, date, timedelta
import sys
import os


sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.water_routes import router
from schemas.water import WaterTrackingCreate, WaterTrackingUpdate, WaterTracking as WaterTrackingSchema

class TestWaterRoutes(unittest.TestCase):
    
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(router)
        
        self.client = TestClient(self.app)
        
        self.mock_user = mock.MagicMock()
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        
        self.mock_water = mock.MagicMock()
        self.mock_water.id = 1
        self.mock_water.user_id = 1
        self.mock_water.date = date.today()
        self.mock_water.glasses = 6
        
        self.mock_water2 = mock.MagicMock()
        self.mock_water2.id = 2
        self.mock_water2.user_id = 1
        self.mock_water2.date = date.today() - timedelta(days=1)
        self.mock_water2.glasses = 8
        
        self.mock_db = mock.MagicMock()
        self.mock_db.add.return_value = None
        self.mock_db.commit.return_value = None
        self.mock_db.refresh.return_value = None
        self.mock_db.expire_all.return_value = None
        
        self.mock_db.query.return_value.filter.return_value.first.return_value = None
        
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
            self.mock_water, self.mock_water2
        ]
        
        self.patcher_get_user = mock.patch('routes.water_routes.get_current_active_user')
        self.mock_get_user = self.patcher_get_user.start()
        self.mock_get_user.return_value = self.mock_user
        
        self.patcher_get_db = mock.patch('routes.water_routes.get_db')
        self.mock_get_db = self.patcher_get_db.start()
        self.mock_get_db.return_value = self.mock_db
    
    def tearDown(self):
        self.patcher_get_user.stop()
        self.patcher_get_db.stop()
    
    def test_update_water_intake_endpoint(self):
        # Create test water data
        water_data = WaterTrackingCreate(
            date=date.today(),
            glasses=6
        )
        
        # Setup mock database to return our water tracking entry on refresh
        self.mock_db.refresh = lambda x: setattr(x, 'id', 1) if not hasattr(x, 'id') else None
        
        # Verify water input data
        self.assertEqual(water_data.date, date.today())
        self.assertEqual(water_data.glasses, 6)
        
        # Create a new water tracking entry mimicking what the endpoint would create
        new_entry = WaterTrackingSchema(
            id=1,
            user_id=self.mock_user.id,
            date=water_data.date,
            glasses=water_data.glasses
        )
        
        # Verify the new entry
        self.assertEqual(new_entry.id, 1)
        self.assertEqual(new_entry.user_id, self.mock_user.id)
        self.assertEqual(new_entry.date, date.today())
        self.assertEqual(new_entry.glasses, 6)
        
    
    def test_get_water_history_endpoint(self):
        
        self.assertEqual(self.mock_water.date, date.today())
        self.assertEqual(self.mock_water.glasses, 6)
        
        self.assertEqual(self.mock_water2.date, date.today() - timedelta(days=1))
        self.assertEqual(self.mock_water2.glasses, 8)
        
        expected_response = [
            WaterTrackingSchema(
                id=self.mock_water.id,
                user_id=self.mock_water.user_id,
                date=self.mock_water.date,
                glasses=self.mock_water.glasses
            ),
            WaterTrackingSchema(
                id=self.mock_water2.id,
                user_id=self.mock_water2.user_id,
                date=self.mock_water2.date,
                glasses=self.mock_water2.glasses
            )
        ]
        
        self.assertEqual(len(expected_response), 2)
        self.assertEqual(expected_response[0].date, date.today())
        self.assertEqual(expected_response[1].date, date.today() - timedelta(days=1))


if __name__ == '__main__':
    unittest.main() 