import { useEffect, useState } from 'react';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface GenerationStatus {
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  error: string | null;
  project_name?: string;
  start_time?: string;
  completion_time?: string;
  failure_time?: string;
}

interface GeneratingDocumentationProps {
  progressKey: string;
  onComplete: () => void;
}

export default function GeneratingDocumentation({ progressKey, onComplete }: GeneratingDocumentationProps) {
  const [status, setStatus] = useState<GenerationStatus>({
    status: 'in_progress',
    progress: 0,
    current_step: 'Initializing...',
    error: null
  });
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let timeoutId: number;
    let mounted = true;

    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/generate/status/${progressKey}`);
        
        if (!mounted) return;

        if (!response.ok) {
          if (response.status === 404 && retryCount < MAX_RETRIES) {
            // Handle potential race condition with slight delay
            setRetryCount(prev => prev + 1);
            timeoutId = setTimeout(checkStatus, 1000);
            return;
          }
          throw new Error(`Status check failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        setStatus(data);
        setRetryCount(0); // Reset retry count on successful request

        if (data.status === 'completed') {
          // Clean up status after completion
          fetch(`http://localhost:8000/api/generate/status/${progressKey}`, {
            method: 'DELETE'
          }).catch(console.error);
          
          setTimeout(onComplete, 1500);
        } else if (data.status === 'in_progress') {
          timeoutId = setTimeout(checkStatus, 1000);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            status: 'failed',
            error: 'Failed to fetch generation status'
          }));
        }
      }
    };

    checkStatus();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [progressKey, onComplete, retryCount]);

  const steps = [
    {
      id: 1,
      title: 'Step 1',
      description: 'Fetching files from the codebase',
      status: status.progress >= 20 ? 'completed' : 
             status.progress > 0 ? 'in-progress' : 'pending'
    },
    {
      id: 2,
      title: 'Step 2',
      description: 'Analyzing the code',
      status: status.progress >= 40 ? 'completed' :
             status.progress >= 20 ? 'in-progress' : 'pending'
    },
    {
      id: 3,
      title: 'Step 3',
      description: 'Generating the document',
      status: status.progress >= 100 ? 'completed' :
             status.progress >= 40 ? 'in-progress' : 'pending'
    }
  ];

  if (status.error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-4">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <h1 className="text-4xl font-bold text-red-400">
              Generation Failed
            </h1>
          </div>
          <p className="text-gray-400">{status.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <h1 className="text-4xl font-bold text-white mb-8">
          Generating Your Documentation...
        </h1>
        
        <div className="mb-8">
          <div className="h-2 bg-gray-700 rounded-full">
            <div 
              className="h-2 bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-gray-400 mt-2">{status.current_step}</p>
          <p className="text-sm text-gray-500">This process may take a few minutes.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Detailed steps</h2>
          {steps.map(step => (
            <div
              key={step.id}
              className="flex items-center space-x-4"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                step.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-800 text-gray-400'
              }`}>
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : step.status === 'in-progress' ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div>
                <h3 className="font-medium text-white">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}