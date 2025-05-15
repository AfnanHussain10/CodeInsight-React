import os
import sqlite3
from groq import Groq
from dotenv import load_dotenv
from sections_extractor import extract_all_sections_for_files
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

# Path to your DB file (update as needed)
DB_PATH = "settings.db"
# Default prompt templates (fallback if no DB prompt is found)
default_section_formats = {
    "project_overview": """### 1. Project Overview

**Project Summary**
[Provide:
- Project name and purpose
- Core functionality and features
- Target users/stakeholders
- Business value and use cases]
""",

    "project_infrastructure": """### 2. Technical Infrastructure

**Development Environment**
[Document:
- Required development tools
- Build system and process
- Testing framework
- Development workflows]

**Project Architecture**
[Detail:
- High-level system architecture
- Key components and their relationships
- Technology stack
- Design principles and patterns]
""",

    "project_organization": """### 3. Component Organization

**Project Structure**
[Document:
- Directory organization
- Key folders and their purposes
- File naming conventions
- Module organization]

**Core Components**
[Detail:
- Major subsystems
- Critical services
- Shared libraries
- Utility modules]

**Integration Points**
[Specify:
- Internal component interactions
- External system interfaces
- API endpoints
- Data flow patterns]""",

    "project_dependencies": """### 4. Dependencies and Requirements

**Technical Requirements**
[List:
- System requirements
- Runtime dependencies
- External services
- Third-party libraries]

**Integration Requirements**
[Detail:
- API dependencies
- Service integrations
- Database requirements
- Authentication systems]
"""
}

sections_mappings = {"project_overview": "Project Overview",
                     "project_infrastructure": "Technical Infrastructure",
                     "project_organization": "Component Organization",
                     "project_dependencies": "Dependencies and Requirements"}

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

def combine_documentation(docs):
    """
    Combine multiple documentation sections into a single string.
    
    Args:
        docs (dict): Dictionary of documentation sections
        
    Returns:
        str: Combined documentation string
    """
    combined_doc = ""
    for section, content in docs.items():
        combined_doc += f"\n{content}\n\n"
    return combined_doc

def format_documentation_summary(documentation_dict, section_name, doc_type="File"):
    """
    Format documentation summary with improved validation and error handling.
    
    Args:
        documentation_dict (dict): Dictionary containing documentation sections
        section_name (str): Name of the section to format
        doc_type (str): Type of documentation (File or Folder)
    
    Returns:
        str: Formatted documentation summary
    """
    
    # Check if documentation_dict exists and is not empty
    if not documentation_dict:
        print(f"No {doc_type.lower()} documentation dictionary available")
        return f"No {doc_type.lower()} level documentation available."
    
    # Check if section exists in documentation
    if section_name not in documentation_dict:
        print(f"Section {section_name} not found in {doc_type.lower()} documentation")
        return f"No {doc_type.lower()} level documentation found for section: {section_name}"
    
    # Check if section has any content
    section_content = documentation_dict[section_name]
    if not section_content:
        print(f"Empty content for section {section_name} in {doc_type.lower()} documentation")
        return f"No content available for {section_name} in {doc_type.lower()} documentation."
    
    # Format the documentation
    formatted_docs = []
    for path, content in section_content.items():
        if content and content.strip():  # Check if content exists and is not just whitespace
            formatted_docs.append(f"{doc_type}: {path}\n{content.strip()}")
    
    # Return formatted content or no content message
    if formatted_docs:
        return "\n\n".join(formatted_docs)
    else:
        return f"No valid content found for {section_name} in {doc_type.lower()} documentation."

def map_extracted_to_formal_sections(extracted_documentation):
    """
    Maps extracted folder documentation sections to formal project documentation sections.
    
    Args:
        extracted_documentation (dict): Dictionary containing extracted documentation sections
        
    Returns:
        dict: Mapped documentation with formal section names
    """
    # Define mapping between extracted and formal section names
    section_mapping = {
        'Overview and Purpose': 'project_overview',
        'Key Functions': 'project_overview',
        'Architecture': 'project_infrastructure',
        'Inter-File Relationships': 'project_organization',
        'Dependencies and External Calls': 'project_dependencies',
        'Code Snippets and Examples': 'project_infrastructure'
    }
    
    # Initialize mapped documentation with the keys from sections_mappings values
    mapped_documentation = {
        'project_overview': {},
        'project_infrastructure': {},
        'project_organization': {},
        'project_dependencies': {}
    }
    
    # Map the documentation
    if extracted_documentation:
        for extracted_section, content in extracted_documentation.items():
            if extracted_section in section_mapping:
                formal_section = section_mapping[extracted_section]
                # Merge content if the formal section already has content
                if formal_section in mapped_documentation:
                    if isinstance(content, dict):
                        mapped_documentation[formal_section].update(content)
                    else:
                        mapped_documentation[formal_section] = content
    
    return mapped_documentation

