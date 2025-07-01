import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProcessing } from '../contexts/ProcessingContext';

const ProcessingStatus = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { activeProcesses } = useProcessing();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [patienceMessage, setPatienceMessage] = useState('');
  const [showPatienceMessage, setShowPatienceMessage] = useState(false);

  // Find the specific process
  const process = activeProcesses.find(p => p.fileId === fileId);

  useEffect(() => {
    if (process && process.status === 'COMPLETE') {
      setShowSuccessMessage(true);
      // Elegant redirect with smooth transition after 3 seconds
      setTimeout(() => {
        const card = document.querySelector('.processing-card');
        if (card) {
          card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
          card.style.opacity = '0';
          card.style.transform = 'translateY(-20px)';
        }
        
        // Navigate after fade out
        setTimeout(() => {
          navigate('/summaries');
        }, 500);
      }, 3000);
    }
  }, [process, navigate]);

  // Patience message system for process status page
  useEffect(() => {
    if (!process || ['COMPLETE', 'FAILED'].includes(process.status)) {
      setShowPatienceMessage(false);
      setPatienceMessage('');
      return;
    }

    const patienceMessages = [
      "Please be patient while we process your audio file...",
      "Audio processing takes time to ensure the best quality results.",
      "We're analyzing your audio to create a comprehensive summary.",
      "Almost there! Our AI is working on your summary...",
      "Thank you for waiting - quality processing takes time.",
      "We're creating the most accurate summary possible for you!"
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
  }, [process]);

  if (!process) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Process Not Found</h2>
            <p className="text-gray-600 mb-6">
              The processing job you're looking for could not be found or may have completed.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStageProgress = (stageName, currentStatus, currentProgress) => {
    const stageOrder = ['UPLOADED', 'TRANSCRIBING', 'SUMMARIZING', 'COMPLETE'];
    const currentStageIndex = stageOrder.indexOf(currentStatus === 'TRANSCRIPTION_COMPLETE' ? 'TRANSCRIBING' : currentStatus);
    const stageIndex = stageOrder.indexOf(stageName);
    
    if (stageIndex < currentStageIndex) {
      // Stage is completed
      return { progress: 100, isCompleted: true, isCurrent: false };
    } else if (stageIndex === currentStageIndex) {
      // Current stage
      return { progress: currentProgress || 0, isCompleted: false, isCurrent: true };
    } else {
      // Future stage
      return { progress: 0, isCompleted: false, isCurrent: false };
    }
  };

  const stages = [
    { 
      key: 'UPLOADED', 
      title: 'File Upload', 
      desc: 'Audio file uploaded successfully'
    },
    { 
      key: 'TRANSCRIBING', 
      title: 'Speech to Text', 
      desc: 'Converting audio to text transcript'
    },
    { 
      key: 'SUMMARIZING', 
      title: 'AI Summary', 
      desc: 'Generating intelligent meeting summary'
    },
    { 
      key: 'COMPLETE', 
      title: 'Complete', 
      desc: 'Processing finished successfully'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-4 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Nice Header Above Card */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Audio Processing Pipeline
          </h1>
          <p className="text-gray-600 text-sm mb-4">Real-time processing status for your audio file</p>
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center mx-auto space-x-1 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Main Processing Card - Wider and Smaller Height */}
        <div className="processing-card bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500">
          {/* File Info Header - Compact */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-6 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
            </div>
            
            <div className="relative flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white/90 mb-1">
                  {process.fileName || 'Processing Audio File'}
                </h2>
                <p className="text-indigo-100 text-sm">
                  {process.stage || 'Processing your audio file...'}
                </p>
              </div>
            </div>
          </div>

          {/* Stage Progress Section - Compact */}
          <div className="p-6">
            <div className="grid grid-cols-4 gap-6 mb-6">
              {stages.map((stage, index) => {
                const stageProgress = getStageProgress(stage.key, process.status, process.progressPercentage);
                
                return (
                  <div key={stage.key} className="relative">
                    {/* Horizontal Connector Line */}
                    {index < stages.length - 1 && (
                      <div className={`absolute top-8 left-16 right-0 h-0.5 ${
                        stageProgress.isCompleted ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gray-200'
                      }`}></div>
                    )}
                    
                    <div className="text-center relative z-10">
                      {/* Status Circle */}
                      <div className={`w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg transition-all duration-500 ${
                        stageProgress.isCompleted 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-200' 
                          : stageProgress.isCurrent 
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200 animate-pulse' 
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {stageProgress.isCompleted ? (
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : stageProgress.isCurrent ? (
                          <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-4 h-4 bg-current rounded-full opacity-30"></div>
                        )}
                      </div>
                      
                      {/* Stage Content */}
                      <div>
                        <h3 className={`text-sm font-semibold mb-1 transition-colors duration-300 ${
                          stageProgress.isCompleted 
                            ? 'text-green-700' 
                            : stageProgress.isCurrent 
                              ? 'text-indigo-700' 
                              : 'text-gray-500'
                        }`}>
                          {stage.title}
                        </h3>
                        
                        <p className={`text-xs mb-2 transition-colors duration-300 ${
                          stageProgress.isCompleted 
                            ? 'text-green-600' 
                            : stageProgress.isCurrent 
                              ? 'text-indigo-600' 
                              : 'text-gray-400'
                        }`}>
                          {stage.desc}
                        </p>
                        
                        {/* Progress Percentage */}
                        {stageProgress.isCurrent && (
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-sm font-medium text-indigo-600">
                              {Math.round(stageProgress.progress)}%
                            </span>
                            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Full-Width Progress Bar Under Status */}
            {(() => {
              const currentStage = stages.find(stage => {
                const stageProgress = getStageProgress(stage.key, process.status, process.progressPercentage);
                return stageProgress.isCurrent;
              });
              
              if (currentStage) {
                const stageProgress = getStageProgress(currentStage.key, process.status, process.progressPercentage);
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-indigo-700">
                        {currentStage.title} in Progress
                      </span>
                      <span className="text-sm font-bold text-indigo-600">
                        {Math.round(stageProgress.progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${stageProgress.progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Patience Message */}
            {showPatienceMessage && !showSuccessMessage && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-800 mb-1">Processing in Progress</h3>
                    <p className="text-sm text-blue-700">{patienceMessage}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Success Message - Compact */}
            {showSuccessMessage && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-green-800">Processing Complete!</h3>
                    <p className="text-sm text-green-700">Taking you to your summaries...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatus;
