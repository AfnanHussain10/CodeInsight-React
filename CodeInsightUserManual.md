# CodeInsight User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation and Setup](#installation-and-setup)
4. [Getting Started](#getting-started)
5. [User Interface Overview](#user-interface-overview)
6. [Core Features](#core-features)
7. [Backend Components](#backend-components)
8. [Frontend Components](#frontend-components)
9. [Administration](#administration)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

## Introduction

CodeInsight is a comprehensive code documentation platform that automatically generates high-quality documentation for your software projects. It analyzes your codebase at multiple levels (file, folder, and project) to create detailed, contextual documentation that helps developers understand code structure and functionality.

### Key Benefits

- **Automated Documentation**: Generate comprehensive documentation with minimal effort
- **Multi-level Analysis**: Document individual files, folders, and entire projects
- **PDF Export**: Export documentation in PDF format for offline reference
- **Web Interface**: Access and navigate documentation through an intuitive web interface
- **User Management**: Control access with user accounts and permissions

## System Requirements

### Backend
- Python 3.8 or higher
- FastAPI framework
- SQLite database
- Groq API key for AI-powered documentation generation

### Frontend
- Node.js 14.x or higher
- React 18.x
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation and Setup

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/Codeinsight-React.git
   cd Codeinsight-React/backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your API keys:
   ```
   GROQ_API_KEY=your_groq_api_key
   ```

4. Initialize the database:
   ```
   python init_db.py
   ```

5. Start the backend server:
   ```
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd ../frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Getting Started

### Creating an Account

1. Open your browser and navigate to `http://localhost:5173` (or the configured frontend URL)
2. Click on "Sign Up" in the navigation bar
3. Enter your email and password
4. Click "Create Account"

### Logging In

1. Navigate to the login page
2. Enter your email and password
3. Click "Log In"

## User Interface Overview

### Navigation

The main navigation bar provides access to:
- **Home**: Landing page with project overview
- **Dashboard**: View and manage your projects
- **Documentation**: Access generated documentation
- **Features**: Overview of platform capabilities
- **About**: Information about CodeInsight
- **Admin**: Administrative functions (admin users only)

## Core Features

### Project Management

1. **Creating a New Project**:
   - From the Dashboard, click "New Project"
   - Upload your project files or provide a repository URL
   - Configure project settings
   - Click "Generate Documentation"

2. **Viewing Projects**:
   - Access the Dashboard to see all your projects
   - Click on a project to view its documentation

### Documentation Generation

CodeInsight generates documentation at three levels:

1. **File Level**: Detailed documentation for individual source code files
   - Function/method descriptions
   - Parameter explanations
   - Return value details
   - Code examples

2. **Folder Level**: Documentation for directories/modules
   - Folder purpose and contents
   - Relationships between files
   - Module architecture

3. **Project Level**: High-level project documentation
   - Project overview
   - Architecture diagrams
   - Component relationships
   - Setup instructions

### Viewing Documentation

1. From the Dashboard, click on a project
2. Use the Documentation Tree in the left sidebar to navigate through files and folders
3. Click on any item to view its documentation
4. Toggle the tree view using the button in the top-left corner

### Exporting Documentation

1. While viewing documentation, click the "Export PDF" button
2. Choose export options (if available)
3. Download the generated PDF

## Backend Components

### Main API Endpoints

- `/api/auth`: Authentication endpoints (login, signup, session management)
- `/api/documentation`: Documentation generation and retrieval
- `/api/projects`: Project management
- `/api/admin`: Administrative functions

### Documentation Generation Process

1. Code is uploaded and stored in the `uploaded_projects` directory
2. The system analyzes the code structure using the hierarchy manager
3. AI models generate documentation for each level (file, folder, project)
4. Documentation is stored in the database and made available through the API

## Frontend Components

### Key Pages

- **Home.tsx**: Landing page with project introduction
- **Dashboard.tsx**: Project management interface
- **Documentation.tsx**: Documentation viewer with navigation tree
- **Setup.tsx**: Project setup and configuration

### Components

- **DocumentationTree**: Navigation tree for browsing project structure
- **DocumentationViewer**: Renders documentation content with formatting
- **GeneratingDocumentation**: Progress indicator during documentation generation

## Administration

### Admin Dashboard

Access the admin dashboard by logging in with an admin account and navigating to `/admin`.

Key administrative functions include:

- **User Management**: Add, edit, and remove users
- **Documentation Overview**: Monitor all documentation in the system
- **Documentation Sections**: View and manage individual documentation sections
- **Feedback Overview**: Review user feedback on documentation
- **Settings**: Configure system settings

## Troubleshooting

### Common Issues

1. **Documentation Generation Fails**
   - Ensure your API keys are correctly configured
   - Check that the project files are accessible and not corrupted
   - Verify that the project structure is supported

2. **Cannot Access Documentation**
   - Confirm you are logged in
   - Verify you have permission to access the project
   - Check that documentation has been generated successfully

3. **PDF Export Issues**
   - Ensure the backend server is running
   - Check for any error messages in the console
   - Try regenerating the documentation

## FAQ

**Q: How long does documentation generation take?**

A: Generation time depends on the size and complexity of your project. Small projects may take a few minutes, while larger projects can take 15-30 minutes or more.

**Q: Can I customize the documentation format?**

A: Currently, the documentation format is standardized. Future versions may include customization options.

**Q: Is my code secure when uploaded for documentation?**

A: Yes, your code is stored securely and is only used for documentation generation. It is not shared with third parties.

**Q: Can I update documentation after changes to my code?**

A: Yes, you can re-upload your project and generate new documentation to reflect code changes.

**Q: Does CodeInsight support all programming languages?**

A: CodeInsight supports most popular programming languages, including Python, JavaScript, TypeScript, Java, C#, and more. Support for additional languages is continuously being added.