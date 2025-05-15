import sqlite3

def get_db_connection():
    conn = sqlite3.connect("settings.db")
    conn.row_factory = sqlite3.Row  # Enables column access by name
    return conn

def initialize_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create settings table
    conn.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create trigger for updating updated_at
    conn.execute("""
            CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
            AFTER UPDATE ON settings
            BEGIN
                UPDATE settings SET updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;
        """)

    conn.commit()
    conn.close()
    print("Database initialized successfully!")

# Example usage
if __name__ == "__main__":
    initialize_db()