def create_project_prompt(project_path, project_name, section_name, section_format, files_summary, folders_summary):
    """
    Create project prompt with improved validation and clarity.
    
    Args:
        project_path (str): Path to the project
        project_name (str): Name of the project
        section_name (str): Name of the documentation section
        section_format (str): Format template for the section
        files_summary (str): Summary of file documentation
        folders_summary (str): Summary of folder documentation
    
    Returns:
        str: Formatted prompt for documentation generation
    """
    # Add validation checks for summaries
    files_info = (
        "No file-level documentation available." 
        if files_summary.startswith("No file level") 
        else f"File Documentation:\n{files_summary}"
    )
    
    folders_info = (
        "No folder-level documentation available." 
        if folders_summary.startswith("No folder level") 
        else f"Folder Documentation:\n{folders_summary}"
    )
    
    return f"""You are a technical documentation expert creating comprehensive project-level documentation. Your task is to synthesize information from root-level files and immediate child folders into cohesive, accurate project documentation.

Key Requirements:
- Create high-level project documentation that provides a clear overview of the entire system
- Synthesize information from both files and folders documentations to create a complete picture
- Maintain consistent terminology and technical accuracy
- Focus on project-wide patterns, architectures, and relationships
- Include only information that is explicitly present in the source documentation
- If no source documentation is available for a section, clearly state that the information is not available

Context:
Project Name: {project_name}
Project Path: {project_path}
Section: {section_name}

Available Documentation:
{files_info}

{folders_info}

Output Format:
{section_format}

Guidelines:
1. Focus on project-wide concerns and architectural decisions
2. Highlight relationships between major components
3. Maintain technical accuracy while providing high-level overview
4. Use consistent terminology throughout
5. Include relevant cross-references between components
6. Emphasize project-wide patterns and standards
7. Consider both immediate implementation details and long-term maintenance
8. If no documentation is available for certain aspects, explicitly state this rather than making assumptions"""

def generate_project_level_documentation(project_path, project_name, root_files_documentation, root_folders_documentation, project_level_model):
    """
    Generate comprehensive project-level documentation by synthesizing information from root-level files
    and immediate child folders.
    
    Args:
        project_path (str): Path to the project root directory
        project_name (str): Name of the project
        root_files_documentation (dict): Documentation extracted from files in the root directory
        root_folders_documentation (dict): Documentation from immediate child folders
        project_level_model (str): The model to use for documentation generation
    
    Returns:
        tuple: Contains the combined documentation string, prompts dictionary, and responses dictionary
    """
    # Add debug logging at the start
    print(f"Generating documentation for project: {project_name}")
    print(f"Root files documentation available: {bool(root_files_documentation)}")
    print(f"Root folders documentation available: {bool(root_folders_documentation)}")

    # Process root files documentation
    if root_files_documentation is not None:
        print("Processing project files...")
        root_files_documentation = extract_all_sections_for_files(root_files_documentation)
        # Map the extracted sections to formal sections
        root_files_documentation = map_extracted_to_formal_sections(root_files_documentation)
        print(f"Mapped sections from files: {root_files_documentation.keys() if root_files_documentation else 'None'}")

    # Process root folders documentation
    if root_folders_documentation is not None:
        print("Processing project folders...")
        root_folders_documentation = extract_all_sections_for_files(root_folders_documentation)
        # Map the extracted sections to formal sections
        root_folders_documentation = map_extracted_to_formal_sections(root_folders_documentation)
        print(f"Mapped sections from folders: {root_folders_documentation.keys() if root_folders_documentation else 'None'}")

    # Fetch prompts from the DB
    db_prompts = get_prompts_from_db()

    # Build the final section formats by checking if a prompt exists in the DB
    section_formats = {}
    for section, default_prompt in default_section_formats.items():
        section_formats[section] = db_prompts.get(section, default_prompt)

    try:
        # Generate prompts for each section
        prompts = {}
        for section_key, section_format in section_formats.items():
            section_name = sections_mappings[section_key]
            files_summary = format_documentation_summary(root_files_documentation, section_key)
            folders_summary = format_documentation_summary(root_folders_documentation, section_key, "Folder") if root_folders_documentation else ""
            
            base_prompt = create_project_prompt(
                project_path=project_path,
                project_name=project_name,
                section_name=section_name,
                section_format=section_format,
                files_summary=files_summary,
                folders_summary=folders_summary
            )
            
            prompts[section_key] = [
                {"role": "system", "content": base_prompt},
                {"role": "user", "content": f"Generate the {section_name} section for project {project_name}, focusing on providing a comprehensive project-level perspective. Include only information that is explicitly present in the source documentation."}
            ]

        # Generate documentation for each section
        responses = {}
        for section_key in section_formats.keys():
            section_name = sections_mappings[section_key]
            try:
                print(f"Generating documentation for section: {section_name}")
                response = client.chat.completions.create(
                    model=project_level_model,
                    messages=prompts[section_key]
                )
                responses[section_key] = response
                print(f"Successfully generated documentation for section: {section_name}")
            except Exception as e:
                print(f"Error generating documentation for section {section_name}: {str(e)}")
                responses[section_key] = None

        # Compile responses
        project_documentation = {}
        for section_key, response in responses.items():
            if response is not None:
                project_documentation[section_key] = response.choices[0].message.content
            else:
                project_documentation[section_key] = f"Error generating documentation for {sections_mappings[section_key]}"

        # Combine documentation
        final_documentation = combine_documentation(project_documentation)
        print("Documentation generation completed successfully")
        return final_documentation, prompts, project_documentation

    except Exception as e:
        error_message = f"Error processing project {project_path}: {str(e)}"
        print(error_message)
        return error_message, {}, {}