import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const ProcessingDetail = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProcesses } = useProcessing();

  // Determine where user came from for dynamic back button
  const fromPage = location.state?.from || 'dashboard';

  const getBackButtonText = () => {
    const text = (() => {
      switch (fromPage) {
        case 'summaries':
          return 'Back to Summaries';
        case 'upload':
          return 'Back to Upload';
        default:
          return 'Back to Dashboard';
      }
    })();
    return text;
  };

  const getBackButtonPath = () => {
    switch (fromPage) {
      case 'summaries':
        return '/summaries';
      case 'upload':
        return '/upload';
      default:
        return '/';
    }
  };

  // Find the specific process
  const process = activeProcesses.find(p => p.fileId === fileId);
  const [redirectCountdown, setRedirectCountdown] = useState(null);

  // Auto-redirect with countdown when process is complete - ONLY if still on this page
  useEffect(() => {
    if (process && process.status === 'COMPLETE') {
      setRedirectCountdown(5);
      
      const countdownInterval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Only redirect if we're still on the processing detail page
            if (location.pathname.includes('/processing/')) {
              navigate('/summaries');
            } else {
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(countdownInterval);
      };
    }
  }, [process?.status, navigate, location.pathname]);

  if (!process) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Process Not Found</h2>
            <p className="text-gray-600 mb-6">
              The processing job you're looking for could not be found or may have completed.
            </p>
            <Button onClick={() => navigate(getBackButtonPath())}>
              {getBackButtonText()}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Map status to stage information
  const getStageInfo = (status) => {
    const stages = {
      'UPLOADED': {
        title: 'File Uploaded',
        description: 'Your audio file has been successfully uploaded and is queued for processing.',
        icon: '📁',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      'TRANSCRIBING': {
        title: 'Transcribing Audio',
        description: 'Converting your audio to text using advanced speech recognition.',
        icon: '🎤',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      },
      'SUMMARIZING': {
        title: 'Generating Summary',
        description: 'Creating an intelligent summary of your meeting using AI.',
        icon: '🤖',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      'COMPLETE': {
        title: 'Processing Complete',
        description: 'Your meeting summary is ready to view!',
        icon: '✅',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      'FAILED': {
        title: 'Processing Failed',
        description: 'There was an error processing your file. Please try again.',
        icon: '❌',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      }
    };
    return stages[status] || stages['UPLOADED'];
  };

  const stageInfo = getStageInfo(process.status);
  const progress = process.progressPercentage || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Processing Details</h1>
          <p className="text-gray-600 mt-1">Track the progress of your audio processing</p>
        </div>
        <Button variant="outline" onClick={() => navigate(getBackButtonPath())}>
          {getBackButtonText()}
        </Button>
      </div>

      {/* Main Processing Card */}
      <Card>
        <div className="p-6">
          {/* File Info */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {process.fileName || 'Unknown File'}
            </h2>
            <p className="text-sm text-gray-500">
              File ID: {process.fileId}
            </p>
          </div>

          {/* Current Stage */}
          <div className={`rounded-lg p-4 mb-6 ${stageInfo.bgColor}`}>
            <div className="flex items-center">
              <span className="text-2xl mr-3">{stageInfo.icon}</span>
              <div>
                <h3 className={`text-lg font-semibold ${stageInfo.color}`}>
                  {stageInfo.title}
                </h3>
                <p className="text-gray-700 text-sm">
                  {stageInfo.description}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage Details */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">Processing Stages</h4>
            
            {/* Stage Timeline */}
            <div className="space-y-3">
              {[
                { key: 'UPLOADED', title: 'File Upload', desc: 'Audio file uploaded successfully' },
                { key: 'TRANSCRIBING', title: 'Speech to Text', desc: 'Converting audio to text transcript' },
                { key: 'SUMMARIZING', title: 'AI Summary', desc: 'Generating intelligent meeting summary' },
                { key: 'COMPLETE', title: 'Complete', desc: 'Processing finished successfully' }
              ].map((stage, index) => {
                const isCompleted = ['TRANSCRIBING', 'SUMMARIZING', 'COMPLETE'].includes(process.status) && 
                                  (stage.key === 'UPLOADED' || 
                                   (stage.key === 'TRANSCRIBING' && ['SUMMARIZING', 'COMPLETE'].includes(process.status)) ||
                                   (stage.key === 'SUMMARIZING' && process.status === 'COMPLETE') ||
                                   (stage.key === 'COMPLETE' && process.status === 'COMPLETE'));
                const isCurrent = stage.key === process.status || 
                                 (stage.key === 'TRANSCRIBING' && process.status === 'TRANSCRIPTION_COMPLETE');
                
                return (
                  <div key={stage.key} className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${
                      isCompleted ? 'bg-green-500' : 
                      isCurrent ? 'bg-indigo-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {stage.title}
                      </p>
                      <p className="text-xs text-gray-500">{stage.desc}</p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-indigo-600 font-medium">Current</span>
                    )}
                    {isCompleted && stage.key !== process.status && (
                      <span className="text-xs text-green-600 font-medium">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {process.status === 'COMPLETE' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              {redirectCountdown !== null ? (
                <div className="text-center mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 font-medium">
                      🎉 Processing Complete! 
                    </p>
                    <p className="text-blue-600 text-sm mt-1">
                      Redirecting to Summaries in {redirectCountdown} seconds...
                    </p>
                    <Button 
                      onClick={() => {
                        setRedirectCountdown(null);
                        navigate('/summaries');
                      }}
                      className="mt-2 text-sm"
                      variant="outline"
                    >
                      Go Now
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => navigate('/summaries')} className="w-full">
                  View Summary
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProcessingDetail;
