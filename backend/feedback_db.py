import sqlite3

def create_feedback_db():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()

    # Create the feedback table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        path TEXT NOT NULL,
        level TEXT CHECK(level IN ('file', 'folder', 'project')) NOT NULL,
        feedback TEXT NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Run this function to create the database and table
create_feedback_db()
