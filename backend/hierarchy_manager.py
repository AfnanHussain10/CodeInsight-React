import os
import time
import sqlite3
from file_level_documentation import generate_documentation_for_file
from folder_level_documentation import generate_folder_level_documentation
from project_level_documentation import generate_project_level_documentation
from concurrent.futures import ThreadPoolExecutor, as_completed



def store_documentation(user_id, path, doc, project_name, level, root_path):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute('''
    INSERT OR REPLACE INTO documentation (user_id, path, doc, project_name, level, root_path)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, path, doc, project_name, level, root_path))
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return doc_id

def store_section_documentation(documentation_id, section_name, section_content, prompt_used):
    """Store section-wise documentation in the database."""
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO documentation_sections (documentation_id, section_name, section_content, prompt_used)
    VALUES (?, ?, ?, ?)
    ''', (documentation_id, section_name, section_content, prompt_used))
    conn.commit()
    conn.close()

def safe_api_call(api_function, *args, **kwargs):
    retries = 3
    while retries > 0:
        try:
            return api_function(*args, **kwargs)
        except Exception as e:
            if "rate_limit_exceeded" in str(e):
                print("Rate limit exceeded, retrying in 60 seconds...")
                time.sleep(60)
                retries -= 1
            else:
                raise e
    raise Exception("API call failed after multiple retries.")


def is_selected_or_has_selected_children(path, selected_items):
    """Check if the path or any of its children are in selected_items"""
    if path in selected_items:
        return True
    return any(selected.startswith(path + os.sep) for selected in selected_items)


def get_selected_items_in_folder(folder_path, selected_items):
    """Get only the directly selected files and subfolders in this folder"""
    files = []
    subfolders = []
    
    for item in selected_items:
        parent_dir = os.path.dirname(item)
        if parent_dir == folder_path:  # Only direct children
            if os.path.isfile(item):
                files.append(item)
            elif os.path.isdir(item):
                subfolders.append(item)
    
    return files, subfolders


