const API_BASE_URL = 'http://localhost:8000/api';

export async function uploadProject(files: FileList, projectName: string) {
  const formData = new FormData();
  
  // Add each file with its relative path
  Array.from(files).forEach(file => {
    // Get the relative path from webkitRelativePath
    const relativePath = file.webkitRelativePath;
    formData.append('files', file, relativePath);
  });
  
  formData.append('project_name', projectName);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to upload project');
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error('Failed to upload project');
  }
}

export async function fetchDocumentation(path: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/documentation?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to fetch documentation');
    }

    return response.text();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch documentation: ${error.message}`);
    }
    throw new Error('Failed to fetch documentation');
  }
}

export async function fetchEvaluation(path: string, model: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/evaluation?path=${encodeURIComponent(path)}&model=${encodeURIComponent(model)}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to fetch evaluation');
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch evaluation: ${error.message}`);
    }
    throw new Error('Failed to fetch evaluation');
  }
}

export async function generateDocumentation(
  rootPath: string,
  projectName: string,
  selectedItems: string[],
  fileModel: string,
  folderModel: string,
  projectModel: string
) {
  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        root_path: rootPath,
        project_name: projectName,
        selected_items: selectedItems,
        file_model: fileModel,
        folder_model: folderModel,
        project_model: projectModel,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to generate documentation');
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate documentation: ${error.message}`);
    }
    throw new Error('Failed to generate documentation');
  }
}