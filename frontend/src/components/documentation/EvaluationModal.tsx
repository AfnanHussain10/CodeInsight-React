import { X, AlertCircle, BarChart3, ThumbsUp, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import FeedbackForm from './FeedbackForm';
import SectionFeedback from './SectionFeedback';
import Toast from '../common/Toast';
import { getAuthHeader } from '../../lib/auth';
import ModelSelector from '../ModelSelector';

interface Section {
  id: number;
  section_name: string;
  section_content: string;
}

interface Evaluation {
  evaluation: string;
  path: string;
  model: string;
  error?: string;
}

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  documentationId?: number | null;
}

export default function EvaluationModal({ 
  isOpen, 
  onClose, 
  path,  
  documentationId,
}: EvaluationModalProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('evaluation');
  
  // Define getLevel function first
  const getLevel = (pathString: string): 'file' | 'folder' | 'project' => {
    if (!pathString) return 'file'; // Default fallback
    
    if (pathString.includes('_project')) {
      return 'project';
    }
    const hasExtension = /\.[^/\\]+$/.test(pathString);
    return hasExtension ? 'file' : 'folder';
  };

  const isFolder = () => getLevel(path) !== 'file';
  
  // Reset everything when modal closes
  const handleClose = () => {
    setToast(null);
    setSelectedModel(null);
    setIsGenerating(false);
    setEvaluation(null);
    setIsLoading(false);
    setActiveTab('evaluation');
    onClose();
  };
  
  useEffect(() => {
    if (isOpen && documentationId && isFolder()) {
      fetchSections();
    }
  }, [isOpen, documentationId, path]);

  const fetchSections = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers) return;

      const response = await fetch(`http://localhost:8000/api/documentation/sections/${documentationId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleFeedbackSubmit = () => {
    setToast({
      message: 'Thank you for your feedback! Your input helps us improve.',
      type: 'success'
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleEvaluate = async () => {
    if (!selectedModel) {
      setToast({
        message: 'Please select an evaluation model first.',
        type: 'error'
      });
      return;
    }

    setIsGenerating(true);
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/evaluation?path=${encodeURIComponent(path)}_evaluation&level=${getLevel(path)}&model=${selectedModel}`
      );
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      setEvaluation(data);
      
    } catch (error) {
      console.error('Error fetching evaluation:', error);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-0 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with improved styling */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Documentation Evaluation
          </h2>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Configuration panel */}
        <div className="px-6 py-4 bg-gray-850 border-b border-gray-700">
          <div className="mb-4">
            <ModelSelector 
              label="Select Evaluation Model" 
              value={selectedModel} 
              onChange={setSelectedModel} 
            />
          </div>

          <button
            onClick={handleEvaluate}
            className={`p-2.5 w-full bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md shadow-md transition-colors flex items-center justify-center gap-2 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating Evaluation...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4" />
                Generate Evaluation
              </>
            )}
          </button>
        </div>

        {/* Main content area with tabs */}
        <div className="flex-1 overflow-auto">
          {isFolder() && evaluation && (
            <div className="px-6 pt-4 border-b border-gray-700">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('evaluation')}
                  className={`px-4 py-2 rounded-t-md font-medium text-sm transition-colors ${
                    activeTab === 'evaluation' 
                      ? 'bg-gray-800 text-amber-500 border-t border-l border-r border-gray-700' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Evaluation
                </button>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`px-4 py-2 rounded-t-md font-medium text-sm transition-colors ${
                    activeTab === 'feedback' 
                      ? 'bg-gray-800 text-amber-500 border-t border-l border-r border-gray-700' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Section Feedback
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {isLoading || isGenerating ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Analyzing and evaluating documentation...</p>
                <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
              </div>
            ) : evaluation?.error ? (
              <div className="flex items-center gap-3 text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-800/50">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Evaluation Error</p>
                  <p className="text-red-300">{evaluation.error}</p>
                </div>
              </div>
            ) : evaluation ? (
              <>
                {isFolder() && activeTab === 'feedback' && documentationId && sections.length > 0 ? (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-amber-500" />
                      Rate Documentation Sections
                    </h3>
                    <div className="space-y-6 divide-y divide-gray-700">
                      {sections.map(section => (
                        <div key={section.id} className="pt-4">
                          <SectionFeedback 
                            documentationId={documentationId} 
                            sectionId={section.id} 
                            sectionName={section.section_name} 
                            inlineDisplay 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{evaluation.evaluation}</ReactMarkdown>
                    
                    {!isFolder() && (
                      <div className="mt-8 pt-6 border-t border-gray-700">
                        <FeedbackForm path={path} level={getLevel(path)} onSubmit={handleFeedbackSubmit} />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No evaluation data available</p>
                <p className="text-gray-500 text-sm mt-2">Select a model and generate an evaluation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}