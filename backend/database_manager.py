import os
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime

class DocumentationDatabase:
    """
    Manages storage and retrieval of documentation for code projects
    """
    def __init__(self, db_path='documentation.db'):
        """
        Initialize the documentation database
        
        Args:
            db_path (str): Path to the SQLite database file
        """
        self.db_path = db_path
        

    def _get_connection(self):
        """
        Create and return a database connection
        
        Returns:
            sqlite3.Connection: Database connection
        """
        return sqlite3.connect(self.db_path)

    def store_documentation(self, path: str, doc: str, project_name: str, model: str) -> bool:
        """
        Store documentation for a specific file or folder
        
        Args:
            path (str): Full path of the file or folder
            doc (str): Generated documentation content
            project_name (str): Name of the project
            model (str): Model used for documentation generation
        
        Returns:
            bool: Success of storage operation
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Upsert documentation (replace if exists)
            cursor.execute('''
            INSERT OR REPLACE INTO documentation 
            (path, doc, project_name, model, timestamp) 
            VALUES (?, ?, ?, ?, ?)
            ''', (
                path, 
                doc, 
                project_name, 
                model, 
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            conn.commit()
            return True
        
        except sqlite3.Error as e:
            print(f"Database storage error: {e}")
            return False
        finally:
            conn.close()

    def get_project_documentation(self, project_name: str = None, path: str = None) -> List[Dict[str, Any]]:
        """
        Retrieve documentation from the database
        
        Args:
            project_name (str, optional): Name of the project
            path (str, optional): Specific file path
        
        Returns:
            list: Documentation entries matching criteria
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Build query based on provided parameters
            query = "SELECT path, doc, project_name, model, timestamp FROM documentation WHERE 1=1"
            params = []
            
            if project_name:
                query += " AND project_name = ?"
                params.append(project_name)
            
            if path:
                query += " AND path = ?"
                params.append(path)
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            return [
                {
                    "path": row[0],
                    "documentation": row[1],
                    "project_name": row[2],
                    "model": row[3],
                    "timestamp": row[4]
                } for row in results
            ]
        
        except sqlite3.Error as e:
            print(f"Database retrieval error: {e}")
            return []
        finally:
            conn.close()

    def fetch_documentation(self, path: str) -> Optional[str]:
        """
        Fetch documentation for a specific path
        
        Args:
            path (str): Path of the file or folder
        
        Returns:
            str: Documentation content or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT doc FROM documentation WHERE path = ?', (path,))
            result = cursor.fetchone()
            
            return result[0] if result else None
        
        except sqlite3.Error as e:
            print(f"Database fetch error: {e}")
            return None
        finally:
            conn.close()

class DocumentationEvaluationDatabase:
    """
    Manages storage and retrieval of documentation evaluations
    """
    def __init__(self, db_path='documentation_evaluations.db'):
        """
        Initialize the evaluation database
        
        Args:
            db_path (str): Path to the SQLite evaluation database
        """
        self.db_path = db_path
        self._initialize_database()

    def _initialize_database(self):
        """
        Create the evaluations table if it doesn't exist
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS documentation_evaluations (
                path TEXT PRIMARY KEY,
                evaluation TEXT,
                overall_score REAL,
                criteria TEXT,
                model TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            conn.commit()
        except sqlite3.Error as e:
            print(f"Database initialization error: {e}")
        finally:
            conn.close()

    def _get_connection(self):
        """
        Create and return a database connection
        
        Returns:
            sqlite3.Connection: Database connection
        """
        return sqlite3.connect(self.db_path)

    def store_evaluation(
        self, 
        path: str, 
        evaluation: Dict[str, Any], 
        overall_score: Optional[float] = None, 
        criteria: Optional[List[str]] = None,
        model: Optional[str] = None
    ) -> bool:
        """
        Store documentation evaluation results in the database
        
        Args:
            path (str): Path of the documented file or folder
            evaluation (dict): Evaluation results to store
            overall_score (float, optional): Calculated overall score
            criteria (list, optional): Evaluation criteria used
            model (str, optional): Model used for evaluation
        
        Returns:
            bool: Success of update operation
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Calculate overall score if not provided
            if overall_score is None:
                overall_score = self._calculate_overall_score(evaluation)
            
            # Convert criteria to JSON string if provided
            criteria_str = None
            if criteria:
                import json
                criteria_str = json.dumps(criteria)
            
            # Upsert evaluation results
            cursor.execute('''
            INSERT OR REPLACE INTO documentation_evaluations 
            (path, evaluation, overall_score, criteria, model, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                path, 
                str(evaluation), 
                overall_score,
                criteria_str,
                model,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            conn.commit()
            return True
        
        except sqlite3.Error as e:
            print(f"Database update error: {e}")
            return False
        finally:
            conn.close()

    def fetch_evaluation(self, path: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve documentation evaluation for a specific path
        
        Args:
            path (str): Path of the documented file or folder
        
        Returns:
            dict or None: Evaluation results or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT evaluation, overall_score, criteria, model, timestamp FROM documentation_evaluations WHERE path = ?', 
                (path,)
            )
            result = cursor.fetchone()
            
            if result:
                # Safely convert string back to dict
                evaluation = eval(result[0]) if result[0] else {}
                
                # Convert criteria back from JSON if exists
                criteria = None
                if result[2]:
                    import json
                    criteria = json.loads(result[2])
                
                return {
                    "evaluation": evaluation,
                    "overall_score": result[1],
                    "criteria": criteria,
                    "model": result[3],
                    "timestamp": result[4]
                }
            return None
        
        except sqlite3.Error as e:
            print(f"Database fetch error: {e}")
            return None
        finally:
            conn.close()

    def _calculate_overall_score(self, evaluation_result: Dict[str, Any]) -> float:
        """
        Calculate an overall score from evaluation result
        
        Args:
            evaluation_result (dict): Evaluation result dictionary
        
        Returns:
            float: Calculated overall score
        """
        try:
            # Extract numeric scores from raw evaluation
            import re
            
            raw_evaluation = evaluation_result.get('raw_evaluation', '')
            scores = re.findall(r'(\d+)\s*-\s*Exceptional', raw_evaluation)
            
            if scores:
                return float(scores[0])
            return 0.0
        except Exception:
            return 0.0

# Utility function to create database instances
def get_documentation_db(db_path='documentation.db') -> DocumentationDatabase:
    """
    Create and return a DocumentationDatabase instance
    
    Args:
        db_path (str): Path to the documentation database
    
    Returns:
        DocumentationDatabase: Database instance
    """
    return DocumentationDatabase(db_path)

def get_evaluation_db(db_path='documentation_evaluations.db') -> DocumentationEvaluationDatabase:
    """
    Create and return a DocumentationEvaluationDatabase instance
    
    Args:
        db_path (str): Path to the evaluation database
    
    Returns:
        DocumentationEvaluationDatabase: Database instance
    """
    return DocumentationEvaluationDatabase(db_path)