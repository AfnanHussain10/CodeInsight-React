import csv
import sqlite3
from datetime import datetime
import os
from contextlib import contextmanager
import traceback

@contextmanager
def get_database_connection(db_path="app.db"):
    """Helper function to get a database connection with Row factory"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def export_documentation_sections_to_csv(output_path=None, db_path="app.db"):
    """
    Standalone function to export all documentation sections to a CSV file.
    
    Args:
        output_path: Optional path for the CSV file. If None, generates a timestamped filename.
        db_path: Path to the SQLite database file (default: "app.db")
        
    Returns:
        The path to the exported CSV file
    """
    # Generate output filename if not provided
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"documentation_sections_{timestamp}.csv"
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    
    # Define CSV headers
    headers = [
        "Documentation ID", 
        "Project Name", 
        "Path", 
        "Level", 
        "User Email", 
        "Doc Created At",
        "Section ID", 
        "Section Name", 
        "Section Content", 
        "Prompt Used", 
        "Section Created At"
    ]
    
    try:
        # Connect to database and fetch data
        with get_database_connection(db_path) as conn:
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
            
        # Write data to CSV
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            
            # Process each documentation and its sections
            for doc in docs:
                doc_dict = dict(doc)
                
                with get_database_connection(db_path) as conn:
                    # Get sections for this documentation
                    sections = conn.execute(
                        '''
                        SELECT id, documentation_id, section_name, section_content, prompt_used, created_at
                        FROM documentation_sections
                        WHERE documentation_id = ?
                        ORDER BY id
                        ''',
                        (doc_dict['id'],)
                    ).fetchall()
                
                doc_base = [
                    doc_dict['id'],
                    doc_dict['project_name'],
                    doc_dict['path'],
                    doc_dict['level'],
                    doc_dict['user_email'],
                    doc_dict['created_at']
                ]
                
                if not sections:
                    # Write a row with empty section data if no sections
                    writer.writerow(doc_base + ['', '', '', '', ''])
                else:
                    # Write a row for each section
                    for section in sections:
                        section_data = [
                            section['id'],
                            section['section_name'],
                            section['section_content'],
                            section['prompt_used'],
                            section['created_at']
                        ]
                        writer.writerow(doc_base + section_data)
        
        print(f"CSV export completed: {output_path}")
        return output_path
    
    except Exception as e:
        print(f"Error exporting to CSV: {str(e)}")
        traceback.print_exc()
        raise

if __name__ == "__main__":
    # Example usage as a standalone script
    try:
        output_file = export_documentation_sections_to_csv()
        print(f"Documentation sections exported to: {output_file}")
    except Exception as e:
        print(f"Export failed: {str(e)}")