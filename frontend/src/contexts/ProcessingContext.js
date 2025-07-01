import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { listUserProcessingStatus } from '../graphql/queries';
import { getSummaries } from '../services/api';

const client = generateClient();

const ProcessingContext = createContext();

export const useProcessing = () => {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
};

export const ProcessingProvider = ({ children }) => {
  const [activeProcesses, setActiveProcesses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [summariesLastUpdated, setSummariesLastUpdated] = useState(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // Fetch summaries function
  const fetchSummaries = useCallback(async () => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      const response = await getSummaries(20); // Fetch latest 20 summaries
      
      if (response && response.summaries) {
        setSummaries(response.summaries);
        setSummariesLastUpdated(new Date());
        return response.summaries;
      } else if (response && response.items) {
        // Handle different response format
        setSummaries(response.items);
        setSummariesLastUpdated(new Date());
        return response.items;
      } else {
        setSummaries([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching summaries:', error);
      return [];
    }
  }, [isAuthenticated]);

  // Trigger summary refresh when a process completes
  const refreshSummariesOnCompletion = useCallback(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  // Track notified files to prevent duplicates
  const notifiedFiles = useRef(new Set());

  // Manual cleanup function
  const clearOldProcesses = () => {
    
    // Keep only in-progress processes (not COMPLETE or FAILED)
    const inProgressProcesses = activeProcesses.filter(p => 
      !['COMPLETE', 'FAILED'].includes(p.status)
    );

    setActiveProcesses(inProgressProcesses);
    notifiedFiles.current.clear(); // Clear notification tracking
    setNotifications([]); // Clear ALL notifications
    
  };

  // Clear completed processes only (keep failed ones visible)
  const clearCompletedProcesses = () => {
    
    // Force immediate state update
    setActiveProcesses(prev => {
      const withoutCompleted = prev.filter(p => {
        const shouldKeep = p.status !== 'COMPLETE';
        if (!shouldKeep) {
        } else {
        }
        return shouldKeep;
      });
      
      return withoutCompleted;
    });
    
    // Clear success notifications only
    setNotifications(prev => {
      const filtered = prev.filter(n => n.type !== 'success');
      return filtered;
    });
    
    // Clear completed notification tracking
    const completedKeys = Array.from(notifiedFiles.current).filter(key => key.includes('complete-'));
    completedKeys.forEach(key => {
      notifiedFiles.current.delete(key);
    });
    
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Fetch processing status with optimized updates
  const fetchProcessingStatus = async () => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await client.graphql({
        query: listUserProcessingStatus
      });

      const backendProcesses = response.data.listUserProcessingStatus || [];

      // Mark that we've done initial load
      if (!hasInitialLoad) {
        setHasInitialLoad(true);
      }
      
      // Merge backend processes with frontend-created processes
      setActiveProcesses(prevProcesses => {
        // Check for timed out processes and mark them as failed
        const now = new Date();
        const processesWithTimeoutCheck = backendProcesses.map(process => {
          const processStart = new Date(process.createdAt);
          const timeDiff = (now - processStart) / (1000 * 60); // minutes
          
          if (timeDiff > 15 && !['COMPLETE', 'FAILED'].includes(process.status)) {
            return {
              ...process,
              status: 'FAILED',
              stage: 'Processing timed out',
              progressPercentage: 0,
              error: 'Processing timed out after 15 minutes'
            };
          }
          
          return process;
        });
        
        // Preserve frontend-created processes that don't exist in backend yet
        const frontendOnlyProcesses = prevProcesses.filter(frontendProcess => {
          // Keep frontend processes that:
          // 1. Have a timestamp-based fileId (frontend-created)
          // 2. Don't exist in backend response
          const isFrontendCreated = frontendProcess.fileId && frontendProcess.fileId.includes('-') && 
                                   frontendProcess.fileId.match(/^\d{13}-/); // timestamp-filename pattern
          const existsInBackend = processesWithTimeoutCheck.some(backendProcess => 
            backendProcess.fileId === frontendProcess.fileId ||
            backendProcess.fileName === frontendProcess.fileName
          );
          
          if (isFrontendCreated && !existsInBackend) {
            return true;
          }
          return false;
        });

        // Merge backend processes (with timeout check) with preserved frontend processes
        const mergedProcesses = [...processesWithTimeoutCheck, ...frontendOnlyProcesses];
        
        const hasChanged = JSON.stringify(prevProcesses) !== JSON.stringify(mergedProcesses);
        if (hasChanged) {
          setLastUpdated(new Date());
          return mergedProcesses;
        } else {
        }
        return prevProcesses; // No change, return previous state
      });

      return backendProcesses;
    } catch (err) {
      console.error('Error fetching processing status:', err);
      setError(err.message || 'Failed to fetch processing status');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const addProcess = (process) => {
    
    // Force hasInitialLoad to true when adding a process manually
    if (!hasInitialLoad) {
      setHasInitialLoad(true);
    }
    
    setActiveProcesses(prev => {
      // Clear ALL old processes when adding new ones to prevent stacking
      
      // Check if this process already exists
      const existing = prev.find(p => p.fileId === process.fileId);
      if (existing) {
        return [{ ...existing, ...process }]; // Only keep the updated process
      }
      
      return [process]; // Only keep the new process
    });
    
    // Clear success notifications when starting new upload to avoid confusion
    setNotifications(prev => {
      const filtered = prev.filter(n => n.type !== 'success');
      if (filtered.length !== prev.length) {
      }
      return filtered;
    });
    
  };

  // Update a specific process
  const updateProcess = (fileId, updates) => {
    setActiveProcesses(prev =>
      prev.map(p => p.fileId === fileId ? { ...p, ...updates } : p)
    );
  };

  const removeProcess = (fileId) => {
    setActiveProcesses(prev => prev.filter(p => p.fileId !== fileId));
  };

  // Get active processes (only in-progress, not complete or failed)
  const getActiveProcesses = () => {
    return activeProcesses.filter(p => 
      !['COMPLETE', 'FAILED'].includes(p.status)
    );
  };

  // Get completed processes
  const getCompletedProcesses = () => {
    return activeProcesses.filter(p => p.status === 'COMPLETE');
  };

  // Get failed processes
  const getFailedProcesses = () => {
    return activeProcesses.filter(p => p.status === 'FAILED');
  };

  // Check if there are any active processes
  const hasActiveProcesses = () => {
    return getActiveProcesses().length > 0;
  };

  // Auto-refresh active processes - SIMPLIFIED AND MORE RELIABLE POLLING
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    // Do initial load if we haven't done it yet
    if (!hasInitialLoad) {
      fetchProcessingStatus();
      return;
    }
    
    // Start polling immediately and continue for 15 minutes
    const startTime = Date.now();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes

    // Poll immediately
    fetchProcessingStatus();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < fifteenMinutes) {
        fetchProcessingStatus();
      } else {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated, hasInitialLoad]); // Simplified dependencies

  // Check auth status on mount and when it changes
  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuthStatus();
      
      // If authenticated, do initial summary fetch (but only once)
      if (isAuthenticated && summaries.length === 0) {
        fetchSummaries();
      }
    };
    
    initializeAuth();
    
    // Clear notification tracking on mount to prevent stale notifications
    notifiedFiles.current.clear();
    
    // Auto-clear completed processes on page load/refresh
    setActiveProcesses(prev => {
      const inProgressOnly = prev.filter(p => !['COMPLETE', 'FAILED'].includes(p.status));
      if (inProgressOnly.length !== prev.length) {
      }
      return inProgressOnly;
    });
    
  }, []); // Only run once on mount

  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id, timestamp: new Date() };
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Watch for status changes and show notifications - DISABLED AUTO-REMOVAL
  useEffect(() => {
    if (!isAuthenticated || activeProcesses.length === 0) return;

    // Only process notifications for COMPLETE processes to reduce noise
    const completedProcesses = activeProcesses.filter(p => p.status === 'COMPLETE');
    
    completedProcesses.forEach(process => {
      // Handle completed processes
      const notificationKey = `complete-${process.fileId}-${process.fileName}`;
      if (!notifiedFiles.current.has(notificationKey)) {
        notifiedFiles.current.add(notificationKey);
        
        // Trigger summary refresh when process completes
        refreshSummariesOnCompletion();
        
        // Auto-remove completed process after 15 seconds to clean up UI
        setTimeout(() => {
          setActiveProcesses(prev => prev.filter(p => p.fileId !== process.fileId));
          // Also clear from notification tracking
          notifiedFiles.current.delete(notificationKey);
        }, 15000); // 15 seconds to let user see completion
      }
    });
  }, [
    // Only trigger when completed processes change, not all processes
    activeProcesses.filter(p => p.status === 'COMPLETE').map(p => `${p.fileId}-${p.fileName}`).join(','),
    isAuthenticated,
    addNotification,
    refreshSummariesOnCompletion
  ]);

  // Function to manually trigger polling (useful after uploads)
  const triggerPolling = useCallback(() => {
    fetchProcessingStatus();
    
    // Set recent upload flag to ensure polling continues
    localStorage.setItem('lastUploadTime', Date.now().toString());
  }, [fetchProcessingStatus]);

  const value = {
    // State
    activeProcesses,
    isLoading,
    error,
    lastUpdated,
    notifications,
    summariesLastUpdated, // Add summaries timestamp
    isAuthenticated,

    // Actions
    fetchProcessingStatus,
    refreshSummariesOnCompletion, // Add summary refresh trigger
    addProcess,
    updateProcess,
    removeProcess,
    clearOldProcesses, // Clear all old processes
    clearCompletedProcesses, // Clear only completed processes
    addNotification,
    removeNotification,
    checkAuthStatus,

    // Computed values
    getActiveProcesses,
    getCompletedProcesses,
    getFailedProcesses,
    hasActiveProcesses,

    // Stats
    totalProcesses: activeProcesses.length,
    activeCount: getActiveProcesses().length,
    completedCount: getCompletedProcesses().length,
    failedCount: getFailedProcesses().length
  };

  return (
    <ProcessingContext.Provider value={value}>
      {children}
    </ProcessingContext.Provider>
  );
};

export default ProcessingContext;
