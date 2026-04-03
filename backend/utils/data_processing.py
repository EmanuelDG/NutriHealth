import json
import re
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, date

def transform_dates_to_string(data: Dict[str, Any]) -> Dict[str, Any]:
    transformed_data = {}
    
    for key, value in data.items():
        if isinstance(value, (datetime, date)):
            transformed_data[key] = value.isoformat()
        elif isinstance(value, dict):
            transformed_data[key] = transform_dates_to_string(value)
        elif isinstance(value, list):
            transformed_data[key] = [
                transform_dates_to_string(item) if isinstance(item, dict) 
                else item.isoformat() if isinstance(item, (datetime, date))
                else item
                for item in value
            ]
        else:
            transformed_data[key] = value
            
    return transformed_data

def transform_keys_to_snake_case(data: Dict[str, Any]) -> Dict[str, Any]:
    transformed_data = {}
    
    for key, value in data.items():
        snake_key = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', key).lower()
        
        if isinstance(value, dict):
            transformed_data[snake_key] = transform_keys_to_snake_case(value)
        elif isinstance(value, list):
            transformed_data[snake_key] = [
                transform_keys_to_snake_case(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            transformed_data[snake_key] = value
    return transformed_data

def validate_numeric_fields(data: Dict[str, Any], 
                           numeric_fields: List[str], 
                           min_values: Optional[Dict[str, float]] = None,
                           max_values: Optional[Dict[str, float]] = None) -> List[str]:
    errors = []
    
    min_values = min_values or {}
    max_values = max_values or {}
    
    for field in numeric_fields:
        if field not in data:
            continue
            
        value = data[field]
        
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            errors.append(f"Field '{field}' must be numeric, got {type(value).__name__}")
            continue
            
        if field in min_values and value < min_values[field]:
            errors.append(f"Field '{field}' value {value} is less than minimum {min_values[field]}")
            
        if field in max_values and value > max_values[field]:
            errors.append(f"Field '{field}' value {value} is greater than maximum {max_values[field]}")
            
    return errors

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
    errors = []
    
    for field in required_fields:
        if field not in data:
            errors.append(f"Required field '{field}' is missing")
        elif data[field] is None:
            errors.append(f"Required field '{field}' cannot be None")
            
    return errors 