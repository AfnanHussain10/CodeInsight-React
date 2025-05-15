import os
import sqlite3
from groq import Groq
from dotenv import load_dotenv
from sections_extractor import extract_all_sections_for_files

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

# Path to your DB file (update as needed)
DB_PATH = "settings.db"
# Default prompt templates (fallback if no DB prompt is found)
default_section_formats = {
    "folder_overview": """### 1. Overview and Purpose

**Folder Overview**
[Provide a comprehensive summary that:
- Describes the folder's primary functionality
- Explains how it fits into the larger system
- Highlights key features and capabilities]

**Purpose and Scope**
[Define:
- The folder's main responsibilities
- Core problems it solves
- Target users/consumers of this code
- Boundaries and limitations]""",

    "folder_key_functions": """### 2. Key Functions

**Core Functionality**
[List and describe the most important functions/classes, including:
- Function signatures with parameter types and return values
- Pre/post conditions
- Error handling
- Performance characteristics
- Threading/concurrency considerations]

**Function Categories**
[Group related functions by:
- Data processing
- Business logic
- Utility functions
- API endpoints
- etc.]""",

    "folder_architecture": """### 3. Architecture

**Design Patterns**
[Document:
- Architectural patterns used
- Design principles followed
- Class hierarchies
- Component interactions]

**Technical Decisions**
[Explain:
- Key architectural choices
- Trade-offs made
- Performance considerations
- Scalability approach]""",

    "folder_inter_rs": """### 4. Inter-File Relationships

**Component Dependencies**
[Map out:
- File dependencies and import hierarchy
- Data flow between components
- Shared resources
- Integration points]

**Communication Patterns**
[Detail:
- Inter-module communication
- Event handling
- State management
- Resource sharing]""",

    "folder_dependencies": """### 5. Dependencies and External Calls

**External Dependencies**
[List:
- Required libraries and versions
- External services
- System requirements
- Configuration dependencies]

**Integration Points**
[Document:
- API calls
- Database interactions
- File system operations
- Network communications]""",

    "folder_examples": """### 6. Code Snippets and Examples

**Common Use Cases**
[Provide:
- Complete, runnable examples
- Expected inputs and outputs
- Error handling examples
- Configuration examples]

**Integration Examples**
[Show:
- How to use with other components
- Common patterns
- Best practices
- Performance optimization examples]"""
}

sections_mappings = {"folder_overview":"Overview and Purpose",
                     "folder_key_functions": "Key Functions",
                     "folder_architecture": "Architecture",
                     "folder_inter_rs": "Inter-File Relationships",
                     "folder_dependencies": "Dependencies and External Calls",
                     "folder_examples": "Code Snippets and Examples"}

def get_prompts_from_db():
    """Fetch all prompts from the database with keys matching those in default_section_formats."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Fetch prompts for keys that match the default_section_formats keys
    cursor.execute("SELECT key, value FROM settings WHERE key IN ({})".format(
        ', '.join(['?'] * len(default_section_formats))
    ), list(default_section_formats.keys()))
    
    rows = cursor.fetchall()
    prompts = {row['key']: row['value'] for row in rows}
    conn.close()
    return prompts

# Function to combine subfolder documentation sections into a single string
def combine_folder_documentation(subfolder_docs):
    combined_doc = ""
    for section, content in subfolder_docs.items():
        combined_doc += f"\n{content}\n\n"  # Add section heading and content
    return combined_doc

def generate_folder_level_documentation(folder_path, file_documentation, subfolder_documentation, folder_level_model):
    # Extract sections from files and subfolders (if provided)
    if file_documentation is not None:
        file_documentation = extract_all_sections_for_files(file_documentation)

    if subfolder_documentation is not None:
        subfolder_documentation = extract_all_sections_for_files(subfolder_documentation)
        print(f"Subfolder Found!: {folder_path}")

    # Fetch prompts from the DB. These are expected to have keys like "folder_overview", etc.
    db_prompts = get_prompts_from_db()

    # Build the final section formats by checking if a prompt exists in the DB.
    section_formats = {}
    for section, default_prompt in default_section_formats.items():
        section_formats[section] = db_prompts.get(section, default_prompt)

    # Helper function to format documentation summaries from the extracted sections
    def format_summaries(documentation_dict, section_name, doc_type="File"):
        if not documentation_dict:
            return f"No {doc_type.lower()} documentation available."
        return "\n".join([
            f"{doc_type}: {path}\n{sections_mappings[section_name]}: {content}"
            for path, content in documentation_dict[sections_mappings[section_name]].items()
        ])

    def create_base_prompt(folder_path, section_name, section_format, file_summaries, subfolder_summaries):
        return f"""You are a technical documentation expert creating comprehensive folder-level documentation. Your task is to synthesize information from multiple files and subfolders into cohesive, accurate documentation.

Key Requirements:
- Focus on factual information derived directly from the provided documentation
- Maintain consistent terminology across sections
- Highlight relationships and dependencies between components
- Use clear, precise language without speculation
- Include only information that is explicitly present in the source documentation

Context:
Folder Path: {folder_path}
Section: {section_name}

Files Documentation:
{file_summaries}
{"Subfolders Documentation:" if subfolder_summaries else ""}
{subfolder_summaries}

Output Format:
{section_format}

Guidelines:
1. Synthesize information across all files and subfolders to create a unified narrative
2. Preserve technical accuracy and specificity from source documentation
3. Highlight common patterns and relationships
4. Use consistent terminology throughout
5. Format code examples with proper syntax highlighting
6. Include cross-references between related components"""

    try:
        # Generate prompt messages for each section
        prompts = {}
        for section_name, section_format in section_formats.items():
            file_summaries = format_summaries(file_documentation, section_name)
            subfolder_summaries = format_summaries(subfolder_documentation, section_name, "Subfolder") if subfolder_documentation else ""
            
            base_prompt = create_base_prompt(
                folder_path=folder_path,
                section_name=section_name,
                section_format=section_format,
                file_summaries=file_summaries,
                subfolder_summaries=subfolder_summaries
            )
            
            prompts[section_name] = [
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": f"Generate the {section_name} section for {folder_path}, focusing on accuracy and clarity. Include only information that is explicitly present in the source documentation."}
            ]

        # Generate documentation for each section using the Groq client
        responses = {}
        for section in section_formats.keys():
            try:
                response = client.chat.completions.create(
                    model=folder_level_model, 
                    messages=prompts[section]
                )
                responses[section] = response
            except Exception as e:
                print(f"Error generating documentation for section {section}: {str(e)}")
                responses[section] = None

        # Compile the responses into a single documentation string
        folder_documentation = {}
        for section, response in responses.items():
            if response is not None:
                folder_documentation[section] = response.choices[0].message.content
            else:
                folder_documentation[section] = f"Error generating documentation for {section}"

        return combine_folder_documentation(folder_documentation),prompts,folder_documentation

    except Exception as e:
        print(f"Error processing folder {folder_path}: {str(e)}")
        return f"Error generating documentation: {str(e)}"