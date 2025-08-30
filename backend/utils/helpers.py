import json
from datetime import datetime

def format_datetime(dt):
    """Format a datetime object to ISO format."""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

def parse_json(json_str):
    """Parse a JSON string into a Python object."""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return None

def validate_request_data(data, required_fields):
    """
    Validate that the request data contains all required fields.
    
    Args:
        data (dict): The request data to validate
        required_fields (list): List of field names that must be present
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not data:
        return False, "No data provided"
    
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    return True, None
