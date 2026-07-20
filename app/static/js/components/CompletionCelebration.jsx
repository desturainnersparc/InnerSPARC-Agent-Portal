/**
 * CompletionCelebration Component
 * Modal that displays on module completion with Lottie animation
 * 
 * Features:
 * - Semi-transparent overlay background
 * - Centered responsive modal card
 * - Module-specific success message
 * - Lottie animation (plays once, non-looping)
 * - Auto-close after 3-4 seconds
 * - Escape key support
 * - Click-outside support
 * - Smooth fade transitions (300-400ms)
 * 
 * Props:
 *   - isOpen (boolean): Controls modal visibility
 *   - completedModule (number): Module count for animation selection
 *   - onClose (function): Callback when modal should close
 *   - autoCloseDuration (number, optional): Time until auto-close (default 3500ms)
 */

function CompletionCelebration(props) {
  const React = window.React || require('react');
  const animationMap = window.animationMap || {};
  
  // Destructure props
  const isOpen = props.isOpen || false;
  const completedModule = props.completedModule || 0;
  const onClose = props.onClose || function() {};
  const autoCloseDuration = props.autoCloseDuration || 3500;
  
  // Get animation config
  const animationPath = animationMap.getAnimationPathForModule ? 
    animationMap.getAnimationPathForModule(completedModule) : 
    ('/static/json/calm-' + (completedModule === 1 ? '1' : (completedModule === 2 ? '2' : (completedModule === 3 ? 'Fire2' : 'Fire3'))) + '.json');
  
  // State for animation instance and timer
  const [animationInstance, setAnimationInstance] = React.useState(null);
  const [autoCloseTimer, setAutoCloseTimer] = React.useState(null);
  const fadeOutClass = isOpen ? '' : ' opacity-0 pointer-events-none';
  
  // Get message based on completed module
  function getCompletionMessage() {
    const messages = {
      1: { title: 'Module 1 Complete', subtitle: 'Your streak has begun!' },
      2: { title: 'Module 2 Complete', subtitle: 'You\'re on fire! Keep it up!' },
      3: { title: 'Module 3 Complete', subtitle: 'You\'re unstoppable! Almost there!' },
      4: { title: 'Module 4 Complete', subtitle: 'You\'re a completion champion!' }
    };
    
    return messages[completedModule] || { 
      title: 'Module ' + completedModule + ' Complete',
      subtitle: 'Great progress! Keep going!'
    };
  }
  
  // Load Lottie animation
  function loadLottieAnimation() {
    if (!isOpen || !animationPath) {
      return;
    }
    
    const container = document.getElementById('completionLottieContainer');
    if (!container) {
      return;
    }
    
    // Clear any existing animation
    container.innerHTML = '';
    
    // Wait for lottie to be available
    if (typeof window.lottie === 'undefined') {
      console.warn('Lottie library not loaded');
      return;
    }
    
    try {
      const instance = window.lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: false,  // Play once only
        autoplay: true,
        path: animationPath,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet'
        }
      });
      
      setAnimationInstance(instance);
    } catch (e) {
      console.error('Failed to load Lottie animation:', e);
    }
  }
  
  // Set up auto-close timer
  function setupAutoClose() {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
    }
    
    if (isOpen && onClose) {
      const timer = setTimeout(function() {
        onClose();
      }, autoCloseDuration);
      
      setAutoCloseTimer(timer);
    }
  }
  
  // Handle Escape key
  function handleKeyDown(e) {
    if (e.key === 'Escape' && isOpen && onClose) {
      onClose();
    }
  }
  
  // Handle background click
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && isOpen && onClose) {
      onClose();
    }
  }
  
  // Setup event listener for Escape key
  React.useEffect(function() {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      loadLottieAnimation();
      setupAutoClose();
      
      return function() {
        document.removeEventListener('keydown', handleKeyDown);
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
        }
      };
    }
  }, [isOpen, completedModule, autoCloseDuration]);
  
  // Cleanup animation on unmount
  React.useEffect(function() {
    return function() {
      if (animationInstance && typeof animationInstance.destroy === 'function') {
        try {
          animationInstance.destroy();
        } catch (e) {
          console.warn('Error destroying Lottie animation:', e);
        }
      }
    };
  }, []);
  
  // Get message
  const message = getCompletionMessage();
  
  // Render modal
  return React.createElement('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300' + fadeOutClass,
    style: {
      backgroundColor: 'rgba(0, 0, 0, ' + (isOpen ? '0.65' : '0') + ')',
      transitionProperty: 'background-color, visibility',
      transitionDuration: '300ms',
      transitionTimingFunction: 'ease'
    },
    onClick: handleBackdropClick,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'completionTitle',
    'aria-hidden': !isOpen ? 'true' : 'false'
  },
    // Modal card
    React.createElement('div', {
      className: 'relative bg-white rounded-xl shadow-2xl max-w-md w-[calc(100%-2rem)] sm:w-96 overflow-hidden transition-all duration-300',
      style: {
        transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        opacity: isOpen ? 1 : 0
      }
    },
      // Close button
      React.createElement('button', {
        onClick: function() { if (onClose) onClose(); },
        className: 'absolute top-4 right-4 z-10 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors',
        'aria-label': 'Close modal',
        type: 'button'
      },
        React.createElement('svg', {
          className: 'w-5 h-5 text-gray-500',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24'
        },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M6 18L18 6M6 6l12 12'
          })
        )
      ),
      
      // Content
      React.createElement('div', {
        className: 'p-8 text-center'
      },
        // Animation container
        React.createElement('div', {
          id: 'completionLottieContainer',
          className: 'mb-6 flex justify-center',
          style: { width: '200px', height: '200px', margin: '0 auto' }
        }),
        
        // Title
        React.createElement('h2', {
          id: 'completionTitle',
          className: 'text-2xl sm:text-3xl font-bold text-gray-900 mb-2'
        },
          message.title
        ),
        
        // Subtitle
        React.createElement('p', {
          className: 'text-base sm:text-lg text-gray-600 mb-6'
        },
          message.subtitle
        ),
        
        // Continue button (compact, centered)
        React.createElement('button', {
          onClick: function() { if (onClose) onClose(); },
          className: 'mx-auto block max-w-[320px] w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200',
          type: 'button'
        },
          'Continue'
        )
      )
    )
  );
}

// Export for use
if (typeof window !== 'undefined') {
  window.CompletionCelebration = CompletionCelebration;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompletionCelebration;
}
