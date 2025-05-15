import sqlite3

with sqlite3.connect("app.db") as conn:
        # Add project_vectors table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS project_vectors (
                id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                is_vectorized BOOLEAN DEFAULT 0,
                vector_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(project_name, user_id)
            )
        """)
        
        # Add chat_history table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                project_name TEXT NOT NULL,
                messages TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)