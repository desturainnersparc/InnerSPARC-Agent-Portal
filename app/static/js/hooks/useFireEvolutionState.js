(function () {
  function useFireEvolutionState(options) {
    var opts = options || {};
    var fireMap = window.fireEvolutionMap || {};

    var STORAGE_LATEST = opts.storageLatestKey || 'innerSparc_fire_latest_module';
    var STORAGE_LAST_CELEBRATED = opts.storageCelebratedKey || 'innerSparc_fire_last_celebrated_module';
    var MIN_EVOLUTION_MS = opts.minEvolutionMs || 2000;
    var MAX_EVOLUTION_MS = opts.maxEvolutionMs || 4000;

    var state = {
      isLoading: true,
      currentModule: 0,
      evolutionModule: null,
      evolutionVisible: false,
      statusMessage: '',
      lastCelebratedModule: 0,
      hasPlaybackError: false
    };

    var queue = [];
    var isProcessingQueue = false;
    var evolutionTimer = null;

    function dispatchState() {
      document.dispatchEvent(new CustomEvent('fireEvolution:stateChange', { detail: getState() }));
    }

    function persistNumbers(latest, celebrated) {
      try {
        if (typeof latest === 'number') {
          localStorage.setItem(STORAGE_LATEST, String(latest));
        }
        if (typeof celebrated === 'number') {
          localStorage.setItem(STORAGE_LAST_CELEBRATED, String(celebrated));
        }
      } catch (err) {
        console.warn('[FireEvolution] Failed to persist state', err);
      }
    }

    function getStoredNumber(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        var parsed = parseInt(raw, 10);
        return isNaN(parsed) ? fallback : parsed;
      } catch (err) {
        return fallback;
      }
    }

    function buildStatusMessage(moduleCount) {
      return 'Module ' + moduleCount + ' Complete - Streak upgraded';
    }

    function clampDuration(ms) {
      var value = typeof ms === 'number' ? ms : 3000;
      return Math.min(MAX_EVOLUTION_MS, Math.max(MIN_EVOLUTION_MS, value));
    }

    function processQueue() {
      if (isProcessingQueue || queue.length === 0) return;

      isProcessingQueue = true;
      var nextModule = queue.shift();
      var durationFromMap = fireMap.getEvolutionDurationMs
        ? fireMap.getEvolutionDurationMs(nextModule, 3000)
        : 3000;
      var resolvedDuration = clampDuration(durationFromMap);

      state.evolutionModule = nextModule;
      state.evolutionVisible = true;
      state.statusMessage = buildStatusMessage(nextModule);
      dispatchState();

      if (evolutionTimer) {
        clearTimeout(evolutionTimer);
      }

      evolutionTimer = setTimeout(function () {
        state.lastCelebratedModule = nextModule;
        state.evolutionVisible = false;
        state.evolutionModule = null;
        state.statusMessage = '';
        persistNumbers(undefined, state.lastCelebratedModule);
        isProcessingQueue = false;
        dispatchState();
        processQueue();
      }, resolvedDuration);
    }

    function enqueueNewCompletions(newCount) {
      var start = state.lastCelebratedModule + 1;
      for (var i = start; i <= newCount; i += 1) {
        queue.push(i);
      }
      processQueue();
    }

    function handleModulesUpdated(event) {
      var detail = event && event.detail ? event.detail : {};
      var normalize = fireMap.normalizeModuleCount || function (v) {
        var p = parseInt(v, 10);
        return isNaN(p) || p < 0 ? 0 : p;
      };

      var nextCount = normalize(detail.modulesCompleted);
      if (nextCount < state.currentModule) {
        return;
      }

      state.currentModule = nextCount;
      persistNumbers(state.currentModule, undefined);

      if (nextCount > state.lastCelebratedModule) {
        enqueueNewCompletions(nextCount);
      } else {
        dispatchState();
      }
    }

    function reportPlaybackError() {
      state.hasPlaybackError = true;
      dispatchState();
    }

    function initialize() {
      var latestStored = getStoredNumber(STORAGE_LATEST, 0);
      var celebratedStored = getStoredNumber(STORAGE_LAST_CELEBRATED, 0);

      state.currentModule = latestStored;
      state.lastCelebratedModule = celebratedStored > latestStored ? latestStored : celebratedStored;
      state.isLoading = false;
      dispatchState();
    }

    function getState() {
      return {
        isLoading: state.isLoading,
        currentModule: state.currentModule,
        evolutionModule: state.evolutionModule,
        evolutionVisible: state.evolutionVisible,
        statusMessage: state.statusMessage,
        lastCelebratedModule: state.lastCelebratedModule,
        hasPlaybackError: state.hasPlaybackError
      };
    }

    function cleanup() {
      document.removeEventListener('onboarding:modulesUpdated', handleModulesUpdated);
      if (evolutionTimer) {
        clearTimeout(evolutionTimer);
      }
      queue = [];
    }

    initialize();
    document.addEventListener('onboarding:modulesUpdated', handleModulesUpdated);

    return {
      getState: getState,
      cleanup: cleanup,
      reportPlaybackError: reportPlaybackError
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = useFireEvolutionState;
  }

  if (typeof window !== 'undefined') {
    window.useFireEvolutionState = useFireEvolutionState;
  }
})();
