(function () {
  function FloatingFireStreak(props) {
    var React = window.React;
    var providerFactory = window.animationProviderFactory || {};
    var mapApi = window.floatingFireMap || {};

    var state = props.state || {};
    var moduleCount = state.currentModule || 0;
    var fireVisible = !!state.fireVisible;
    var hasPlaybackError = !!state.hasPlaybackError;
    var containerId = props.containerId || 'floatingFireStreakLayer';

    var config = mapApi.resolveFloatingFireConfig
      ? mapApi.resolveFloatingFireConfig(moduleCount)
      : { idlePath: null, label: 'No streak' };

    var providerRef = React.useRef(null);

    React.useEffect(function () {
      var animationContainer = document.getElementById(containerId);
      if (!animationContainer) return;

      if (!providerRef.current) {
        providerRef.current = (providerFactory.createAnimationProvider || function () {
          return { play: function () { return { ok: false }; }, destroy: function () {} };
        })('lottie-web', { container: animationContainer });
      }

      if (!fireVisible || !config.idlePath) {
        providerRef.current.destroy();
        return;
      }

      var result = providerRef.current.play({
        path: config.idlePath,
        loop: true,
        autoplay: true
      });

      if (!result.ok && typeof props.onPlaybackError === 'function') {
        props.onPlaybackError();
      }

      return function () {
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, [fireVisible, config.idlePath, containerId, props.onPlaybackError]);

    React.useEffect(function () {
      return function () {
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
        className: 'pointer-events-none fixed right-2 top-[55%] z-40 -translate-y-1/2 sm:right-4 lg:right-6',
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
        React.createElement('div', {
          id: containerId,
          className: 'absolute inset-0 h-full w-full transition-opacity duration-500 [filter:drop-shadow(0_0_14px_rgba(251,146,60,0.62))]'
        }),
        React.createElement('div', {
          className: 'absolute inset-0 rounded-full opacity-50',
          style: {
            background: 'radial-gradient(circle, rgba(251,146,60,0.14) 0%, rgba(251,146,60,0) 72%)'
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
