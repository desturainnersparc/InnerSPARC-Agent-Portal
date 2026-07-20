(function () {
  function FireCelebrationModal(props) {
    var React = window.React;
    var providerFactory = window.animationProviderFactory || {};
    var mapApi = window.floatingFireMap || {};

    var isOpen = !!props.isOpen;
    var moduleCount = props.moduleCount || 0;
    var onClose = props.onClose || function () {};
    var onPlaybackError = props.onPlaybackError;
    var containerId = props.containerId || 'fireCelebrationModalLayer';

    var config = mapApi.resolveFloatingFireConfig
      ? mapApi.resolveFloatingFireConfig(moduleCount)
      : { evolutionPath: null, headline: 'Module Complete', subtitle: 'Streak upgraded.' };

    var providerRef = React.useRef(null);
    var closeTimerRef = React.useRef(null);

    function clearCloseTimer() {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }

    /* Progress Path mount/unmount: render a small React UMD component when modal opens */
    React.useEffect(function () {
      if (!isOpen) return undefined;

      var cancelled = false;
      var progressContainerId = 'fireCelebrationProgress';
      function buildNodes() {
        // compact set: show 3 items for early modules, 4 for later ones
        var base = [
          { id: 'start', type: 'start', label: 'Start' },
          { id: 'mid1', type: 'lesson', label: 'Lesson' },
          { id: 'mid2', type: 'lesson', label: 'Lesson' },
          { id: 'final', type: 'final', label: 'Final' }
        ];
        return moduleCount >= 3 ? base.slice(0, 4) : base.slice(0, 3);
      }

      var nodes = buildNodes();
      try {
        if (mapApi && typeof mapApi.resolveFloatingFireConfig === 'function') {
          var cfg = mapApi.resolveFloatingFireConfig(moduleCount) || {};
          if (cfg.headline) nodes[nodes.length - 1].label = cfg.headline || nodes[nodes.length - 1].label;
        }
      } catch (err) {
        if (typeof console !== 'undefined' && console.debug) console.debug('[ProgressPath] label derivation failed', err);
      }

      var currentIndex = Math.min(Math.max(0, Number(moduleCount) || 0), Math.max(0, nodes.length - 1));

      // set node states (completed/current/locked/upcoming/final)
      nodes = nodes.map(function (n, i) {
        var locked = false;
        if (n.type === 'locked') {
          locked = Number(moduleCount) < 5; // keep locked until lesson 3 completed
        }
        var state = 'upcoming';
        if (i < currentIndex) state = 'completed';
        else if (i === currentIndex) state = 'current';
        if (locked) state = 'locked';
        return Object.assign({}, n, { locked: locked, state: state });
      });

      // Wait for renderer + container to be available (retry loop)
      var maxMs = 1000;
      var step = 80;
      var elapsed = 0;

      function tryMount() {
        if (cancelled) return;
        if (typeof window.renderProgressPath === 'function') {
          var containerEl = document.getElementById(progressContainerId);
          if (containerEl) {
            try {
              var res = window.renderProgressPath(progressContainerId, {
                nodes: nodes,
                currentIndex: currentIndex,
                onSelect: function (node, idx) {
                  try { console.debug('[ProgressPath] select', node, idx); } catch (e) {}
                },
                animate: true
              });

              if (res && res.instance) {
                window.__progressPathInstances = window.__progressPathInstances || {};
                window.__progressPathInstances[progressContainerId] = res.instance;
              }
            } catch (e) {
              if (typeof console !== 'undefined' && console.warn) console.warn('[ProgressPath] mount error', e);
            }
            return;
          }
        }

        elapsed += step;
        if (elapsed < maxMs) {
          setTimeout(tryMount, step);
        } else {
          if (typeof console !== 'undefined' && console.warn) console.warn('[ProgressPath] mount timed out');
        }
      }

      tryMount();

      return function () {
        cancelled = true;
        try { if (typeof window.destroyProgressPath === 'function') window.destroyProgressPath(progressContainerId); } catch (e) {}
      };
    }, [isOpen, moduleCount]);

    React.useEffect(function () {
      var animationContainer = document.getElementById(containerId);
      if (!animationContainer) return;

      if (!providerRef.current) {
        providerRef.current = (providerFactory.createAnimationProvider || function () {
          return { play: function () { return { ok: false }; }, destroy: function () {} };
        })('lottie-web', { container: animationContainer });
      }

      if (!isOpen || !config.evolutionPath) {
        providerRef.current.destroy();
        clearCloseTimer();
        return;
      }

      var result = providerRef.current.play({
        path: config.evolutionPath,
        loop: true,
        autoplay: true
      });

      if (!result.ok && typeof onPlaybackError === 'function') {
        onPlaybackError();
      }

      var durationMs = mapApi.getFloatingDurationMs
        ? mapApi.getFloatingDurationMs(moduleCount, 3000)
        : 3000;
      var clampedDuration = Math.min(4000, Math.max(2000, durationMs));

      clearCloseTimer();
      closeTimerRef.current = setTimeout(function () {
        onClose();
      }, clampedDuration);

      return function () {
        clearCloseTimer();
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, [isOpen, moduleCount, config.evolutionPath, onClose, onPlaybackError, containerId]);

    React.useEffect(function () {
      return function () {
        clearCloseTimer();
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, []);

    /* Update ProgressPath instance when moduleCount changes without remounting */
    React.useEffect(function () {
      if (!isOpen) return undefined;
      try {
        var inst = window.__progressPathInstances && window.__progressPathInstances['fireCelebrationProgress'];
        var idx = Math.min(Math.max(0, Number(moduleCount) || 0), 6);
        if (inst && typeof inst.setCurrent === 'function') inst.setCurrent(idx);
      } catch (e) {}
    }, [moduleCount, isOpen]);

    if (!isOpen) {
      return null;
    }

    return React.createElement(
      'div',
      {
        className: 'fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]'
      },
      React.createElement(
        'div',
        {
          className: 'relative w-full max-w-md overflow-hidden rounded-3xl border border-white/25 bg-white/12 p-6 text-white shadow-[0_24px_70px_-24px_rgba(251,146,60,0.55)] backdrop-blur-xl'
        },
        React.createElement('div', {
          className: 'pointer-events-none absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full',
          style: {
            background: 'radial-gradient(circle, rgba(251,146,60,0.35) 0%, rgba(251,146,60,0) 70%)',
            animation: 'celebrationAuraPulse 1.5s ease-in-out infinite'
          },
          'aria-hidden': 'true'
        }),
        React.createElement(
          'div',
          { className: 'relative z-10' },
          React.createElement('div', {
            id: containerId,
            className: 'mx-auto h-44 w-44 [filter:drop-shadow(0_0_18px_rgba(251,146,60,0.78))]'
          }),
          React.createElement('h3', { className: 'text-center text-2xl font-semibold tracking-tight text-white' }, config.headline || 'Module Complete'),
          React.createElement('p', { className: 'mt-2 text-center text-sm text-white/90' }, config.subtitle || 'Your fire has evolved. Streak upgraded.'),
          React.createElement('div', { id: 'fireCelebrationProgress', className: 'mt-4 overflow-hidden' }),
          React.createElement(
            'p',
            {
              className: 'mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-amber-200/90',
              role: 'status',
              'aria-live': 'polite'
            },
            'Module ',
            String(moduleCount),
            ' complete'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onClose,
              className: 'mt-5 mx-auto block max-w-[320px] w-full rounded-xl border border-white/25 bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30'
            },
            'Continue'
          )
        )
      )
    );
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FireCelebrationModal;
  }

  if (typeof window !== 'undefined') {
    window.FireCelebrationModal = FireCelebrationModal;
    try { document.dispatchEvent(new CustomEvent('floatingFire:modalReady')); } catch (e) {}
  }
})();
