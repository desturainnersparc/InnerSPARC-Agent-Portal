(function () {
  function FireEvolutionInline(props) {
    var React = window.React;
    var fireMap = window.fireEvolutionMap || {};
    var IdleFireFloat = window.IdleFireFloat;
    var FireEvolutionBurst = window.FireEvolutionBurst;

    var state = props.state || {};
    var currentModule = state.currentModule || 0;
    var evolutionModule = state.evolutionModule || currentModule;
    var evolutionVisible = !!state.evolutionVisible;
    var statusMessage = state.statusMessage || '';
    var hasPlaybackError = !!state.hasPlaybackError;

    var panelId = props.panelId || 'fireEvolutionPanel';
    var idleContainerId = props.idleContainerId || 'fireIdleLayer';
    var evolutionContainerId = props.evolutionContainerId || 'fireEvolutionLayer';

    var fireConfig = fireMap.resolveFireConfig
      ? fireMap.resolveFireConfig(currentModule)
      : { path: null, label: 'No streak yet', description: 'Complete your first module.' };

    var statusNode = statusMessage
      ? React.createElement(
          'p',
          {
            className: 'mt-1 text-right text-[11px] font-medium tracking-wide text-amber-500 drop-shadow-[0_0_8px_rgba(251,146,60,0.45)]',
            role: 'status',
            'aria-live': 'polite'
          },
          statusMessage
        )
      : React.createElement(
          'p',
          {
            className: 'mt-1 text-right text-[10px] uppercase tracking-[0.18em] text-amber-300/90',
            role: 'status',
            'aria-live': 'polite'
          },
          'Streak Level: ',
          fireConfig.label || 'No streak yet'
        );

    var errorNode = hasPlaybackError
      ? React.createElement(
          'p',
          { className: 'mt-1 text-right text-[11px] text-rose-300' },
          'Animation unavailable right now. Your streak progress is still saved.'
        )
      : null;

    var idleLayer = IdleFireFloat
      ? React.createElement(IdleFireFloat, {
          moduleCount: currentModule,
          containerId: idleContainerId,
          onPlaybackError: props.onPlaybackError,
          className: 'absolute inset-0 h-full w-full [filter:drop-shadow(0_0_16px_rgba(251,146,60,0.55))]'
        })
      : null;

    var evolutionLayer = FireEvolutionBurst
      ? React.createElement(FireEvolutionBurst, {
          moduleCount: evolutionModule,
          isVisible: evolutionVisible,
          containerId: evolutionContainerId,
          onPlaybackError: props.onPlaybackError,
          className: 'absolute inset-0 h-full w-full transition-all duration-500 [filter:drop-shadow(0_0_22px_rgba(251,146,60,0.85))]'
        })
      : null;

    return React.createElement(
      'aside',
      {
        id: panelId,
        className: 'pointer-events-none ml-auto w-[154px] select-none sm:w-[178px] lg:w-[208px]'
      },
      React.createElement(
        'div',
        {
          className: 'relative h-[154px] w-[154px] sm:h-[178px] sm:w-[178px] lg:h-[208px] lg:w-[208px]',
          style: {
            animation: 'fireIdleFloat 5.9s ease-in-out infinite'
          }
        },
        idleLayer,
        React.createElement('div', {
          className: 'absolute inset-0 transition-all duration-500 ' + (evolutionVisible ? 'scale-110 opacity-100' : 'scale-95 opacity-0')
        }, evolutionLayer),
        React.createElement('div', {
          className: 'absolute inset-0 rounded-full opacity-0 transition-opacity duration-400 ' + (evolutionVisible ? 'opacity-100' : ''),
          style: {
            background: 'radial-gradient(circle, rgba(251,146,60,0.24) 0%, rgba(251,146,60,0.0) 68%)',
            animation: evolutionVisible ? 'firePulseGlow 1.2s ease-in-out 2' : 'none'
          },
          'aria-hidden': 'true'
        })
      ),
      statusNode,
      errorNode
    );
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FireEvolutionInline;
  }

  if (typeof window !== 'undefined') {
    window.FireEvolutionInline = FireEvolutionInline;
  }
})();
