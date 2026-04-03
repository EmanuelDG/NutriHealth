from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Dict, Any
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get HTTPS environment flag
HTTPS_ENABLED = os.getenv("ENVIRONMENT", "development") == "production"

from auth.auth_utils import (
    Token,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    verify_refresh_token
)
from database.database import get_db
from database.models import User
from schemas.auth import UserCreate, UserLogin, RefreshTokenRequest

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={401: {"description": "Unauthorized"}},
)

# Signup route
@router.post("/signup", response_model=Dict)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):

    # Check if username already exists
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create a new user with hashed password
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        username=user_data.username,
        email=user_data.email,
        phone_number=user_data.phone_number,
        hashed_password=hashed_password,
    )
    
    # Add to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "user_id": new_user.id}

# Login route
@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # Authenticate user
    user = await authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )
    
    # Create refresh token
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    # Set access token in HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=HTTPS_ENABLED,  # Only send cookie over HTTPS in production
        samesite="lax",        # Provides CSRF protection in modern browsers
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    )
    
    # Return tokens
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# Refresh token route       
@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_data: RefreshTokenRequest
):
    # Verify the refresh token
    payload = await verify_refresh_token(refresh_data.refresh_token)
    
    # Extract username
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": username},
        expires_delta=access_token_expires,
    )
    
    # Set access token in HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=HTTPS_ENABLED,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    # Return new tokens
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# Logout route
@router.post("/logout")
async def logout(response: Response):

    response.delete_cookie(
        key="access_token",
        secure=HTTPS_ENABLED,
        httponly=True,
        samesite="lax"
    )
    
    return {"message": "Successfully logged out"} 