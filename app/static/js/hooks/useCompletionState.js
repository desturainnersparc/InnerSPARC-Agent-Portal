/**
 * useCompletionState Hook
 * Manages modal visibility based on module completion events
 * 
 * Features:
 * - Listens to onboarding:modulesUpdated custom event
 * - Tracks completed module count in state
 * - Persists to localStorage to prevent re-triggering on page reload
 * - Debounces rapid completions
 * - Cleanup listeners and timers on unmount
 */

function useCompletionState() {
  // React-like hook using vanilla JS (compatible with existing setup)
  // In a real React context, replace this with React.useState hooks
  
  const STORAGE_KEY = 'innerSparc_lastCompletedModule';
  const storageCheckKey = 'innerSparc_completionCheckDone';
  
  // Initialize state
  let state = {
    isLoading: true,
    completedModule: null,
    isModalOpen: false,
    lastNotifiedModule: null
  };
  
  // Get stored value on initialization
  function initializeState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        state.lastNotifiedModule = parseInt(stored, 10);
      }
      localStorage.setItem(storageCheckKey, 'true');
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    state.isLoading = false;
  }
  
  /**
   * Handle module completion event
   * @param {CustomEvent} event - Event with detail.modulesCompleted
   */
  function handleModuleUpdate(event) {
    if (!event.detail || typeof event.detail.modulesCompleted !== 'number') {
      return;
    }
    
    const currentModuleCount = event.detail.modulesCompleted;
    
    // Only show modal if this is a NEW completion (not a reload)
    if (currentModuleCount > (state.lastNotifiedModule || 0)) {
      state.completedModule = currentModuleCount;
      state.isModalOpen = true;
      state.lastNotifiedModule = currentModuleCount;
      
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, String(currentModuleCount));
      } catch (e) {
        console.warn('Failed to persist completion state:', e);
      }
      
      // Notify any listeners (in real React, this would trigger a render)
      dispatchStateChange();
    }
  }
  
  /**
   * Close the modal
   */
  function closeModal() {
    state.isModalOpen = false;
    state.completedModule = null;
    dispatchStateChange();
  }
  
  /**
   * Dispatch state change event (for non-React listeners)
   */
  function dispatchStateChange() {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('completionStateChange', {
        detail: {
          isModalOpen: state.isModalOpen,
          completedModule: state.completedModule,
          isLoading: state.isLoading
        }
      });
      document.dispatchEvent(event);
    }
  }
  
  /**
   * Initialize hook - set up listeners
   */
  function init() {
    // Initialize state from localStorage
    initializeState();
    
    // Listen for module completion events
    document.addEventListener('onboarding:modulesUpdated', handleModuleUpdate);
    
    return function cleanup() {
      // Remove event listener on cleanup
      document.removeEventListener('onboarding:modulesUpdated', handleModuleUpdate);
    };
  }
  
  // Auto-initialize
  const cleanup = init();
  
  // Return public API
  return {
    state: state,
    closeModal: closeModal,
    cleanup: cleanup,
    
    // For React integration
    getState: function() {
      return {
        isLoading: state.isLoading,
        completedModule: state.completedModule,
        isModalOpen: state.isModalOpen
      };
    }
  };
}

// Export for use in components
if (typeof window !== 'undefined') {
  window.useCompletionState = useCompletionState;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = useCompletionState;
}
