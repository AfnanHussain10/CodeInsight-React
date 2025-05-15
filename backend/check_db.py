import sqlite3

def has_updated_at_column(table_name):
    with sqlite3.connect("app.db") as conn:
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = [row[1] for row in cursor.fetchall()]  # row[1] is the column name
        return 'updated_at' in columns

if __name__ == "__main__":
    tables_to_check = ["documentation", "documentation_sections"]
    for table in tables_to_check:
        has_column = has_updated_at_column(table)
        print(f"Table '{table}' has 'updated_at' column: {has_column}")
