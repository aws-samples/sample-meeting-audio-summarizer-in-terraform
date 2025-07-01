import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProcessing } from '../../contexts/ProcessingContext';

const GlobalProgressBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    return () => {
    };
  }, []);
  
  const { 
    activeProcesses: allProcesses, // Get all processes, not just filtered active ones
    isAuthenticated 
  } = useProcessing();

  // Show progress bar for any processes that exist (including completed ones briefly)
  // OR if there are any processes at all (for debugging)
  const isVisible = isAuthenticated && allProcesses.length > 0;
  
  // Show progress bar when authenticated and has processes
  const shouldShow = isAuthenticated && allProcesses.length > 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'UPLOADED':
        return 'bg-blue-500';
      case 'TRANSCRIBING':
        return 'bg-yellow-500';
      case 'TRANSCRIPTION_COMPLETE':
        return 'bg-orange-500';
      case 'SUMMARIZING':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'UPLOADED':
        return '📁';
      case 'TRANSCRIBING':
        return '🎤';
      case 'TRANSCRIPTION_COMPLETE':
        return '📝';
      case 'SUMMARIZING':
        return '🤖';
      default:
        return '⏳';
    }
  };

  const handleViewDetails = (fileId) => {
    // Pass location state like ProcessingProgressBar does
    const currentPage = location.pathname === '/summaries' ? 'summaries' : 
                       location.pathname === '/upload' ? 'upload' : 'dashboard';
    navigate(`/processing/${fileId}`, { 
      state: { from: currentPage } 
    });
  };

  const handleMinimize = () => {
    setIsExpanded(false);
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg border-b border-gray-200">
      {/* Compact View */}
      {!isExpanded && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm font-medium text-gray-700">
                  {allProcesses.length} file{allProcesses.length !== 1 ? 's' : ''} processing
                </span>
              </div>
              
              {/* Mini progress indicators */}
              <div className="flex space-x-2">
                {allProcesses.slice(0, 3).map((process) => (
                  <div key={process.fileId} className="flex items-center space-x-1">
                    <span className="text-xs">{getStatusIcon(process.status)}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${getStatusColor(process.status)}`}
                        style={{ width: `${process.progressPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{process.progressPercentage}%</span>
                  </div>
                ))}
                {allProcesses.length > 3 && (
                  <span className="text-xs text-gray-500">+{allProcesses.length - 3} more</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExpand}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Details
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-4 py-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Processing Status ({allProcesses.length} active)
              </h3>
              <button
                onClick={handleMinimize}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {allProcesses.map((process) => (
                <div
                  key={process.fileId}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getStatusIcon(process.status)}</span>
                      <div>
                        <h4 className="font-medium text-gray-800 truncate max-w-xs">
                          {process.fileName || `File ${process.fileId.slice(-8)}`}
                        </h4>
                        <p className="text-sm text-gray-600">{process.stage}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">
                        {process.progressPercentage}%
                      </span>
                      <button
                        onClick={() => handleViewDetails(process.fileId)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(process.status)}`}
                      style={{ width: `${process.progressPercentage}%` }}
                    ></div>
                  </div>

                  {/* Time info */}
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Started: {new Date(process.createdAt).toLocaleTimeString()}</span>
                    <span>Updated: {new Date(process.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {allProcesses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>No active processing tasks</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalProgressBar;
