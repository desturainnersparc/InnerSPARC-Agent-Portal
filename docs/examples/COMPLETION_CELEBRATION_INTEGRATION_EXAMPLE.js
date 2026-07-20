/**
 * INTEGRATION EXAMPLE: CompletionCelebration Modal in Dashboard
 * 
 * This file shows how to integrate the celebration modal into the onboarding
 * dashboard. Copy this pattern to your dashboard initialization code.
 * 
 * Location: Insert this code into your dashboard component or init function
 */

(function initCompletionCelebration() {
  'use strict';
  
  // Configuration
  const MODAL_CONTAINER_ID = 'celebrationModalContainer';
  const AUTO_CLOSE_DURATION = 3500; // milliseconds
  
  // Verify required dependencies are loaded
  if (typeof window.CompletionCelebration === 'undefined') {
    console.error('CompletionCelebration component not loaded');
    return;
  }
  
  if (typeof window.useCompletionState === 'undefined') {
    console.error('useCompletionState hook not loaded');
    return;
  }
  
  if (typeof window.React === 'undefined') {
    console.error('React not loaded');
    return;
  }
  
  if (typeof window.ReactDOM === 'undefined') {
    console.error('ReactDOM not loaded');
    return;
  }
  
  // Get or create modal container
  function getModalContainer() {
    let container = document.getElementById(MODAL_CONTAINER_ID);
    
    if (!container) {
      container = document.createElement('div');
      container.id = MODAL_CONTAINER_ID;
      document.body.appendChild(container);
    }
    
    return container;
  }
  
  // Initialize hook and modal
  function init() {
    const hook = window.useCompletionState();
    const container = getModalContainer();
    
    // Store hook reference globally for cleanup
    window._completionHookInstance = hook;
    
    console.log('✓ Completion celebration modal initialized');
    
    /**
     * Render modal based on state changes
     * This function is called whenever the completion state changes
     */
    function renderModal() {
      const state = hook.getState();
      
      if (!state) {
        return;
      }
      
      const modal = window.CompletionCelebration({
        isOpen: state.isModalOpen,
        completedModule: state.completedModule,
        onClose: function() {
          hook.closeModal();
          renderModal(); // Re-render after close
        },
        autoCloseDuration: AUTO_CLOSE_DURATION
      });
      
      // Render modal using ReactDOM
      try {
        window.ReactDOM.render(modal, container);
      } catch (e) {
        console.error('Failed to render modal:', e);
      }
    }
    
    // Listen for state changes from completion hook
    document.addEventListener('completionStateChange', function(e) {
      console.log('Completion state updated:', e.detail);
      renderModal();
    });
    
    // Initial render
    setTimeout(function() {
      renderModal();
    }, 100);
    
    // Return cleanup function
    return function cleanup() {
      document.removeEventListener('completionStateChange', renderModal);
      hook.cleanup();
      
      if (container && container.parentNode) {
        window.ReactDOM.unmountComponentAtNode(container);
      }
      
      console.log('✓ Completion celebration modal cleaned up');
    };
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (window._completionHookInstance) {
      window._completionHookInstance.cleanup();
    }
  });
})();

/**
 * USAGE INSTRUCTIONS
 * 
 * 1. Add this code to your dashboard initialization (e.g., in templateBeta.html 
 *    or in a separate script file that runs on page load)
 * 
 * 2. Ensure scripts are loaded in this order:
 *    - React + ReactDOM
 *    - Lottie library
 *    - animationMap.js
 *    - useCompletionState.js
 *    - CompletionCelebration.jsx
 *    - THIS initialization code
 * 
 * 3. That's it! The modal will now:
 *    - Listen for module completion events
 *    - Show celebration modal when modules complete
 *    - Auto-close after 3.5 seconds
 *    - Not re-trigger on page reload
 * 
 * CUSTOMIZATION
 * 
 * Change auto-close duration:
 *   const AUTO_CLOSE_DURATION = 5000; // 5 seconds
 * 
 * Change modal container location:
 *   const MODAL_CONTAINER_ID = 'myCustomContainer';
 * 
 * Add logging for debugging:
 *   Hook into completionStateChange event:
 * 
 *     document.addEventListener('completionStateChange', (e) => {
 *       console.log('Modal state:', e.detail);
 *     });
 * 
 * TESTING
 * 
 * Test that modal shows:
 *   1. Open onboarding dashboard
 *   2. Complete a module
 *   3. Observe celebration modal
 * 
 * Test that modal doesn't replay:
 *   1. Complete Module 1 (modal appears)
 *   2. Close modal or wait for auto-close
 *   3. Refresh page (Ctrl+R)
 *   4. Modal should NOT appear again
 * 
 * Test multiple completions:
 *   1. Complete Module 2 (should show new modal)
 *   2. Modal should display correct message
 *   3. Lottie animation should be different (calm2.json)
 */
