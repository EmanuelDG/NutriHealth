import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.database import get_db, Base
from database.models import User, MealLog, HealthStatus, Recommendation, ExerciseLog, WaterTracking
from main import app

class BaseTestCase(unittest.TestCase):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=cls.engine)
        
        cls.client = TestClient(app)
    
    @classmethod
    def tearDownClass(cls):
        # Drop all tables after all tests
        Base.metadata.drop_all(bind=cls.engine)
    
    def setUp(self):
        self.db = self.TestingSessionLocal()
        
        def override_get_db():
            try:
                yield self.db
            finally:
                pass
                
        app.dependency_overrides[get_db] = override_get_db
        
    def tearDown(self):
        try:
            self.db.rollback()
        except:
            pass
        self.db.close()
        
        app.dependency_overrides = {} 