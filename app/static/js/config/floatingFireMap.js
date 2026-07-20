(function () {
  var DEBUG = typeof window !== 'undefined' && !!window.__DEBUG_FLOATING_FIRE;
  var SHARED_FIRE_JSON = '/static/json/animate.json';
  var FLOATING_FIRE_MAP = {
    0: {
      key: 'none',
      idlePath: null,
      evolutionPath: null,
      durationMs: 2600,
      label: 'No streak',
      headline: 'Ready to ignite',
      subtitle: 'Complete a module to start your fire streak.',
      glowDropShadow: 'rgba(203,213,225,0.65)',
      glowAura: 'rgba(203,213,225,0.18)',
      modalGlowShadow: 'rgba(203,213,225,0.70)',
      modalAura: 'rgba(203,213,225,0.30)'
    },
    1: {
      key: 'calm-1',
      idlePath: SHARED_FIRE_JSON,
      evolutionPath: SHARED_FIRE_JSON,
      durationMs: 2400,
      label: 'Spark',
      headline: 'Module Complete',
      subtitle: 'Your fire has evolved. Streak upgraded.',
      glowDropShadow: 'rgba(203,213,225,0.65)',
      glowAura: 'rgba(203,213,225,0.18)',
      modalGlowShadow: 'rgba(203,213,225,0.70)',
      modalAura: 'rgba(203,213,225,0.30)'
    },
    2: {
      key: 'calm-2',
      idlePath: SHARED_FIRE_JSON,
      evolutionPath: SHARED_FIRE_JSON,
      durationMs: 2700,
      label: 'Steady',
      headline: 'Module Complete',
      subtitle: 'Your fire has evolved. Streak upgraded.',
      glowDropShadow: 'rgba(251,146,60,0.70)',
      glowAura: 'rgba(251,146,60,0.18)',
      modalGlowShadow: 'rgba(251,146,60,0.78)',
      modalAura: 'rgba(251,146,60,0.35)'
    },
    3: {
      key: 'fire-2',
      idlePath: SHARED_FIRE_JSON,
      evolutionPath: SHARED_FIRE_JSON,
      durationMs: 3200,
      label: 'Hot',
      headline: 'Module Complete',
      subtitle: 'Your fire has evolved. Streak upgraded.',
      glowDropShadow: 'rgba(251,146,60,0.70)',
      glowAura: 'rgba(251,146,60,0.18)',
      modalGlowShadow: 'rgba(251,146,60,0.78)',
      modalAura: 'rgba(251,146,60,0.35)'
    },
    4: {
      key: 'fire-3',
      idlePath: SHARED_FIRE_JSON,
      evolutionPath: SHARED_FIRE_JSON,
      durationMs: 3600,
      label: 'Blazing',
      headline: 'Module Complete',
      subtitle: 'Your fire has evolved. Streak upgraded.',
      glowDropShadow: 'rgba(96,165,250,0.70)',
      glowAura: 'rgba(96,165,250,0.18)',
      modalGlowShadow: 'rgba(96,165,250,0.78)',
      modalAura: 'rgba(96,165,250,0.35)'
    },
    5: {
      key: 'fire-4',
      idlePath: SHARED_FIRE_JSON,
      evolutionPath: SHARED_FIRE_JSON,
      durationMs: 3900,
      label: 'Elite',
      headline: 'Module Complete',
      subtitle: 'Your fire has evolved. Streak upgraded.',
      glowDropShadow: 'rgba(96,165,250,0.70)',
      glowAura: 'rgba(96,165,250,0.18)',
      modalGlowShadow: 'rgba(96,165,250,0.78)',
      modalAura: 'rgba(96,165,250,0.35)'
    }
  };

  function normalizeModuleCount(value) {
    var parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  }

  function resolveFloatingFireConfig(moduleCount) {
    var normalized = normalizeModuleCount(moduleCount);
    var resolved = null;
    if (normalized <= 0) {
      resolved = FLOATING_FIRE_MAP[0];
    } else if (normalized >= 5) {
      resolved = FLOATING_FIRE_MAP[5];
    } else {
      resolved = FLOATING_FIRE_MAP[normalized] || FLOATING_FIRE_MAP[0];
    }

    if (DEBUG) {
      console.debug('[FloatingFireMap] moduleCount -> resolved path', normalized, '->', resolved ? resolved.idlePath : null);
    }

    return resolved;
  }

  function getFloatingFirePath(moduleCount) {
    var config = resolveFloatingFireConfig(moduleCount);
    return config ? config.idlePath : null;
  }

  function getFloatingIdlePath(moduleCount) {
    var config = resolveFloatingFireConfig(moduleCount);
    return config ? config.idlePath : null;
  }

  function getFloatingEvolutionPath(moduleCount) {
    var config = resolveFloatingFireConfig(moduleCount);
    return config ? config.evolutionPath : null;
  }

  function getFloatingDurationMs(moduleCount, fallbackMs) {
    var config = resolveFloatingFireConfig(moduleCount);
    if (!config || typeof config.durationMs !== 'number') {
      return typeof fallbackMs === 'number' ? fallbackMs : 3000;
    }
    return config.durationMs;
  }

  function getFloatingCelebrationCopy(moduleCount) {
    var config = resolveFloatingFireConfig(moduleCount);
    return {
      headline: config && config.headline ? config.headline : 'Module Complete',
      subtitle: config && config.subtitle ? config.subtitle : 'Your fire has evolved. Streak upgraded.'
    };
  }

  function isKnownAssetPath(path) {
    return path === SHARED_FIRE_JSON;
  }

  function resolveValidatedAssetPath(options) {
    var opts = options || {};
    var moduleCount = normalizeModuleCount(opts.moduleCount);
    var channel = opts.channel === 'evolution' ? 'evolution' : 'idle';
    var previous = opts.previousValidPath || null;

    var config = resolveFloatingFireConfig(moduleCount);
    var candidate = opts.candidatePath || (channel === 'evolution' ? config.evolutionPath : config.idlePath) || null;

    if (DEBUG && channel === 'evolution') {
      console.debug('[FloatingFireMap] evolution moduleCount received:', moduleCount);
    }

    if (!candidate) {
      if (DEBUG) {
        console.debug('[FloatingFireMap] no asset for module', moduleCount, 'channel=', channel);
      }
      if (DEBUG && channel === 'evolution') {
        console.debug('[FloatingFireMap] evolution resolved path:', null, 'fallbackUsed=', false);
      }
      return { path: null, fallbackUsed: false, reason: 'none' };
    }

    if (isKnownAssetPath(candidate)) {
      if (DEBUG) {
        console.debug('[FloatingFireMap] resolved path', candidate, 'module=', moduleCount, 'channel=', channel);
      }
      if (DEBUG && channel === 'evolution') {
        console.debug('[FloatingFireMap] evolution resolved path:', candidate, 'fallbackUsed=', false);
      }
      return { path: candidate, fallbackUsed: false, reason: 'known' };
    }

    if (previous && isKnownAssetPath(previous)) {
      console.warn('[FloatingFireMap] Unknown asset path; using previous valid path instead:', candidate, '->', previous);
      if (DEBUG && channel === 'evolution') {
        console.debug('[FloatingFireMap] evolution resolved path:', previous, 'fallbackUsed=', true);
      }
      return { path: previous, fallbackUsed: true, reason: 'previous-valid' };
    }

    console.warn('[FloatingFireMap] Unknown asset path and no fallback available:', candidate);
    if (DEBUG && channel === 'evolution') {
      console.debug('[FloatingFireMap] evolution resolved path:', null, 'fallbackUsed=', true);
    }
    return { path: null, fallbackUsed: true, reason: 'invalid' };
  }

  var api = {
    FLOATING_FIRE_MAP: FLOATING_FIRE_MAP,
    normalizeModuleCount: normalizeModuleCount,
    resolveFloatingFireConfig: resolveFloatingFireConfig,
    getFloatingFirePath: getFloatingFirePath,
    getFloatingIdlePath: getFloatingIdlePath,
    getFloatingEvolutionPath: getFloatingEvolutionPath,
    getFloatingDurationMs: getFloatingDurationMs,
    getFloatingCelebrationCopy: getFloatingCelebrationCopy,
    resolveValidatedAssetPath: resolveValidatedAssetPath,
    isKnownAssetPath: isKnownAssetPath
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.floatingFireMap = api;
  }
})();
