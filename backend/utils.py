import os
import pathlib
import sqlite3
from contextlib import contextmanager
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Security scheme for authentication
security = HTTPBearer()

VECTOR_STORE_DIR = "./vector_stores"
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

def get_vector_store_path(project_name: str, user_id: str) -> str:
    return os.path.join(VECTOR_STORE_DIR, f"{user_id}_{project_name}")

@contextmanager
def get_app_db():
    """
    Context manager for database connections.
    Ensures connections are properly closed after use.
    
    Yields:
        sqlite3.Connection: A SQLite database connection
    """
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get the current authenticated user.
    Verifies the session and returns the user information.
    
    Args:
        credentials: HTTP authorization credentials from the request
        
    Returns:
        dict: User information if authenticated
        
    Raises:
        HTTPException: If authentication fails
    """
    session_id = credentials.credentials
    
    with get_app_db() as conn:
        # Check if session exists and is valid
        session = conn.execute(
            "SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')",
            (session_id,)
        ).fetchone()
        
        if not session:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session"
            )
        
        # Get user details
        user = conn.execute(
            "SELECT id, email, is_admin FROM users WHERE id = ?",
            (session["user_id"],)
        ).fetchone()
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )
        
        return dict(user)