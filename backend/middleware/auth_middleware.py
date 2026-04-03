from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from auth.auth_utils import get_current_user
from database.database import get_db
from database.models import User

# Get authenticated user
async def get_current_active_user(
    current_username: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Get user from database using the username from token
    user = db.query(User).filter(User.username == current_username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user 