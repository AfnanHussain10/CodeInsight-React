import os
import json
import re
from typing import Dict, Any, List, Optional
from groq import Groq
from dotenv import load_dotenv
from database_manager import get_documentation_db, get_evaluation_db

load_dotenv()

class DocumentationEvaluator:
    def __init__(self, model='llama3-8b-8192'):
        """
        Initialize the Documentation Evaluator
        
        Args:
            model (str): Groq model to use for evaluation
        """
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = model
        self.doc_db = get_documentation_db()
        self.eval_db = get_evaluation_db()

    def _load_file_content(self, file_path: str) -> str:
        """
        Load file content safely
        
        Args:
            file_path (str): Path to the file
        
        Returns:
            str: File content or error message
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                return file.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"

    def _get_context_documentation(self, path: str, level: str) -> Dict[str, Any]:
        """
        Retrieve context documentation based on the level
        
        Args:
            path (str): Path to evaluate
            level (str): Documentation level (file/folder/project)
        
        Returns:
            dict: Context documentation
        """
        # Retrieve documentation from the database
        doc_retrieval_methods = {
            'file': self.doc_db.get_project_documentation,
            'folder': self.doc_db.get_project_documentation,
            'project': self.doc_db.get_project_documentation
        }
        
        context = doc_retrieval_methods[level](path=path)
        return context[0] if context else {}

    def _create_evaluation_prompt(self, level: str) -> Dict[str, List[Dict[str, str]]]:
        """
        Create evaluation prompts for different documentation levels
        
        Args:
            level (str): Documentation level to evaluate
        
        Returns:
            dict: Evaluation prompt templates
        """
        evaluation_prompts = {
            'file': {
                'system_prompt': """You are an expert software documentation quality assessor. 
                Evaluate the file-level documentation and provide DETAILED SCORES (0-10) for each criterion:

                ### 1. Technical Accuracy and Completeness (0-10)
                - Verify factual correctness of technical descriptions
                - Assess comprehensiveness of function and method documentation
                - Check for accurate representation of code's purpose and functionality

                ### 2. Clarity and Readability (0-10)
                - Evaluate clarity of language and technical explanations
                - Assess logical flow and organization of documentation
                - Check for consistent terminology and professional tone

                ### 3. Code Context and Purpose (0-10)
                - Verify documentation explains the code's role in the broader system
                - Assess how well the documentation captures the code's purpose
                - Check for meaningful examples and use cases

                ### 4. Structural Quality (0-10)
                - Evaluate adherence to the specified documentation format
                - Check consistency across different sections
                - Assess depth and breadth of information in each section

                ### 5. Practical Utility (0-10)
                - Determine if documentation helps developers understand and use the code
                - Check for inclusion of important implementation details
                - Assess usefulness for onboarding and maintenance

                RESPONSE FORMAT (CRITICAL):
                - Provide a detailed evaluation
                - Include a score for EACH criterion
                - Calculate and report an OVERALL WEIGHTED SCORE
                - Explain the reasoning behind each score
                - Give specific recommendations for improvement""",
                
                'user_prompt': """Evaluate the following file-level documentation:

                Documentation to Evaluate:
                {documentation}

                Original Code Context:
                {code_context}

                Please follow the detailed evaluation and scoring format in the system prompt."""
            },
            'folder': {
                'system_prompt': """You are an expert software architecture documentation evaluator. 
                Evaluate the folder-level documentation and provide DETAILED SCORES (0-10) for each criterion:

                ### 1. Architectural Coherence (0-10)
                - Evaluate how well the documentation captures the folder's architectural role
                - Assess inter-component relationships and dependencies
                - Check for clear explanation of design patterns and structural decisions

                ### 2. Comprehensive Coverage (0-10)
                - Verify documentation covers all significant components in the folder
                - Assess depth of explanation for key functions and classes
                - Check for meaningful categorization of functionality

                ### 3. Contextual Understanding (0-10)
                - Evaluate how documentation explains the folder's place in the larger system
                - Assess clarity of inter-file and inter-component relationships
                - Check for meaningful cross-references and integration points

                ### 4. Technical Depth and Precision (0-10)
                - Verify technical accuracy of architectural descriptions
                - Assess depth of technical explanations
                - Check for inclusion of critical implementation details

                ### 5. Practical Guidance (0-10)
                - Evaluate usefulness for developers understanding the folder's structure
                - Assess quality of examples and usage guidance
                - Check for insights into development and maintenance processes

                RESPONSE FORMAT (CRITICAL):
                - Provide a detailed evaluation
                - Include a score for EACH criterion
                - Calculate and report an OVERALL WEIGHTED SCORE
                - Explain the reasoning behind each score
                - Give specific recommendations for improvement""",
                
                'user_prompt': """Evaluate the following folder-level documentation:

                Documentation to Evaluate:
                {documentation}

                Context (Files and Subfolders):
                {context_documentation}

                Analyze the documentation's effectiveness in explaining the folder's architectural and functional aspects."""
            },
            'project': {
                'system_prompt': """You are a senior technical documentation and architecture reviewer. 
                Evaluate project-level documentation and provide DETAILED SCORES (0-10) for each criterion:

                ### 1. Holistic System Understanding (0-10)
                - Assess documentation's ability to explain the entire project's purpose
                - Evaluate architectural overview and system boundaries
                - Check for clear articulation of project goals and technical vision

                ### 2. Architectural Clarity (0-10)
                - Verify comprehensive explanation of technical infrastructure
                - Assess documentation of technology stack and design principles
                - Check for insights into system design and component interactions

                ### 3. Strategic and Technical Depth (0-10)
                - Evaluate depth of technical and strategic documentation
                - Assess coverage of development workflows and standards
                - Check for meaningful discussion of project requirements and constraints

                ### 4. Comprehensive Dependency Management (0-10)
                - Verify documentation of technical and integration dependencies
                - Assess explanation of external service interactions
                - Check for clear environmental and system requirements

                ### 5. Developer Enablement (0-10)
                - Evaluate documentation's effectiveness for onboarding
                - Assess practical guidance for development and maintenance
                - Check for inclusion of setup instructions and common workflows

                RESPONSE FORMAT (CRITICAL):
                - Provide a detailed evaluation
                - Include a score for EACH criterion
                - Calculate and report an OVERALL WEIGHTED SCORE
                - Explain the reasoning behind each score
                - Give specific recommendations for improvement""",
                
                'user_prompt': """Evaluate the following project-level documentation:

                Documentation to Evaluate:
                {documentation}

                Project Context (Root Files and Folders Documentation):
                {context_documentation}

                Analyze the documentation's effectiveness in explaining the project's architecture, purpose, and strategic vision."""
            }
        }
        
        return evaluation_prompts[level]

    def evaluate_documentation(
        self, 
        path: str, 
        level: str, 
        documentation: Optional[str] = None, 
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate documentation at different levels
        
        Args:
            path (str): Path to the documentation source
            level (str): Documentation level (file/folder/project)
            documentation (str, optional): Pre-existing documentation
            model (str, optional): Specific model to use for evaluation
        
        Returns:
            dict: Evaluation results
        """
        # Use default model if not specified
        evaluation_model = model or self.model

        
        
        # Retrieve documentation if not provided
        if not documentation:
            doc_context = self._get_context_documentation(path, level)
            documentation = doc_context.get('documentation', '')
        
        # Retrieve context based on level
        context_strategies = {
            'file': lambda: self._load_file_content(path),
            'folder': lambda: json.dumps(self._get_context_documentation(os.path.dirname(path), 'folder')),
            'project': lambda: json.dumps(self._get_context_documentation(os.path.dirname(path), 'project'))
        }
        
        code_context = context_strategies[level]()
        
        # Get evaluation prompt
        evaluation_prompt = self._create_evaluation_prompt(level)
        
        # Prepare messages for evaluation
        messages = [
            {"role": "system", "content": evaluation_prompt['system_prompt']},
            {"role": "user", "content": evaluation_prompt['user_prompt'].format(
                documentation=documentation, 
                code_context=code_context,
                context_documentation=code_context
            )}
        ]
        
        # Generate evaluation
        try:
            response = self.client.chat.completions.create(
                model=evaluation_model,
                messages=messages,
                max_tokens=4000
            )
            
            evaluation_content = response.choices[0].message.content
            
            # Calculate detailed scores
            score_breakdown = self._calculate_overall_score(evaluation_content)
            
            # Prepare evaluation result
            evaluation_result = {
                "evaluation": evaluation_content,
                "criteria_scores": score_breakdown['criteria_scores'],
                "overall_score": score_breakdown['overall_score'],
                "path": path,
                "level": level,
                "model": evaluation_model
            }
            
            # Store evaluation in database
            self.eval_db.store_evaluation(
                path=path, 
                evaluation=evaluation_result,
                overall_score=score_breakdown['overall_score'],
                criteria=list(self._create_evaluation_prompt(level)['system_prompt'].split('### ')[1:]),
                model=evaluation_model
            )
            
            return evaluation_result
        
        except Exception as e:
            print(f"Evaluation error: {str(e)}")
            return {"error": str(e)}

    def _calculate_overall_score(self, evaluation_text: str) -> Dict[str, Any]:
        """
        Calculate overall score from evaluation text
        
        Args:
            evaluation_text (str): Evaluation content
        
        Returns:
            dict: Calculated scores
        """
        def extract_score(criterion: str) -> float:
            # Use regex to find scores for each criterion
            pattern = rf"{criterion}\s*\(0-10\).*?:?\s*(\d+(?:\.\d+)?)"
            match = re.search(pattern, evaluation_text, re.DOTALL | re.IGNORECASE)
            return float(match.group(1)) if match else 5.0

        criteria_by_level = {
            'file': [
                "Technical Accuracy and Completeness", 
                "Clarity and Readability", 
                "Code Context and Purpose", 
                "Structural Quality", 
                "Practical Utility"
            ],
            'folder': [
                "Architectural Coherence",
                "Comprehensive Coverage",
                "Contextual Understanding",
                "Technical Depth and Precision",
                "Practical Guidance"
            ],
            'project': [
                "Holistic System Understanding",
                "Architectural Clarity",
                "Strategic and Technical Depth",
                "Comprehensive Dependency Management",
                "Developer Enablement"
            ]
        }

        # Dynamically select criteria based on evaluation context
        criteria = criteria_by_level.get('file', [])  # Default to file-level if not determined
        
        # Extract individual criterion scores
        scores = {criterion: extract_score(criterion) for criterion in criteria}
        
        # Calculate weighted overall score
        default_weights = {
            "Technical Accuracy and Completeness": 0.3,
            "Clarity and Readability": 0.2,
            "Code Context and Purpose": 0.2,
            "Structural Quality": 0.15,
            "Practical Utility": 0.15
        }
        
        overall_score = sum(scores.get(criterion, 5.0) * default_weights.get(criterion, 0.2) for criterion in criteria)
        
        return {
            "criteria_scores": scores,
            "overall_score": overall_score
        }
