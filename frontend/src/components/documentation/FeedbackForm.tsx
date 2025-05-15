import { useState } from 'react';
import { Star, StarOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface FeedbackFormProps {
  path: string;
  level: string;
  onSubmit: () => void;
}

export default function FeedbackForm({ path, level, onSubmit }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth() || {};  // Ensures destructuring doesn't fail


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating || !feedback.trim()) {
      setError('Please provide both rating and feedback');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create FormData object to match backend expectations
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('path', path);
      formData.append('level', level);
      formData.append('feedback', feedback.trim());
      formData.append('rating', rating.toString());

      const response = await fetch('http://localhost:8000/api/feedback', {
        method: 'POST',
        // Remove Content-Type header - browser will set it automatically with boundary
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit feedback');
      }

      setFeedback('');
      setRating(0);
      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-700 mt-8 pt-8">
      <h3 className="text-xl font-semibold text-white mb-4">Help Us Improve</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Rate this evaluation
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="p-1 hover:text-yellow-400 transition-colors"
            >
              {value <= rating ? (
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-6 w-6" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="feedback" className="block text-sm font-medium text-gray-300 mb-2">
          Your Feedback
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          rows={4}
          placeholder="What did you think about this evaluation? How can we improve it?"
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`px-4 py-2 rounded-lg text-white transition-colors ${
          isSubmitting 
            ? 'bg-blue-500/50 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
}