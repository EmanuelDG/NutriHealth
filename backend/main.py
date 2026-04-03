from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from typing import Dict, Any

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Adaptive Dietary Recommendation API",
    description="API for the Adaptive Dietary Recommendation App",
    version="1.0.0"
)

# Get environment mode and port
ENV_MODE = os.getenv("ENVIRONMENT", "development")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

# Define frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# CORS settings
if ENV_MODE == "development":
    print("Running in DEVELOPMENT mode with permissive CORS")
    # In development mode, allow all origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*", FRONTEND_URL, "http://localhost:3000"],  # Allow any origin in development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Length", "Content-Type"],
        max_age=600,  # Preflight requests can be cached for 10 minutes
    )
else:
    # In production, use specific origins
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", FRONTEND_URL).split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "Access-Control-Request-Method", "Access-Control-Request-Headers"],
        expose_headers=["Content-Length", "Content-Type"],
        max_age=600,  # Preflight requests can be cached for 10 minutes
    )
    print(f"Running in PRODUCTION mode with restricted CORS: {ALLOWED_ORIGINS}")

# Add privacy middleware
from middleware.privacy_middleware import add_privacy_middleware
add_privacy_middleware(app)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the Adaptive Dietary Recommendation API"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Import routes
from routes import auth_routes, health_routes, user_routes, meal_routes, recommendation_routes, exercise_routes, water_routes, future_insight_routes
app.include_router(auth_routes.router)
app.include_router(health_routes.router)
app.include_router(user_routes.router)
app.include_router(meal_routes.router)
app.include_router(recommendation_routes.router)
app.include_router(exercise_routes.router)
app.include_router(water_routes.router)
app.include_router(future_insight_routes.router)

# SQLAlchemy middleware
@app.middleware("http")
async def db_session_middleware(request, call_next):
    response = await call_next(request)
    return response

from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

# custom response middleware
@app.middleware("http")
async def custom_response_middleware(request, call_next):
    response = await call_next(request)
    if isinstance(response, JSONResponse):
        content = response.body
        try:
            if hasattr(content, "__dict__"):
                response.body = jsonable_encoder(content)
        except Exception:
            pass
    return response

if __name__ == "__main__":
    import uvicorn
    
 
    if ENV_MODE == "production":
        # run with HTTPS in production
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=int(os.getenv("PORT", str(BACKEND_PORT))),
            ssl_keyfile=os.getenv("SSL_KEYFILE"),
            ssl_certfile=os.getenv("SSL_CERTFILE")
        )
    else:
        # run without HTTPS in development
        uvicorn.run("main:app", host="0.0.0.0", port=BACKEND_PORT, reload=True) 