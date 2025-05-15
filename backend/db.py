import sqlite3

# Connect to SQLite database
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Execute PRAGMA command to get table structure
cursor.execute("PRAGMA table_info(documentation);")

# Fetch and display results
columns = cursor.fetchall()

# Print column details
for col in columns:
    print(col)

# Close the connection
conn.close()
