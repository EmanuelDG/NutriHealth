import unittest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from tests.base import BaseTestCase

# Integration test for database connection
class TestDatabaseConnection(BaseTestCase):

    def test_database_connection(self):
        try:
            result = self.db.execute(text("SELECT 1"))
            row = result.fetchone()
            
            self.assertIsNotNone(row)
            self.assertEqual(row[0], 1)
            
        except SQLAlchemyError as e:
            self.fail(f"Database connection failed with error: {str(e)}")
    
    def test_session_creation_and_closing(self):
        try:
            self.db.execute(text("CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)"))
            
            self.db.execute(text("INSERT INTO test_table (id, value) VALUES (1, 'test')"))
            self.db.commit()
            
            result = self.db.execute(text("SELECT value FROM test_table WHERE id = 1"))
            row = result.fetchone()
            
            self.assertIsNotNone(row)
            self.assertEqual(row[0], 'test')
            
            self.db.close()
            
            new_db = self.TestingSessionLocal()
            result = new_db.execute(text("SELECT value FROM test_table WHERE id = 1"))
            row = result.fetchone()
            self.assertEqual(row[0], 'test')
            new_db.close()
            
        except SQLAlchemyError as e:
            self.fail(f"Session operations failed with error: {str(e)}")

if __name__ == '__main__':
    unittest.main() 