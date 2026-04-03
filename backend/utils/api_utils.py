import requests
import json
from typing import Dict, Any, Optional, List, Union

def format_api_request(endpoint: str, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:

    default_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    request_headers = {**default_headers, **(headers or {})}
    
    formatted_request = {
        "url": endpoint,
        "headers": request_headers,
        "data": json.dumps(data)
    }
    
    return formatted_request

def parse_api_response(response: Union[object, Dict[str, Any]], expected_fields: List[str] = None) -> Dict[str, Any]:

    if hasattr(response, 'status_code') and hasattr(response, 'json'):
        if response.status_code != 200:
            raise ValueError(f"API request failed with status code {response.status_code}")
        
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            raise ValueError("Failed to parse API response as JSON")
    else:
        response_data = response
    
    if expected_fields:
        missing_fields = [field for field in expected_fields if field not in response_data]
        if missing_fields:
            raise ValueError(f"API response missing required fields: {', '.join(missing_fields)}")
    
    return response_data

def call_external_api(endpoint: str, data: Dict[str, Any], 
                     method: str = "POST", 
                     headers: Optional[Dict[str, str]] = None,
                     expected_fields: List[str] = None) -> Dict[str, Any]:

    request = format_api_request(endpoint, data, headers)
    
    try:
        if method.upper() == "GET":
            response = requests.get(request["url"], headers=request["headers"], params=data)
        else:
            response = requests.post(request["url"], headers=request["headers"], data=request["data"])
        
        return parse_api_response(response, expected_fields)
        
    except requests.RequestException as e:
        raise ValueError(f"API request failed: {str(e)}") 