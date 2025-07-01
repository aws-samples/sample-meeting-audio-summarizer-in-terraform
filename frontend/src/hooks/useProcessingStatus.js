// EMERGENCY DISABLE: This hook is causing API resource exhaustion
// All polling is now handled by ProcessingContext.js

const useProcessingStatus = (fileId, options = {}) => {
  // EMERGENCY DISABLE: This hook is causing API resource exhaustion
  // All polling is now handled by ProcessingContext.js
  console.warn('⚠️ useProcessingStatus hook is DISABLED to prevent API spam');
  
  // Return empty state to prevent any polling
  return {
    status: null,
    loading: false,
    error: null,
    isPolling: false,
    startPolling: () => console.warn('useProcessingStatus polling disabled'),
    stopPolling: () => {},
    refetch: () => Promise.resolve(null),
    resetStatus: () => {}
  };
};

export default useProcessingStatus;
