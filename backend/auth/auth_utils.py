from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
import string

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
# Fallback if not provided in env
if not SECRET_KEY or len(SECRET_KEY) < 32:
    chars = string.ascii_letters + string.digits + string.punctuation
    SECRET_KEY = ''.join(secrets.choice(chars) for _ in range(64))
    print("WARNING: Using a randomly generated SECRET_KEY. Set it in your .env file for production!")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Password hashing with stronger settings
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Use secure OAuth2 scheme 
class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> Optional[str]:
        authorization = request.headers.get("Authorization")
        if authorization:
            scheme, token = authorization.split()
            if scheme.lower() == "bearer":
                return token
        
        token = request.cookies.get("access_token")
        if token:
            return token
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="auth/login")

# Token models
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    permissions: Optional[list] = None
    exp: Optional[datetime] = None

# Check password match
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Hash new password
def get_password_hash(password):
    return pwd_context.hash(password)

# Generate access token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    # Add additional security claims
    to_encode.update({"iat": datetime.utcnow()})  # Issued at
    to_encode.update({"nbf": datetime.utcnow()})  # Not valid before
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

# Create refresh token
def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    to_encode.update({"iat": datetime.utcnow()})  # Issued at
    to_encode.update({"nbf": datetime.utcnow()})  # Not valid before
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

# Get user from token
async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "access":
            raise credentials_exception
            
        username: str = payload.get("sub")
        exp = payload.get("exp")
        
        if username is None or exp is None:
            raise credentials_exception
        
        # Check token expiration
        if datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token_data = TokenData(username=username, exp=datetime.fromtimestamp(exp))
    except JWTError:
        raise credentials_exception
    
    return token_data.username

# Check refresh token
async def verify_refresh_token(refresh_token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Ensure it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
            
        # Check token expiration
        exp = payload.get("exp")
        if datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired",
            )
            
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid refresh token"
        )

# Login user
async def authenticate_user(username, password, db):
    from sqlalchemy.orm import Session
    from database.models import User
    
    # Get user from database
    user = db.query(User).filter(User.username == username).first()
    
    # Check if user exists and password is correct
    if not user or not verify_password(password, user.hashed_password):
        return False
    
    return user 