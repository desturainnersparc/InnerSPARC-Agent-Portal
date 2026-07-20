(function () {
  function FireEvolutionBurst(props) {
    var React = window.React;
    var providerFactory = window.animationProviderFactory || {};
    var mapApi = window.fireEvolutionMap || {};

    var moduleCount = props.moduleCount || 0;
    var isVisible = !!props.isVisible;
    var className = props.className || '';
    var containerId = props.containerId || 'fireEvolutionLayer';
    var onPlaybackError = props.onPlaybackError;

    var config = mapApi.resolveFireConfig
      ? mapApi.resolveFireConfig(moduleCount)
      : { evolutionPath: null, label: 'No streak yet' };

    var providerRef = React.useRef(null);

    React.useEffect(function () {
      var animationContainer = document.getElementById(containerId);
      if (!animationContainer) return;

      if (!providerRef.current) {
        providerRef.current = (providerFactory.createAnimationProvider || function () {
          return { play: function () { return { ok: false }; }, destroy: function () {} };
        })('lottie-web', { container: animationContainer });
      }

      if (!isVisible || !config.evolutionPath) {
        providerRef.current.destroy();
        return;
      }

      var result = providerRef.current.play({
        path: config.evolutionPath,
        loop: false,
        autoplay: true
      });

      if (!result.ok && typeof onPlaybackError === 'function') {
        onPlaybackError();
      }

      return function () {
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, [isVisible, config.evolutionPath, containerId, onPlaybackError]);

    React.useEffect(function () {
      return function () {
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, []);

    return React.createElement('div', {
      id: containerId,
      className: className,
      'aria-hidden': isVisible ? 'false' : 'true'
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FireEvolutionBurst;
  }

  if (typeof window !== 'undefined') {
    window.FireEvolutionBurst = FireEvolutionBurst;
  }
})();
