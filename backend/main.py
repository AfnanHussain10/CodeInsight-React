from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks, Depends,Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict
import os
import shutil
import asyncio
from datetime import datetime, timedelta
import sqlite3
from pydantic import BaseModel
import bcrypt
import uuid
from contextlib import contextmanager
from langchain_groq import ChatGroq
from langchain_ollama import OllamaEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain_community.vectorstores import FAISS
from pydantic import BaseModel
import traceback
import json
import pickle
# Import existing modules
from hierarchy_manager import generate_documentation
from documentation_evaluator import DocumentationEvaluator
from chat_routes import router as chat_router
from typing import Literal

app = FastAPI()
app.include_router(chat_router)
security = HTTPBearer()
VECTOR_STORE_DIR = "./vector_stores"
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

def get_vector_store_path(project_name: str, user_id: str) -> str:
    return os.path.join(VECTOR_STORE_DIR, f"{user_id}_{project_name}")



# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

# Database initialization with admin user
def init_db():
    with sqlite3.connect("app.db") as conn:
        # Create users table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create sessions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Create documentation table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documentation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                path TEXT NOT NULL,
                doc TEXT NOT NULL,
                project_name TEXT NOT NULL,
                level TEXT NOT NULL,
                root_path TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added updated_at
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        conn.execute("""CREATE TABLE IF NOT EXISTS documentation_sections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    documentation_id INTEGER NOT NULL,
                    section_name TEXT NOT NULL,
                    section_content TEXT NOT NULL,
                    prompt_used TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added updated_at
                    FOREIGN KEY (documentation_id) REFERENCES documentation(id)
                );""")
        
        # Create chat tables
        conn.execute("""
            CREATE TABLE IF NOT EXISTS project_vectors (
                id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                is_vectorized INTEGER DEFAULT 0,
                vector_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_name, user_id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                project_name TEXT NOT NULL,
                messages TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Create section feedback table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS section_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                documentation_id INTEGER NOT NULL,
                section_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                feedback TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (documentation_id) REFERENCES documentation(id),
                FOREIGN KEY (section_id) REFERENCES documentation_sections(id),
                UNIQUE(user_id, section_id)
            )
        """)

init_db()

@contextmanager
def get_app_db():
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Auth models
class UserSignup(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# Section feedback model
class SectionFeedback(BaseModel):
    documentation_id: int
    section_id: int
    rating: int
    feedback: Optional[str] = None

# Auth helper functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def create_session(user_id: str) -> str:
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    with get_app_db() as conn:
        conn.execute(
            "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
            (session_id, user_id, expires_at.isoformat())
        )
        conn.commit()
    
    return session_id

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
    
class FeedbackCreate(BaseModel):
    user_id: str
    documentation_id: int
    section_id: int
    rating: int
    feedback: Optional[str] = None
    
# Pydantic model for feedback status response
class FeedbackStatusResponse(BaseModel):
    section_ids: List[int]

class FeedbackStatusFileResponse(BaseModel):
    has_feedback: bool

# Endpoint to check feedback status
@app.get("/feedback-status", response_model=FeedbackStatusResponse)
async def get_feedback_status(user_id: str = Query(...), documentation_id: int = Query(...)):
    try:
        with sqlite3.connect("app.db") as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT section_id FROM section_feedback WHERE user_id = ? AND documentation_id = ?",
                (user_id, documentation_id)
            )
            rows = cursor.fetchall()
            section_ids = [row["section_id"] for row in rows]
            return {"section_ids": section_ids}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Section feedback endpoints
