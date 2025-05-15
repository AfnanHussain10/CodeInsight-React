import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Star, X } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import DocumentationHeader from './DocumentationHeader';
import EvaluationModal from './EvaluationModal';
import ChatPanel from './ChatPanel';
import SectionViewer from './SectionViewer';
import SectionFeedback from './SectionFeedback';
import { processDocumentation } from '../../utils/documentation.utils';
import { getAuthHeader } from '../../lib/auth';
// import { toast } from 'react-hot-toast'; // Replaced with custom Toast
import html2pdf from 'html2pdf.js';
import Toast from '../common/Toast'; // Import custom Toast component

interface DocumentationViewerProps {
  documentation: string | null;
  path: string | null;
  projectName: string;
  onTreeToggle?: () => void;
  isTreeVisible?: boolean;
}

interface Evaluation {
  evaluation: string;
  path: string;
  model: string;
  error?: string;
}

interface Section {
  id: number;
  section_name: string;
  section_content: string;
}

export default function DocumentationViewer({
  documentation,
  path,
  projectName,
  onTreeToggle,
  isTreeVisible,
}: DocumentationViewerProps) {
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState('');
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [documentationId, setDocumentationId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [feedbackGivenMap, setFeedbackGivenMap] = useState<Map<string, boolean>>(new Map());
  const [isLoadingFeedbackStatus, setIsLoadingFeedbackStatus] = useState(true); // Start as true
  const [docLevel, setDocLevel] = useState<string | null>(null); // To store the documentation level ('file', 'folder', 'project')
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  // const [editingSectionId, setEditingSectionId] = useState<number | null>(null); // No longer needed for multi-section editing

  useEffect(() => {
    if (documentation) {
      const processed = processDocumentation(documentation);
      setContent(processed);
    } else {
      setContent('');
    }
  }, [documentation]);

  useEffect(() => {
    if (path) {
      setIsLoadingFeedbackStatus(true);
      fetchDocumentationId();
      fetchFeedbackStatus(path).finally(() => setIsLoadingFeedbackStatus(false));
    } else {
      setFeedbackGivenMap(new Map());
      setIsLoadingFeedbackStatus(false);
    }
  }, [path]);

  useEffect(() => {
    if (documentationId) {
      fetchSections();
    }
  }, [documentationId, path]); // Added path to dependency array for level inference fallback

  // useEffect(() => {
  //   const isProjectOrFolder = path?.includes('folder') || path?.includes('project');
  //   if (editMode && isProjectOrFolder && sections.length > 0) {
  //     // This logic was for defaulting to the first section when a single section editor was used.
  //     // It's no longer needed as all sections will be displayed.
  //   } else if ((!isProjectOrFolder || !editMode) /* && editingSectionId !== null */ ) {
  //     // setEditingSectionId(null); // Reset if not applicable, state removed
  //   }
  // }, [editMode, path, sections]); // editingSectionId dependency removed as state is removed

  const fetchDocumentationId = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(
        `http://localhost:8000/api/documentation/id?path=${encodeURIComponent(path || '')}`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setDocumentationId(data.id);
        // Assuming the backend /api/documentation/id now also returns 'level'
        if (data.level) {
          setDocLevel(data.level);
        } else {
          // Fallback: Infer level from path if not provided by API (less reliable)
          if (path?.endsWith('/') || path?.includes('folder_doc') || path?.includes('project_doc')) {
            setDocLevel('folder'); // Or 'project'
          } else {
            setDocLevel('file');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching documentation ID:', error);
    }
  };

  const handleSave = async (sectionIdToSave?: number) => {
    if (!documentationId) {
      setToastMessage('Documentation ID not found. Cannot save.');
      setToastType('error');
      return;
    }
    setIsSaving(true);
    const headers = getAuthHeader();
    if (!headers) {
      setToastMessage('Authentication error. Cannot save.');
      setToastType('error');
      setIsSaving(false);
      return;
    }

    try {
      if (sectionIdToSave !== undefined) {
        // Save a specific section
        const sectionToSave = sections.find(s => s.id === sectionIdToSave);
        if (!sectionToSave) {
          setToastMessage('Section not found. Cannot save.');
          setToastType('error');
          setIsSaving(false);
          return;
        }
        const response = await fetch(`http://localhost:8000/api/documentation/sections/${sectionIdToSave}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ section_content: sectionToSave.section_content }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Failed to save section' }));
          throw new Error(errorData.detail || 'Failed to save section');
        }
        console.log('Successfully saved section:', sectionIdToSave);
        setToastMessage(`Section "${sectionToSave.section_name}" saved successfully!`);
        setToastType('success');
      } else {
        // Save the whole document content (for file level or if docLevel indicates file)
        const response = await fetch(`http://localhost:8000/api/documentation/${documentationId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_content: content }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Failed to save document' }));
          throw new Error(errorData.detail || 'Failed to save document');
        }
        console.log('Successfully saved document:', documentationId);
        setToastMessage('Document saved successfully!');
        setToastType('success');
      }
    } catch (error) {
      console.error('Error saving documentation:', error);
      setToastMessage(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setToastType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSections = async () => {
    try {
      setIsLoadingSections(true);
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(
        `http://localhost:8000/api/documentation/sections/${documentationId}`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setIsLoadingSections(false);
    }
  };

  const fetchFeedbackStatus = async (currentPath: string) => {
    try {
      const headers = getAuthHeader();
      if (!headers) {
        console.log('No auth headers, skipping feedback status fetch');
        return;
      }

      const userId = localStorage.getItem('userId');
      if (!userId || !currentPath) {
        console.log('Missing userId or path, skipping feedback status fetch');
        return;
      }

      const url = `http://localhost:8000/api/feedback-status-level?user_id=${userId}&path=${encodeURIComponent(currentPath)}&level=file`;
      console.log('Fetching feedback status:', url);
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        console.log(`Feedback status for ${currentPath} (file):`, data);
        setFeedbackGivenMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentPath, data.has_feedback);
          console.log('Updated feedbackGivenMap:', [...newMap]);
          return newMap;
        });
      } else {
        console.error(`Failed to fetch feedback status for ${currentPath}: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching feedback status:', error);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSectionContentChange = (sectionId: number, newSecContent: string) => {
    setSections(prevSections =>
      prevSections.map(s =>
        s.id === sectionId ? { ...s, section_content: newSecContent } : s
      )
    );
  };

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      setShowEvaluation(true);
    } catch (error) {
      console.error('Error fetching evaluation:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const opt = {
      margin: 1,
      filename: `${projectName}_documentation.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleFeedbackSubmitted = (currentPath: string) => {
    console.log(`Feedback submitted or detected for ${currentPath}`);
    setFeedbackGivenMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(currentPath, true);
      console.log('Updated feedbackGivenMap after submission:', [...newMap]);
      return newMap;
    });
    fetchFeedbackStatus(currentPath); // Ensure sync with backend
  };

  const isProjectOrFolder = path?.includes('folder') || path?.includes('project');
  const feedbackGiven = path ? feedbackGivenMap.get(path) ?? false : false;

  const hasNoDocumentation = !documentation || documentation.trim() === '';
  console.log('Rendering - Path:', path, 'Documentation:', documentation, 'HasNoDocumentation:', hasNoDocumentation, 'FeedbackGiven:', feedbackGiven, 'feedbackGivenMap:', [...feedbackGivenMap], 'isLoadingFeedbackStatus:', isLoadingFeedbackStatus);

  if (hasNoDocumentation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Select a file or folder to view its documentation
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <DocumentationHeader
        editMode={editMode}
        onEditToggle={() => setEditMode(!editMode)}
        onEvaluate={handleEvaluate}
        onChatToggle={() => setShowChat(!showChat)}
        onDownloadPDF={handleDownloadPDF}
        onTreeToggle={onTreeToggle}
        isTreeVisible={isTreeVisible}
      />

      <div className={`flex-1 ${editMode ? 'grid grid-cols-2' : ''} overflow-hidden`}>
        {editMode && (
          <div className="border-r border-gray-700 h-full flex flex-col overflow-y-auto p-4 space-y-4"> {/* MODIFIED: Added padding and spacing for multiple editors */}
            {isProjectOrFolder && sections.length > 0 ? (
              sections.map(section => ( // MODIFIED: Loop through sections to render an editor for each
                <div key={section.id} className="border border-gray-600 rounded-lg shadow-sm bg-gray-850">
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{section.section_name}</h3>
                  </div>
                  <div className="h-[400px]">
                    <MarkdownEditor
                      value={section.section_content} // MODIFIED: Use current section's content
                      onChange={(newContent) => handleSectionContentChange(section.id, newContent)} // MODIFIED: Pass section.id and new content
                      onSave={() => handleSave(section.id)} // Pass sectionId for specific section save
                    />
                  </div>
                </div>
              ))
            ) : (
              // If not project/folder or no sections, show single editor for main content
              <div className="flex-grow min-h-0">
                 <MarkdownEditor value={content} onChange={handleContentChange} onSave={() => handleSave()} />
              </div>
            )}
          </div>
        )}

        <div
          className={`h-full overflow-auto ${editMode ? 'border-l border-gray-700' : ''}`}
          ref={contentRef}
        >
          {isProjectOrFolder && sections.length > 0 ? (
            <SectionViewer documentationId={documentationId || 0} sections={sections} />
          ) : (
            <div className="p-8 relative">
              {isLoadingFeedbackStatus ? (
                <div className="absolute top-4 right-4 text-gray-400">Loading feedback status...</div>
              ) : (
                <button
                  onClick={() => !feedbackGiven && setShowFeedback(true)}
                  className={`absolute top-4 right-4 transition-colors ${
                    feedbackGiven
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-yellow-400'
                  }`}
                  disabled={feedbackGiven}
                >
                  <Star className="h-5 w-5" />
                </button>
              )}

              <div className="prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-code:text-blue-300 prose-pre:bg-gray-800 prose-pre:text-gray-300 prose-ul:text-gray-300 prose-li:text-gray-300 max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className={`bg-gray-800 text-blue-300 rounded px-1 py-0.5 ${className}`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      <EvaluationModal
        isOpen={showEvaluation}
        onClose={() => setShowEvaluation(false)}
        path={path || ''}
        documentationId={documentationId}
      />

      <ChatPanel
        projectName={projectName}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />

      {showFeedback && path && (
        <SectionFeedback
          documentationId={documentationId || 0}
          sectionId={-1}
          sectionName={path}
          userId={localStorage.getItem('userId')}
          onClose={() => setShowFeedback(false)}
          onFeedbackSubmitted={() => handleFeedbackSubmitted(path)}
        />
      )}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}