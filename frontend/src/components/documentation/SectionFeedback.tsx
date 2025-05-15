import { useState, useEffect } from 'react';
import { Star, StarOff, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAuthHeader } from '../../lib/auth';
import Toast from '../common/Toast';

interface SectionFeedbackProps {
  documentationId: number;
  sectionId: number;
  sectionName: string;
  userId?: string;
  onClose?: () => void;
  onFeedbackSubmitted?: () => void;
  inlineDisplay?: boolean;
}

export default function SectionFeedback({
  documentationId,
  sectionId,
  sectionName,
  userId,
  onClose,
  onFeedbackSubmitted,
  inlineDisplay = false,
}: SectionFeedbackProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasFeedback, setHasFeedback] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const maxFeedbackLength = 500;
  const displayName = sectionId === -1 ? sectionName.split(/[\\/]/).pop() || 'Feedback' : sectionName;
  const isFileFeedback = sectionId === -1;

  useEffect(() => {
    console.log('useEffect triggered:', { userId: user?.id, sectionName, sectionId, documentationId });
    if (user?.id) {
      fetchFeedbackStatus();
    } else {
      console.log('No user ID available, skipping fetchFeedbackStatus');
    }
  }, [user?.id, sectionName, sectionId, documentationId]);

  const fetchFeedbackStatus = async () => {
    try {
      const headers = getAuthHeader();
      if (!headers || !user?.id) {
        console.log('Missing headers or user ID, aborting fetch');
        return;
      }

      console.log('Fetching feedback status for:', { isFileFeedback, sectionName, sectionId });

      if (isFileFeedback) {
        const url = `http://localhost:8000/api/feedback-status-level?user_id=${user.id}&path=${encodeURIComponent(sectionName)}&level=file`;
        console.log('Calling API:', url);
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          console.log('File feedback status response:', data);
          setHasFeedback(data.has_feedback);
          // Immediately sync with parent on mount if feedback exists
          if (data.has_feedback && onFeedbackSubmitted) {
            console.log('Feedback exists, syncing with parent');
            onFeedbackSubmitted();
          }
        } else {
          console.error('File feedback status fetch failed:', response.status, response.statusText);
        }
      } else {
        const url = `http://localhost:8000/api/feedback-status?user_id=${user.id}&documentation_id=${documentationId}`;
        console.log('Calling API:', url);
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          console.log('Section feedback status response:', data);
          setHasFeedback(data.section_ids.includes(sectionId));
          if (data.section_ids.includes(sectionId) && onFeedbackSubmitted) {
            console.log('Section feedback exists, syncing with parent');
            onFeedbackSubmitted();
          }
        } else {
          console.error('Section feedback status fetch failed:', response.status, response.statusText);
        }
      }
    } catch (error) {
      console.error('Error fetching feedback status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setToast({ message: 'You must be logged in to submit feedback', type: 'error' });
      return;
    }

    if (!rating) {
      setToast({ message: 'Please provide a rating', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      };

      if (!headers) {
        throw new Error('Authentication required');
      }

      const endpoint = isFileFeedback
        ? 'http://localhost:8000/api/feedback'
        : 'http://localhost:8000/api/section-feedback';

      const body = isFileFeedback
        ? JSON.stringify({
            user_id: user.id,
            path: sectionName,
            level: 'file',
            rating,
            feedback: feedback.trim() || '',
          })
        : JSON.stringify({
            user_id: user.id,
            documentation_id: documentationId,
            section_id: sectionId,
            rating,
            feedback: feedback.trim() || null,
          });

      console.log('Submitting feedback to:', endpoint, 'with body:', body);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Feedback submission failed:', response.status, errorData);
        throw new Error(errorData?.detail || `Failed to submit feedback (status: ${response.status})`);
      }

      console.log('Feedback submitted successfully');
      setIsSubmitted(true);

      if (onFeedbackSubmitted) {
        console.log('Calling onFeedbackSubmitted after submission');
        onFeedbackSubmitted();
      }

      if (!inlineDisplay && onClose) {
        setTimeout(() => onClose(), 3000);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setToast({
        message: err instanceof Error ? err.message : 'Failed to submit feedback',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasFeedback && !isSubmitted) {
    console.log('Hiding form due to existing feedback');
    return null;
  }

  if (isSubmitted && !inlineDisplay) {
    console.log('Rendering success message');
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
        <div className="relative bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h4 className="text-xl font-semibold text-white mb-3">{displayName}</h4>
            <p className="text-green-400 flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-green-400" /> Thank you for your feedback!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted && inlineDisplay) {
    console.log('Rendering inline success message');
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <h4 className="text-lg font-semibold text-white mb-2">{displayName}</h4>
        <p className="text-green-400 flex items-center gap-1">
          <Star className="h-5 w-5 fill-green-400" /> Thank you for your feedback!
        </p>
      </div>
    );
  }

  console.log('Rendering feedback form');
  const content = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          className="mb-4"
        />
      )}

      <div>
        <h4 className="text-xl font-semibold text-white mb-3">{displayName}</h4>
        <div
          className="flex gap-2 mb-4"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              className="p-1 transition-all duration-200 ease-in-out transform hover:scale-110"
            >
              {(hoverRating || rating) >= value ? (
                <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-7 w-7 text-gray-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value.slice(0, maxFeedbackLength))}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
          rows={4}
          placeholder="Your feedback (optional)"
        />
        <span className="absolute bottom-2 right-3 text-gray-400 text-sm">
          {feedback.length}/{maxFeedbackLength}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !rating}
          className={`relative px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
            isSubmitting || !rating
              ? 'bg-blue-500/50 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </form>
  );

  if (inlineDisplay) {
    return <div className="bg-gray-800 rounded-lg p-4 shadow-md">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="relative bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl transform transition-all duration-300 scale-100">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        )}
        {content}
      </div>
    </div>
  );
}