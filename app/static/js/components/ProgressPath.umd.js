 (function () {
  'use strict';

  var roots = window.__progressPathRoots = window.__progressPathRoots || {};

  function renderProgressPath(containerId, opts) {
    opts = opts || {};
    if (!window.React || !window.ReactDOM) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[ProgressPath] React/ReactDOM missing');
      return { ok: false };
    }

    var container = document.getElementById(containerId);
    if (!container) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[ProgressPath] container not found:', containerId);
      return { ok: false };
    }

    var React = window.React;
    var ReactDOM = window.ReactDOM;

    function RailSVG(props) {
      var nodes = props.nodes || [];
      var currentIndex = Math.max(0, Math.min((props.currentIndex || 0), Math.max(0, nodes.length - 1)));
      // Clamp visible nodes to avoid horizontal overflow in compact contexts
      var maxVisible = 4;
      var displayNodes = nodes;
      var displayStart = 0;
      if (nodes.length > maxVisible) {
        // center window around currentIndex when possible
        displayStart = Math.max(0, Math.min(currentIndex - Math.floor((maxVisible - 1) / 2), nodes.length - maxVisible));
        displayNodes = nodes.slice(displayStart, displayStart + maxVisible);
      }
      var onSelect = typeof props.onSelect === 'function' ? props.onSelect : function () {};
      var animate = !!props.animate && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      var total = Math.max(1, displayNodes.length - 1);
      // map currentIndex into display window for percent calculation
      var displayIndex = Math.max(0, currentIndex - displayStart);
      var percent = total > 0 ? (displayIndex / total) * 100 : (displayIndex ? 100 : 0);

      var wrapRef = React.useRef(null);

      React.useEffect(function () {
        if (wrapRef.current) {
          wrapRef.current.setAttribute('role', 'progressbar');
          wrapRef.current.setAttribute('aria-valuemin', '0');
          wrapRef.current.setAttribute('aria-valuemax', String(total));
          wrapRef.current.setAttribute('aria-valuenow', String(currentIndex));
        }
      }, [currentIndex, total]);

      function handleNodeClick(i, node) {
        if (node.locked) return;
        onSelect(node, i);
        try { document.dispatchEvent(new CustomEvent('progresspath:changed', { detail: { index: i, node: node } })); } catch (e) {}
      }

      return React.createElement('div', { ref: wrapRef, className: 'rail-wrap', tabIndex: 0 },
        React.createElement('svg', { className: 'rail-svg', viewBox: '0 0 100 24', preserveAspectRatio: 'none', role: 'img', 'aria-hidden': 'true' },
          React.createElement('defs', null,
            React.createElement('linearGradient', { id: 'progressGradient', x1: '0%', x2: '100%' },
              React.createElement('stop', { offset: '0%', stopColor: '#60a5fa' }),
              React.createElement('stop', { offset: '100%', stopColor: '#7c3aed' })
            )
          ),
          React.createElement('rect', { x: 2, y: 9, width: 96, height: 6, rx: 3, className: 'rail-bg' }),
          React.createElement('rect', {
            x: 2, y: 9, width: 96, height: 6, rx: 3, className: 'rail-fill',
            style: {
              transformOrigin: 'left center',
              transform: 'scaleX(' + (percent / 100) + ')',
              transition: animate ? 'transform 560ms cubic-bezier(.2,.9,.2,1)' : 'none'
            }
          })
        ),
        React.createElement('div', { className: 'rail-nodes' },
          displayNodes.map(function (node, di) {
            var actualIndex = displayStart + di;
            var isCurrent = actualIndex === currentIndex;
            var isCompleted = actualIndex < currentIndex;
            var isLocked = !!node.locked;
            var classes = 'rail-node-btn' + (isCompleted ? ' completed' : '') + (isCurrent ? ' current' : '') + (isLocked ? ' locked' : '') + (node.type === 'final' ? ' final' : '');
            var leftPercent = total > 0 ? (di / total) * 100 : 0;

            return React.createElement('div', { key: 'n_' + actualIndex, role: 'listitem', className: 'rail-node-item', style: { left: leftPercent + '%' } },
              React.createElement('button', {
                type: 'button',
                title: node.label || '',
                'data-node-id': node.id || actualIndex,
                'data-node-index': actualIndex,
                className: classes,
                onClick: function () { handleNodeClick(actualIndex, node); },
                'aria-current': isCurrent ? 'true' : undefined,
                'aria-label': (node.label || 'Step') + (isCurrent ? ' (current)' : isCompleted ? ' (completed)' : isLocked ? ' (locked)' : ''),
                disabled: !!isLocked,
                'aria-disabled': !!isLocked
              },
                React.createElement('span', { className: 'rail-node-circle', 'aria-hidden': 'true' }, isCompleted ? '\u2713' : (node.type === 'final' ? '🏆' : React.createElement('span', { className: 'rail-node-dot' })) ),
                React.createElement('span', { className: 'rail-node-label' }, node.label || '')
              )
            );
          })
        )
      );
    }

    try {
      if (roots[containerId]) {
        try { roots[containerId].unmount(); } catch (e) {}
        delete roots[containerId];
      }
      var root = ReactDOM.createRoot(container);

      var initialProps = { nodes: opts.nodes || [], currentIndex: opts.currentIndex || 0, onSelect: opts.onSelect || opts.onNodeClick || function () {}, animate: !!opts.animate };
      root.render(React.createElement(RailSVG, initialProps));

      var inst = {
        root: root,
        props: initialProps,
        setCurrent: function (i) { try { inst.props.currentIndex = i; root.render(React.createElement(RailSVG, inst.props)); } catch (e) { } },
        setNodes: function (nodes) { try { inst.props.nodes = nodes; root.render(React.createElement(RailSVG, inst.props)); } catch (e) { } },
        destroy: function () { try { root.unmount(); delete roots[containerId]; delete window.__progressPathInstances[containerId]; } catch (e) {} }
      };

      roots[containerId] = root;
      window.__progressPathInstances = window.__progressPathInstances || {};
      window.__progressPathInstances[containerId] = inst;

      return { ok: true, instance: inst };
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error('[ProgressPath] render error', err);
      return { ok: false };
    }
  }

  function destroyProgressPath(containerId) {
    try {
      var inst = window.__progressPathInstances && window.__progressPathInstances[containerId];
      if (inst && typeof inst.destroy === 'function') { inst.destroy(); return { ok: true }; }
      var root = roots[containerId];
      if (!root) return { ok: false, msg: 'not mounted' };
      root.unmount();
      delete roots[containerId];
      return { ok: true };
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) console.warn('[ProgressPath] destroy error', err);
      return { ok: false };
    }
  }

  window.renderProgressPath = renderProgressPath;
  window.destroyProgressPath = destroyProgressPath;

})();
