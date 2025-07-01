import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProcessing } from '../../contexts/ProcessingContext';

const ProcessingProgressBar = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProcesses, refreshSummariesOnCompletion, clearCompletedProcesses } = useProcessing();
  
  const [dismissedProcesses, setDismissedProcesses] = useState(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const [progressBarId] = useState(() => `pb-${Date.now()}-${Math.random()}`);
  const [patienceMessage, setPatienceMessage] = useState('');
  const [showPatienceMessage, setShowPatienceMessage] = useState(false);
  const [processedCompletions, setProcessedCompletions] = useState(new Set());

  // Show processes immediately when they exist
  const visibleProcesses = useMemo(() => {
    // Show processes as soon as they exist
    if (activeProcesses.length === 0) {
      return [];
    }
    
    const filtered = activeProcesses.filter(process => {
      const isDismissed = dismissedProcesses.has(`${process.fileId}-${progressBarId}`);
      return !isDismissed;
    });
    
    return filtered;
  }, [activeProcesses, dismissedProcesses, progressBarId]);

  // Patience message system for long-running processes
  useEffect(() => {
    const inProgressProcesses = visibleProcesses.filter(p => 
      !['COMPLETE', 'FAILED'].includes(p.status)
    );

    if (inProgressProcesses.length === 0) {
      setShowPatienceMessage(false);
      setPatienceMessage('');
      return;
    }

    const patienceMessages = [
      "Please be patient, we're processing your audio file...",
      "Audio processing can take a few minutes depending on file size.",
      "We're working hard to generate your summary!",
      "Almost there! Processing is still in progress...",
      "Thank you for your patience while we analyze your audio.",
      "Quality takes time - we're creating the best summary for you!"
    ];

    let messageIndex = 0;
    let patienceInterval;
    let hideTimeout;

    // Start patience messages after 1 minute (60 seconds)
    const initialTimeout = setTimeout(() => {
      const showMessage = () => {
        setPatienceMessage(patienceMessages[messageIndex % patienceMessages.length]);
        setShowPatienceMessage(true);
        messageIndex++;

        // Hide message after 30 seconds for first message, then 15 seconds for subsequent
        const hideDelay = messageIndex === 1 ? 30000 : 15000;
        hideTimeout = setTimeout(() => {
          setShowPatienceMessage(false);
        }, hideDelay);
      };

      // Show first message immediately
      showMessage();

      // Then show messages every minute (60 seconds)
      patienceInterval = setInterval(showMessage, 60000);
    }, 60000); // 1 minute

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(patienceInterval);
      clearTimeout(hideTimeout);
      setShowPatienceMessage(false);
      setPatienceMessage('');
    };
  }, [visibleProcesses]);

  // Memoize completed processes count to prevent unnecessary re-renders
  const completedProcessesCount = useMemo(() => 
    visibleProcesses.filter(p => p.status === 'COMPLETE').length, 
    [visibleProcesses]
  );

  // Simple completion handling - refresh summaries but only once per completion
  useEffect(() => {
    const completedProcesses = visibleProcesses.filter(p => p.status === 'COMPLETE');
    
    if (completedProcesses.length > 0) {
      // Check if we've already processed these completions to prevent repeated actions
      const newCompletions = completedProcesses.filter(p => 
        !processedCompletions.has(p.fileId)
      );
      
      if (newCompletions.length > 0) {
        // Mark these as processed to prevent repeated handling
        setProcessedCompletions(prev => {
          const newSet = new Set(prev);
          newCompletions.forEach(p => newSet.add(p.fileId));
          return newSet;
        });
        
        // Handle completion actions only once per file
        const currentPath = window.location.pathname;
        const userOnSummariesPage = currentPath === '/summaries';

        if (userOnSummariesPage) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshSummariesPage', {
              detail: { 
                reason: 'processing_complete',
                fileIds: newCompletions.map(p => p.fileId),
                timestamp: Date.now()
              }
            }));
          }, 2000); // 2 second delay to allow backend processing
        } else {
          // Just do the basic refresh for other pages
          refreshSummariesOnCompletion();
        }
      }
    }
  }, [completedProcessesCount, processedCompletions, refreshSummariesOnCompletion]);

  // Only clear dismissed processes when there are no active processes at all
  useEffect(() => {
    // If there are no active processes, clear all dismissed processes
    // This allows fresh start when user uploads new files
    if (activeProcesses.length === 0 && dismissedProcesses.size > 0) {
      setDismissedProcesses(new Set());
      // Also clear from localStorage
      try {
        localStorage.removeItem('dismissedProcesses');
      } catch (error) {
        console.error('Error clearing dismissed processes from localStorage:', error);
      }
    }
  }, [activeProcesses.length, dismissedProcesses.size]);
  useEffect(() => {
    
    if (visibleProcesses.length > 0) {
    } else {
    }
  }, [activeProcesses, visibleProcesses, dismissedProcesses]);

  const handleDismiss = (fileId) => {
    
    const dismissKey = `${fileId}-${progressBarId}`;
    setDismissedProcesses(prev => {
      const newSet = new Set([...prev, dismissKey]);
      return newSet;
    });
    
    // Also remove from global context to prevent stacking
    if (typeof clearCompletedProcesses === 'function') {
      clearCompletedProcesses();
    }
    
  };

  // Memoize clean status names for display
  const getCleanStatus = useMemo(() => {
    return (status) => {
      const cleanStatusMap = {
        'UPLOADED': 'Uploaded',
        'TRANSCRIBING': 'Transcribing',
        'TRANSCRIPTION_COMPLETE': 'Transcribing',
        'SUMMARIZING': 'Summarizing',
        'FAILED': 'Failed',
        'COMPLETE': 'Complete'
      };
      return cleanStatusMap[status] || status;
    };
  }, []);

  // Memoize status color function
  const getStatusColor = useMemo(() => {
    return (status) => {
      switch (status) {
        case 'COMPLETE': return 'text-green-600 bg-green-50';
        case 'FAILED': return 'text-red-600 bg-red-50';
        case 'SUMMARIZING': return 'text-purple-600 bg-purple-50';
        case 'TRANSCRIBING': 
        case 'TRANSCRIPTION_COMPLETE': return 'text-blue-600 bg-blue-50';
        default: return 'text-indigo-600 bg-indigo-50';
      }
    };
  }, []);

  // Memoize progress calculation
  const getProgressPercentage = useMemo(() => {
    return (status) => {
      switch (status) {
        case 'UPLOADED': return 10;
        case 'TRANSCRIBING': return 30;
        case 'TRANSCRIPTION_COMPLETE': return 60;
        case 'SUMMARIZING': return 80;
        case 'COMPLETE': return 100;
        case 'FAILED': return 0;
        default: return 5;
      }
    };
  }, []);

  // Memoize status description
  const formatStatus = useMemo(() => {
    return (status) => {
      switch (status) {
        case 'UPLOADED': return 'File uploaded successfully';
        case 'TRANSCRIBING': return 'Converting speech to text...';
        case 'TRANSCRIPTION_COMPLETE': return 'Transcription complete, preparing summary...';
        case 'SUMMARIZING': return 'Generating meeting summary...';
        case 'COMPLETE': return 'Processing complete!';
        case 'FAILED': return 'Processing failed';
        default: return 'Processing...';
      }
    };
  }, []);

  // Don't render if no visible processes
  if (visibleProcesses.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg w-full">{/* Made wider: max-w-md -> max-w-lg */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">
              Processing Audio Files ({visibleProcesses.length})
            </h3>
            <div className="flex items-center space-x-2">
              {/* Minimize/Maximize button */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:text-blue-100 transition-colors p-1"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMinimized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          
          {/* Minimized state summary */}
          {isMinimized && (
            <div className="mt-2 space-y-1">
              {visibleProcesses.map((process) => (
                <div key={process.fileId} className="flex items-center justify-between text-xs">
                  <span className="text-blue-100 truncate flex-1 mr-2">
                    {process.fileName}
                  </span>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-blue-200">
                      {getCleanStatus(process.status)}
                    </span>
                    <span className="text-white font-medium">
                      {getProgressPercentage(process.status)}%
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Patience message in minimized state */}
              {showPatienceMessage && (
                <div className="mt-2 pt-2 border-t border-blue-400 border-opacity-30">
                  <div className="text-xs text-blue-100 text-center animate-pulse">
                    💫 {patienceMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible content */}
        {!isMinimized && (
          <div className="max-h-96 overflow-y-auto">
          {visibleProcesses.map((process) => (
            <div key={process.fileId} className="p-4 border-b border-gray-100 last:border-b-0">
              {/* File info header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {process.fileName}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-gray-600 font-medium">
                        {formatStatus(process.status)}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(process.status)}`}>
                        Status: {getCleanStatus(process.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dismiss button - more prominent for completed processes */}
                <button
                  onClick={() => handleDismiss(process.fileId)}
                  className={`ml-2 p-1 transition-colors flex-shrink-0 ${
                    process.status === 'COMPLETE' 
                      ? 'text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">Progress</span>
                  <span className="text-xs font-medium text-gray-700">
                    {getProgressPercentage(process.status)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${
                      process.status === 'FAILED' 
                        ? 'bg-red-500' 
                        : process.status === 'COMPLETE'
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}
                    style={{ width: `${getProgressPercentage(process.status)}%` }}
                  />
                </div>
              </div>

              {/* Success message for completed processes */}
              {process.status === 'COMPLETE' && (
                <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-green-800">
                      Processing Complete! 🎉
                    </p>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Processing complete!
                  </p>
                </div>
              )}

              {/* Patience message for expanded view */}
              {showPatienceMessage && !['COMPLETE', 'FAILED'].includes(process.status) && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <span className="text-sm text-blue-700 font-medium">
                      {patienceMessage}
                    </span>
                  </div>
                </div>
              )}

              {/* Modern action button */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    // Minimize the progress bar
                    setIsMinimized(true);
                    // Navigate to the detailed processing status page with location state
                    const currentPage = location.pathname === '/summaries' ? 'summaries' : 
                                       location.pathname === '/upload' ? 'upload' : 'dashboard';
                    navigate(`/processing/${process.fileId}`, { 
                      state: { from: currentPage } 
                    });
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  View Processing Details
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
});

ProcessingProgressBar.displayName = 'ProcessingProgressBar';

export default ProcessingProgressBar;
