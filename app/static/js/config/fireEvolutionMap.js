(function () {
  var FIRE_EVOLUTION_MAP = {
    0: {
      key: 'base',
      idlePath: null,
      evolutionPath: null,
      evolutionDurationMs: 2600,
      label: 'No streak yet',
      description: 'Complete your first module to ignite your streak.'
    },
    1: {
      key: 'fire-1',
      idlePath: '/static/json/calm-1.json',
      evolutionPath: '/static/json/calm-1.json',
      evolutionDurationMs: 2500,
      label: 'Spark',
      description: 'Your streak has started.'
    },
    2: {
      key: 'fire-2',
      idlePath: '/static/json/calm2.json',
      evolutionPath: '/static/json/calm2.json',
      evolutionDurationMs: 2800,
      label: 'Blaze',
      description: 'Momentum is building.'
    },
    3: {
      key: 'fire-3',
      idlePath: '/static/json/Fire2.json',
      evolutionPath: '/static/json/Fire2.json',
      evolutionDurationMs: 3200,
      label: 'Inferno',
      description: 'Strong consistency unlocked.'
    },
    4: {
      key: 'fire-4',
      idlePath: '/static/json/Fire3.json',
      evolutionPath: '/static/json/Fire3.json',
      evolutionDurationMs: 3600,
      label: 'Elite Flame',
      description: 'You are in elite streak territory.'
    },
    5: {
      key: 'fire-5',
      idlePath: '/static/json/Fire4.json',
      evolutionPath: '/static/json/Fire4.json',
      evolutionDurationMs: 3900,
      label: 'Legendary Flame',
      description: 'You have reached peak streak evolution.',
      glowDropShadow: 'rgba(96,165,250,0.70)',
      glowAura: 'rgba(96,165,250,0.18)',
      modalGlowShadow: 'rgba(96,165,250,0.78)',
      modalAura: 'rgba(96,165,250,0.35)'
    }
  };

  function normalizeModuleCount(moduleCount) {
    var parsed = parseInt(moduleCount, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  }

  function resolveFireConfig(moduleCount) {
    var normalized = normalizeModuleCount(moduleCount);
    var key = normalized >= 5 ? 5 : normalized;
    return FIRE_EVOLUTION_MAP[key] || FIRE_EVOLUTION_MAP[0];
  }

  function getFireAssetPath(moduleCount) {
    var config = resolveFireConfig(moduleCount);
    return config ? config.idlePath : null;
  }

  function getIdleAssetPath(moduleCount) {
    var config = resolveFireConfig(moduleCount);
    return config ? config.idlePath : null;
  }

  function getEvolutionAssetPath(moduleCount) {
    var config = resolveFireConfig(moduleCount);
    return config ? config.evolutionPath : null;
  }

  function getEvolutionDurationMs(moduleCount, fallbackMs) {
    var config = resolveFireConfig(moduleCount);
    if (!config || typeof config.evolutionDurationMs !== 'number') {
      return typeof fallbackMs === 'number' ? fallbackMs : 3000;
    }
    return config.evolutionDurationMs;
  }

  function registerFireLevel(level, config) {
    if (typeof level !== 'number' || level < 0 || !config) return;
    FIRE_EVOLUTION_MAP[level] = config;
  }

  var api = {
    FIRE_EVOLUTION_MAP: FIRE_EVOLUTION_MAP,
    normalizeModuleCount: normalizeModuleCount,
    resolveFireConfig: resolveFireConfig,
    getFireAssetPath: getFireAssetPath,
    getIdleAssetPath: getIdleAssetPath,
    getEvolutionAssetPath: getEvolutionAssetPath,
    getEvolutionDurationMs: getEvolutionDurationMs,
    registerFireLevel: registerFireLevel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.fireEvolutionMap = api;
  }
})();