@app.post("/api/section-feedback")
async def add_section_feedback(
    feedback: SectionFeedback,
    current_user: dict = Depends(get_current_user)
):
    """
    Add feedback for a specific documentation section
    """
    try:
        # Validate rating
        if not 1 <= feedback.rating <= 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
            
        with get_app_db() as conn:
            # Check if documentation and section exist
            doc = conn.execute(
                'SELECT id FROM documentation WHERE id = ?',
                (feedback.documentation_id,)
            ).fetchone()
            
            if not doc:
                raise HTTPException(status_code=404, detail="Documentation not found")
                
            section = conn.execute(
                'SELECT id FROM documentation_sections WHERE id = ? AND documentation_id = ?',
                (feedback.section_id, feedback.documentation_id)
            ).fetchone()
            
            if not section:
                raise HTTPException(status_code=404, detail="Section not found")
                
            # Check if user already submitted feedback for this section
            existing = conn.execute(
                'SELECT id FROM section_feedback WHERE user_id = ? AND section_id = ?',
                (current_user['id'], feedback.section_id)
            ).fetchone()
            
            if existing:
                # Update existing feedback
                conn.execute(
                    '''
                    UPDATE section_feedback 
                    SET rating = ?, feedback = ?, created_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND section_id = ?
                    ''',
                    (feedback.rating, feedback.feedback, current_user['id'], feedback.section_id)
                )
            else:
                # Insert new feedback
                conn.execute(
                    '''
                    INSERT INTO section_feedback 
                    (user_id, documentation_id, section_id, rating, feedback)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (current_user['id'], feedback.documentation_id, feedback.section_id, 
                     feedback.rating, feedback.feedback)
                )
                
            conn.commit()
            
            return {"message": "Feedback submitted successfully"}
            
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/section-feedback/{section_id}")
async def get_section_feedback(
    section_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get feedback for a specific section
    """
    try:
        with get_app_db() as conn:
            # Get user's feedback for this section
            feedback = conn.execute(
                '''
                SELECT * FROM section_feedback
                WHERE section_id = ? AND user_id = ?
                ''',
                (section_id, current_user['id'])
            ).fetchone()
            
            if not feedback:
                return {"has_feedback": False}
                
            return {
                "has_feedback": True,
                "rating": feedback['rating'],
                "feedback": feedback['feedback'],
                "created_at": feedback['created_at']
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/section-feedback")
async def get_all_section_feedback(
    current_user: dict = Depends(get_current_user)
):
    """
    Admin endpoint to get all section feedback
    """
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    try:
        with get_app_db() as conn:
            feedback = conn.execute(
                '''
                SELECT sf.*, 
                       u.email as user_email,
                       ds.section_name,
                       d.project_name
                FROM section_feedback sf
                JOIN users u ON sf.user_id = u.id
                JOIN documentation_sections ds ON sf.section_id = ds.id
                JOIN documentation d ON sf.documentation_id = d.id
                ORDER BY sf.created_at DESC
                '''
            ).fetchall()
            
            return [dict(row) for row in feedback]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/section-feedback/{feedback_id}")
async def delete_section_feedback(
    feedback_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Admin endpoint to delete section feedback
    """
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    try:
        with get_app_db() as conn:
            result = conn.execute(
                'DELETE FROM section_feedback WHERE id = ?',
                (feedback_id,)
            )
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Feedback not found")
                
            conn.commit()
            
            return {"message": "Feedback deleted successfully"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documentation/id")
async def get_documentation_id(
    path: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get documentation ID by path
    """
    try:
        conn = sqlite3.connect('app.db')
        conn.row_factory = sqlite3.Row # Ensure row_factory is set for dict-like access
        cursor = conn.cursor() # cursor might not be needed if using conn.execute directly with row_factory
        # Ensure the documentation belongs to the current user
        doc = conn.execute(
                'SELECT id, level FROM documentation WHERE path = ? AND user_id = ?',
                (path, current_user['id'])
            ).fetchone()
            
        if not doc:
                raise HTTPException(status_code=404, detail="Documentation not found")
        if not doc:
            raise HTTPException(status_code=404, detail="Documentation not found or access denied for the current user.")
        # print(doc) # Optional: remove or use proper logging
        return {"id": doc['id'], "level": doc['level']}
            
    except sqlite3.Error as e:
        # It's good practice to close the connection in a finally block
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'conn' in locals() and conn: # Check if conn was defined
            conn.close()

class DocumentationUpdate(BaseModel):
    doc_content: str

@app.put("/api/documentation/{documentation_id}")
async def update_documentation_content(
    documentation_id: int,
    payload: DocumentationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the main content of a documentation entry.
    """
    try:
        with get_app_db() as conn:
            # Check if documentation exists and belongs to the user
            doc = conn.execute(
                'SELECT id FROM documentation WHERE id = ? AND user_id = ?',
                (documentation_id, current_user['id'])
            ).fetchone()

            if not doc:
                raise HTTPException(status_code=404, detail="Documentation not found or access denied")

            conn.execute(
                'UPDATE documentation SET doc = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (payload.doc_content, documentation_id)
            )
            conn.commit()
            return {"message": "Documentation updated successfully"}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SectionContentUpdate(BaseModel):
    section_content: str

@app.put("/api/documentation/sections/{section_id}")
async def update_section_content(
    section_id: int,
    payload: SectionContentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the content of a specific documentation section.
    """
    try:
        with get_app_db() as conn:
            # Check if section exists and its parent documentation belongs to the user
            section = conn.execute(
                '''
                SELECT ds.id 
                FROM documentation_sections ds
                JOIN documentation d ON ds.documentation_id = d.id
                WHERE ds.id = ? AND d.user_id = ?
                ''',
                (section_id, current_user['id'])
            ).fetchone()

            if not section:
                raise HTTPException(status_code=404, detail="Section not found or access denied")

            conn.execute(
                'UPDATE documentation_sections SET section_content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (payload.section_content, section_id)
            )
            conn.commit()
            return {"message": "Section updated successfully"}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/admin/documentation-sections")
async def get_all_documentation_sections(
    current_user: dict = Depends(get_current_user)
):
    """
    Admin endpoint to get all documentation sections with their parent documentation details,
    only returning documentation that has at least one section
    """
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    try:
        with get_app_db() as conn:
            # Get only documentation that has sections
            docs = conn.execute(
                '''
                SELECT DISTINCT d.id, d.user_id, d.path, d.project_name, d.level, d.created_at,
                       u.email as user_email
                FROM documentation d
                JOIN users u ON d.user_id = u.id
                JOIN documentation_sections ds ON d.id = ds.documentation_id
                ORDER BY d.created_at DESC
                '''
            ).fetchall()
            
            result = []
            
            # For each documentation, get its sections
            for doc in docs:
                doc_dict = dict(doc)
                
                sections = conn.execute(
                    '''
                    SELECT id, documentation_id, section_name, section_content, prompt_used, created_at
                    FROM documentation_sections
                    WHERE documentation_id = ?
                    ORDER BY id
                    ''',
                    (doc['id'],)
                ).fetchall()
                
                doc_dict['sections'] = [dict(section) for section in sections]
                result.append(doc_dict)
                
            return result
            
    except Exception as e:
        print(f"Error fetching documentation sections: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documentation/sections/{documentation_id}")
async def get_documentation_sections(
    documentation_id: int
):
    """
    Get sections for a specific documentation
    """
    try:
        with get_app_db() as conn:
                
            sections = conn.execute(
                '''
                SELECT id, section_name, section_content, prompt_used, created_at
                FROM documentation_sections
                WHERE documentation_id = ?
                ORDER BY id
                ''',
                (documentation_id,)
            ).fetchall()
            
            return [dict(row) for row in sections]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    with get_app_db() as conn:
        cursor = conn.execute("""
            SELECT u.id, u.email, u.is_admin, u.created_at,
                   MAX(s.created_at) as last_sign_in_at
            FROM users u
            LEFT JOIN sessions s ON u.id = s.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        """)
        users = [dict(row) for row in cursor.fetchall()]
        return users

@app.put("/api/admin/users/{user_id}/toggle-admin")
async def toggle_admin_status(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    with get_app_db() as conn:
        # Get current admin status
        cursor = conn.execute(
            "SELECT is_admin FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Toggle admin status
        new_status = not bool(user['is_admin'])
        conn.execute(
            "UPDATE users SET is_admin = ? WHERE id = ?",
            (int(new_status), user_id)
        )
        conn.commit()
        
        return {"success": True, "is_admin": new_status}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    with get_app_db() as conn:
        # Check if user exists
        cursor = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
            
        # Delete user's sessions
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        
        # Delete user's documentation
        conn.execute("DELETE FROM documentation WHERE user_id = ?", (user_id,))
        
        # Delete user
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        
        return {"message": "User deleted successfully"}

@app.get("/api/admin/documentation")
async def get_all_documentation(current_user: dict = Depends(get_current_user)):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    with get_app_db() as conn:
        cursor = conn.execute("""
            SELECT d.id, d.user_id, d.path, d.project_name, d.created_at,
                   u.email as user_email
            FROM documentation d
            JOIN users u ON d.user_id = u.id
            WHERE d.level = 'project'
            ORDER BY d.created_at DESC
        """)
        docs = [
            {
                **dict(row),
                'user': {'email': row['user_email']}
            }
            for row in cursor.fetchall()
        ]
        return docs

@app.get("/api/admin/documentation/{doc_id}")
async def get_documentation_by_id(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    with get_app_db() as conn:
        cursor = conn.execute("""
            SELECT d.*, u.email as user_email
            FROM documentation d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
        """, (doc_id,))
        doc = cursor.fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Documentation not found")
            
        return {
            **dict(doc),
            'user': {'email': doc['user_email']}
        }
@app.delete("/api/documentation/{doc_id}")
async def delete_documentation(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    with get_app_db() as conn:
        # Check if documentation exists and user has permission
        cursor = conn.execute(
            "SELECT user_id FROM documentation WHERE id = ?",
            (doc_id,)
        )
        doc = cursor.fetchone()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Documentation not found")
            
        if not current_user['is_admin'] and doc['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this documentation")
            
        # Delete documentation
        conn.execute("DELETE FROM documentation WHERE id = ?", (doc_id,))
        conn.commit()
        
        return {"message": "Documentation deleted successfully"}

@app.delete("/api/documentation/project/{project_name}")
async def delete_project_documentation(
    project_name: str,
    current_user: dict = Depends(get_current_user)
):
    with get_app_db() as conn:
        # Check if project exists and user has permission
        cursor = conn.execute(
            "SELECT user_id FROM documentation WHERE project_name = ? LIMIT 1",
            (project_name,)
        )
        project = cursor.fetchone()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        if not current_user['is_admin'] and project['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this project")
            
        # Delete all documentation for the project
        conn.execute("DELETE FROM documentation WHERE project_name = ?", (project_name,))
        conn.commit()
        
        return {"message": "Project deleted successfully"}
   
# Auth endpoints
@app.post("/api/auth/signup")
async def signup(user: UserSignup):
    with get_app_db() as conn:
        # Check if user exists
        existing_user = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            (user.email,)
        ).fetchone()
        
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # Create new user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(user.password)
        
        conn.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            (user_id, user.email, password_hash)
        )
        conn.commit()
        
        # Create session
        session_id = create_session(user_id)
        
        return {
            "session_id": session_id,
            "user": {
                "id": user_id,
                "email": user.email,
                "is_admin": False
            }
        }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    with get_app_db() as conn:
        db_user = conn.execute(
            "SELECT id, email, password_hash, is_admin FROM users WHERE email = ?",
            (user.email,)
        ).fetchone()
        
        if not db_user or not verify_password(user.password, db_user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Create session
        session_id = create_session(db_user["id"])
        
        return {
            "session_id": session_id,
            "user": {
                "id": db_user["id"],
                "email": db_user["email"],
                "is_admin": bool(db_user["is_admin"])
            }
        }

@app.post("/api/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    session_id = credentials.credentials
    
    with get_app_db() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
    
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/create-admin")
async def create_admin():
    admin_email = "admin@codeinsight.com"
    admin_password = "admin123"
    
    with get_db() as conn:
        # Check if admin exists
        existing_admin = conn.execute(
            "SELECT id FROM users WHERE email = ? AND is_admin = 1",
            (admin_email,)
        ).fetchone()
        
        if existing_admin:
            return {"message": "Admin already exists"}
        
        # Create admin user
        admin_id = str(uuid.uuid4())
        password_hash = hash_password(admin_password)
        
        conn.execute(
            "INSERT INTO users (id, email, password_hash, is_admin) VALUES (?, ?, ?, 1)",
            (admin_id, admin_email, password_hash)
        )
        conn.commit()
        
        return {"message": "Admin created successfully"}

def get_db():
    conn = sqlite3.connect("settings.db")
    conn.row_factory = sqlite3.Row
    return conn

# Global state for tracking generation progress
generation_status: Dict[str, dict] = {}

UPLOAD_DIRECTORY = "./uploaded_projects"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# Modified progress key generation
def get_progress_key(project_name: str) -> str:
    # Remove any path components from the project name
    clean_project_name = os.path.basename(project_name)
    return f"{clean_project_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

# Modified status tracking
generation_status: Dict[str, dict] = {}

async def generate_docs_background(
    user_id:str,
    progress_key: str,
    root_path: str,
    project_name: str,
    selected_items: List[str],
    file_model: str,
    folder_model: str,
    project_model: str
):
    try:
        # Initialize status with more detailed information
        generation_status[progress_key] = {
            "status": "in_progress",
            "progress": 0,
            "current_step": "Initializing documentation process...",
            "error": None,
            "project_name": project_name,
            "start_time": datetime.now().isoformat()
        }
        # Project Analysis
        generation_status[progress_key].update({
            "progress": 20,
            "current_step": "Analyzing project structure..."
        })
        
        await asyncio.sleep(2)
        # Documentation Generation
        generation_status[progress_key].update({
            "progress": 40,
            "current_step": "Generating documentation..."
        })
        print("Starting documentation generation")
        await asyncio.sleep(1) 
        # Actual documentation generation
        try:
            documentation = generate_documentation(
                user_id=user_id,
                root_path=root_path,
                project_name=project_name,
                selected_items=selected_items,
                file_model=file_model,
                folder_model=folder_model,
                project_model=project_model
            )
            print("finished documentation generation, documentation:",documentation)
        except Exception as e:
            print(f"Error in generate_documentation: {str(e)}")
            raise

        # Completion
        generation_status[progress_key].update({
            "status": "completed",
            "progress": 100,
            "current_step": "Documentation generated successfully!",
            "completion_time": datetime.now().isoformat()
        })

    except Exception as e:
        generation_status[progress_key].update({
            "status": "failed",
            "error": str(e),
            "current_step": "Generation failed",
            "failure_time": datetime.now().isoformat()
        })
        raise

@app.post("/api/generate")
async def generate_docs(
    body: dict,
    background_tasks: BackgroundTasks
):
    # Validate required fields
    required_fields = ['user_id','project_name', 'root_path', 'selected_items', 'file_model', 'folder_model', 'project_model']
    for field in required_fields:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    progress_key = get_progress_key(body['project_name'])
    
    background_tasks.add_task(
        generate_docs_background,
        user_id=body['user_id'],
        progress_key=progress_key,
        root_path=body['root_path'],
        project_name=body['project_name'],
        selected_items=body['selected_items'],
        file_model=body['file_model'],
        folder_model=body['folder_model'],
        project_model=body['project_model']
    )
    
    return {"progress_key": progress_key}

@app.get("/api/generate/status/{progress_key}")
async def get_generation_status(progress_key: str):
    if progress_key not in generation_status:
        raise HTTPException(
            status_code=404, 
            detail={
                "message": "Generation task not found",
                "progress_key": progress_key,
                "available_keys": list(generation_status.keys())
            }
        )
    
    return generation_status[progress_key]

# Add a cleanup route for completed generations
@app.delete("/api/generate/status/{progress_key}")
async def cleanup_generation_status(progress_key: str):
    if progress_key in generation_status:
        del generation_status[progress_key]
        return {"message": "Status cleared successfully"}
    raise HTTPException(status_code=404, detail="Generation task not found")
# Temporary upload directory
UPLOAD_DIRECTORY = "./uploaded_projects"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

def fetch_documentation(path):
    """
    Fetch documentation from SQLite database
    """
    try:
        conn = sqlite3.connect('app.db')
        cursor = conn.cursor()
        cursor.execute('SELECT doc FROM documentation WHERE path = ?', (path,))
        result = cursor.fetchone()

        conn.close()
        return result[0] if result else "Documentation not found."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def fetch_evaluation(path, level, model=None):
    """
    Fetch or generate documentation evaluation
    """
    try:
        evaluator = DocumentationEvaluator()
        # Determine documentation level
        if path.endswith('_evaluation'):
            original_path = path.replace('_evaluation', '')
            
            
            # Determine level based on path
            path_parts = original_path.split(os.sep)  # Split the path into parts using the separator
            print(path_parts[0],path_parts[1],path_parts[2])
            print(len(path_parts))

            if os.path.isfile(original_path):
                level = 'file'
            elif os.path.isdir(original_path):
                # Check if it's the third level after 'upload'
                if len(path_parts) == 3:  
                    level = 'project'
                    
                else:
                    level = 'folder'
            print(level)
            # Fetch corresponding documentation
            documentation = fetch_documentation(original_path)
            
            # Perform evaluation with optional model
            evaluation = evaluator.evaluate_documentation(
                documentation=documentation, 
                path=original_path,
                level=level,
                model=model
            )
            
            return evaluation
        
    except Exception as e:
        return {
            "error": f"Error fetching evaluation: {str(e)}",
            "path": path
        }

@app.post("/api/upload")
async def upload_project(
    files: List[UploadFile] = File(...), 
    project_name: str = Form(...)
):
    """
    Handle project file uploads
    """
    project_path = os.path.join(UPLOAD_DIRECTORY, project_name)
    os.makedirs(project_path, exist_ok=True)
    
    try:
        for file in files:
            # Preserve file structure
            file_path = os.path.join(project_path, file.filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Save uploaded file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        return {"message": "Project uploaded successfully", "path": project_path}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/documentation")
async def get_documentation(path: str):
    """
    Retrieve documentation for a specific path
    """
    try:
        documentation = fetch_documentation(path)
        return documentation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Add new endpoint to get all documentation projects
@app.get("/api/documentation/projects")
async def get_documentation_projects(current_user: dict = Depends(get_current_user)):
    with sqlite3.connect("app.db") as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("""
            SELECT DISTINCT project_name, created_at, root_path
            FROM documentation
            WHERE user_id = ? AND level = 'project'
            ORDER BY created_at DESC
        """, (current_user['id'],))
        
        projects = [dict(row) for row in cursor.fetchall()]
        return projects

# Add endpoint to get documentation by project name
@app.get("/api/documentation/project/{project_name}")
async def get_project_documentation(
    project_name: str,
    current_user: dict = Depends(get_current_user)
):
    with sqlite3.connect("app.db") as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("""
            SELECT id, path, doc, created_at
            FROM documentation
            WHERE user_id = ? AND project_name = ?
            ORDER BY path
        """, (current_user['id'], project_name))
        
        docs = [dict(row) for row in cursor.fetchall()]
        if not docs:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return docs

@app.get("/api/evaluation")
async def get_evaluation(path: str, level:str, model: Optional[str] = None):
    """
    Retrieve or generate documentation evaluation
    """
    try:
        evaluation = fetch_evaluation(path, level, model)
        print(evaluation)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/file-structure/{project_name}")
async def get_file_structure(project_name: str):
    """
    Get the file structure for a specific project
    """
    try:
        project_path = os.path.join(UPLOAD_DIRECTORY, project_name)
        if not os.path.exists(project_path):
            raise HTTPException(status_code=404, detail="Project not found")
            
        def build_tree(path):
            tree = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                if os.path.isdir(item_path):
                    tree.append({
                        "name": item,
                        "path": item_path,
                        "type": "folder",
                        "children": build_tree(item_path)
                    })
                else:
                    tree.append({
                        "name": item,
                        "path": item_path,
                        "type": "file"
                    })
            return tree
            
        file_structure = build_tree(project_path)
        return file_structure
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Utility function to execute database queries
def execute_query(query: str, params: tuple = (), fetchall: bool = False):
    try:
        conn = sqlite3.connect("feedback.db")
        cursor = conn.cursor()
        cursor.execute(query, params)
        if fetchall:
            result = cursor.fetchall()
        else:
            conn.commit()
            result = cursor.lastrowid
        conn.close()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
class FeedbackCreate(BaseModel):
    user_id: str
    path: str
    level: str
    rating: int
    feedback: str | None = None

@app.get("/api/feedback-status-level", response_model=FeedbackStatusFileResponse)
async def get_feedback_status(user_id: str = Query(...), path: str = Query(...), level: str = Query(...)):
    if level not in ["file", "folder", "project"]:
        raise HTTPException(status_code=400, detail="Invalid level")
    
    try:
        with sqlite3.connect("app.db") as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM feedback WHERE user_id = ? AND path = ? AND level = ?",
                (user_id, path, level)
            )
            result = cursor.fetchone()
            has_feedback = result["count"] > 0
            return {"has_feedback": has_feedback}
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@app.post("/api/feedback")
async def add_feedback(feedback: FeedbackCreate):
    """
    API to add user feedback.
    """
    try:
        if not feedback.path or not feedback.level or feedback.rating is None:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        if feedback.level not in ["file", "folder", "project"]:
            raise HTTPException(status_code=400, detail="Invalid level")
        
        if not (1 <= feedback.rating <= 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

        with sqlite3.connect("app.db") as conn:
            cursor = conn.cursor()
            query = '''
            INSERT INTO feedback (user_id, path, level, feedback, rating) 
            VALUES (?, ?, ?, ?, ?)
            '''
            cursor.execute(query, (feedback.user_id, feedback.path, feedback.level, feedback.feedback, feedback.rating))
            conn.commit()
            
            return JSONResponse(
                content={"message": "Feedback added successfully"},
                status_code=201
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rating format")
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/admin/feedback")
async def get_all_feedback(current_user: dict = Depends(get_current_user)):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
        
    
    cursor = conn.execute("""
            SELECT f.*, u.email as user_email, d.doc as documentation
            FROM feedback f
            JOIN users u ON f.user_id = u.id
            LEFT JOIN documentation d ON f.path = d.path
            ORDER BY f.timestamp DESC
        """)
    feedback = [dict(row) for row in cursor.fetchall()]
    return feedback   

@app.delete("/api/admin/feedback/{feedback_id}")
async def delete_feedback(
    feedback_id: int,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
        
    with sqlite3.connect('app.db') as conn:
        cursor = conn.execute(
            "DELETE FROM feedback WHERE id = ?",
            (feedback_id,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
            
        conn.commit()
        
        return {"message": "Feedback deleted successfully"}


# Database path
DB_PATH = "settings.db"

class Setting(BaseModel):
    key: str
    value: str
    category: str
    description: str | None = None

class SettingResponse(Setting):
    id: int

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@app.get("/api/settings", response_model=List[SettingResponse])
async def get_settings():
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM settings ORDER BY key")
        return [dict(row) for row in cursor.fetchall()]

@app.get("/api/settings/{setting_id}", response_model=SettingResponse)
async def get_setting(setting_id: int):
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM settings WHERE id = ?", (setting_id,))
        setting = cursor.fetchone()
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        return dict(setting)

@app.post("/api/settings", response_model=SettingResponse)
async def create_setting(setting: Setting):
    if setting.category not in ['general', 'prompt', 'models', 'rlhf']:
        raise HTTPException(status_code=400, detail="Category must be either 'general' or 'prompt'")
    
    with get_db() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO settings (key, value, category, description)
                VALUES (?, ?, ?, ?)
                """,
                (setting.key, setting.value, setting.category, setting.description)
            )
            conn.commit()
            
            # Get the created setting
            created = conn.execute(
                "SELECT * FROM settings WHERE id = ?", 
                (cursor.lastrowid,)
            ).fetchone()
            return dict(created)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=400,
                detail="A setting with this key already exists"
            )

@app.put("/api/settings/{setting_id}", response_model=SettingResponse)
async def update_setting(setting_id: int, setting: Setting):
    if setting.category not in ['general', 'prompt', 'models', 'rlhf']:
        raise HTTPException(status_code=400, detail="Category must be either 'general' or 'prompt'")
    
    with get_db() as conn:
        try:
            cursor = conn.execute(
                """
                UPDATE settings 
                SET key = ?, value = ?, category = ?, description = ?
                WHERE id = ?
                """,
                (setting.key, setting.value, setting.category, setting.description, setting_id)
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Setting not found")
            conn.commit()
            
            # Get the updated setting
            updated = conn.execute(
                "SELECT * FROM settings WHERE id = ?", 
                (setting_id,)
            ).fetchone()
            return dict(updated)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=400,
                detail="A setting with this key already exists"
            )

@app.delete("/api/settings/{setting_id}")
async def delete_setting(setting_id: int):
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM settings WHERE id = ?", (setting_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Setting not found")
        conn.commit()
        return {"message": "Setting deleted successfully"}
    



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)