import React from 'react';

interface ProjectConfigProps {
  folderPath: string;
  projectName: string;
  onFolderPathChange: (path: string) => void;
  onProjectNameChange: (name: string) => void;
}

export default function ProjectConfig({
  folderPath,
  projectName,
  onFolderPathChange,
  onProjectNameChange,
}: ProjectConfigProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label htmlFor="folderPath" className="block text-sm font-medium text-gray-300 mb-2">
          Project folder path
        </label>
        <input
          type="text"
          id="folderPath"
          value={folderPath}
          onChange={(e) => onFolderPathChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="/path/to/project"
        />
      </div>
      <div>
        <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-2">
          Project name
        </label>
        <input
          type="text"
          id="projectName"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="My Project"
        />
      </div>
    </div>
  );
}