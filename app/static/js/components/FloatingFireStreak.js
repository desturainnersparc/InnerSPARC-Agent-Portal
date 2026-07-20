(function () {
  function FloatingFireStreak(props) {
    var React = window.React;
    var providerFactory = window.animationProviderFactory || {};
    var mapApi = window.floatingFireMap || {};

    var state = props.state || {};
    var moduleCount = state.currentModule || 0;
    var modalOpen = !!state.modalOpen;
    var modalAvailable = props.modalAvailable !== false;
    var effectiveModalOpen = modalAvailable && modalOpen;
    var fireVisible = !!state.fireVisible;
    var hasPlaybackError = !!state.hasPlaybackError;
    var containerId = props.containerId || 'floatingFireStreakLayer';

    var config = mapApi.resolveFloatingFireConfig
      ? mapApi.resolveFloatingFireConfig(moduleCount)
      : { idlePath: null, label: 'No streak' };

    // Fallback glow colors (light blue) if not defined in config
    var defaultGlowDropShadow = 'rgba(96,165,250,0.62)';
    var defaultGlowAura = 'rgba(96,165,250,0.14)';
    var glowDropShadow = config && config.glowDropShadow ? config.glowDropShadow : defaultGlowDropShadow;
    var glowAura = config && config.glowAura ? config.glowAura : defaultGlowAura;

    var offsetYState = React.useState(0);
    var offsetY = offsetYState[0];
    var setOffsetY = offsetYState[1];
    var collapsedState = React.useState(true);
    var isCollapsed = collapsedState[0];
    var setIsCollapsed = collapsedState[1];
    var isAnimatingState = React.useState(false);
    var isAnimating = isAnimatingState[0];
    var setIsAnimating = isAnimatingState[1];
    var isDraggingState = React.useState(false);
    var isDragging = isDraggingState[0];
    var setIsDragging = isDraggingState[1];

    var draggingRef = React.useRef(false);
    var pointerIdRef = React.useRef(null);
    var startYRef = React.useRef(0);
    var baseOffsetRef = React.useRef(0);
    var visualCollapsedRef = React.useRef(true);
    var lastToggleTsRef = React.useRef(0);

    var providerRef = React.useRef(null);
    var lastGoodPathRef = React.useRef(null);
    var COLLAPSED_KEY = 'floatingFireCollapsed';
    var PANEL_TRANSITION_MS = 360;
    var PANEL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
    var COLLAPSED_TRANSLATE_X = '76%';
    var EXPANDED_TRANSLATE_X = '0%';
    var COLLAPSED_SCALE = '0.955';
    var EXPANDED_SCALE = '1';
    var COLLAPSED_OPACITY = 0.84;
    var EXPANDED_OPACITY = 1;
    var POST_MODAL_AUTO_COLLAPSE_DELAY_MS = 1500;
    var wasModalOpenRef = React.useRef(false);
    var autoCollapseTimerRef = React.useRef(null);
    var panelAnimationTimerRef = React.useRef(null);
    var userCollapsedPrefRef = React.useRef(true);

    function clearAutoCollapseTimer() {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
        autoCollapseTimerRef.current = null;
      }
    }

    function clearPanelAnimationTimer() {
      if (panelAnimationTimerRef.current) {
        clearTimeout(panelAnimationTimerRef.current);
        panelAnimationTimerRef.current = null;
      }
    }

    function persistCollapsedPreference(nextCollapsed) {
      userCollapsedPrefRef.current = !!nextCollapsed;
      try {
        localStorage.setItem(COLLAPSED_KEY, nextCollapsed ? '1' : '0');
      } catch (err) {}
    }

    function clampOffset(nextY) {
      var viewportHeight = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 800;
      var maxDrag = Math.max(120, Math.min(320, Math.floor(viewportHeight * 0.35)));
      return Math.max(-maxDrag, Math.min(maxDrag, nextY));
    }

    function handlePointerDown(event) {
      if (!event) return;
      if (isCollapsed) return;
      draggingRef.current = true;
      setIsDragging(true);
      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      baseOffsetRef.current = offsetY;

      if (event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (err) {}
      }
    }

    function handlePointerMove(event) {
      if (!draggingRef.current) return;
      if (!event || pointerIdRef.current !== event.pointerId) return;

      var deltaY = event.clientY - startYRef.current;
      var nextY = baseOffsetRef.current + deltaY;
      setOffsetY(clampOffset(nextY));
    }

    function handlePointerUpOrCancel(event) {
      if (!draggingRef.current) return;
      if (event && pointerIdRef.current !== event.pointerId) return;

      if (event && event.currentTarget && typeof event.currentTarget.releasePointerCapture === 'function') {
        try {
          event.currentTarget.releasePointerCapture(pointerIdRef.current);
        } catch (err) {}
      }

      draggingRef.current = false;
      pointerIdRef.current = null;
      setIsDragging(false);
    }

    function handleToggleCollapse(event) {
      if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
      }

      var now = Date.now();
      // Guard against pointer/click double firing on touch devices.
      if (now - lastToggleTsRef.current < 120) {
        return;
      }
      lastToggleTsRef.current = now;

      if (isDragging) return;

      clearAutoCollapseTimer();

      var baseCollapsed = effectiveModalOpen ? userCollapsedPrefRef.current : visualCollapsedRef.current;
      var nextCollapsed = !baseCollapsed;
      persistCollapsedPreference(nextCollapsed);

      // While modal is open, persist preference but keep visual state expanded.
      if (!effectiveModalOpen) {
        setIsCollapsed(nextCollapsed);
      }

      setIsAnimating(true);
      clearPanelAnimationTimer();
      panelAnimationTimerRef.current = setTimeout(function () {
        setIsAnimating(false);
      }, PANEL_TRANSITION_MS + 50);

      if (nextCollapsed) {
        draggingRef.current = false;
        pointerIdRef.current = null;
        setIsDragging(false);
      }
    }

    React.useEffect(function () {
      try {
        var stored = localStorage.getItem(COLLAPSED_KEY);
        var initialCollapsed = (stored === null) ? true : stored === '1';
        userCollapsedPrefRef.current = initialCollapsed;
        visualCollapsedRef.current = initialCollapsed;
        setIsCollapsed(initialCollapsed);
      } catch (err) {}
    }, []);

    React.useEffect(function () {
      visualCollapsedRef.current = isCollapsed;
    }, [isCollapsed]);

    React.useEffect(function () {
      if (effectiveModalOpen) {
        clearAutoCollapseTimer();
        draggingRef.current = false;
        pointerIdRef.current = null;
        setIsDragging(false);
        setIsCollapsed(false);
      } else if (wasModalOpenRef.current) {
        clearAutoCollapseTimer();
        // Keep panel expanded after modal closes to let user admire the completed fire streak.
      }

      wasModalOpenRef.current = effectiveModalOpen;
    }, [effectiveModalOpen]);

    React.useEffect(function () {
      var animationContainer = document.getElementById(containerId);
      if (!animationContainer) return;

      if (!providerRef.current) {
        providerRef.current = (providerFactory.createAnimationProvider || function () {
          return { play: function () { return { ok: false }; }, destroy: function () {} };
        })('lottie-web', { container: animationContainer });
      }

      if (!fireVisible) {
        providerRef.current.destroy();
        return;
      }

      var resolution = mapApi.resolveValidatedAssetPath
        ? mapApi.resolveValidatedAssetPath({
            moduleCount: moduleCount,
            candidatePath: config.idlePath,
            previousValidPath: lastGoodPathRef.current,
            channel: 'idle'
          })
        : { path: config.idlePath, fallbackUsed: false };
      var resolvedPath = resolution && resolution.path ? resolution.path : null;

      if (!resolvedPath) {
        providerRef.current.destroy();
        return;
      }

      var result = providerRef.current.play({
        path: resolvedPath,
        loop: true,
        autoplay: true
      });

      if (result.ok) {
        lastGoodPathRef.current = resolvedPath;
      } else {
        if (typeof props.onPlaybackError === 'function') {
          props.onPlaybackError();
        }

        if (lastGoodPathRef.current && lastGoodPathRef.current !== resolvedPath) {
          var fallbackResult = providerRef.current.play({
            path: lastGoodPathRef.current,
            loop: true,
            autoplay: true
          });
          if (!fallbackResult.ok && typeof props.onPlaybackError === 'function') {
            props.onPlaybackError();
          }
        }
      }

      return function () {
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, [fireVisible, config.idlePath, containerId, props.onPlaybackError, mapApi, moduleCount]);

    React.useEffect(function () {
      return function () {
        clearAutoCollapseTimer();
        clearPanelAnimationTimer();
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, []);

    if (!fireVisible) {
      return null;
    }

    return React.createElement(
      'div',
      {
        className: 'pointer-events-auto fixed right-0 top-[55%] z-40 sm:right-1 lg:right-2 select-none touch-action-none ' + ((isDragging && !isCollapsed) ? 'cursor-grabbing' : (isCollapsed ? 'cursor-default' : 'cursor-grab')),
        style: {
          right: '-8px',
          transform: 'translateY(calc(-50% + ' + offsetY + 'px)) translateX(' + (isCollapsed ? COLLAPSED_TRANSLATE_X : EXPANDED_TRANSLATE_X) + ') scale(' + (isCollapsed ? COLLAPSED_SCALE : EXPANDED_SCALE) + ')',
          opacity: isCollapsed ? COLLAPSED_OPACITY : EXPANDED_OPACITY,
          transition: isDragging
            ? 'none'
            : 'transform ' + PANEL_TRANSITION_MS + 'ms ' + PANEL_EASING + ', opacity ' + PANEL_TRANSITION_MS + 'ms ' + PANEL_EASING,
          willChange: (isAnimating || isDragging) ? 'transform, opacity' : 'auto'
        },
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUpOrCancel,
        onPointerCancel: handlePointerUpOrCancel,
        'aria-hidden': 'false'
      },
      React.createElement(
        'div',
        {
          className: 'relative h-[118px] w-[118px] transition-all duration-500 ease-out sm:h-[142px] sm:w-[142px] lg:h-[170px] lg:w-[170px]',
          style: {
            animation: 'floatingFireBob 6.2s ease-in-out infinite'
          }
        },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'pointer-events-auto absolute -left-2 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-slate-900/55 text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.7)] transition hover:bg-slate-900/70',
            onClick: handleToggleCollapse,
            onPointerDown: function (event) {
              if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
              }
            },
            onPointerUp: handleToggleCollapse,
            'aria-expanded': String(!isCollapsed),
            'aria-label': isCollapsed ? 'Expand fire' : 'Collapse fire'
          },
          React.createElement(
            'span',
            {
              style: {
                display: 'inline-block',
                transform: 'rotate(' + (isCollapsed ? '180deg' : '0deg') + ')',
                transition: 'transform ' + PANEL_TRANSITION_MS + 'ms ' + PANEL_EASING
              },
              'aria-hidden': 'true'
            },
            '›'
          )
        ),
        React.createElement('div', {
          id: containerId,
          className: 'absolute inset-0 h-full w-full rounded-full overflow-hidden transition-opacity duration-500',
          style: {
            background: 'transparent',
            filter: 'drop-shadow(0 0 14px ' + glowDropShadow + ')'
          }
        }),
        React.createElement('div', {
          className: 'absolute inset-0 rounded-full opacity-50',
          style: {
            background: 'radial-gradient(circle, ' + glowAura + ' 0%, rgba(0,0,0,0) 72%)'
          },
          'aria-hidden': 'true'
        })
      ),
      hasPlaybackError
        ? React.createElement(
            'p',
            {
              className: 'text-right text-[10px] text-rose-300',
              role: 'status',
              'aria-live': 'polite'
            },
            'Fire animation unavailable'
          )
        : null
    );
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FloatingFireStreak;
  }

  if (typeof window !== 'undefined') {
    window.FloatingFireStreak = FloatingFireStreak;
  }
})();
