(function () {
  var DEBUG = typeof window !== 'undefined' && !!window.__DEBUG_FLOATING_FIRE;

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('fc-styles')) return;
    var css = "\
  .fc-backdrop{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.6);backdrop-filter:blur(6px)}\
  .fc-card{position:relative;width:min(780px,94%);max-height:94vh;padding:28px;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));box-shadow:0 30px 80px -20px rgba(2,6,23,0.8);color:#fff;overflow-y:auto;overflow-x:hidden} \
  .fc-full{width:100%;height:100%;border-radius:0;padding:40px} \
  .fc-aura{position:absolute;left:50%;top:4%;transform:translateX(-50%);width:380px;height:380px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(96,165,250,0.28) 0%, rgba(0,0,0,0) 60%);filter:blur(8px)}\
  .fc-anim{width:220px;height:220px;margin:0 auto;filter:drop-shadow(0 0 28px rgba(96,165,250,0.6))} \
  .fc-head{margin-top:10px;text-align:center;font-size:28px;font-weight:700} \
  .fc-sub{margin-top:6px;text-align:center;font-size:14px;opacity:0.95} \
  .fc-rail{display:flex;gap:10px;justify-content:center;margin-top:14px;overflow:hidden;flex-wrap:nowrap} \
  .fc-node{flex:0 0 auto;width:10px;height:10px;border-radius:99px;background:rgba(255,255,255,0.18);position:relative} \
  .fc-node.fc-completed{background:linear-gradient(90deg,#60a5fa,#f97316)} \
  .fc-node.fc-current{flex:0 0 auto;width:18px;height:18px;background:linear-gradient(90deg,#60a5fa,#7c3aed);box-shadow:0 4px 12px rgba(124,58,237,0.36)} \
  .fc-node.fc-locked{background:rgba(120,120,120,0.24)} \
  .fc-cta{display:block;margin:18px auto 0;padding:12px 22px;border-radius:12px;background:linear-gradient(90deg,#0ea5e9,#3b82f6);color:#fff;font-weight:700;border:none;cursor:pointer;max-width:320px;width:100%} \
  .fc-close{position:absolute;right:12px;top:10px;background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer} \
  .fc-status{margin-top:8px;text-align:center;font-size:12px;opacity:0.95} \
  .fc-hidden{display:none} \";
    var s = document.createElement('style');
    s.id = 'fc-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  function FireCelebrationModal(props) {
    var React = window.React;
    var providerFactory = window.animationProviderFactory || {};
    var mapApi = window.floatingFireMap || {};

    var isOpen = !!props.isOpen;
    var moduleCount = typeof props.moduleCount === 'number' ? props.moduleCount : Number(props.moduleCount) || 0;
    var onClose = typeof props.onClose === 'function' ? props.onClose : function () {};
    var onPlaybackError = typeof props.onPlaybackError === 'function' ? props.onPlaybackError : function () {};
    var containerId = props.containerId || 'fireCelebrationModalLayer';
    var fullScreen = !!props.fullScreen;

    var config = mapApi.resolveFloatingFireConfig
      ? mapApi.resolveFloatingFireConfig(moduleCount)
      : { evolutionPath: null, headline: 'Module Complete', subtitle: 'Streak upgraded.' };

    var containerRef = React.useRef(null);
    var providerRef = React.useRef(null);
    var lastGoodPath = React.useRef(null);
    var playRun = React.useRef(0);
    var previouslyFocused = React.useRef(null);
    var [status, setStatus] = React.useState(null);

    // inject styles once
    React.useEffect(function () {
      injectStyles();
    }, []);

    // open/close focus management
    React.useEffect(function () {
      if (isOpen) {
        previouslyFocused.current = document.activeElement;
        // defer focus to close button later
        setTimeout(function () {
          var closeBtn = document.querySelector('[data-fc-close]');
          if (closeBtn) closeBtn.focus();
        }, 40);
      } else if (previouslyFocused.current) {
        try { previouslyFocused.current.focus(); } catch (e) {}
      }
    }, [isOpen]);

    // Lottie playback
    React.useEffect(function () {
      // cleanup
      function cleanup() {
        try {
          if (providerRef.current && typeof providerRef.current.destroy === 'function') providerRef.current.destroy();
        } catch (e) { if (DEBUG) console.debug('[FC] destroy err', e); }
        providerRef.current = null;
      }

      cleanup();
      if (!isOpen) return;
      if (!config.evolutionPath) {
        setStatus('No animation available');
        onPlaybackError();
        return;
      }

      var el = containerRef.current;
      if (!el) {
        setStatus('Animation container missing');
        onPlaybackError();
        return;
      }

      var runId = (playRun.current || 0) + 1;
      playRun.current = runId;

      try {
        providerRef.current = (providerFactory.createAnimationProvider || function () { return { play: function () { return { ok: false }; }, destroy: function () {} }; })('lottie-web', { container: el });

        var resolution = mapApi.resolveValidatedAssetPath
          ? mapApi.resolveValidatedAssetPath({ moduleCount: moduleCount, candidatePath: config.evolutionPath, previousValidPath: lastGoodPath.current, channel: 'evolution' })
          : { path: config.evolutionPath };
        var resolved = resolution && resolution.path ? resolution.path : null;

        if (DEBUG) console.debug('[FC] play', { moduleCount: moduleCount, resolved: resolved });

        if (!resolved) {
          setStatus('Animation unavailable');
          onPlaybackError();
          return;
        }

        setStatus(null);
        var res = providerRef.current.play({ path: resolved, autoplay: true, loop: true, onError: function (err) {
          if (playRun.current !== runId) return;
          setStatus('Playback error');
          if (DEBUG) console.debug('[FC] playback error', err);
          onPlaybackError();
        }});

        if (res && res.ok) lastGoodPath.current = resolved;
        if (!res || !res.ok) {
          setStatus('Playback failed to start');
          onPlaybackError();
        }
      } catch (err) {
        setStatus('Playback initialization failed');
        if (DEBUG) console.debug('[FC] init err', err);
        onPlaybackError();
      }

      (function () {
        function FireCelebrationModal(props) {
          var React = window.React;
          if (!React) return null;

          var providerFactory = window.animationProviderFactory || {};
          var mapApi = window.floatingFireMap || {};

          var isOpen = !!(props && props.isOpen);
          var moduleCount = props && props.moduleCount ? Math.max(0, Number(props.moduleCount) || 0) : 0;
          var containerId = props && props.containerId ? props.containerId : 'fireCelebrationModalLayer';
          var onClose = typeof (props && props.onClose) === 'function' ? props.onClose : function () {};
          var onPlaybackError = typeof (props && props.onPlaybackError) === 'function' ? props.onPlaybackError : function () {};

          var rootRef = React.useRef(null);
          var providerRef = React.useRef(null);
          var lastGoodPathRef = React.useRef(null);
          var activeElementBeforeRef = React.useRef(null);

          // Inject scoped styles once
          React.useEffect(function () {
            if (document.getElementById('fc-modal-styles')) return;
            var css = "\n      .fc-modal-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.6);display:flex;align-items:center;justify-content:center;z-index:9999}\\n      .fc-modal-card{width:100%;max-width:980px;margin:24px;border-radius:14px;background:linear-gradient(180deg,#0f172a,#020617);color:#fff;box-shadow:0 20px 60px rgba(2,6,23,0.6);overflow:hidden;padding:24px;display:flex;flex-direction:column;align-items:center}\\n      .fc-modal-inner{width:100%;max-width:760px;text-align:center}\\n      .fc-modal-title{font-size:20px;margin:6px 0 4px}\\n      .fc-modal-sub{font-size:14px;color:#cbd5e1;margin-bottom:12px}\\n      .fc-animation-wrap{width:320px;height:240px;margin:8px auto;border-radius:8px;overflow:hidden}\\n      .fc-rail{display:flex;gap:8px;justify-content:center;margin:12px 0;overflow:hidden}\\n      .fc-node{width:12px;height:12px;border-radius:6px;background:rgba(255,255,255,0.22)}\\n      .fc-node.active{background:linear-gradient(90deg,#f97316,#fb7185)}\\n      .fc-cta{margin-top:14px;display:flex;justify-content:center;width:100%}\\n      .fc-cta button{max-width:320px;width:100%;padding:10px 18px;border-radius:999px;border:none;background:#fb7185;color:#051025;font-weight:600;font-size:16px;cursor:pointer}\\n      .fc-status{font-size:12px;color:#fecaca;margin-top:10px}\\n      @media (min-width:900px){.fc-modal-card{padding:36px}}";
            var style = document.createElement('style');
            style.id = 'fc-modal-styles';
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
          }, []);

          // Focus management: trap focus and restore
          React.useEffect(function () {
            if (!isOpen) return;
            activeElementBeforeRef.current = document.activeElement;
            try { if (rootRef.current) rootRef.current.focus(); } catch (e) {}

            function onKey(e) {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
              if (e.key === 'Tab') {
                // simple tab trap: keep focus on rootRef
                if (!rootRef.current) return;
                var focusables = rootRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusables.length) return;
                var first = focusables[0];
                var last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault(); first.focus();
                }
              }
            }

            document.addEventListener('keydown', onKey);
            return function () {
              document.removeEventListener('keydown', onKey);
              try { if (activeElementBeforeRef.current && typeof activeElementBeforeRef.current.focus === 'function') activeElementBeforeRef.current.focus(); } catch (e) {}
            };
          }, [isOpen]);

          // Lottie playback via provider factory
          React.useEffect(function () {
            var container = document.getElementById(containerId);
            if (!isOpen || !container) {
              if (providerRef.current) {
                try { providerRef.current.destroy(); } catch (e) {}
                providerRef.current = null;
              }
              return;
            }

            if (!providerRef.current) {
              providerRef.current = (providerFactory.createAnimationProvider || function () { return { play: function () { return { ok: false }; }, destroy: function () {} }; })('lottie-web', { container: container });
            }

            var config = mapApi.resolveFloatingFireConfig ? mapApi.resolveFloatingFireConfig(moduleCount) : { idlePath: null };
            var resolution = mapApi.resolveValidatedAssetPath ? mapApi.resolveValidatedAssetPath({ moduleCount: moduleCount, candidatePath: config.idlePath, previousValidPath: lastGoodPathRef.current, channel: 'celebration' }) : { path: config.idlePath };
            var path = resolution && resolution.path ? resolution.path : null;

            if (!path) {
              onPlaybackError();
              return;
            }

            var result = providerRef.current.play({ path: path, loop: true, autoplay: true, onError: function () { onPlaybackError(); } });
            if (result.ok) lastGoodPathRef.current = path; else onPlaybackError();

            return function () {
              if (providerRef.current) {
                try { providerRef.current.destroy(); } catch (e) {}
                providerRef.current = null;
              }
            };
          }, [isOpen, moduleCount, containerId]);

          if (!isOpen) return null;

          // Build compact rail: show up to 4 nodes, highlighting the most recent (right-most)
          var visibleNodes = Math.max(1, Math.min(4, moduleCount || 4));
          var nodes = [];
          for (var i = 0; i < visibleNodes; i += 1) {
            var isActive = (i === visibleNodes - 1);
            nodes.push(React.createElement('span', { key: 'n' + i, className: 'fc-node' + (isActive ? ' active' : '') }));
          }

          return React.createElement(
            'div',
            { className: 'fc-modal-backdrop', role: 'presentation', onClick: function (e) { if (e.target === e.currentTarget) onClose(); } },
            React.createElement(
              'div',
              { className: 'fc-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-live': 'polite', tabIndex: -1, ref: rootRef },
              React.createElement('div', { className: 'fc-modal-inner' },
                React.createElement('h3', { className: 'fc-modal-title' }, 'Nice work — You completed a module!'),
                React.createElement('div', { className: 'fc-modal-sub' }, 'Keep going to unlock more milestones.'),
                React.createElement('div', { id: containerId, className: 'fc-animation-wrap', 'aria-hidden': 'true' }),
                React.createElement('div', { className: 'fc-rail', role: 'img', 'aria-label': visibleNodes + ' step progress' }, nodes),
                React.createElement('div', { className: 'fc-cta' },
                  React.createElement('button', { type: 'button', onClick: function () { try { onClose(); } catch (e) {} } }, 'Continue')
                ),
                React.createElement('div', { className: 'fc-status', role: 'status', 'aria-live': 'polite' }, 'If the animation does not play, continue to proceed.' )
              )
            )
          );
        }

        // Preserve CommonJS and window export for compatibility and notify host that modal is ready
        if (typeof module !== 'undefined' && module.exports) {
          module.exports = FireCelebrationModal;
        }

        if (typeof window !== 'undefined') {
          window.FireCelebrationModal = FireCelebrationModal;
          try {
            document.dispatchEvent(new CustomEvent('floatingFire:modalReady'));
          } catch (e) {}
        }
      })();
      return function () { document.removeEventListener('keydown', onKey); };
    }, [isOpen]);

    if (!isOpen) return null;

    // build compact rail nodes (max 3-4 visible to avoid horizontal overflow)
    var maxVisible = moduleCount >= 3 ? 4 : 3;
    var currentIndex = Math.min(moduleCount, maxVisible - 1);
    var nodes = Array.from({ length: maxVisible }, function (_, i) {
      var state = 'upcoming';
      if (i < currentIndex) state = 'completed';
      else if (i === currentIndex) state = 'current';
      return { idx: i, state: state };
    });

    return React.createElement('div', {
      className: 'fc-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'fc-headline',
      onClick: function (e) { if (e.target === e.currentTarget) onClose(); }
    }, React.createElement('div', { className: 'fc-card' + (fullScreen ? ' fc-full' : '') },
      React.createElement('button', { 'data-fc-close': '1', 'data-fc-focusable': '1', className: 'fc-close', onClick: onClose, 'aria-label': 'Close celebration' }, '\u00d7'),
      React.createElement('div', { className: 'fc-aura', 'aria-hidden': 'true' }),
      React.createElement('div', { id: containerId, ref: containerRef, className: 'fc-anim', 'aria-hidden': status ? 'true' : 'false' }),
      status ? React.createElement('div', { className: 'fc-status', role: 'status', 'aria-live': 'polite' }, status) : null,
      React.createElement('h2', { id: 'fc-headline', className: 'fc-head' }, config.headline || 'Module Complete'),
      React.createElement('div', { className: 'fc-sub' }, config.subtitle || 'Your fire has evolved.'),
      React.createElement('div', { className: 'fc-rail', role: 'list', 'aria-hidden': 'false' }, nodes.map(function (n) {
        var cls = 'fc-node' + (n.state === 'completed' ? ' fc-completed' : n.state === 'current' ? ' fc-current' : n.state === 'locked' ? ' fc-locked' : '');
        return React.createElement('div', { key: 'n' + n.idx, className: cls, role: 'presentation' });
      })),
      React.createElement('div', { style: { textAlign: 'center' } },
        React.createElement('button', { className: 'fc-cta', 'data-fc-focusable': '1', onClick: onClose }, 'Continue')
      )
    ));
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FireCelebrationModal;
  }

  if (typeof window !== 'undefined') {
    window.FireCelebrationModal = FireCelebrationModal;
    try {
      document.dispatchEvent(new CustomEvent('floatingFire:modalReady'));
    } catch (e) {}
  }
})();
