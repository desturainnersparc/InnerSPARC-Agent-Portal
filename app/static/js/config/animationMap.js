/**
 * Animation Mapping Configuration
 * Maps module completion count to Lottie animation file paths
 * 
 * Structured to support future replacements (e.g., 3D animations) without refactoring
 */

const ANIMATION_MAP = {
  1: {
    path: '/static/json/calm-1.json',
    name: 'calm-1',
    description: 'Serene, calming animation',
    duration: 2800 // approximate milliseconds
  },
  2: {
    path: '/static/json/calm2.json',
    name: 'calm2',
    description: 'Continued calm animation',
    duration: 3000
  },
  3: {
    path: '/static/json/Fire2.json',
    name: 'Fire2',
    description: 'Energetic, fire-themed animation',
    duration: 3200
  },
  4: {
    path: '/static/json/Fire3.json',
    name: 'Fire3',
    description: 'Extended fire animation',
    duration: 3500
  },
  5: {
    path: '/static/json/Fire4.json',
    name: 'Fire4',
    description: 'Final module fire animation',
    duration: 3800
  }
};

/**
 * Get animation config for a given module count
 * @param {number} moduleCount - Number of completed modules
 * @returns {object|null} Animation config object or null if no animation
 */
function getAnimationForModule(moduleCount) {
  if (!moduleCount || moduleCount < 1) {
    return null;
  }
  
  // Module 5+ uses Fire4.json
  const animationKey = moduleCount >= 5 ? 5 : moduleCount;
  
  return ANIMATION_MAP[animationKey] || null;
}

/**
 * Get animation path for a given module count
 * @param {number} moduleCount - Number of completed modules
 * @returns {string|null} Path to animation JSON file or null
 */
function getAnimationPathForModule(moduleCount) {
  const config = getAnimationForModule(moduleCount);
  return config ? config.path : null;
}

/**
 * Get animation duration for a given module count (for auto-close timing)
 * @param {number} moduleCount - Number of completed modules
 * @returns {number} Animation duration in milliseconds (default 3000ms)
 */
function getAnimationDurationForModule(moduleCount) {
  const config = getAnimationForModule(moduleCount);
  return config ? config.duration : 3000;
}

/**
 * Get all animation configs
 * @returns {object} Complete animation map
 */
function getAllAnimations() {
  return ANIMATION_MAP;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ANIMATION_MAP,
    getAnimationForModule,
    getAnimationPathForModule,
    getAnimationDurationForModule,
    getAllAnimations
  };
}