def generate_hierarchical_documentation(
    user_id,
    root_path,
    folder_path, 
    project_name,
    file_model, 
    folder_model, 
    project_model,
    selected_items, 
    is_project_root=False,
    max_threads=5, 
    processed_folders=None
):
    """
    Generate documentation only for selected items in a bottom-up approach.
    Now includes project-level documentation generation for the root folder.
    
    Args:
        folder_path: Path to the current folder
        project_name: Name of the project (used for project-level documentation)
        file_model: Model to use for file-level documentation
        folder_model: Model to use for folder-level documentation
        project_model: Model to use for project-level documentation
        selected_items: List of paths selected for documentation
        is_project_root: Boolean indicating if this is the project root folder
        max_threads: Maximum number of concurrent threads
        processed_folders: Set of already processed folders
    """
    print(f"\n{'='*50}")
    print(f"Starting documentation generation for: {folder_path}")
    print(f"Is project root: {is_project_root}")
    print(f"Number of selected items: {len(selected_items)}")
    print(f"Max threads: {max_threads}")
    
    if processed_folders is None:
        processed_folders = set()
        print("Initialized new processed_folders set")

    # Check if folder should be processed
    if not is_selected_or_has_selected_children(folder_path, selected_items):
        print(f"Skipping folder {folder_path} - no selected items found")
        return None

    if folder_path in processed_folders:
        print(f"Skipping already processed folder: {folder_path}")
        return None

    processed_folders.add(folder_path)
    print(f"Added {folder_path} to processed folders. Total processed: {len(processed_folders)}")

    folder_documentation = {
        'files': {},
        'subfolders': {},
        'folder_summary': None,
        'project_summary': None
    }

    # Get selected items
    selected_files, selected_subfolders = get_selected_items_in_folder(folder_path, selected_items)
    print(f"\nFound in {folder_path}:")
    print(f"- Selected files: {len(selected_files)}")
    print(f"- Selected subfolders: {len(selected_subfolders)}")

    # Process subfolders
    print("\nProcessing subfolders...")
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        subfolder_futures = {}
        
        for subfolder_path in selected_subfolders:
            print(f"Submitting subfolder for processing: {subfolder_path}")
            future = executor.submit(
                safe_api_call,
                generate_hierarchical_documentation,
                user_id,
                root_path,
                subfolder_path,
                project_name,
                file_model,
                folder_model,
                project_model,
                selected_items,
                False,
                max_threads,
                processed_folders
            )
            subfolder_futures[future] = subfolder_path

        for future in as_completed(subfolder_futures):
            subfolder_path = subfolder_futures[future]
            try:
                subfolder_result = future.result()
                if subfolder_result:
                    print(f"Successfully processed subfolder: {subfolder_path}")
                    folder_documentation['subfolders'][subfolder_path] = subfolder_result
                else:
                    print(f"No documentation generated for subfolder: {subfolder_path}")
            except Exception as exc:
                print(f"ERROR processing subfolder {subfolder_path}: {exc}")

    # Process files
    print("\nProcessing files...")
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        file_futures = {}
        
        for file_path in selected_files:
            print(f"Submitting file for processing: {file_path}")
            future = executor.submit(
                safe_api_call,
                generate_documentation_for_file,
                file_path,
                file_model
            )
            file_futures[future] = file_path

        for future in as_completed(file_futures):
            file_path = file_futures[future]
            try:
                file_doc = future.result()
                print(f"Successfully processed file: {file_path}")
                folder_documentation['files'][file_path] = file_doc
                store_documentation(user_id, file_path, file_doc, project_name, 'file', root_path)
            except Exception as exc:
                print(f"ERROR processing file {file_path}: {exc}")

    if folder_path in selected_items:
        print(f"\nGenerating documentation for folder: {folder_path}")
        
        file_docs = folder_documentation['files']
        subfolder_docs = {
            path: data['folder_summary'] 
            for path, data in folder_documentation['subfolders'].items()
            if data and data.get('folder_summary')
        }
        
        print(f"Collected documentation:")
        print(f"- Files: {len(file_docs)}")
        print(f"- Subfolders with summaries: {len(subfolder_docs)}")
        
        if is_project_root:
            print("\nGenerating project-level documentation...")
            try:
                project_summary,proj_prompts,proj_sections = safe_api_call(
                    generate_project_level_documentation,
                    folder_path,
                    project_name,
                    file_docs,
                    subfolder_docs,
                    project_model
                )
                folder_documentation['project_summary'] = project_summary
                doc_id = store_documentation(user_id, f"{folder_path}_project", project_summary, project_name, 'project',root_path)
                for section_name, section_content in proj_sections.items():
                    prompt_text = proj_prompts[section_name][0]["content"]  # Get the system prompt
                    store_section_documentation(doc_id, section_name, section_content, prompt_text)
                    print(f"Section: {section_name} stored successfully! PROJECT LEVEL")
                print(f"Successfully generated project-level documentation for {project_name}")
                
            except Exception as exc:
                print(f"ERROR generating project-level documentation: {exc}")
        else:
            print("\nGenerating folder-level documentation...")
            try:
                folder_summary,prompts,sections = safe_api_call(
                    generate_folder_level_documentation,
                    folder_path,
                    file_docs,
                    subfolder_docs,
                    folder_model
                )
                folder_documentation['folder_summary'] = folder_summary
                doc_id = store_documentation(user_id, folder_path, folder_summary, project_name, 'folder',root_path)
                for section_name, section_content in sections.items():
                    prompt_text = prompts[section_name][0]["content"]  # Get the system prompt
                    store_section_documentation(doc_id, section_name, section_content, prompt_text)
                    print(f"Section: {section_name} stored successfully! FOLDER LEVEL")
                print(f"Successfully generated folder-level documentation for {folder_path}")
            except Exception as exc:
                print(f"ERROR generating folder-level documentation: {exc}")

    print(f"\nCompleted processing {'project root' if is_project_root else 'folder'}: {folder_path}")
    print(f"{'='*50}\n")
    return folder_documentation


def generate_documentation(
    user_id,
    root_path,
    project_name,
    selected_items,
    file_model,
    folder_model,
    project_model,
    max_threads=3
):
    """
    Main entry point for documentation generation.
    
    Args:
        root_path: Path to the project root
        project_name: Name of the project
        selected_items: List of paths selected for documentation
        file_model: Model to use for file-level documentation
        folder_model: Model to use for folder-level documentation
        project_model: Model to use for project-level documentation
        max_threads: Maximum number of concurrent threads
    """
    try:
        # Generate documentation with project root handling
        print(f"In hierarchy manager\n----------------------\nFile model: {file_model}\nFolder Model: {folder_model}\nProject Model: {project_model}")
        documentation = generate_hierarchical_documentation(
            user_id,
            root_path,
            root_path,
            project_name,
            file_model,
            folder_model,
            project_model,
            selected_items,
            is_project_root=True,
            max_threads=max_threads
        )

        return documentation

    except Exception as e:
        print(f"Error generating documentation: {str(e)}")
        raise