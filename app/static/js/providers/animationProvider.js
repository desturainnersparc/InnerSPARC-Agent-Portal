(function () {
  var DEBUG = typeof window !== 'undefined' && !!window.__DEBUG_FLOATING_FIRE;

  function createLottieWebProvider(options) {
    var animationInstance = null;
    var detachListeners = null;

    function safeDetachListeners() {
      if (typeof detachListeners === 'function') {
        try {
          detachListeners();
        } catch (err) {}
      }
      detachListeners = null;
    }

    function destroy() {
      safeDetachListeners();
      try {
        if (animationInstance && typeof animationInstance.destroy === 'function') {
          animationInstance.destroy();
        }
      } catch (err) {
        console.warn('[FireEvolution] Animation destroy failed', err);
      }
      animationInstance = null;
    }

    function play(config) {
      destroy();

      if (!options || !options.container || !config || !config.path) {
        return { ok: false, reason: 'missing-container-or-path' };
      }

      if (!window.lottie || typeof window.lottie.loadAnimation !== 'function') {
        return { ok: false, reason: 'lottie-web-unavailable' };
      }

      try {
        animationInstance = window.lottie.loadAnimation({
          container: options.container,
          renderer: 'svg',
          loop: !!config.loop,
          autoplay: config.autoplay !== false,
          path: config.path,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet'
          }
        });

        var onDataReady = function () {
          if (typeof config.onReady === 'function') {
            config.onReady({ path: config.path });
          }
          if (DEBUG) {
            console.debug('[FireEvolution] Lottie data ready:', config.path);
          }
        };

        var onDataFailed = function () {
          if (typeof config.onError === 'function') {
            config.onError({ reason: 'data-failed', path: config.path });
          }
          if (DEBUG) {
            console.debug('[FireEvolution] Lottie data failed:', config.path);
          }
        };

        var onLoadError = function () {
          if (typeof config.onError === 'function') {
            config.onError({ reason: 'load-error', path: config.path });
          }
          if (DEBUG) {
            console.debug('[FireEvolution] Lottie load error:', config.path);
          }
        };

        if (animationInstance && typeof animationInstance.addEventListener === 'function') {
          animationInstance.addEventListener('data_ready', onDataReady);
          animationInstance.addEventListener('data_failed', onDataFailed);
          animationInstance.addEventListener('error', onLoadError);

          detachListeners = function () {
            if (!animationInstance || typeof animationInstance.removeEventListener !== 'function') {
              return;
            }
            animationInstance.removeEventListener('data_ready', onDataReady);
            animationInstance.removeEventListener('data_failed', onDataFailed);
            animationInstance.removeEventListener('error', onLoadError);
          };
        }

        if (typeof config.onComplete === 'function') {
          animationInstance.addEventListener('complete', config.onComplete);
        }

        return { ok: true };
      } catch (err) {
        console.error('[FireEvolution] Animation play failed', err);
        return { ok: false, reason: 'animation-load-failed', error: err };
      }
    }

    return {
      play: play,
      destroy: destroy
    };
  }

  // Provider factory indirection allows swapping to 3D or video later.
  function createAnimationProvider(kind, options) {
    if (kind === 'lottie-web' || !kind) {
      return createLottieWebProvider(options);
    }

    return {
      play: function () {
        return { ok: false, reason: 'unsupported-provider' };
      },
      destroy: function () {}
    };
  }

  var api = {
    createAnimationProvider: createAnimationProvider,
    createLottieWebProvider: createLottieWebProvider
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.animationProviderFactory = api;
  }
})();
