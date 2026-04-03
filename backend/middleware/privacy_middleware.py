from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Dict, List
import logging
import json
import time
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("privacy_middleware")


class PrivacyMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, 
        app,
        sensitive_fields: List[str] = None,
        exempt_paths: List[str] = None
    ):
        super().__init__(app)
        # Fields that are considered sensitive and handled specially
        self.sensitive_fields = sensitive_fields or [
            "password", "medical_history", "health_data", "heart_disease", 
            "diabetes", "family_history", "smoking", "alcohol", 
            "email", "phone", "address", "date_of_birth"
        ]
        # Paths that don't require GDPR notices (like static files, health checks)
        self.exempt_paths = exempt_paths or [
            "/health", "/docs", "/redoc", "/openapi.json", "/static", "/"
        ]
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if request path is exempt from privacy controls
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # Add GDPR-related headers to all responses
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Add privacy headers
        response.headers["X-Privacy-Policy"] = "/privacy-policy"
        response.headers["X-Data-Processing-Time"] = str(process_time)
        
        # Log access for GDPR audit trail (excluding sensitive paths)
        if not request.url.path.startswith(("/auth", "/health")):
            self._log_data_access(request)
            
        return response
    
    # Log API access
    def _log_data_access(self, request: Request):
        try:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "client_ip": self._get_client_ip(request),
                "method": request.method,
                "path": request.url.path,
                "user_agent": request.headers.get("user-agent", "Not provided")
            }
            
            # Get authenticated user if available
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                log_entry["auth"] = "Bearer token provided (details redacted)"
            
            logger.info(f"Data Access: {json.dumps(log_entry)}")
            
        except Exception as e:
            logger.error(f"Error logging data access: {str(e)}")
    
    # Get IP safely
    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Get the first IP in case of multiple proxies
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "Unknown"


# Minimize sensitive data
class DataMinimizationMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, 
        app,
        sensitive_fields: List[str] = None,
        redaction_method: str = "remove"  
    ):
        super().__init__(app)
        # Fields to minimize in responses
        self.sensitive_fields = sensitive_fields or [
            "medical_history", "family_history", "smoking", "alcohol", 
            "password", "ssn", "credit_card", "ip_address"
        ]
        self.redaction_method = redaction_method
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Process the request normally
        response = await call_next(request)
        
        try:
            # Skip binary responses or responses that don't need processing
            if (
                not response.headers.get("content-type") or
                "application/json" not in response.headers.get("content-type", "")
                or request.url.path.startswith(("/health", "/docs", "/redoc", "/static"))
                or not hasattr(response, "body") 
                or not response.body
            ):
                return response
                
            logger.info(f"Data minimization applied to response for {request.url.path}")
        except Exception as e:
            logger.error(f"Error in data minimization middleware: {str(e)}")
        
        return response


# Configure privacy middleware
def setup_privacy_middleware(app):
    # Add privacy middleware
    app.add_middleware(
        PrivacyMiddleware,
        sensitive_fields=[
            "password", "medical_history", "health_data", "heart_disease", 
            "diabetes", "family_history", "smoking", "alcohol", 
            "email", "phone", "address", "date_of_birth"
        ],
        exempt_paths=["/health", "/docs", "/redoc", "/openapi.json", "/static", "/"]
    )
    
    # Add data minimization middleware
    app.add_middleware(
        DataMinimizationMiddleware,
        sensitive_fields=[
            "medical_history", "family_history", "smoking", "alcohol", 
            "password", "ssn", "credit_card", "ip_address"
        ]
    )

# Add privacy middleware
def add_privacy_middleware(app):
    return setup_privacy_middleware(app)

# Get privacy settings
async def get_user_privacy_preferences(user_id: int):

    return {
        "marketing_emails": False,
        "data_analytics": False,
        "third_party_sharing": False,
        "personalized_recommendations": True,
        "health_data_processing": True
    }

# Check user consent
async def user_has_consented(user_id: int, consent_type: str):
    default_consents = {
        "marketing": False,
        "data_analytics": False,
        "third_party_sharing": False,
        "personalized_recommendations": True,
        "health_data_processing": True
    }
    return default_consents.get(consent_type, False) 