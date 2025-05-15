export function validateUploadedFiles(files: FileList): string | null {
  if (!files.length) {
    return 'No files selected';
  }

  const hasDirectory = Array.from(files).some(file => 
    file.webkitRelativePath.includes('/')
  );

  if (!hasDirectory) {
    return 'Please select a directory containing your project files';
  }

  // Add more validations as needed (file size, type, etc.)
  return null;
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function isValidProjectFile(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase();
  const validExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'h', 'cs'];
  return validExtensions.includes(extension);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}