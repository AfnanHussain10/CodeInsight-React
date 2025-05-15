import re

# Function to clean up unwanted trailing content (e.g., "---", section numbers)
def clean_extracted_content(content):
    # Remove trailing '---' and section numbers (like '3.', '2.', etc.) and any unnecessary extra lines
    content = re.sub(r"(\n?---\s*\d*\s*)$", "", content)  # Remove trailing "---" and numbers
    content = re.sub(r"^\d+(\.|\s)", "", content)  # Remove leading section numbers (like 2. or 2 )
    return content.strip()

# Function to extract sections from file-level documentation
def extract_sections_from_file(file_doc):
    sections = {
        'Overview and Purpose': None,
        'Key Functions': None,
        'Architecture': None,
        'Inter-File Relationships': None,
        'Dependencies and External Calls': None,
        'Code Snippets and Examples': None
    }

    # Regular expression patterns to match each section
    section_patterns = {
        'Overview and Purpose': r"(?<=\bOverview and Purpose\b)(.*?)(?=\n*(?:\bKey Functions\b|$))",
        'Key Functions': r"(?<=\bKey Functions\b)(.*?)(?=\n*(?:\bArchitecture\b|$))",
        'Architecture': r"(?<=\bArchitecture\b)(.*?)(?=\n*(?:\bInter-File Relationships\b|$))",
        'Inter-File Relationships': r"(?<=\bInter-File Relationships\b)(.*?)(?=\n*(?:\bDependencies and External Calls\b|$))",
        'Dependencies and External Calls': r"(?<=\bDependencies and External Calls\b)(.*?)(?=\n*(?:\bCode Snippets and Examples\b|$))",
        'Code Snippets and Examples': r"(?<=\bCode Snippets and Examples\b)(.*?)(?=\n*(?:$|\bOverview\b|\bKey Functions\b|\bArchitecture\b|\bInter-File Relationships\b|\bDependencies and External Calls\b|\b$))"
    }

    # Extract each section using regex
    for section, pattern in section_patterns.items():
        match = re.search(pattern, file_doc, re.DOTALL)  # re.DOTALL allows matching newlines as well
        if match:
            content = match.group(1).strip()
            content = clean_extracted_content(content)  # Clean unwanted content
            
            sections[section] = content

    return sections

# Function to extract and organize documentation for all files
def extract_all_sections_for_files(file_docs):
    section_dicts = {
        'Overview and Purpose': {},
        'Key Functions': {},
        'Architecture': {},
        'Inter-File Relationships': {},
        'Dependencies and External Calls': {},
        'Code Snippets and Examples': {}
    }

    # Extract the sections for each file and organize them in dictionaries
    for file_path, file_doc in file_docs.items():
        if isinstance(file_doc, str):  # Ensure the file_doc is a string
            sections = extract_sections_from_file(file_doc)

            # Add extracted sections to the corresponding dictionaries
            for section, text in sections.items():
                if text:
                    section_dicts[section][file_path] = text
        else:
            print(f"Warning: Skipping {file_path} because the documentation is not a string.")

    return section_dicts