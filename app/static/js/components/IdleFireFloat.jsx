(function () {
  function IdleFireFloat(props) {
    var React = window.React;
    var providerFactory = window.animationProviderFactory || {};

    var moduleCount = props.moduleCount || 0;
    var className = props.className || '';
    var mapApi = window.fireEvolutionMap || {};
    var idleContainerId = props.containerId || 'fireIdleLayer';
    var onPlaybackError = props.onPlaybackError;

    var idleConfig = mapApi.resolveFireConfig
      ? mapApi.resolveFireConfig(moduleCount)
      : { idlePath: null, label: 'No streak yet' };

    var providerRef = React.useRef(null);

    React.useEffect(function () {
      var animationContainer = document.getElementById(idleContainerId);
      if (!animationContainer) return;

      if (!providerRef.current) {
        providerRef.current = (providerFactory.createAnimationProvider || function () {
          return { play: function () { return { ok: false }; }, destroy: function () {} };
        })('lottie-web', { container: animationContainer });
      }

      if (!idleConfig.idlePath) {
        providerRef.current.destroy();
        return;
      }

      var result = providerRef.current.play({
        path: idleConfig.idlePath,
        loop: true,
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
    }, [idleConfig.idlePath, idleContainerId, onPlaybackError]);

    React.useEffect(function () {
      return function () {
        if (providerRef.current) {
          providerRef.current.destroy();
        }
      };
    }, []);

    return React.createElement('div', {
      id: idleContainerId,
      className: className,
      'aria-hidden': idleConfig.idlePath ? 'false' : 'true'
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdleFireFloat;
  }

  if (typeof window !== 'undefined') {
    window.IdleFireFloat = IdleFireFloat;
  }
})();
