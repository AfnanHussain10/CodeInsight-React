import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Star, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SectionFeedback from './SectionFeedback';

interface Section {
  id: number;
  section_name: string;
  section_content: string;
}

interface SectionViewerProps {
  documentationId: number;
  sections: Section[];
}

export default function SectionViewer({ documentationId, sections }: SectionViewerProps) {
  const { user } = useAuth();
  const [activeFeedbackSection, setActiveFeedbackSection] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<number>>(new Set());

  // Fetch feedback status when the component mounts or user/documentationId changes
  useEffect(() => {
    if (!user) return;

    const fetchFeedbackStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/feedback-status?user_id=${user.id}&documentation_id=${documentationId}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch feedback status');
        }
        const data = await response.json();
        const sectionIdsWithFeedback = new Set(data.section_ids);
        setFeedbackGiven(sectionIdsWithFeedback);
      } catch (error) {
        console.error('Error fetching feedback status:', error);
      }
    };

    fetchFeedbackStatus();
  }, [user, documentationId]);

  if (!sections || sections.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        No sections available for this documentation.
      </div>
    );
  }

  // Handle feedback submission to update the local state immediately
  const handleFeedbackSubmitted = (sectionId: number) => {
    setFeedbackGiven((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });
    setActiveFeedbackSection(null); // Close the feedback modal
  };

  return (
    <div className="space-y-8 p-6">
      {sections.map((section) => (
        <div key={section.id} className="bg-gray-800 rounded-lg p-6 relative">
          <button
            onClick={() => user && !feedbackGiven.has(section.id) && setActiveFeedbackSection(section.id)}
            className={`absolute top-4 right-4 transition-colors ${
              feedbackGiven.has(section.id) || !user
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-yellow-400'
            }`}
            disabled={feedbackGiven.has(section.id) || !user}
          >
            <Star className="h-5 w-5" />
          </button>

          <div className="prose prose-invert prose-p:text-gray-300 prose-strong:text-white prose-code:text-blue-300 prose-pre:bg-gray-900 prose-pre:text-gray-300 prose-ul:text-gray-300 prose-li:text-gray-300 max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.section_content}
            </ReactMarkdown>
          </div>
        </div>
      ))}

      {activeFeedbackSection !== null && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-gray-700 rounded-lg p-6 max-w-md w-full">
            <button
              onClick={() => setActiveFeedbackSection(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <SectionFeedback
              documentationId={documentationId}
              sectionId={activeFeedbackSection}
              userId={user.id}
              onClose={() => setActiveFeedbackSection(null)}
              onFeedbackSubmitted={() => handleFeedbackSubmitted(activeFeedbackSection)}
            />
          </div>
        </div>
      )}
    </div>
  );
}