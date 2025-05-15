import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from groq import Groq
from dotenv import load_dotenv
import sqlite3

load_dotenv()

DB_PATH = "settings.db"

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

def get_prompts_from_db():
    """Fetch all prompts from the database with keys starting with 'file_'."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings WHERE key LIKE 'file_%'")
    rows = cursor.fetchall()
    prompts = {row['key']: row['value'] for row in rows}
    conn.close()
    return prompts

def chunk_code(code_content, chunk_size=300):
    lines = code_content.splitlines()
    for i in range(0, len(lines), chunk_size):
        yield '\n'.join(lines[i:i + chunk_size])


def generate_chunk_sections(chunk, file_path, small_model):

    prompts = get_prompts_from_db()
    
    # Get base prompts from DB
    system_prompt = prompts.get('file_chunk_prompt', '')

    chunk_prompt = [
    {"role": "system", "content": f"""
    {system_prompt}

    Based on this information, generate the documentation for the following code chunk:
     
    File Path: {file_path}
    Code:
    {chunk}
    """},

    {"role": "user", "content": "Maintain a precise, factual tone. Provide documentation for this chunk of code in a professional format, strictly based on the provided code."}
]

    chunk_prompt_response = client.chat.completions.create(
        model=small_model,
        messages=chunk_prompt,
    )
    documentation = chunk_prompt_response.choices[0].message.content


    # Return combined sections
    return documentation



def generate_high_level_sections(chunks_sections, file_path, small_model):

    prompts = get_prompts_from_db()
    
    system_prompt = prompts.get('file_consolidate_prompt', '')

    consolidate_prompt = [
    {"role": "system", "content": f"""
    {system_prompt}

    Below are the chunk-level documentations to be consolidated into file-level documentation:
    File Path: {file_path}

    {chunks_sections}
    """},

    {"role": "user", "content": "Using the provided chunk-level documentations, consolidate the information into a single, detailed file-level documentation. Maintain clarity and consistency, and make sure to follow the structure provided."}
]

    consolidated_doc_response = client.chat.completions.create(
        model=small_model,
        messages=consolidate_prompt,
    )

    documentation = consolidated_doc_response.choices[0].message.content

    # Return combined sections
    return documentation


# Updated documentation generation function for larger files
def generate_documentation_for_file(file_path, small_model):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        code_content = file.read()

    # Define a threshold for chunking based on the number of lines in the file
    chunk_threshold = 300

    prompts = get_prompts_from_db()
    system_prompt = prompts.get('file_prompt', '')

    file_prompt = f"""
    {system_prompt}
    Now, based on this information, generate the documentation for the following file:

    File Path: {file_path}
    Code:
    {code_content}
    """

    # Check if chunking is necessary
    if chunk_threshold < len(code_content.splitlines()) and len(code_content.splitlines()) - chunk_threshold > 50:
        chunks = chunk_code(code_content)
        chunk_docs = [generate_chunk_sections(chunk, file_path, small_model) for chunk in chunks]
        documentation = generate_high_level_sections(chunk_docs, file_path, small_model)
    else:
        file_prompt_response = client.chat.completions.create(
            model=small_model,
            messages=[
                {"role": "system", "content": file_prompt},
                {"role": "user", "content": "Maintain a precise and factual tone. Avoid assumptions and speculation. Provide the documentation for the target file in a professional format."}
            ],
            temperature=0.5,
            max_tokens=8000,
        )
        documentation = file_prompt_response.choices[0].message.content

    return documentation
