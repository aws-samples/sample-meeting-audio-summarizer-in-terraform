import React from 'react';

const ProgressTracker = ({ status, stage, progressPercentage, fileName, errorMessage }) => {
  const getStatusColor = (currentStatus) => {
    switch (currentStatus) {
      case 'UPLOADED':
        return 'bg-blue-500';
      case 'TRANSCRIBING':
        return 'bg-yellow-500';
      case 'TRANSCRIPTION_COMPLETE':
        return 'bg-orange-500';
      case 'SUMMARIZING':
        return 'bg-purple-500';
      case 'COMPLETE':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = (currentStatus) => {
    switch (currentStatus) {
      case 'UPLOADED':
        return '✅';
      case 'TRANSCRIBING':
        return '🔄';
      case 'TRANSCRIPTION_COMPLETE':
        return '📝';
      case 'SUMMARIZING':
        return '🤖';
      case 'COMPLETE':
        return '🎉';
      case 'FAILED':
        return '❌';
      default:
        return '⏳';
    }
  };

  const stages = [
    { key: 'UPLOADED', label: 'File Uploaded', description: 'File uploaded successfully' },
    { key: 'TRANSCRIBING', label: 'Transcribing', description: 'Converting speech to text' },
    { key: 'TRANSCRIPTION_COMPLETE', label: 'Transcription Complete', description: 'Transcription completed' },
    { key: 'SUMMARIZING', label: 'Summarizing', description: 'Generating meeting summary' },
    { key: 'COMPLETE', label: 'Complete', description: 'Processing complete' }
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(s => s.key === status);
  };

  const currentStageIndex = getCurrentStageIndex();

  if (status === 'FAILED') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">Processing Failed</h3>
          <p className="text-gray-600 mb-4">
            There was an error processing your file: {fileName}
          </p>
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-left">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Processing: {fileName}
        </h3>
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-2">{getStatusIcon(status)}</span>
          <span className="text-sm font-medium text-gray-700">{stage}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(status)}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="space-y-3">
        {stages.map((stageItem, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div key={stageItem.key} className="flex items-center">
              <div className={`
                w-4 h-4 rounded-full mr-3 flex-shrink-0
                ${isCompleted ? 'bg-green-500' : ''}
                ${isCurrent ? getStatusColor(status) : ''}
                ${isPending ? 'bg-gray-300' : ''}
              `}>
                {isCompleted && (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className={`
                  text-sm font-medium
                  ${isCompleted ? 'text-green-600' : ''}
                  ${isCurrent ? 'text-gray-800' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}>
                  {stageItem.label}
                </div>
                <div className={`
                  text-xs
                  ${isCompleted ? 'text-green-500' : ''}
                  ${isCurrent ? 'text-gray-600' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}>
                  {stageItem.description}
                </div>
              </div>
              {isCurrent && status === 'TRANSCRIBING' && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                </div>
              )}
              {isCurrent && status === 'SUMMARIZING' && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {status === 'COMPLETE' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700 text-center">
            🎉 Your meeting summary is ready! You can now view it in your summaries list.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
