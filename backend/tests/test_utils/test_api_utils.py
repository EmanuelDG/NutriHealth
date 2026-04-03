import unittest
from unittest import mock
import sys
import os
import json
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils import api_utils

class TestApiUtils(unittest.TestCase):

    def setUp(self):
        self.patcher_requests = mock.patch('utils.api_utils.requests')
        self.mock_requests = self.patcher_requests.start()
        
        self.mock_response = mock.MagicMock()
        self.mock_response.status_code = 200
        self.mock_response.json.return_value = {
            "success": True,
            "data": {
                "id": 123,
                "name": "Test Data"
            }
        }
        self.mock_requests.post.return_value = self.mock_response
        self.mock_requests.get.return_value = self.mock_response
    
    def tearDown(self):
        self.patcher_requests.stop()
    
    def test_external_api_call_formatting(self):
        endpoint = "https://api.example.com/data"
        data = {"query": "test", "limit": 10}
        
        formatted_request = api_utils.format_api_request(endpoint, data)
        
        self.assertEqual(formatted_request["url"], endpoint)
        self.assertIn("Content-Type", formatted_request["headers"])
        self.assertEqual(formatted_request["headers"]["Content-Type"], "application/json")
        self.assertIn("Accept", formatted_request["headers"])
        
        parsed_data = json.loads(formatted_request["data"])
        self.assertEqual(parsed_data["query"], "test")
        self.assertEqual(parsed_data["limit"], 10)
        
        custom_headers = {
            "Authorization": "Bearer token123",
            "X-Custom-Header": "Custom Value"
        }
        
        formatted_request = api_utils.format_api_request(endpoint, data, custom_headers)
        
        self.assertEqual(formatted_request["headers"]["Authorization"], "Bearer token123")
        self.assertEqual(formatted_request["headers"]["X-Custom-Header"], "Custom Value")
        
        self.assertEqual(formatted_request["headers"]["Content-Type"], "application/json")
    
    def test_response_parsing(self):
        response_data = {
            "success": True,
            "data": {
                "id": 123,
                "name": "Test Data",
                "values": [1, 2, 3]
            }
        }
        
        mock_response = mock.MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = response_data
        
        parsed_data = api_utils.parse_api_response(mock_response)
        
        self.assertTrue(parsed_data["success"])
        self.assertEqual(parsed_data["data"]["id"], 123)
        self.assertEqual(parsed_data["data"]["name"], "Test Data")
        self.assertEqual(parsed_data["data"]["values"], [1, 2, 3])
        
        parsed_data = api_utils.parse_api_response(response_data)
        
        self.assertTrue(parsed_data["success"])
        self.assertEqual(parsed_data["data"]["id"], 123)
        
        expected_fields = ["success", "data"]
        parsed_data = api_utils.parse_api_response(response_data, expected_fields)
        
        self.assertTrue(parsed_data["success"])
        
        expected_fields = ["success", "data", "missing_field"]
        with self.assertRaises(ValueError):
            api_utils.parse_api_response(response_data, expected_fields)
        
        mock_response.status_code = 404
        with self.assertRaises(ValueError):
            api_utils.parse_api_response(mock_response)


if __name__ == '__main__':
    unittest.main() 