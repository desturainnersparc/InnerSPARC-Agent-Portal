(function () {(function () {(function () {









































































































































































































































































































































































































































})();  } catch (err) {}    document.dispatchEvent(new CustomEvent('floatingFire:modalReady'));  try {  window.destroyLevelCompleteModal = destroyLevelCompleteModal;  window.renderLevelCompleteModal = renderLevelCompleteModal;  }    modalState.isOpen = false;    }      root.parentNode.removeChild(root);    if (root && root.parentNode) {    var root = document.getElementById(ROOT_ID);    setFocusTrap(false);    clearTimers();  function destroyLevelCompleteModal() {  }    });      completedStages: completedStages      previousCompletedStages: previousCompletedStages,      toPercent: toPercent,      fromPercent: fromPercent,      reducedMotion: reducedMotion,      shouldAnimateProgress: shouldAnimateProgress,    playProgressSequence(root, {    playTextSequence(root, !reducedMotion);    openModal();    }      return;      overlay.setAttribute('aria-hidden', 'true');      closeModal(false);    if (!isOpen) {    });      reducedMotion: reducedMotion      shouldAnimateProgress: shouldAnimateProgress,      currentStageIndex: currentStageIndex,      previousCompletedStages: previousCompletedStages,      completedStages: completedStages,      totalStages: totalStages,      labels: labels,    buildColumns(columnsEl, {    clearTimers();    subtitleEl.textContent = 'You completed Module ' + Math.max(1, currentLevel);    var fromPercent = normalizePercent(props && props.previousCompletionPercent, previousCompletionPercent);    var toPercent = normalizePercent(props && props.completionPercent, completionPercent);      : (previousCompletedStages > 0 ? 100 : 0);      ? ((Math.max(0, previousCompletedStages - 1) / (totalStages - 1)) * 100)    var previousCompletionPercent = totalStages > 1      : (completedStages > 0 ? 100 : 0);      ? ((Math.max(0, completedStages - 1) / (totalStages - 1)) * 100)    var completionPercent = totalStages > 1      : 0;      ? Math.max(0, Math.min(completedStages - 1, totalStages - 1))    var currentStageIndex = totalStages    var reducedMotion = !!(props && props.reducedMotion) || prefersReducedMotion();    var shouldAnimateProgress = !!(props && props.shouldAnimateProgress) && isNewCompletion;    var isNewCompletion = completedStages > previousCompletedStages;    var previousCompletedStages = Math.max(0, Math.min(previousLevel, totalStages));    var completedStages = Math.max(0, Math.min(currentLevel, totalStages));    if (totalStages !== labels.length) totalStages = labels.length;    var totalStages = normalizeInt(props && props.totalStages, labels.length);    if (!labels.length) labels = fallbackLabels.slice();      .filter(function (label) { return !!label; });      .map(function (label) { return String(label || '').trim().toUpperCase(); })    var labels = (inputLabels && inputLabels.length ? inputLabels : fallbackLabels)    var fallbackLabels = ['WELCOME', 'PROFILE AND CREDENTIALS', 'AGENT FOUNDATION', 'CONGRATULATIONS'];    var inputLabels = props && Array.isArray(props.stepLabels) ? props.stepLabels : null;    var previousLevel = normalizeInt(props && props.previousLevel, 0);    var currentLevel = normalizeInt(props && props.currentLevel, 1);    modalState.onClose = typeof (props && props.onClose) === 'function' ? props.onClose : function () {};    var isOpen = !!(props && props.isOpen);    var columnsEl = root.querySelector('[data-lcv-columns="1"]');    var subtitleEl = root.querySelector('.lcv-subtitle');    var overlay = root.querySelector('[data-lcv-overlay="1"]');    var root = createRoot();    injectStyles();  function renderLevelCompleteModal(props) {  }    }      }(i));        }, checkDelay));          if (checkEl) checkEl.classList.add('is-visible');          var checkEl = root.querySelector('[data-lcv-check="' + idx + '"]');        modalState.timers.push(setTimeout(function () {        }, nodeDelay));          if (nodeEl) nodeEl.classList.add('is-done');          var nodeEl = root.querySelector('[data-lcv-node="' + idx + '"]');        modalState.timers.push(setTimeout(function () {        var checkDelay = nodeDelay + 120;        var nodeDelay = 660 + (idx - previousCompletedStages) * 40;      (function (idx) {    for (var i = previousCompletedStages; i < completedStages; i += 1) {    }, 260));      fillEl.style.width = toPercent + '%';    modalState.timers.push(setTimeout(function () {    }      return;      fillEl.style.width = toPercent + '%';    if (!shouldAnimateProgress || reducedMotion) {    fillEl.style.width = ((shouldAnimateProgress && !reducedMotion) ? fromPercent : toPercent) + '%';    var completedStages = data.completedStages;    var previousCompletedStages = data.previousCompletedStages;    var toPercent = data.toPercent;    var fromPercent = data.fromPercent;    var reducedMotion = data.reducedMotion;    var shouldAnimateProgress = data.shouldAnimateProgress;    var fillEl = root.querySelector('[data-lcv-fill="1"]');  function playProgressSequence(root, data) {  }    modalState.timers.push(setTimeout(function () { actions.classList.add('is-visible'); }, 620));    modalState.timers.push(setTimeout(function () { feedback.classList.add('is-visible'); }, 560));    modalState.timers.push(setTimeout(function () { progress.classList.add('is-visible'); }, 180));    modalState.timers.push(setTimeout(function () { subtitle.classList.add('is-visible'); }, 120));    modalState.timers.push(setTimeout(function () { title.classList.add('is-visible'); }, 60));    }      return;      actions.classList.add('is-visible');      feedback.classList.add('is-visible');      progress.classList.add('is-visible');      subtitle.classList.add('is-visible');      title.classList.add('is-visible');    if (!animated) {    actions.classList.remove('is-visible');    feedback.classList.remove('is-visible');    progress.classList.remove('is-visible');    subtitle.classList.remove('is-visible');    title.classList.remove('is-visible');    var actions = root.querySelector('[data-lcv-actions="1"]');    var feedback = root.querySelector('[data-lcv-feedback="1"]');    var progress = root.querySelector('[data-lcv-progress="1"]');    var subtitle = root.querySelector('.lcv-subtitle');    var title = root.querySelector('.lcv-title');  function playTextSequence(root, animated) {  }    columnsEl.innerHTML = '<div class="lcv-rail"><div class="lcv-rail-fill" data-lcv-fill="1"></div></div>' + html;    }        + '</div>';        + '  <div class="lcv-label-bottom ' + labelClass + '">' + bottom + '</div>'        + '  </div>'        + '    </span>'        + '      <svg class="lcv-check' + (isDone && (wasDone || !shouldAnimateProgress || reducedMotion) ? ' is-visible' : '') + '" data-lcv-check="' + i + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>'        + '    <span class="' + nodeClass + '" data-lcv-node="' + i + '">'        + '    <span class="lcv-glow' + (isCurrent ? ' is-visible' : '') + '"></span>'        + '  <div class="lcv-node-wrap">'        + '  <div class="lcv-label-top ' + labelClass + '">' + top + '</div>'        + '<div class="lcv-col" data-lcv-col="' + i + '">'      html += ''      var bottom = (i % 2 === 1) ? label : '&nbsp;';      var top = (i % 2 === 0) ? label : '&nbsp;';      var labelClass = isCurrent ? 'is-active' : (isDone ? 'is-done' : '');      if (!reducedMotion && shouldAnimateProgress && isNewDone) nodeClass += ' is-new';      if (isCurrent) nodeClass += ' is-current';      if (isDone) nodeClass += ' is-done';      var nodeClass = 'lcv-node';      var label = escapeHtml(labels[i] || '');      var isNewDone = !wasDone && isDone;      var isCurrent = isDone && i === currentStageIndex;      var wasDone = i < previousCompletedStages;      var isDone = i < completedStages;    for (var i = 0; i < totalStages; i += 1) {    var html = '';    var reducedMotion = data.reducedMotion;    var shouldAnimateProgress = data.shouldAnimateProgress;    var currentStageIndex = data.currentStageIndex;    var previousCompletedStages = data.previousCompletedStages;    var completedStages = data.completedStages;    var totalStages = data.totalStages;    var labels = data.labels;  function buildColumns(columnsEl, data) {  }      .replace(/'/g, '&#39;');      .replace(/"/g, '&quot;')      .replace(/>/g, '&gt;')      .replace(/</g, '&lt;')      .replace(/&/g, '&amp;')    return String(value == null ? '' : value)  function escapeHtml(value) {  }    }, 20));      }        continueBtn.focus();      if (continueBtn && typeof continueBtn.focus === 'function') {    modalState.timers.push(setTimeout(function () {    setFocusTrap(true);    overlay.setAttribute('aria-hidden', 'false');    overlay.classList.add('is-open');    modalState.isOpen = true;    }      modalState.previousFocusEl = document.activeElement;    if (!modalState.isOpen) {    var continueBtn = root.querySelector('[data-lcv-continue="1"]');    var overlay = root.querySelector('[data-lcv-overlay="1"]');    var root = createRoot();  function openModal() {  }    }      modalState.onClose();    if (triggerCallback && wasOpen && typeof modalState.onClose === 'function') {    }      try { modalState.previousFocusEl.focus(); } catch (err) {}    if (modalState.previousFocusEl && typeof modalState.previousFocusEl.focus === 'function') {    clearTimers();    setFocusTrap(false);    overlay.setAttribute('aria-hidden', 'true');    overlay.classList.remove('is-open');    modalState.isOpen = false;    var wasOpen = modalState.isOpen;    if (!overlay) return;    var overlay = root.querySelector('[data-lcv-overlay="1"]');    if (!root) return;    var root = document.getElementById(ROOT_ID);  function closeModal(triggerCallback) {  }    };      document.removeEventListener('keydown', onKeydown);    modalState.removeTrapHandler = function () {    document.addEventListener('keydown', onKeydown);    }      }        first.focus();        event.preventDefault();      } else if (!event.shiftKey && document.activeElement === last) {        last.focus();        event.preventDefault();      if (event.shiftKey && document.activeElement === first) {      var last = focusable[focusable.length - 1];      var first = focusable[0];      if (!focusable.length) return;      var focusable = overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');      if (event.key !== 'Tab') return;      }        return;        closeModal(true);        event.preventDefault();      if (event.key === 'Escape') {      if (!overlay || !overlay.classList.contains('is-open')) return;      var overlay = root.querySelector('[data-lcv-overlay="1"]');      if (!root) return;      var root = document.getElementById(ROOT_ID);    function onKeydown(event) {    }      return;      }        modalState.removeTrapHandler = null;        modalState.removeTrapHandler();      if (modalState.removeTrapHandler) {    if (!enabled) {  function setFocusTrap(enabled) {  }    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);  function prefersReducedMotion() {  }    return Math.max(0, Math.min(100, parsed));    if (!isFinite(parsed)) return fallback;    var parsed = Number(value);  function normalizePercent(value, fallback) {  }    return Math.floor(parsed);    if (!isFinite(parsed)) return fallback;    var parsed = Number(value);  function normalizeInt(value, fallback) {  }    return root;    });      closeModal(true);    btn.addEventListener('click', function () {    });      event.stopPropagation();    shell.addEventListener('click', function (event) {    });      if (event.target === overlay) closeModal(true);    overlay.addEventListener('click', function (event) {    var btn = root.querySelector('[data-lcv-continue="1"]');    var shell = root.querySelector('.lcv-shell');    var overlay = root.querySelector('[data-lcv-overlay="1"]');    document.body.appendChild(root);      + '</div>';      + '  </section>'      + '    </div>'      + '      <button type="button" class="lcv-btn" data-lcv-continue="1">Continue</button>'      + '    <div class="lcv-actions" data-lcv-actions="1">'      + '    <p class="lcv-feedback" data-lcv-feedback="1">Next module unlocked</p>'      + '    </div>'      + '      </div>'      + '        <div class="lcv-rail"><div class="lcv-rail-fill" data-lcv-fill="1"></div></div>'      + '      <div class="lcv-columns" data-lcv-columns="1">'      + '    <div class="lcv-progress" data-lcv-progress="1">'      + '    </header>'      + '      <p id="lcv-subtitle" class="lcv-subtitle"></p>'      + '      <h2 id="lcv-title" class="lcv-title">Module Complete</h2>'      + '    <header class="lcv-header">'      + '  <section class="lcv-shell" role="dialog" aria-modal="true" aria-labelledby="lcv-title" aria-describedby="lcv-subtitle">'      + '<div class="lcv-overlay" data-lcv-overlay="1" aria-hidden="true">'    root.innerHTML = ''    root.id = ROOT_ID;    root = document.createElement('div');    if (root) return root;    var root = document.getElementById(ROOT_ID);  function createRoot() {  }    document.head.appendChild(styleEl);    styleEl.appendChild(document.createTextNode(css));    styleEl.id = STYLE_ID;    var styleEl = document.createElement('style');      + '@media (prefers-reduced-motion:reduce){.lcv-overlay,.lcv-shell,.lcv-title,.lcv-subtitle,.lcv-progress,.lcv-feedback,.lcv-actions,.lcv-rail-fill,.lcv-node,.lcv-check,.lcv-glow{transition:none !important;}}';      + '@media (max-width:640px){.lcv-overlay{padding:14px;}.lcv-shell{padding:34px 14px 22px;}.lcv-title{font-size:1.74rem;}.lcv-subtitle{font-size:.94rem;}.lcv-label-top,.lcv-label-bottom{font-size:.56rem;letter-spacing:.06em;min-height:34px;}.lcv-node{width:1.32rem;height:1.32rem;}}'      + '.lcv-btn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px;}'      + '.lcv-btn:hover{background:#7ab4fb;box-shadow:0 12px 24px -16px rgba(96,165,250,.72);}'      + '.lcv-btn{border:0;border-radius:.5rem;padding:.8rem 2.8rem;background:#60a5fa;color:#fff;font-weight:600;font-size:.98rem;line-height:1;cursor:pointer;transition:background-color .2s ease,transform .2s ease,box-shadow .2s ease;box-shadow:0 12px 22px -16px rgba(96,165,250,.62),0 0 0 1px rgba(191,219,254,.22) inset;}'      + '.lcv-actions.is-visible{opacity:1;transform:translateY(0);}'      + '.lcv-actions{display:flex;justify-content:center;opacity:0;transform:translateY(6px);transition:opacity .22s ease-out,transform .22s ease-out;}'      + '.lcv-feedback.is-visible{opacity:1;}'      + '.lcv-feedback{text-align:center;font-size:.82rem;line-height:1.35;color:#94a3b8;margin:0 0 20px;opacity:0;transition:opacity .2s ease-out;}'      + '.lcv-check.is-visible{opacity:1;transform:scale(1);}'      + '.lcv-check{width:.78rem;height:.78rem;opacity:0;transform:scale(.82);transition:opacity .16s ease-out,transform .18s ease-out;}'      + '.lcv-glow.is-visible{opacity:1;}'      + '.lcv-glow{position:absolute;inset:-3px;border-radius:999px;background:rgba(96,165,250,.22);filter:blur(8px);opacity:0;transition:opacity .24s ease-out;pointer-events:none;}'      + '.lcv-node.is-new{transform:scale(1.06);}'      + '.lcv-node.is-current{background:rgba(96,165,250,.30);border-color:rgba(191,219,254,.98);color:#f8fafc;box-shadow:0 0 0 2px rgba(96,165,250,.16);}'      + '.lcv-node.is-done{background:rgba(96,165,250,.22);border-color:rgba(125,211,252,.78);color:#f8fafc;}'      + '.lcv-node{position:relative;z-index:2;width:1.45rem;height:1.45rem;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(148,163,184,.55);background:rgba(15,23,42,.22);color:transparent;opacity:.97;transition:background-color .2s ease,border-color .2s ease,color .2s ease,transform .2s ease,box-shadow .2s ease;}'      + '.lcv-node-wrap{position:relative;height:30px;display:flex;align-items:center;justify-content:center;}'      + '.lcv-label-top.is-done,.lcv-label-bottom.is-done{color:#bfdbfe;}'      + '.lcv-label-top.is-active,.lcv-label-bottom.is-active{color:#dbeafe;}'      + '.lcv-label-top,.lcv-label-bottom{font-size:.62rem;line-height:1.15;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;text-align:center;min-height:30px;display:flex;align-items:center;justify-content:center;max-width:95%;word-break:break-word;}'      + '.lcv-col{position:relative;display:flex;flex-direction:column;align-items:center;min-width:0;}'      + '.lcv-rail-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#60a5fa;border-radius:999px;transition:width .38s cubic-bezier(.22,1,.36,1);}'      + '.lcv-rail{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(148,163,184,.38);transform:translateY(-50%);border-radius:999px;}'      + '.lcv-columns{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);align-items:center;}'      + '.lcv-progress.is-visible{opacity:1;transform:translateY(0);}'      + '.lcv-progress{margin:0 auto 18px;max-width:34rem;opacity:0;transform:translateY(4px);transition:opacity .22s ease-out,transform .22s ease-out;}'      + '.lcv-title.is-visible,.lcv-subtitle.is-visible{opacity:1;transform:translateY(0);}'      + '.lcv-subtitle{margin:9px 0 0;font-size:1.02rem;line-height:1.4;color:#cbd5e1;opacity:0;transform:translateY(4px);transition:opacity .20s ease-out,transform .20s ease-out;}'      + '.lcv-title{margin:0;font-size:2.05rem;line-height:1.12;font-weight:700;letter-spacing:.01em;opacity:0;transform:translateY(6px);transition:opacity .22s ease-out,transform .22s ease-out;}'      + '.lcv-header{text-align:center;margin:0 0 22px;}'      + '.lcv-overlay.is-open .lcv-shell{transform:translateY(0) scale(1);opacity:1;}'      + '.lcv-shell{width:min(100%,42rem);padding:40px 24px 28px;border-radius:18px;color:#f8fafc;transform:translateY(8px) scale(.992);opacity:0;transition:transform .26s ease-out,opacity .26s ease-out;}'      + '.lcv-overlay.is-open{opacity:1;pointer-events:auto;}'      + '.lcv-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,28,.60);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .26s ease-out;}'    var css = ''    if (document.getElementById(STYLE_ID)) return;  function injectStyles() {  }    modalState.timers = [];    }      clearTimeout(modalState.timers[i]);    for (var i = 0; i < modalState.timers.length; i += 1) {  function clearTimers() {  };    timers: []    removeTrapHandler: null,    previousFocusEl: null,    onClose: function () {},    isOpen: false,  var modalState = {  var ROOT_ID = 'lcv-root';  var STYLE_ID = 'lcv-styles';  if (typeof window === 'undefined' || typeof document === 'undefined') return;





















































































































































































































































































































































































































































})();  } catch (err) {}    document.dispatchEvent(new CustomEvent('floatingFire:modalReady'));  try {  window.destroyLevelCompleteModal = destroyLevelCompleteModal;  window.renderLevelCompleteModal = renderLevelCompleteModal;  }    modalState.isOpen = false;    }      root.parentNode.removeChild(root);    if (root && root.parentNode) {    var root = document.getElementById(ROOT_ID);    setFocusTrap(false);    clearTimers();  function destroyLevelCompleteModal() {  }    });      completedStages: completedStages      previousCompletedStages: previousCompletedStages,      toPercent: toPercent,      fromPercent: fromPercent,      reducedMotion: reducedMotion,      shouldAnimateProgress: shouldAnimateProgress,    animateProgress(root, {    });      shouldAnimate: !reducedMotion    stageTextSequence(root, {    openModal();    }      return;      setFocusTrap(false);      overlay.setAttribute('aria-hidden', 'true');      overlay.classList.remove('is-open');      modalState.isOpen = false;    if (!isOpen) {    });      reducedMotion: reducedMotion      shouldAnimateProgress: shouldAnimateProgress,      currentStageIndex: currentStageIndex,      previousCompletedStages: previousCompletedStages,      completedStages: completedStages,      totalStages: totalStages,      labels: labels,    buildNodeColumns(columnsEl, {    clearTimers();    subtitleEl.textContent = 'You completed Module ' + Math.max(1, currentLevel);    var fromPercent = normalizePercent(props && props.previousCompletionPercent, previousCompletionPercent);    var toPercent = normalizePercent(props && props.completionPercent, completionPercent);      : (previousCompletedStages > 0 ? 100 : 0);      ? ((Math.max(0, previousCompletedStages - 1) / (totalStages - 1)) * 100)    var previousCompletionPercent = totalStages > 1      : (completedStages > 0 ? 100 : 0);      ? ((Math.max(0, completedStages - 1) / (totalStages - 1)) * 100)    var completionPercent = totalStages > 1      : 0;      ? Math.max(0, Math.min(completedStages - 1, totalStages - 1))    var currentStageIndex = totalStages    var reducedMotion = !!(props && props.reducedMotion) || prefersReducedMotion();    var shouldAnimateProgress = !!(props && props.shouldAnimateProgress) && isNewCompletion;    var isNewCompletion = completedStages > previousCompletedStages;    var previousCompletedStages = Math.max(0, Math.min(previousLevel, totalStages));    var completedStages = Math.max(0, Math.min(currentLevel, totalStages));    if (totalStages !== labels.length) totalStages = labels.length;    var totalStages = normalizeInt(props && props.totalStages, labels.length);    if (!labels.length) labels = fallbackLabels.slice();      .filter(function (label) { return !!label; });      .map(function (label) { return String(label || '').trim().toUpperCase(); })    var labels = (inputLabels && inputLabels.length ? inputLabels : fallbackLabels)    var fallbackLabels = ['WELCOME', 'PROFILE AND CREDENTIALS', 'AGENT FOUNDATION', 'CONGRATULATIONS'];    var inputLabels = props && Array.isArray(props.stepLabels) ? props.stepLabels : null;    var previousLevel = normalizeInt(props && props.previousLevel, 0);    var currentLevel = normalizeInt(props && props.currentLevel, 1);    modalState.onClose = typeof (props && props.onClose) === 'function' ? props.onClose : function () {};    var isOpen = !!(props && props.isOpen);    var columnsEl = root.querySelector('[data-lcv-columns="1"]');    var subtitleEl = root.querySelector('.lcv-subtitle');    var overlay = root.querySelector('[data-lcv-overlay="1"]');    if (!root) return;    var root = document.getElementById(ROOT_ID);    createMarkup();    injectStyles();  function renderLevelCompleteModal(props) {  }    }      fillEl.style.width = toPercent + '%';    } else {      }        }(i));          }, checkDelay));            if (checkEl) checkEl.classList.add('is-visible');            var checkEl = root.querySelector('[data-lcv-check="' + idx + '"]');          modalState.timeouts.push(setTimeout(function () {          }, nodeDelay));            if (nodeEl) nodeEl.classList.add('is-done');            var nodeEl = root.querySelector('[data-lcv-node="' + idx + '"]');          modalState.timeouts.push(setTimeout(function () {          var checkDelay = nodeDelay + 120;          var nodeDelay = 660 + (idx - previousCompletedStages) * 40;        (function (idx) {      for (var i = previousCompletedStages; i < completedStages; i += 1) {      }, 260));        fillEl.style.width = toPercent + '%';      modalState.timeouts.push(setTimeout(function () {    if (shouldAnimateProgress && !reducedMotion) {    fillEl.style.width = (shouldAnimateProgress && !reducedMotion ? fromPercent : toPercent) + '%';    var completedStages = options.completedStages;    var previousCompletedStages = options.previousCompletedStages;    var toPercent = options.toPercent;    var fromPercent = options.fromPercent;    var reducedMotion = options.reducedMotion;    var shouldAnimateProgress = options.shouldAnimateProgress;    var fillEl = root.querySelector('[data-lcv-fill="1"]');  function animateProgress(root, options) {  }    modalState.timeouts.push(setTimeout(function () { actions.classList.add('is-visible'); }, 620));    modalState.timeouts.push(setTimeout(function () { feedback.classList.add('is-visible'); }, 560));    modalState.timeouts.push(setTimeout(function () { progress.classList.add('is-visible'); }, 180));    modalState.timeouts.push(setTimeout(function () { subtitle.classList.add('is-visible'); }, 120));    modalState.timeouts.push(setTimeout(function () { title.classList.add('is-visible'); }, 60));    }      return;      actions.classList.add('is-visible');      feedback.classList.add('is-visible');      progress.classList.add('is-visible');      subtitle.classList.add('is-visible');      title.classList.add('is-visible');    if (!shouldAnimate) {    actions.classList.remove('is-visible');    feedback.classList.remove('is-visible');    progress.classList.remove('is-visible');    subtitle.classList.remove('is-visible');    title.classList.remove('is-visible');    var shouldAnimate = options.shouldAnimate;    var actions = root.querySelector('[data-lcv-actions="1"]');    var feedback = root.querySelector('[data-lcv-feedback="1"]');    var progress = root.querySelector('[data-lcv-progress="1"]');    var subtitle = root.querySelector('.lcv-subtitle');    var title = root.querySelector('.lcv-title');  function stageTextSequence(root, options) {  }    columnsEl.innerHTML = '<div class="lcv-rail"><div class="lcv-rail-fill" data-lcv-fill="1"></div></div>' + html;    }        + '</div>';        + '  <div class="lcv-label-bottom ' + labelClass + '">' + bottomLabel + '</div>'        + '  </div>'        + '    </span>'        + '      <svg class="lcv-check' + (isDone && (!shouldAnimateProgress || wasDone || reducedMotion) ? ' is-visible' : '') + '" data-lcv-check="' + i + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>'        + '    <span class="' + nodeClass + '" data-lcv-node="' + i + '">'        + '    <span class="lcv-glow' + (isCurrent ? ' is-visible' : '') + '"></span>'        + '  <div class="lcv-node-wrap">'        + '  <div class="lcv-label-top ' + labelClass + '">' + topLabel + '</div>'        + '<div class="lcv-col" data-lcv-col="' + i + '">'      html += ''      var bottomLabel = (i % 2 !== 0) ? label : '&nbsp;';      var topLabel = (i % 2 === 0) ? label : '&nbsp;';      var labelClass = isCurrent ? 'is-active' : (isDone ? 'is-done' : '');      if (shouldAnimateProgress && isNewDone && !reducedMotion) nodeClass += ' is-new';      if (isCurrent) nodeClass += ' is-current';      if (isDone) nodeClass += ' is-done';      var nodeClass = 'lcv-node';      var label = escapeHtml(labels[i] || '');      var isNewDone = !wasDone && isDone;      var isCurrent = isDone && i === currentStageIndex;      var wasDone = i < previousCompletedStages;      var isDone = i < completedStages;    for (var i = 0; i < totalStages; i += 1) {    var html = '';    var reducedMotion = options.reducedMotion;    var shouldAnimateProgress = options.shouldAnimateProgress;    var currentStageIndex = options.currentStageIndex;    var previousCompletedStages = options.previousCompletedStages;    var completedStages = options.completedStages;    var totalStages = options.totalStages;    var labels = options.labels;  function buildNodeColumns(columnsEl, options) {  }      .replace(/'/g, '&#39;');      .replace(/"/g, '&quot;')      .replace(/>/g, '&gt;')      .replace(/</g, '&lt;')      .replace(/&/g, '&amp;')    return String(value == null ? '' : value)  function escapeHtml(value) {  }    }      modalState.onClose();    if (typeof modalState.onClose === 'function') {    }      try { modalState.previousFocusEl.focus(); } catch (err) {}    if (modalState.previousFocusEl && typeof modalState.previousFocusEl.focus === 'function') {    clearTimers();    setFocusTrap(false);    overlay.setAttribute('aria-hidden', 'true');    overlay.classList.remove('is-open');    modalState.isOpen = false;    if (!overlay) return;    var overlay = root.querySelector('[data-lcv-overlay="1"]');    if (!root) return;    var root = document.getElementById(ROOT_ID);  function closeModal() {  }    modalState.timeouts.push(focusTimer);    }, 20);      }        continueBtn.focus();      if (continueBtn && typeof continueBtn.focus === 'function') {    var focusTimer = setTimeout(function () {    setFocusTrap(true);    overlay.setAttribute('aria-hidden', 'false');    overlay.classList.add('is-open');    modalState.isOpen = true;    }      modalState.previousFocusEl = document.activeElement;    if (!modalState.isOpen) {    var continueBtn = root.querySelector('[data-lcv-continue="1"]');    var overlay = root.querySelector('[data-lcv-overlay="1"]');    var root = createMarkup();  function openModal() {  }    };      document.removeEventListener('keydown', onKeydown);    modalState.removeTrapHandler = function () {    document.addEventListener('keydown', onKeydown);    }      }        first.focus();        event.preventDefault();      } else if (!event.shiftKey && document.activeElement === last) {        last.focus();        event.preventDefault();      if (event.shiftKey && document.activeElement === first) {      var last = focusable[focusable.length - 1];      var first = focusable[0];      if (!focusable.length) return;      var focusable = overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');      if (event.key !== 'Tab') return;      }        return;        closeModal();        event.preventDefault();      if (event.key === 'Escape') {      if (!overlay || !overlay.classList.contains('is-open')) return;      var overlay = root.querySelector('[data-lcv-overlay="1"]');      if (!root) return;      var root = document.getElementById(ROOT_ID);    function onKeydown(event) {    }      return;      }        modalState.removeTrapHandler = null;        modalState.removeTrapHandler();      if (modalState.removeTrapHandler) {    if (!isOpen) {  function setFocusTrap(isOpen) {  }    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);  function prefersReducedMotion() {  }    return Math.max(0, Math.min(100, parsed));    if (!isFinite(parsed)) return fallback;    var parsed = Number(value);  function normalizePercent(value, fallback) {  }    return Math.floor(parsed);    if (!isFinite(parsed)) return fallback;    var parsed = Number(value);  function normalizeInt(value, fallback) {  }    return root;    });      closeModal();    btn.addEventListener('click', function () {    });      event.stopPropagation();    shell.addEventListener('click', function (event) {    });      }        closeModal();      if (event.target === overlay) {    overlay.addEventListener('click', function (event) {    var btn = root.querySelector('[data-lcv-continue="1"]');    var shell = root.querySelector('.lcv-shell');    var overlay = root.querySelector('[data-lcv-overlay="1"]');    document.body.appendChild(root);      + '</div>';      + '  </section>'      + '    </div>'      + '      <button type="button" class="lcv-btn" data-lcv-continue="1">Continue</button>'      + '    <div class="lcv-actions" data-lcv-actions="1">'      + '    <p class="lcv-feedback" data-lcv-feedback="1">Next module unlocked</p>'      + '    </div>'      + '      </div>'      + '        <div class="lcv-rail"><div class="lcv-rail-fill" data-lcv-fill="1"></div></div>'      + '      <div class="lcv-columns" data-lcv-columns="1">'      + '    <div class="lcv-progress" data-lcv-progress="1">'      + '    </header>'      + '      <p id="lcv-subtitle" class="lcv-subtitle"></p>'      + '      <h2 id="lcv-title" class="lcv-title">Module Complete</h2>'      + '    <header class="lcv-header">'      + '  <section class="lcv-shell" role="dialog" aria-modal="true" aria-labelledby="lcv-title" aria-describedby="lcv-subtitle">'      + '<div class="lcv-overlay" data-lcv-overlay="1" aria-hidden="true">'    root.innerHTML = ''    root.id = ROOT_ID;    root = document.createElement('div');    if (root) return root;    var root = document.getElementById(ROOT_ID);  function createMarkup() {  }    document.head.appendChild(styleEl);    styleEl.appendChild(document.createTextNode(css));    styleEl.id = STYLE_ID;    var styleEl = document.createElement('style');      + '@media (prefers-reduced-motion:reduce){.lcv-overlay,.lcv-shell,.lcv-title,.lcv-subtitle,.lcv-progress,.lcv-feedback,.lcv-actions,.lcv-rail-fill,.lcv-node,.lcv-check,.lcv-glow{transition:none !important;}}';      + '@media (max-width:640px){.lcv-overlay{padding:14px;}.lcv-shell{padding:34px 14px 22px;}.lcv-title{font-size:1.74rem;}.lcv-subtitle{font-size:.94rem;}.lcv-label-top,.lcv-label-bottom{font-size:.56rem;letter-spacing:.06em;min-height:34px;}.lcv-node{width:1.34rem;height:1.34rem;}}'      + '.lcv-btn:active{transform:translateY(1px);}'      + '.lcv-btn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px;}'      + '.lcv-btn:hover{background:#7ab4fb;box-shadow:0 12px 24px -16px rgba(96,165,250,.72);}'      + '.lcv-btn{border:0;border-radius:.5rem;padding:.8rem 2.8rem;background:#60a5fa;color:#fff;font-weight:600;font-size:.98rem;line-height:1;cursor:pointer;transition:background-color .2s ease,transform .2s ease,box-shadow .2s ease;box-shadow:0 12px 22px -16px rgba(96,165,250,.62),0 0 0 1px rgba(191,219,254,.22) inset;}'      + '.lcv-actions.is-visible{opacity:1;transform:translateY(0);}'      + '.lcv-actions{display:flex;justify-content:center;opacity:0;transform:translateY(6px);transition:opacity .24s ease-out,transform .24s ease-out;}'      + '.lcv-feedback.is-visible{opacity:1;}'      + '.lcv-feedback{text-align:center;font-size:.82rem;line-height:1.35;color:#94a3b8;margin:0 0 22px;opacity:0;transition:opacity .2s ease-out;}'      + '.lcv-check.is-visible{opacity:1;transform:scale(1);}'      + '.lcv-check{width:.8rem;height:.8rem;opacity:0;transform:scale(.8);transition:opacity .16s ease-out,transform .18s ease-out;}'      + '.lcv-glow.is-visible{opacity:1;}'      + '.lcv-glow{position:absolute;inset:-3px;border-radius:999px;background:rgba(96,165,250,.22);filter:blur(8px);opacity:0;transition:opacity .25s ease-out;pointer-events:none;}'      + '.lcv-node.is-new{transform:scale(1.06);}'      + '.lcv-node.is-current{background:rgba(96,165,250,.30);border-color:rgba(191,219,254,.98);color:#f8fafc;box-shadow:0 0 0 2px rgba(96,165,250,.16);}'      + '.lcv-node.is-done{background:rgba(96,165,250,.22);border-color:rgba(125,211,252,.8);color:#f8fafc;}'      + '.lcv-node{position:relative;z-index:2;width:1.5rem;height:1.5rem;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(148,163,184,.55);background:rgba(15,23,42,.22);color:transparent;opacity:.96;transition:background-color .2s ease,border-color .2s ease,color .2s ease,transform .22s ease,box-shadow .22s ease;}'      + '.lcv-node-wrap{position:relative;height:32px;display:flex;align-items:center;justify-content:center;}'      + '.lcv-label-top.is-done,.lcv-label-bottom.is-done{color:#bfdbfe;}'      + '.lcv-label-top.is-active,.lcv-label-bottom.is-active{color:#dbeafe;}'      + '.lcv-label-top,.lcv-label-bottom{font-size:.63rem;line-height:1.15;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;text-align:center;min-height:30px;display:flex;align-items:center;justify-content:center;max-width:94%;word-break:break-word;}'      + '.lcv-col{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;}'      + '.lcv-rail-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:#60a5fa;border-radius:999px;transition:width .38s cubic-bezier(.22,1,.36,1);}'      + '.lcv-rail{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(148,163,184,.38);transform:translateY(-50%);border-radius:999px;}'      + '.lcv-columns{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);align-items:center;column-gap:0;}'      + '.lcv-progress.is-visible{opacity:1;transform:translateY(0);}'      + '.lcv-progress{margin:0 auto 20px;max-width:34rem;opacity:0;transform:translateY(4px);transition:opacity .24s ease-out,transform .24s ease-out;}'      + '.lcv-title.is-visible,.lcv-subtitle.is-visible{opacity:1;transform:translateY(0);}'      + '.lcv-subtitle{margin:10px 0 0;font-size:1.03rem;line-height:1.4;color:#cbd5e1;opacity:0;transform:translateY(4px);transition:opacity .22s ease-out,transform .22s ease-out;}'      + '.lcv-title{margin:0;font-size:2.08rem;line-height:1.12;font-weight:700;letter-spacing:.01em;opacity:0;transform:translateY(6px);transition:opacity .24s ease-out,transform .24s ease-out;}'      + '.lcv-header{text-align:center;margin:0 0 24px;}'      + '.lcv-overlay.is-open .lcv-shell{transform:translateY(0) scale(1);opacity:1;}'      + '.lcv-shell{width:min(100%,42rem);padding:42px 24px 28px;border-radius:18px;color:#f8fafc;transform:translateY(8px) scale(.992);opacity:0;transition:transform .26s ease-out,opacity .26s ease-out;}'      + '.lcv-overlay.is-open{opacity:1;pointer-events:auto;}'      + '.lcv-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,28,.60);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .26s ease-out;}'    var css = ''    if (document.getElementById(STYLE_ID)) return;  function injectStyles() {  }    modalState.timeouts = [];    }      clearTimeout(modalState.timeouts[i]);    for (var i = 0; i < modalState.timeouts.length; i += 1) {  function clearTimers() {  };    timeouts: []    removeTrapHandler: null,    previousFocusEl: null,    onClose: function () {},    isOpen: false,  var modalState = {  var ROOT_ID = 'lcv-root';  var STYLE_ID = 'lcv-styles';  if (typeof document === 'undefined' || typeof window === 'undefined') return;  var React = window.React;
  if (!React) return;

  function getMotionLib() {
    return window.Motion || window.framerMotion || {};
  }

  function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('lc-styles')) return;

    var css = ""
      + ".lc-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(8,14,28,.62);backdrop-filter:blur(2px);padding:20px;}"
      + ".lc-shell{position:relative;width:min(100%,40rem);padding:46px 26px 30px;border-radius:18px;background:transparent;color:#fff;}"
      + ".lc-header{margin-bottom:2.5rem;text-align:center;}"
      + ".lc-title{margin:0;font-size:2.1rem;line-height:1.12;font-weight:700;letter-spacing:.01em;color:#f8fafc;}"
      + ".lc-subtitle{margin:.65rem 0 0;font-size:1.05rem;line-height:1.45;color:#cbd5e1;}"
      + ".lc-stepper-wrap{max-width:30rem;padding:0 1.25rem;margin:0 auto 2.15rem;}"
      + ".lc-labels{display:flex;align-items:center;gap:.35rem;margin-bottom:.85rem;font-size:.64rem;line-height:1.1;text-transform:uppercase;font-weight:500;letter-spacing:.08em;}"
      + ".lc-label{flex:1;min-width:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
      + ".lc-label-done{color:#bfdbfe;}"
      + ".lc-label-current{color:#dbeafe;}"
      + ".lc-label-upcoming{color:#94a3b8;}"
      + ".lc-track{position:relative;height:1.85rem;display:flex;align-items:center;justify-content:space-between;}"
      + ".lc-track-bg{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(148,163,184,.38);transform:translateY(-50%);border-radius:999px;}"
      + ".lc-track-fill{position:absolute;left:0;top:50%;height:2px;background:#60a5fa;transform:translateY(-50%);transform-origin:left center;border-radius:999px;}"
      + ".lc-node-wrap{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;width:1.55rem;height:1.55rem;}"
      + ".lc-node{position:relative;display:flex;align-items:center;justify-content:center;width:1.55rem;height:1.55rem;border-radius:999px;box-sizing:border-box;transition:background-color .2s ease,border-color .2s ease,opacity .2s ease;}"
      + ".lc-node-upcoming{background:rgba(15,23,42,.2);border:1.5px solid rgba(148,163,184,.55);color:transparent;opacity:.95;}"
      + ".lc-node-done{background:rgba(96,165,250,.22);border:1.5px solid rgba(125,211,252,.78);color:#e2e8f0;}"
      + ".lc-node-current{background:rgba(96,165,250,.28);border:1.5px solid rgba(191,219,254,.98);color:#f8fafc;box-shadow:0 0 0 2px rgba(96,165,250,.18);}" 
      + ".lc-current-glow{position:absolute;inset:-2px;border-radius:999px;background:rgba(96,165,250,.26);filter:blur(8px);z-index:1;pointer-events:none;}"
      + ".lc-check{position:relative;z-index:2;width:.8rem;height:.8rem;color:#f8fafc;}"
      + ".lc-feedback{margin:0 0 2.25rem;text-align:center;font-size:.82rem;line-height:1.35;color:#94a3b8;}"
      + ".lc-xp{margin:-1.25rem 0 2rem;text-align:center;font-size:1.02rem;line-height:1.25;font-weight:700;letter-spacing:.01em;color:#dbeafe;}"
      + ".lc-xp-count{display:inline-block;min-width:1.25ch;text-align:right;color:#93c5fd;font-size:1.18em;}"
      + ".lc-actions{display:flex;justify-content:center;}"
      + ".lc-continue{border:0;border-radius:.5rem;padding:.8rem 2.8rem;background:#60a5fa;color:#fff;font-weight:600;font-size:.98rem;line-height:1;cursor:pointer;transition:background-color .2s ease,transform .2s ease,box-shadow .2s ease;box-shadow:0 12px 22px -16px rgba(96,165,250,.62),0 0 0 1px rgba(191,219,254,.22) inset;}"
      + ".lc-continue:hover{background:#7ab4fb;box-shadow:0 12px 24px -16px rgba(96,165,250,.72);}"
      + ".lc-continue:focus-visible{outline:2px solid #93c5fd;outline-offset:2px;}"
      + ".lc-continue:active{transform:translateY(1px);}"
      + "@media (max-width:640px){.lc-overlay{padding:14px;}.lc-shell{padding:36px 16px 24px;}.lc-title{font-size:1.78rem;}.lc-subtitle{font-size:.95rem;}.lc-stepper-wrap{padding:0 .3rem;}.lc-labels{font-size:.58rem;letter-spacing:.06em;}.lc-node-wrap,.lc-node{width:1.35rem;height:1.35rem;}}"
      + "@media (prefers-reduced-motion:reduce){.lc-current-glow{animation:none !important;}}"
      + ".lc-cert-icon{width:1em;height:1em;vertical-align:middle;display:inline-block;margin-right:.4ch;stroke:currentColor;}"
      + ".lc-cert-label{font-size:.64rem;line-height:1.15;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;display:inline-flex;align-items:center;gap:.35rem;}"
      + "@keyframes lc-cert-bounce{0%{transform:translateY(0) scale(1);}50%{transform:translateY(-4px) scale(1.06);}100%{transform:translateY(0) scale(1);}}"
      + ".lc-cert-animate{animation:lc-cert-bounce 2s ease-out 1 forwards;}";

    var style = document.createElement('style');
    style.id = 'lc-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function AnimatedDiv(props) {
    var lib = getMotionLib();
    var Comp = (lib.motion && lib.motion.div) || 'div';
    return React.createElement(Comp, props, props.children);
  }

  function AnimatedPath(props) {
    var lib = getMotionLib();
    var Comp = (lib.motion && lib.motion.path) || 'path';
    return React.createElement(Comp, props);
  }

  function Checkmark(props) {
    var reducedMotion = !!props.reducedMotion;
    var delay = typeof props.delay === 'number' ? props.delay : 0;
    var animateIn = !!props.animateIn;

    return React.createElement(
      'svg',
      {
        className: 'lc-check',
        fill: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '3',
        viewBox: '0 0 24 24',
        stroke: 'currentColor',
        'aria-hidden': 'true'
      },
      React.createElement(AnimatedPath, {
        d: 'M5 13l4 4L19 7',
        initial: (reducedMotion || !animateIn) ? { pathLength: 1 } : { pathLength: 0 },
        animate: { pathLength: 1 },
        transition: (reducedMotion || !animateIn)
          ? { duration: 0 }
          : { delay: delay, duration: 0.2, ease: 'easeOut' }
      })
    );
  }

  function StepLabel(props) {
    var reducedMotion = !!props.reducedMotion;
    var delay = typeof props.delay === 'number' ? props.delay : 0;
    var className = props.className;
    var text = props.text;

    return React.createElement(
      AnimatedDiv,
      {
        className: className,
        initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 2 },
        animate: { opacity: 1, y: 0 },
        transition: reducedMotion ? { duration: 0 } : { delay: delay, duration: 0.2, ease: 'easeOut' }
      },
      text
    );
  }

  function XpCounter(props) {
    var reducedMotion = !!props.reducedMotion;
    var startValue = Math.max(0, Math.floor(Number(props.startValue) || 0));
    var target = Math.max(0, Math.floor(Number(props.target) || 0));
    var durationMs = typeof props.durationMs === 'number' ? props.durationMs : 2800;
    var startDelayMs = typeof props.startDelayMs === 'number' ? Math.max(0, props.startDelayMs) : 0;
    var _React$useState = React.useState(reducedMotion ? target : startValue);
    var value = _React$useState[0];
    var setValue = _React$useState[1];

    React.useEffect(function () {
      if (reducedMotion) {
        setValue(target);
        return;
      }

      var startTime = null;
      var frameId = null;
      var startTimerId = null;

      function tick(timestamp) {
        if (startTime == null) startTime = timestamp;
        var elapsed = Math.max(0, timestamp - startTime);
        var progress = Math.min(1, elapsed / durationMs);
        var eased = 1 - Math.pow(1 - progress, 3);
        var nextValue = Math.floor(startValue + ((target - startValue) * eased));
        setValue(nextValue > target ? target : nextValue);

        if (progress < 1) {
          frameId = window.requestAnimationFrame(tick);
        } else {
          setValue(target);
        }
      }

      setValue(startValue);

      var startAnimation = function () {
        frameId = window.requestAnimationFrame(tick);
      };

      if (startDelayMs > 0) {
        startTimerId = window.setTimeout(startAnimation, startDelayMs);
      } else {
        startAnimation();
      }

      return function () {
        if (startTimerId != null) window.clearTimeout(startTimerId);
        if (frameId != null) window.cancelAnimationFrame(frameId);
      };
    }, [durationMs, reducedMotion, startDelayMs, startValue, target]);

    return React.createElement('span', { className: 'lc-xp-count', 'aria-label': String(target) + ' XP' }, String(value));
  }

  function LevelComplete(props) {
    injectStyles();

    var isOpen = !!(props && props.isOpen);
    var onClose = typeof (props && props.onClose) === 'function' ? props.onClose : function () {};
    var currentLevel = props && props.currentLevel != null ? Number(props.currentLevel) : 1;
    var previousLevel = props && props.previousLevel != null ? Number(props.previousLevel) : 0;
    var safeLevel = Number.isFinite(currentLevel) && currentLevel > 0 ? Math.floor(currentLevel) : 1;
    var safePreviousLevel = Number.isFinite(previousLevel) && previousLevel > 0 ? Math.floor(previousLevel) : 0;
    
    var inputLabels = props && Array.isArray(props.stepLabels) ? props.stepLabels : null;
    var fallbackLabels = ['WELCOME', 'PROFILE AND CREDENTIALS', 'AGENT FOUNDATION', 'CONGRATULATIONS'];
    var labels = (inputLabels && inputLabels.length ? inputLabels : fallbackLabels)
      .map(function (label) { return String(label || '').trim().toUpperCase(); })
      .filter(function (label) { return !!label; });

    if (!labels.length) labels = fallbackLabels.slice();

    var totalStages = props && Number(props.totalStages) > 0
      ? Math.floor(Number(props.totalStages))
      : labels.length;
    if (totalStages !== labels.length) totalStages = labels.length;

    var completedStages = Math.max(0, Math.min(safeLevel, totalStages));
    var previousCompletedStages = Math.max(0, Math.min(safePreviousLevel, totalStages));
    var isNewCompletion = completedStages > previousCompletedStages;
    var shouldAnimateProgress = !!props.shouldAnimateProgress && isNewCompletion;

    var currentStageIndex = props && Number.isFinite(Number(props.currentStageIndex))
      ? Math.max(0, Math.min(Math.floor(Number(props.currentStageIndex)), Math.max(totalStages - 1, 0)))
      : Math.max(0, Math.min(completedStages - 1, Math.max(totalStages - 1, 0)));

    var progressPercentFromStages = totalStages > 1
      ? (Math.max(0, completedStages - 1) / (totalStages - 1)) * 100
      : (completedStages > 0 ? 100 : 0);
    var progressPercent = props && Number.isFinite(Number(props.completionPercent))
      ? Math.max(0, Math.min(100, Number(props.completionPercent)))
      : progressPercentFromStages;

    var previousProgressPercentFromStages = totalStages > 1
      ? (Math.max(0, previousCompletedStages - 1) / (totalStages - 1)) * 100
      : (previousCompletedStages > 0 ? 100 : 0);
    var previousProgressPercent = props && Number.isFinite(Number(props.previousCompletionPercent))
      ? Math.max(0, Math.min(100, Number(props.previousCompletionPercent)))
      : previousProgressPercentFromStages;

    var animateFromPercent = shouldAnimateProgress ? previousProgressPercent : progressPercent;
    var animateToPercent = shouldAnimateProgress ? progressPercent : progressPercent;

    var currentStageLabel = props && props.currentStageLabel
      ? String(props.currentStageLabel)
      : (labels[currentStageIndex] || '');
    var xpPerModule = props && props.xpAward != null ? Number(props.xpAward) : 5;
    var xpStart = Math.max(0, previousCompletedStages * xpPerModule);
    var xpAward = Math.max(xpStart, safeLevel * xpPerModule);
    var xpRevealDelaySec = shouldAnimateProgress ? 1.0 : 0.58;
    var xpRevealDelayMs = reducedMotion ? 0 : Math.round(xpRevealDelaySec * 1000);

    var nodeList = [];
    for (var nodeIndex = 0; nodeIndex < totalStages; nodeIndex += 1) {
      nodeList.push(nodeIndex);
    }

    var motionLib = getMotionLib();
    var AnimatePresence = motionLib.AnimatePresence;
    var reducedMotion = !!props.reducedMotion || (typeof motionLib.useReducedMotion === 'function'
      ? !!motionLib.useReducedMotion()
      : false);
    var rootRef = React.useRef(null);
    var previousFocusRef = React.useRef(null);

    React.useEffect(function () {
      if (!isOpen) return;

      function handleEsc(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }

      document.addEventListener('keydown', handleEsc);
      return function () {
        document.removeEventListener('keydown', handleEsc);
      };
    }, [isOpen, onClose]);

    React.useEffect(function () {
      if (!isOpen) return;
      previousFocusRef.current = document.activeElement;

      var timer = setTimeout(function () {
        if (!rootRef.current) return;
        var continueButton = rootRef.current.querySelector('[data-lc-continue]');
        if (continueButton && typeof continueButton.focus === 'function') {
          continueButton.focus();
        }
      }, 20);

      function trapFocus(event) {
        if (event.key !== 'Tab' || !rootRef.current) return;

        var focusable = rootRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;

        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      document.addEventListener('keydown', trapFocus);
      return function () {
        clearTimeout(timer);
        document.removeEventListener('keydown', trapFocus);
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          try { previousFocusRef.current.focus(); } catch (err) {}
        }
      };
    }, [isOpen]);

    if (!AnimatePresence) {
      if (!isOpen) return null;
      return React.createElement('div', { className: 'lc-overlay' }, React.createElement('div', { className: 'lc-shell' }, 'Level complete'));
    }

    return React.createElement(
      AnimatePresence,
      null,
      isOpen
        ? React.createElement(
            AnimatedDiv,
            {
              className: 'lc-overlay',
              initial: reducedMotion ? { opacity: 1 } : { opacity: 0 },
              animate: { opacity: 1 },
              exit: reducedMotion ? { opacity: 0 } : { opacity: 0 },
              transition: reducedMotion ? { duration: 0 } : { duration: 0.3 },
              onClick: function (event) {
                if (event.target === event.currentTarget) onClose();
              }
            },
            React.createElement(
              AnimatedDiv,
              {
                ref: rootRef,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': 'level-complete-title',
                'aria-describedby': 'level-complete-subtitle',
                className: 'lc-shell',
                initial: reducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.985 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 },
                transition: reducedMotion ? { duration: 0 } : { duration: 0.26, ease: 'easeOut' },
                onClick: function (event) {
                  event.stopPropagation();
                }
              },
              React.createElement(
                'header',
                { className: 'lc-header' },
                React.createElement(
                  AnimatedDiv,
                  {
                    initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 },
                    transition: reducedMotion ? { duration: 0 } : { delay: 0.06, duration: 0.26, ease: 'easeOut' }
                  },
                  React.createElement('h2', { id: 'level-complete-title', className: 'lc-title' }, 'Module Complete')
                ),
                React.createElement(
                  AnimatedDiv,
                  {
                    initial: reducedMotion ? { opacity: 1 } : { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: reducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.24 }
                  },
                  React.createElement('p', { id: 'level-complete-subtitle', className: 'lc-subtitle' }, 'You completed Module ', safeLevel)
                )
              ),
              React.createElement(
                AnimatedDiv,
                {
                  className: 'lc-stepper-wrap',
                  initial: reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.985 },
                  animate: { opacity: 1, scale: 1 },
                  transition: reducedMotion ? { duration: 0 } : { delay: 0.16, duration: 0.24, ease: 'easeOut' }
                },
                React.createElement(
                  'div',
                  { className: 'lc-labels', 'aria-hidden': 'true' },
                  labels.map(function (label, labelIndex) {
                    var isDone = labelIndex < completedStages;
                    var isCurrent = labelIndex === currentStageIndex && completedStages > 0;
                    var labelClass = isCurrent
                      ? 'lc-label-current'
                      : (isDone ? 'lc-label-done' : 'lc-label-upcoming');

                    return React.createElement(StepLabel, {
                      key: 'label-' + labelIndex,
                      text: label,
                      className: 'lc-label ' + labelClass,
                      reducedMotion: reducedMotion,
                      delay: 0.18
                    });
                  })
                ),
                React.createElement(
                  'div',
                  {
                    className: 'lc-track',
                    role: 'img',
                    'aria-label': 'Step ' + (currentStageIndex + 1) + ' of ' + totalStages + ' completed: ' + currentStageLabel
                  },
                  React.createElement('div', { className: 'lc-track-bg' }),
                  React.createElement(AnimatedDiv, {
                    className: 'lc-track-fill',
                    initial: reducedMotion 
                      ? { width: animateToPercent + '%' }
                      : (shouldAnimateProgress ? { width: animateFromPercent + '%' } : { width: animateToPercent + '%' }),
                    animate: { width: animateToPercent + '%' },
                    transition: reducedMotion 
                      ? { duration: 0 }
                      : (shouldAnimateProgress
                          ? { delay: 0.26, duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                          : { duration: 0 })
                  }),
                  nodeList.map(function (nodeIndex) {
                    var isPreviousDone = nodeIndex < previousCompletedStages;
                    var isDoneNode = nodeIndex < completedStages;
                    var isCurrentNode = isDoneNode && nodeIndex === currentStageIndex;
                    var isNewNode = !isPreviousDone && isDoneNode;
                    
                    var nodeClass = isCurrentNode
                      ? 'lc-node lc-node-current'
                      : (isDoneNode ? 'lc-node lc-node-done' : 'lc-node lc-node-upcoming');
                    
                    var baseNodeDelay = 0.26 + 0.4;
                    var nodeDelay = shouldAnimateProgress && isNewNode
                      ? (baseNodeDelay + 0.03 * (nodeIndex - previousCompletedStages))
                      : 0;
                    var checkDelay = nodeDelay + 0.12;

                    return React.createElement(
                      AnimatedDiv,
                      {
                        key: 'node-' + nodeIndex,
                        className: 'lc-node-wrap',
                        initial: reducedMotion
                          ? { scale: 1, opacity: 1 }
                          : (shouldAnimateProgress && isNewNode ? { scale: 0.92, opacity: 0.74 } : { scale: 1, opacity: 1 }),
                        animate: { scale: 1, opacity: 1 },
                        transition: reducedMotion
                          ? { duration: 0 }
                          : (shouldAnimateProgress && isNewNode
                              ? { delay: nodeDelay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                              : { duration: 0 })
                      },
                      isCurrentNode
                        ? React.createElement(AnimatedDiv, {
                            className: 'lc-current-glow',
                            initial: reducedMotion
                              ? { opacity: 0.18, scale: 1 }
                              : (shouldAnimateProgress && isNewNode ? { opacity: 0, scale: 0.92 } : { opacity: 0.18, scale: 1 }),
                            animate: { opacity: 0.18, scale: 1 },
                            transition: reducedMotion 
                              ? { duration: 0 }
                              : { delay: nodeDelay, duration: 0.28, ease: 'easeOut' }
                          })
                        : null,
                      React.createElement(
                        'div',
                        { className: nodeClass },
                        isDoneNode
                          ? React.createElement(Checkmark, {
                              reducedMotion: reducedMotion,
                              delay: checkDelay,
                              animateIn: shouldAnimateProgress && isNewNode
                            })
                          : null
                      )
                    );
                  })
                )
              ),
              React.createElement(
                AnimatedDiv,
                {
                  initial: reducedMotion ? { opacity: 1 } : { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: reducedMotion ? { duration: 0 } : { delay: shouldAnimateProgress ? 0.56 : 0.26, duration: 0.24 }
                },
                React.createElement('p', { className: 'lc-feedback' }, 'Next Step Unlocked!')
              ),
              React.createElement(
                AnimatedDiv,
                {
                  initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  transition: reducedMotion ? { duration: 0 } : { delay: xpRevealDelaySec, duration: 0.26, ease: 'easeOut' }
                },
                React.createElement('p', { className: 'lc-xp', 'aria-live': 'polite' }, 'You\'ve Got ', React.createElement(XpCounter, { startValue: xpStart, target: xpAward, reducedMotion: reducedMotion, durationMs: 2800, startDelayMs: xpRevealDelayMs }), ' XP')
              ),
              React.createElement(
                AnimatedDiv,
                {
                  className: 'lc-actions',
                  initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  transition: reducedMotion ? { duration: 0 } : { delay: shouldAnimateProgress ? 1.16 : 0.82, duration: 0.26, ease: [0.22, 1, 0.36, 1] }
                },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'lc-continue',
                    'data-lc-continue': '1',
                    onClick: onClose
                  },
                  'Continue'
                )
              )
            )
          )
        : null
    );
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelComplete;
  }
  if (typeof window !== 'undefined') {
    window.LevelComplete = LevelComplete;
    try {
      document.dispatchEvent(new CustomEvent('floatingFire:modalReady'));
    } catch (err) {}
  }
})();
