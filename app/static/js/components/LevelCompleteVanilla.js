(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var STYLE_ID = 'lcv-styles';
  var ROOT_ID = 'lcv-root';

  var modalState = {
    isOpen: false,
    onClose: function () {},
    previousFocusEl: null,
    removeTrapHandler: null,
    timers: [],
    currentView: 'completion',
    currentLevel: 0,
    lottieInstance: null,
    lottieInstances: [],
    xpData: { currentXP: 0, gainedXP: 5, maxXP: 20, previousMaxXP: 20, didRankUp: false, titleUpgrade: null, previousRankName: 'Beginner', currentRankName: 'Beginner', rankLabel: 'Rank: Beginner', animationPath: '/static/json/b_coin.json' },
    progressConveyor: {
      lastCount: 0,
      windowLabels: [],
      visibleStartIndex: 0,
      trackLabels: []
    }
  };

  var COIN_SETTLE_START_MS = 2200;
  var COIN_MATERIAL_SHIFT_MS = 1500;
  var COIN_SPEED_DEFAULT = 1;
  var LOTTIE_INIT_RETRY_DELAY_MS = 160;
  var LOTTIE_INIT_MAX_RETRIES = 75;
  var LOTTIE_FALLBACK_RUNTIME_SOURCES = [
    'https://cdn.jsdelivr.net/npm/lottie-web@5.10.1/build/player/lottie.min.js',
    'https://unpkg.com/lottie-web@5.10.1/build/player/lottie.min.js'
  ];
  var COIN_ANIMATION_PRELOAD_PATHS = [
    '/static/json/b_coin.json',
    '/static/json/c_coin.json',
    '/static/json/g_coin.json',
    '/static/json/diamond.json',
    '/static/json/gold_crown.json'
  ];
  var lottieJsonCache = {};
  var lottieJsonPending = {};
  var lottieRuntimeLoadPromise = null;
  var lottieRuntimeSourceTried = {};

  function animateXPCounter(containerEl, startXP, targetXP, options) {
    if (!containerEl) return;
    if (typeof targetXP === 'object' && typeof options === 'undefined') {
      options = targetXP;
      targetXP = startXP;
      startXP = 0;
    } else if (typeof targetXP === 'undefined' || targetXP === null) {
      targetXP = startXP;
      startXP = 0;
    }

    var opts = options || {};
    var prefix = typeof opts.prefix === 'string' ? opts.prefix : '+';
    
    var current = Math.max(0, Math.floor(Number(startXP) || 0));
    var target = Math.max(current, Math.floor(Number(targetXP) || 0));
    var increment = Math.ceil(Math.max(1, target - current) / 50);
    var interval = Math.floor(2800 / 50);
    
    containerEl.textContent = prefix + current;
    
    var countupTimer = setInterval(function () {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(countupTimer);
      }
      containerEl.textContent = prefix + current;
    }, interval);
    
    modalState.timers.push(countupTimer);
  }

  function getAvatarUrl(options) {
    var opts = options || {};
    var currentLevel = normalizeInt(opts.currentLevel, 0);
    if (currentLevel === 1) {
      return '/static/images/module%20profile%20default.jpg';
    }

    var pageRoot = document.getElementById('tpl1Root');
    if (pageRoot && pageRoot.dataset) {
      var configuredAvatar = String(pageRoot.dataset.userIconUrl || '').trim();
      if (configuredAvatar) return configuredAvatar;

      var defaultAvatar = String(pageRoot.dataset.defaultUserIconUrl || '').trim();
      if (defaultAvatar) return defaultAvatar;
    }
    return window.location.origin.replace(/\/$/, '') + '/static/images/Sir-Gab.png?v=1';
  }

  function destroyLottieAnimations() {
    var layeredInstances = Array.isArray(modalState.lottieInstances) ? modalState.lottieInstances : [];
    for (var i = 0; i < layeredInstances.length; i += 1) {
      if (layeredInstances[i] && typeof layeredInstances[i].destroy === 'function') {
        layeredInstances[i].destroy();
      }
    }

    if (
      modalState.lottieInstance &&
      typeof modalState.lottieInstance.destroy === 'function' &&
      layeredInstances.indexOf(modalState.lottieInstance) === -1
    ) {
      modalState.lottieInstance.destroy();
    }

    modalState.lottieInstances = [];
    modalState.lottieInstance = null;
  }

  function clearTimers() {
    for (var i = 0; i < modalState.timers.length; i += 1) clearTimeout(modalState.timers[i]);
    modalState.timers = [];
    destroyLottieAnimations();
  }

  function resolveAnimationPath(animationPath) {
    return String(animationPath || '/static/json/b_coin.json').trim() || '/static/json/b_coin.json';
  }

  function cloneAnimationData(data) {
    if (!data) return data;
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(data);
      } catch (err) {}
    }

    try {
      return JSON.parse(JSON.stringify(data));
    } catch (err2) {
      return data;
    }
  }

  function primeLottieJsonCache(animationPath) {
    var resolvedPath = resolveAnimationPath(animationPath);

    if (lottieJsonCache[resolvedPath]) {
      return Promise.resolve(lottieJsonCache[resolvedPath]);
    }
    if (lottieJsonPending[resolvedPath]) {
      return lottieJsonPending[resolvedPath];
    }
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('fetch_unavailable'));
    }

    var pendingRequest = fetch(resolvedPath, {
      credentials: 'same-origin',
      cache: 'force-cache'
    })
      .then(function (response) {
        if (!response || !response.ok) {
          throw new Error('lottie_json_load_failed');
        }
        return response.json();
      })
      .then(function (json) {
        lottieJsonCache[resolvedPath] = json;
        delete lottieJsonPending[resolvedPath];
        return json;
      })
      .catch(function (error) {
        delete lottieJsonPending[resolvedPath];
        throw error;
      });

    lottieJsonPending[resolvedPath] = pendingRequest;
    return pendingRequest;
  }

  function warmLottieJsonCache(paths) {
    var list = Array.isArray(paths) ? paths : [];
    for (var i = 0; i < list.length; i += 1) {
      primeLottieJsonCache(list[i]).catch(function () {});
    }
  }

  function getLottieRuntime() {
    var runtime = window.lottie || window.bodymovin;
    if (!runtime || typeof runtime.loadAnimation !== 'function') {
      return null;
    }

    if (!window.lottie) {
      window.lottie = runtime;
    }
    return runtime;
  }

  function renderLottieFallback(containerEl, animationPath) {
    if (!containerEl) return;

    var pathValue = resolveAnimationPath(animationPath).toLowerCase();
    if (pathValue.indexOf('cert.json') > -1) {
      containerEl.innerHTML = '<svg class="lcv-cert-fallback" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21l3-3 3 3"></path><path d="M8 16v5"></path><path d="M16 16v5"></path></svg>';
      return;
    }

    var toneClass = 'is-bronze';
    if (pathValue.indexOf('gold_crown') > -1) {
      toneClass = 'is-gold';
    } else if (pathValue.indexOf('diamond') > -1) {
      toneClass = 'is-diamond';
    } else if (pathValue.indexOf('g_coin') > -1) {
      toneClass = 'is-gold';
    } else if (pathValue.indexOf('c_coin') > -1) {
      toneClass = 'is-silver';
    }

    containerEl.innerHTML = '<span class="lcv-xp-coin-fallback ' + toneClass + '" aria-hidden="true"></span>';
  }

  function ensureLottieRuntimeLoaded() {
    if (getLottieRuntime()) {
      return Promise.resolve(true);
    }
    if (lottieRuntimeLoadPromise) {
      return lottieRuntimeLoadPromise;
    }
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('document_unavailable'));
    }

    lottieRuntimeLoadPromise = new Promise(function (resolve, reject) {
      var sources = LOTTIE_FALLBACK_RUNTIME_SOURCES.slice(0);

      function attemptNextSource() {
        if (getLottieRuntime()) {
          resolve(true);
          lottieRuntimeLoadPromise = null;
          return;
        }

        if (!sources.length) {
          reject(new Error('lottie_runtime_failed'));
          lottieRuntimeLoadPromise = null;
          return;
        }

        var source = sources.shift();
        if (lottieRuntimeSourceTried[source]) {
          attemptNextSource();
          return;
        }
        lottieRuntimeSourceTried[source] = true;

        var scriptEl = document.createElement('script');
        scriptEl.src = source;
        scriptEl.async = true;
        scriptEl.defer = true;
        scriptEl.crossOrigin = 'anonymous';
        scriptEl.setAttribute('data-lcv-lottie-fallback', source);
        scriptEl.onload = function () {
          if (getLottieRuntime()) {
            resolve(true);
            lottieRuntimeLoadPromise = null;
            return;
          }
          attemptNextSource();
        };
        scriptEl.onerror = function () {
          attemptNextSource();
        };

        (document.head || document.body || document.documentElement).appendChild(scriptEl);
      }

      attemptNextSource();
    });

    return lottieRuntimeLoadPromise;
  }

  function queueLottieInitRetry(containerEl, animationPath, options, retryCount) {
    if (!containerEl) return;

    var attempts = Math.max(0, normalizeInt(retryCount, 0));
    if (attempts >= LOTTIE_INIT_MAX_RETRIES) {
      containerEl.__lcvLottieRetryPending = false;
      return;
    }

    if (containerEl.__lcvLottieRetryPending && attempts === 0) {
      return;
    }
    containerEl.__lcvLottieRetryPending = true;

    modalState.timers.push(setTimeout(function () {
      if (!containerEl || !containerEl.isConnected) {
        if (containerEl) containerEl.__lcvLottieRetryPending = false;
        return;
      }

      if (!getLottieRuntime()) {
        renderLottieFallback(containerEl, animationPath);
        ensureLottieRuntimeLoaded().catch(function () {});
        queueLottieInitRetry(containerEl, animationPath, options, attempts + 1);
        return;
      }

      containerEl.__lcvLottieRetryPending = false;
      initializeLottieAnimation(containerEl, animationPath, options);
    }, LOTTIE_INIT_RETRY_DELAY_MS));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '.lcv-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:none;visibility:hidden;backdrop-filter:blur(8px) saturate(118%);transition:visibility 0s linear .52s;}'
      + '.lcv-overlay::before{content:"";position:absolute;inset:0;background:rgba(8,14,28,.72);opacity:0;pointer-events:none;transition:opacity .62s ease-out;}'
      + '.lcv-overlay.is-open{pointer-events:auto;visibility:visible;transition-delay:0s;}'
      + '.lcv-overlay.is-open::before{opacity:1;}'
      + '.lcv-shell{position:relative;z-index:1;width:min(100%,42rem);padding:30px 24px 22px;border-radius:20px;color:#f8fafc;transform:translateY(12px) scale(.986);opacity:0;border:1px solid rgba(191,219,254,.14);background:linear-gradient(180deg,rgba(16,24,40,.86),rgba(10,16,28,.78));box-shadow:0 26px 70px -34px rgba(15,23,42,.85);transition:transform .50s cubic-bezier(.22,1,.36,1),opacity .50s ease-out;}'
      + '.lcv-overlay.is-open .lcv-shell{transform:translateY(0) scale(1);opacity:1;}'
      + '.lcv-back{position:absolute;top:14px;left:14px;width:34px;height:34px;border-radius:999px;border:1px solid rgba(191,219,254,.24);background:rgba(15,23,42,.42);color:#bfdbfe;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;pointer-events:none;transform:translateX(-6px);transition:opacity .28s ease,transform .28s ease,background-color .2s ease;}'
      + '.lcv-back.is-visible{opacity:1;pointer-events:auto;transform:translateX(0);}'
      + '.lcv-back:hover{background:rgba(30,64,175,.45);}'
      + '.lcv-back:focus-visible{outline:2px solid #93c5fd;outline-offset:2px;}'
      + '.lcv-header{text-align:center;margin:0 0 14px;min-height:68px;}'
      + '.lcv-shell.is-xp-state .lcv-subtitle{visibility:hidden;opacity:0;transform:none;}'
      + '.lcv-title{margin:0;font-size:2.05rem;line-height:1.12;font-weight:700;letter-spacing:.01em;opacity:0;transform:translateY(8px);transition:opacity .42s ease-out,transform .42s ease-out;}'
      + '.lcv-subtitle{margin:9px 0 0;font-size:1.02rem;line-height:1.4;color:#cbd5e1;opacity:0;transform:translateY(6px);transition:opacity .40s ease-out,transform .40s ease-out;}'
      + '.lcv-title.is-visible,.lcv-subtitle.is-visible{opacity:1;transform:translateY(0);}'
      + '.lcv-progress{margin:0 auto 18px;max-width:34rem;opacity:0;transform:translateY(4px);transition:opacity .40s ease-out,transform .40s ease-out;}'
      + '.lcv-progress.is-visible{opacity:1;transform:translateY(0);}'
      + '.lcv-columns{position:relative;overflow:hidden;padding:10px 0;--lcv-visible-count:3;--lcv-conveyor-gap:12px;}'
      + '.lcv-track{position:relative;display:flex;align-items:center;gap:var(--lcv-conveyor-gap,12px);will-change:transform;transform:translate3d(0,0,0);overflow:visible;}'
      + '.lcv-track .lcv-col{flex:0 0 calc((100% - (2 * var(--lcv-conveyor-gap,12px))) / var(--lcv-visible-count,3));max-width:calc((100% - (2 * var(--lcv-conveyor-gap,12px))) / var(--lcv-visible-count,3));}'
      + '.lcv-track.lcv-track-path{gap:0;align-items:stretch;}'
      + '.lcv-track.lcv-track-path.is-sliding{transition:transform .96s cubic-bezier(0.22,1,0.36,1);}'
      + '.lcv-track-node{position:relative;z-index:2;flex:0 0 calc(100% / 3);max-width:calc(100% / 3);}'
      + '.lcv-track-node .lcv-node-wrap{position:relative;z-index:3;overflow:visible;}'
      + '.lcv-track-node .lcv-track-lead,.lcv-track-node .lcv-track-connector{position:absolute;top:50%;height:8px;transform:translateY(-50%);border-radius:999px;background:linear-gradient(180deg,rgba(120,138,167,.38),rgba(90,104,130,.42));overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);pointer-events:none;z-index:1;}'
      + '.lcv-track-node .lcv-track-lead{left:0;width:50%;}'
      + '.lcv-track-node .lcv-track-connector{left:50%;width:100%;}'
      + '.lcv-track-lead-fill,.lcv-track-connector-fill{position:absolute;inset:0;border-radius:999px;background:linear-gradient(90deg,#4f8df6 0%,#60a5fa 48%,#93c5fd 100%);box-shadow:0 0 18px rgba(96,165,250,.34);transform-origin:left center;transform:scaleX(0);transition:transform 1.4s cubic-bezier(.22,1,.36,1);}'
      + '.lcv-track-connector-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.34),rgba(255,255,255,0));opacity:.34;transform:translateX(-35%);animation:lcvRailShimmer 2.2s linear infinite;}'
      + '.lcv-track-lead-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.34),rgba(255,255,255,0));opacity:.28;transform:translateX(-35%);animation:lcvRailShimmer 2.2s linear infinite;}'
      + '.lcv-track-node .lcv-track-lead.is-done .lcv-track-lead-fill{transform:scaleX(1);}'
      + '.lcv-track-connector.is-done .lcv-track-connector-fill{transform:scaleX(1);}'
      + '.lcv-track.is-conveyor{transition:transform .72s cubic-bezier(0.22,1,0.36,1);}'
      + '.lcv-track.is-conveyor-shift{transform:translate3d(calc(-1 * var(--lcv-conveyor-step-x,0px)),0,0);}'
      + '.lcv-track.is-conveyor-shift-two{transform:translate3d(calc(-2 * var(--lcv-conveyor-step-x,0px)),0,0);}'
      + '.lcv-rail{position:absolute;left:0;right:0;top:50%;height:8px;background:linear-gradient(180deg,rgba(98,116,145,.24),rgba(71,85,105,.34));transform:translateY(-50%);border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.07);opacity:0;transition:opacity .36s ease-out;}'
      + '.lcv-rail.is-visible{opacity:1;}'
      + '.lcv-rail-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#4f8df6 0%,#60a5fa 48%,#93c5fd 100%);border-radius:999px;box-shadow:0 0 18px rgba(96,165,250,.32);transition:width 1.4s cubic-bezier(.22,1,.36,1);}'
      + '.lcv-rail-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.34),rgba(255,255,255,0));opacity:.34;transform:translateX(-35%);animation:lcvRailShimmer 2.2s linear infinite;}'
      + '.lcv-col{position:relative;display:flex;flex-direction:column;align-items:center;min-width:0;overflow:visible;}'
      + '.lcv-col.is-exit-oldest,.lcv-col.is-enter-new{will-change:transform,opacity;transition:transform .72s cubic-bezier(0.22,1,0.36,1),opacity .72s cubic-bezier(0.22,1,0.36,1);}'
      + '.lcv-col.is-enter-new{opacity:0;transform:translateX(24px) scale(.98);}'
      + '.lcv-track.is-conveyor-shift .lcv-col.is-exit-oldest{opacity:0;transform:scale(.92);}'
      + '.lcv-track.is-conveyor-shift .lcv-col.is-enter-new{opacity:1;transform:translateX(0) scale(1);}'
      + '.lcv-label-top,.lcv-label-bottom{font-size:.62rem;line-height:1.15;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;text-align:center;min-height:30px;display:flex;align-items:center;justify-content:center;max-width:95%;word-break:break-word;opacity:0;transition:opacity .34s ease-out,color .30s ease-out;}'
      + '.lcv-label-top.is-visible,.lcv-label-bottom.is-visible{opacity:1;}'
      + '.lcv-label-top.is-active,.lcv-label-bottom.is-active{color:#dbeafe;}'
      + '.lcv-label-top.is-done,.lcv-label-bottom.is-done{color:#bfdbfe;}'
      + '.lcv-node-wrap{position:relative;height:64px;display:flex;align-items:center;justify-content:center;overflow:visible;}'
      + '.lcv-node{position:relative;z-index:2;width:1.55rem;height:1.55rem;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(148,163,184,.55);background:rgba(15,23,42,.22);color:transparent;opacity:.97;transition:background-color .40s ease,border-color .40s ease,color .40s ease,transform .40s ease,box-shadow .40s ease;}'
      + '.lcv-node:not(.is-done):not(.is-current){background:rgba(15,23,42,.94);border-color:rgba(148,163,184,.78);opacity:1;}'
      + '.lcv-node.is-done{background:linear-gradient(180deg,rgba(96,165,250,.94),rgba(59,130,246,.92));border-color:rgba(125,211,252,.86);color:#f8fafc;}'
      + '.lcv-node.is-current{background:linear-gradient(180deg,rgba(96,165,250,1),rgba(37,99,235,.98));border-color:rgba(191,219,254,.98);color:#f8fafc;box-shadow:0 0 0 4px rgba(96,165,250,.14),0 0 18px rgba(96,165,250,.32);}'
      + '.lcv-node.is-new{transform:scale(1.06);}'
      + '.lcv-node.is-conveyor-pulse{animation:lcvNodeConveyorPulse .32s cubic-bezier(0.4,0,0.2,1) both;}'
      + '.lcv-node.is-hit{animation:lcvNodeHit .44s cubic-bezier(.22,1,.36,1) both;}'
      + '.lcv-glow{position:absolute;left:50%;top:50%;width:46px;height:46px;margin-left:-23px;margin-top:-23px;border-radius:50%;background:rgba(96,165,250,.42);box-shadow:0 0 18px rgba(96,165,250,.76),0 0 38px rgba(96,165,250,.56);filter:blur(14px);opacity:0;pointer-events:none;}'
      + '.lcv-glow.is-visible{opacity:1;}'
      + '.lcv-glow.is-conveyor-pulse{animation:lcvGlowConveyorPulse .32s cubic-bezier(0.4,0,0.2,1) both;}'
      + '.lcv-glow.is-hit{animation:lcvGlowPulse 1.35s cubic-bezier(.22,1,.36,1);}'
      + '.lcv-check{width:.78rem;height:.78rem;opacity:0;transform:scale(.82);transition:opacity .34s ease-out,transform .34s ease-out;}'
      + '.lcv-check.is-visible{opacity:1;transform:scale(1);}'
      + '.lcv-check path{stroke-dasharray:24;stroke-dashoffset:24;transition:stroke-dashoffset .34s cubic-bezier(.22,1,.36,1);}'
      + '.lcv-check.is-visible path{stroke-dashoffset:0;}'
      + '.lcv-badge{display:flex;align-items:center;justify-content:center;gap:4px;text-align:center;font-size:1.1rem;line-height:1.3;color:#cbd5e1;margin:0 0 8px;opacity:0;transition:opacity .38s ease-out;font-weight:700;letter-spacing:.01em;}'
      + '.lcv-badge.is-visible{opacity:1;}'
      + '.lcv-badge-counter{font-size:1.2rem;color:#60a5fa;font-weight:700;}'
      + '.lcv-feedback{text-align:center;font-size:.62rem;line-height:1.15;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin:0 0 18px;opacity:0;transition:opacity .38s ease-out;display:flex;align-items:center;justify-content:center;gap:.35rem;}'
      + '.lcv-feedback.is-visible{opacity:1;}'
      + '.lcv-cert-animation{width:3.5em;height:3.5em;flex:0 0 auto;display:inline-block;}'
      + '.lcv-cert-copy{display:inline-block;}'
      + '.lcv-state{position:relative;height:300px;min-height:320px;}'
      + '.lcv-view{position:absolute;inset:0;transition:opacity .4s ease-out,transform .4s ease-out;}'
      + '.lcv-view.is-hidden{opacity:0;transform:translateY(-8px);pointer-events:none;}'
      + '.lcv-view.is-visible{opacity:1;transform:translateY(0);pointer-events:auto;}'
      + '.lcv-xp-section{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;width:100%;}'
      + '.lcv-shell.is-xp-state .lcv-xp-section{margin-top:-24px;}'
      + '.lcv-shell.is-xp-state .lcv-xp-focus{margin-top:-24px;}'
      + '.lcv-shell.is-xp-state .lcv-xp-level-label{margin-top:-12px;margin-bottom:30px;}'
      + '.lcv-shell.is-xp-state .lcv-xp-progress{margin-top:-18px;}'
      + '.lcv-xp-focus{position:relative;width:176px;height:176px;margin:0 auto 12px;}'
      + '.lcv-xp-animation{position:absolute;top:50%;left:50%;width:170px;height:170px;opacity:0;transform:translate(-50%,-50%) scale(1);transform-origin:center center;transition:opacity .35s ease-out,transform .95s cubic-bezier(.22,1,.36,1);z-index:2;}'
      + '.lcv-xp-animation.is-visible{opacity:1;}'
      + '.lcv-xp-focus.is-compact .lcv-xp-animation{transform:translate(calc(-50% + 36px),calc(-50% - 43px)) scale(.36);}'
      + '.lcv-xp-animation svg{width:100%;height:100%;}'
      + '.lcv-xp-coin-scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}'
      + '.lcv-xp-coin-core{position:absolute;inset:0;will-change:transform;}'
      + '.lcv-xp-coin-face{position:absolute;inset:0;opacity:0;backface-visibility:hidden;transition:opacity .34s ease-in-out,filter .34s ease-in-out;}'
      + '.lcv-xp-coin-face svg{width:100%;height:100%;}'
      + '.lcv-xp-coin-fallback{display:block;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.36) 0%,rgba(255,255,255,0) 30%),linear-gradient(140deg,#f59e0b 0%,#d97706 45%,#92400e 100%);box-shadow:0 0 16px rgba(245,158,11,.26);}'
      + '.lcv-xp-coin-fallback.is-silver{background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.44) 0%,rgba(255,255,255,0) 32%),linear-gradient(140deg,#e2e8f0 0%,#94a3b8 46%,#64748b 100%);box-shadow:0 0 16px rgba(148,163,184,.26);}'
      + '.lcv-xp-coin-fallback.is-diamond{background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.52) 0%,rgba(255,255,255,0) 34%),linear-gradient(140deg,#dbeafe 0%,#60a5fa 48%,#1d4ed8 100%);box-shadow:0 0 16px rgba(96,165,250,.3);}'
      + '.lcv-xp-coin-fallback.is-gold{background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.46) 0%,rgba(255,255,255,0) 32%),linear-gradient(140deg,#fde68a 0%,#f59e0b 46%,#b45309 100%);box-shadow:0 0 16px rgba(245,158,11,.3);}'
      + '.lcv-xp-coin-face-bronze{opacity:1;filter:drop-shadow(0 0 16px rgba(217,119,6,.30));}'
      + '.lcv-xp-coin-face-silver{opacity:0;filter:drop-shadow(0 0 18px rgba(148,163,184,.32));}'
      + '.lcv-xp-animation.is-material-shift .lcv-xp-coin-face-bronze{opacity:.18;filter:drop-shadow(0 0 20px rgba(251,191,36,.45));}'
      + '.lcv-xp-animation.is-material-shift .lcv-xp-coin-face-silver{opacity:1;}'
      + '.lcv-xp-animation.is-upgraded .lcv-xp-coin-face-bronze{opacity:0;}'
      + '.lcv-xp-animation.is-upgraded .lcv-xp-coin-face-silver{opacity:1;}'
      + '.lcv-xp-burst{position:absolute;inset:-8%;opacity:0;}'
      + '.lcv-xp-burst-ring{position:absolute;inset:15%;border-radius:50%;border:1px solid rgba(191,219,254,.56);box-shadow:0 0 24px rgba(191,219,254,.30),inset 0 0 26px rgba(148,163,184,.18);transform:scale(.66);opacity:0;}'
      + '.lcv-xp-burst-rays{position:absolute;inset:8%;border-radius:50%;background:conic-gradient(from 0deg,rgba(255,255,255,0) 0deg,rgba(255,255,255,.42) 36deg,rgba(255,255,255,0) 72deg,rgba(255,255,255,.28) 108deg,rgba(255,255,255,0) 144deg,rgba(255,255,255,.3) 180deg,rgba(255,255,255,0) 216deg,rgba(255,255,255,.22) 252deg,rgba(255,255,255,0) 288deg,rgba(255,255,255,.35) 324deg,rgba(255,255,255,0) 360deg);mask:radial-gradient(circle at center,transparent 44%,#000 71%,transparent 100%);opacity:0;transform:scale(.78) rotate(0deg);filter:blur(.2px);}'
      + '.lcv-xp-burst-particle{position:absolute;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0%,rgba(191,219,254,.95) 45%,rgba(148,163,184,0) 100%);opacity:0;transform:translate(-50%,-50%) scale(.4);}'
      + '.lcv-xp-burst-particle.p1{left:50%;top:14%;}'
      + '.lcv-xp-burst-particle.p2{left:78%;top:28%;}'
      + '.lcv-xp-burst-particle.p3{left:86%;top:54%;}'
      + '.lcv-xp-burst-particle.p4{left:68%;top:80%;}'
      + '.lcv-xp-burst-particle.p5{left:38%;top:86%;}'
      + '.lcv-xp-burst-particle.p6{left:14%;top:66%;}'
      + '.lcv-xp-burst-particle.p7{left:12%;top:38%;}'
      + '.lcv-xp-burst-particle.p8{left:30%;top:18%;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-coin-core{animation:lcvCoinUpgradePulse .85s cubic-bezier(.22,1,.36,1) .8s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst{opacity:1;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-ring{animation:lcvCoinBurstRing 1s cubic-bezier(.3,0,.2,1) .6s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-rays{animation:lcvCoinBurstRays 1s ease-in-out .6s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p1{animation:lcvCoinParticlePop 1s ease-in-out .66s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p2{animation:lcvCoinParticlePop 1s ease-in-out .70s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p3{animation:lcvCoinParticlePop 1s ease-in-out .74s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p4{animation:lcvCoinParticlePop 1s ease-in-out .78s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p5{animation:lcvCoinParticlePop 1s ease-in-out .82s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p6{animation:lcvCoinParticlePop 1s ease-in-out .86s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p7{animation:lcvCoinParticlePop 1s ease-in-out .90s both;}'
      + '.lcv-xp-animation.is-rankup-sequence .lcv-xp-burst-particle.p8{animation:lcvCoinParticlePop 1s ease-in-out .94s both;}'
      + '.lcv-xp-user-icon{position:absolute;top:50%;left:50%;width:112px;height:112px;opacity:0;transform:translate(-50%,-50%) scale(.82);transform-origin:center center;transition:opacity .45s ease-out,transform .95s cubic-bezier(.22,1,.36,1);z-index:1;pointer-events:none;background:#fff;border-radius:50%;overflow:hidden;}'
      + '.lcv-xp-user-icon.is-visible{opacity:1;transform:translate(-50%,-50%) scale(1);}'
      + '.lcv-xp-user-icon img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;}'
      + '.lcv-xp-level-label{position:relative;display:flex;align-items:center;justify-content:center;gap:.28rem;width:100%;margin:-6px 0 28px;min-height:1.4em;font-size:.95rem;line-height:1.4;font-weight:600;color:#dbeafe;text-align:center;opacity:0;overflow:hidden;}'
      + '.lcv-xp-level-label.is-visible{opacity:1;}'
      + '.lcv-rank-prefix{display:inline-block;color:#dbeafe;font-weight:600;white-space:nowrap;}'
      + '.lcv-rank-stage{display:inline-grid;grid-template-areas:"rank";align-items:center;justify-items:center;position:relative;min-height:1.4em;min-width:1ch;text-align:center;}'
      + '.lcv-xp-level-label-current,.lcv-xp-level-label-next{grid-area:rank;display:inline-block;justify-self:center;opacity:0;transform:translateY(0);will-change:opacity,transform;pointer-events:none;white-space:nowrap;text-align:center;}'
      + '.lcv-xp-level-label-current.is-visible,.lcv-xp-level-label-next.is-visible{opacity:1;}'
      + '.lcv-rank-name{display:inline-block;position:relative;font-weight:700;letter-spacing:.02em;isolation:isolate;}'
      + '.lcv-rank-beginner{color:#f6bf77;background:linear-gradient(165deg,#f9d8a4 0%,#cd7f32 40%,#9a5b2a 65%,#f2c078 100%);background-size:140% 140%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 8px rgba(255,153,51,.22),0 0 16px rgba(255,126,29,.16),0 1px 0 rgba(255,214,166,.22);}'
      + '.lcv-rank-intermediate{color:#e9eef6;background:linear-gradient(160deg,#f8fbff 0%,#dce5f2 22%,#aeb9c7 48%,#f5f8fc 74%,#c6cfdb 100%);background-size:170% 170%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 8px rgba(255,255,255,.28),0 0 18px rgba(194,205,220,.2);}'
      + '.lcv-rank-pro{color:#ffd86b;background:linear-gradient(120deg,#fff3b0 0%,#f7c948 25%,#f59e0b 50%,#ffd86b 72%,#fff5c2 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:lcvProGoldShimmer 2.4s linear infinite;text-shadow:0 0 10px rgba(247,201,72,.35),0 0 24px rgba(245,158,11,.34),0 0 42px rgba(245,158,11,.18);}'
      + '.lcv-rank-veteran{color:#b9eeff;background:linear-gradient(120deg,rgba(227,246,255,.98) 0%,rgba(165,224,255,.95) 28%,rgba(120,190,255,.92) 52%,rgba(214,246,255,.96) 78%,rgba(159,215,255,.94) 100%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:lcvVeteranPrism 3s linear infinite;text-shadow:0 0 10px rgba(122,210,255,.45),0 0 24px rgba(97,183,255,.32),0 0 38px rgba(169,233,255,.22);}'
      + '.lcv-rank-veteran::after{content:"*";position:absolute;right:-.55em;top:-.28em;font-size:.42em;line-height:1;color:#dff7ff;opacity:0;animation:lcvVeteranTwinkle 2.6s ease-in-out infinite;}'
      + '.lcv-rank-certified{color:#ffea8a;background:linear-gradient(110deg,#fff9c9 0%,#ffe277 18%,#f59e0b 42%,#fff2a8 60%,#ffd44d 78%,#fff7cc 100%);background-size:240% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:lcvCertifiedSparkle 1.6s linear infinite;text-shadow:0 0 12px rgba(255,226,119,.45),0 0 30px rgba(245,158,11,.48),0 0 54px rgba(245,158,11,.26);}'
      + '.lcv-rank-certified::before{content:"*";position:absolute;left:-.5em;top:-.25em;font-size:.42em;line-height:1;color:#fff3bf;opacity:0;animation:lcvCertifiedTwinkle 1.7s ease-in-out infinite;}'
      + '.lcv-rank-certified::after{content:"*";position:absolute;right:-.55em;bottom:-.18em;font-size:.4em;line-height:1;color:#ffe48a;opacity:0;animation:lcvCertifiedTwinkle 1.7s ease-in-out .85s infinite;}'
      + '.lcv-xp-level-label.is-rank-swap .lcv-xp-level-label-current{animation:lcvRankLabelOut .9s cubic-bezier(.22,.61,.36,1) both;}'
      + '.lcv-xp-level-label.is-rank-swap .lcv-xp-level-label-next{animation:lcvRankLabelIn 1.05s cubic-bezier(.22,1,.36,1) .18s both;}'
      + '.lcv-rank-stage::after{content:"";position:absolute;left:50%;top:50%;width:170%;height:190%;transform:translate(-50%,-50%) scale(.7);border-radius:50%;opacity:0;pointer-events:none;mix-blend-mode:screen;}'
      + '.lcv-xp-level-label.is-rank-swap[class*="is-rank-shift-"] .lcv-xp-level-label-current,.lcv-xp-level-label.is-rank-swap[class*="is-rank-shift-"] .lcv-xp-level-label-next{animation:none;opacity:1;transform:none;}'
      + '.lcv-xp-level-label.is-rank-swap[class*="is-rank-shift-"] .lcv-rank-name{will-change:transform,opacity,filter,text-shadow;}'
      + '.lcv-xp-level-label.is-rank-shift-beginner-intermediate .lcv-xp-level-label-current .lcv-rank-beginner{animation:lcvRankMeltBronzeOut 1.25s cubic-bezier(.2,.72,.25,1) both;}'
      + '.lcv-xp-level-label.is-rank-shift-beginner-intermediate .lcv-xp-level-label-next .lcv-rank-intermediate{animation:lcvRankChromeRiseIn 1.5s cubic-bezier(.22,1,.36,1) .2s both,lcvRankChromeSweep .85s ease-out 1.05s both;}'
      + '.lcv-xp-level-label.is-rank-shift-intermediate-pro .lcv-xp-level-label-current .lcv-rank-intermediate{animation:lcvRankHeatSilverOut 1.3s cubic-bezier(.22,.72,.27,1) both;}'
      + '.lcv-xp-level-label.is-rank-shift-intermediate-pro .lcv-xp-level-label-next .lcv-rank-pro{animation:lcvRankGoldForgeIn 1.6s cubic-bezier(.22,1,.36,1) .22s both;}'
      + '.lcv-xp-level-label.is-rank-shift-intermediate-pro .lcv-rank-stage::after{background:radial-gradient(circle,rgba(255,177,79,.56) 0%,rgba(255,132,0,.26) 42%,rgba(255,132,0,0) 78%);animation:lcvRankForgeFlash 1s ease-out .34s both;}'
      + '.lcv-xp-level-label.is-rank-shift-pro-veteran .lcv-xp-level-label-current .lcv-rank-pro{animation:lcvRankGoldShatterOut 1.35s cubic-bezier(.22,.78,.28,1) both;}'
      + '.lcv-xp-level-label.is-rank-shift-pro-veteran .lcv-xp-level-label-next .lcv-rank-veteran{animation:lcvRankDiamondAssembleIn 1.7s cubic-bezier(.22,1,.36,1) .24s both;}'
      + '.lcv-xp-level-label.is-rank-shift-pro-veteran .lcv-xp-level-label-next .lcv-rank-veteran::after{animation:lcvVeteranShardSpark 1.7s ease-out .74s both,lcvVeteranTwinkle 2.6s ease-in-out 2.35s infinite;}'
      + '.lcv-xp-level-label.is-rank-shift-pro-veteran .lcv-rank-stage::after{background:radial-gradient(circle,rgba(138,214,255,.5) 0%,rgba(77,166,255,.25) 42%,rgba(77,166,255,0) 78%);animation:lcvRankShardFlash 1.15s ease-out .44s both;}'
      + '.lcv-xp-level-label.is-rank-shift-veteran-certified .lcv-xp-level-label-current .lcv-rank-veteran{animation:lcvRankDiamondAscendOut 1.4s cubic-bezier(.22,.72,.26,1) both;}'
      + '.lcv-xp-level-label.is-rank-shift-veteran-certified .lcv-xp-level-label-next .lcv-rank-certified{animation:lcvRankCertifiedAscendIn 1.8s cubic-bezier(.22,1,.36,1) .24s both;}'
      + '.lcv-xp-level-label.is-rank-shift-veteran-certified .lcv-xp-level-label-next .lcv-rank-certified::before{animation:lcvCertifiedBurstStars 1.5s ease-out .62s both,lcvCertifiedTwinkle 1.7s ease-in-out 2.5s infinite;}'
      + '.lcv-xp-level-label.is-rank-shift-veteran-certified .lcv-xp-level-label-next .lcv-rank-certified::after{animation:lcvCertifiedBurstStars 1.5s ease-out .86s both,lcvCertifiedTwinkle 1.7s ease-in-out 2.9s infinite;}'
      + '.lcv-xp-level-label.is-rank-shift-veteran-certified .lcv-rank-stage::after{background:radial-gradient(circle,rgba(196,235,255,.75) 0%,rgba(255,214,123,.48) 44%,rgba(255,214,123,0) 82%);animation:lcvRankAscensionFlash 1.28s ease-out .34s both;}'
      + '.lcv-xp-title{margin:0 0 16px;font-size:1.4rem;line-height:1.2;font-weight:700;color:#f8fafc;opacity:0;transform:translateY(8px);transition:opacity .4s ease-out,transform .4s ease-out;}'
      + '.lcv-xp-title.is-visible{opacity:1;transform:translateY(0);}'
      + '.lcv-xp-progress{width:min(100%,26rem);margin:0 auto 16px;}'
      + '.lcv-xp-bar-container{position:relative;height:12px;background:rgba(71,85,105,.34);border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.07);margin-bottom:8px;}'
      + '.lcv-xp-bar{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#4f8df6 0%,#60a5fa 48%,#93c5fd 100%);border-radius:999px;transition:width 1.2s cubic-bezier(.22,1,.36,1);}'
      + '.lcv-xp-text{font-size:.85rem;color:#cbd5e1;font-weight:600;}'
      + '.lcv-title-upgrade{margin:20px 0 0;padding:16px 12px;border-radius:8px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.25);opacity:0;transform:scale(.95);transition:opacity .5s ease-out,transform .5s ease-out;}'
      + '.lcv-title-upgrade.is-visible{opacity:1;transform:scale(1);}'
      + '.lcv-title-upgrade-text{font-size:.9rem;color:#93c5fd;font-weight:600;}'
      + '.lcv-actions{display:flex;justify-content:center;opacity:0;transform:translateY(8px);transition:opacity .38s ease-out,transform .38s ease-out;}'
      + '.lcv-actions.is-visible{opacity:1;transform:translateY(0);}'
      + '.lcv-btn{border:0;border-radius:.5rem;padding:.8rem 2.8rem;background:#60a5fa;color:#fff;font-weight:600;font-size:.98rem;line-height:1;cursor:pointer;transition:background-color .2s ease,transform .2s ease,box-shadow .2s ease,opacity .16s ease;box-shadow:0 12px 22px -16px rgba(96,165,250,.62),0 0 0 1px rgba(191,219,254,.22) inset;}'
      + '.lcv-btn:hover{background:#7ab4fb;box-shadow:0 12px 24px -16px rgba(96,165,250,.72);}'
      + '.lcv-btn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px;}'
      + '.lcv-btn.is-text-swap{opacity:.5;}'
      + '@keyframes lcvNodeConveyorPulse{0%{transform:scale(1);}45%{transform:scale(1.08);}100%{transform:scale(1);}}'
      + '@keyframes lcvGlowConveyorPulse{0%{opacity:0;transform:scale(.86);}45%{opacity:1;transform:scale(1.16);}100%{opacity:0;transform:scale(.94);}}'
      + '@keyframes lcvNodeHit{0%{transform:scale(1);}55%{transform:scale(1.16);}100%{transform:scale(1);}}'
      + '@keyframes lcvGlowPulse{0%{opacity:0;transform:scale(.82);}35%{opacity:1;transform:scale(1.24);}100%{opacity:0;transform:scale(.92);}}'
      + '@keyframes lcvRankLabelOut{0%{opacity:1;transform:translateY(0);}100%{opacity:0;transform:translateY(-8px);}}'
      + '@keyframes lcvRankLabelIn{0%{opacity:0;transform:translateY(8px);}100%{opacity:1;transform:translateY(0);}}'
      + '@keyframes lcvRankMeltBronzeOut{0%{opacity:1;transform:translateY(0) scale(1);filter:blur(0) brightness(1);}42%{opacity:1;transform:translateY(1px) scaleX(1.04) scaleY(.9);filter:blur(.3px) brightness(1.18);}100%{opacity:0;transform:translateY(10px) scaleX(1.08) scaleY(.42);filter:blur(2.2px) brightness(1.3);}}'
      + '@keyframes lcvRankChromeRiseIn{0%{opacity:0;transform:translateY(12px) scale(.82);filter:blur(2.4px) brightness(.86);}54%{opacity:1;transform:translateY(0) scale(1.03);filter:blur(.3px) brightness(1.08);}100%{opacity:1;transform:translateY(0) scale(1);filter:blur(0) brightness(1);}}'
      + '@keyframes lcvRankChromeSweep{0%{background-position:0% 50%;}100%{background-position:170% 50%;}}'
      + '@keyframes lcvRankHeatSilverOut{0%{opacity:1;transform:scale(1);filter:blur(0) saturate(1);}38%{opacity:1;text-shadow:0 0 10px rgba(255,173,92,.5),0 0 22px rgba(255,128,0,.42);filter:brightness(1.26) saturate(1.32);}100%{opacity:0;transform:scale(1.14);filter:blur(1.8px) brightness(1.5);text-shadow:0 0 16px rgba(255,173,92,.65),0 0 36px rgba(255,128,0,.55);}}'
      + '@keyframes lcvRankGoldForgeIn{0%{opacity:0;transform:scale(.78) translateY(8px);filter:blur(2.4px) brightness(.86);}40%{opacity:1;transform:scale(1.08) translateY(-1px);filter:blur(.4px) brightness(1.36);}100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0) brightness(1.04);}}'
      + '@keyframes lcvRankForgeFlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.58);}45%{opacity:.95;}100%{opacity:0;transform:translate(-50%,-50%) scale(1.22);}}'
      + '@keyframes lcvRankGoldShatterOut{0%{opacity:1;transform:scale(1) rotate(0deg);filter:blur(0);}36%{opacity:1;letter-spacing:.055em;filter:brightness(1.2);}68%{opacity:.92;transform:scale(1.08) rotate(-1deg);text-shadow:-10px -4px 0 rgba(255,214,122,.48),12px 6px 0 rgba(255,170,65,.42),0 0 22px rgba(255,189,89,.55);}100%{opacity:0;transform:scale(1.18) rotate(-3deg);filter:blur(2px);text-shadow:-18px -9px 0 rgba(255,214,122,.22),20px 11px 0 rgba(255,170,65,.22),0 0 38px rgba(255,189,89,.3);}}'
      + '@keyframes lcvRankDiamondAssembleIn{0%{opacity:0;transform:scale(.72) translateY(11px);filter:blur(3px) brightness(.9);}44%{opacity:1;transform:scale(1.1) translateY(-2px);filter:blur(.5px) brightness(1.4);}100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0) brightness(1.08);}}'
      + '@keyframes lcvRankShardFlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.62);}42%{opacity:.85;}100%{opacity:0;transform:translate(-50%,-50%) scale(1.3);}}'
      + '@keyframes lcvVeteranShardSpark{0%,55%,100%{opacity:0;transform:scale(.6) translateY(0);}70%{opacity:1;transform:scale(1.14) translateY(-2px);}}'
      + '@keyframes lcvRankDiamondAscendOut{0%{opacity:1;transform:scale(1) translateY(0);filter:blur(0);}34%{opacity:1;transform:scale(1.12);filter:brightness(1.65);text-shadow:0 0 14px rgba(184,235,255,.72),0 0 30px rgba(132,208,255,.56);}100%{opacity:0;transform:scale(1.3) translateY(-16px);filter:blur(2.4px) brightness(1.9);}}'
      + '@keyframes lcvRankCertifiedAscendIn{0%{opacity:0;transform:scale(.72) translateY(14px);filter:blur(2.8px) brightness(.9);}46%{opacity:1;transform:scale(1.12) translateY(-2px);filter:blur(.6px) brightness(1.45);}100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0) brightness(1.08);}}'
      + '@keyframes lcvRankAscensionFlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.56);}40%{opacity:1;}100%{opacity:0;transform:translate(-50%,-50%) scale(1.46);}}'
      + '@keyframes lcvCertifiedBurstStars{0%,58%,100%{opacity:0;transform:scale(.56) rotate(0deg);}72%{opacity:1;transform:scale(1.24) rotate(10deg);}}'
      + '@keyframes lcvProGoldShimmer{0%{background-position:0% 50%;}100%{background-position:220% 50%;}}'
      + '@keyframes lcvVeteranPrism{0%{background-position:0% 50%;}100%{background-position:220% 50%;}}'
      + '@keyframes lcvVeteranTwinkle{0%,72%,100%{opacity:0;transform:scale(.65);}36%{opacity:.85;transform:scale(1);}}'
      + '@keyframes lcvCertifiedSparkle{0%{background-position:0% 50%;}100%{background-position:240% 50%;}}'
      + '@keyframes lcvCertifiedTwinkle{0%,70%,100%{opacity:0;transform:scale(.65) rotate(0deg);}35%{opacity:1;transform:scale(1.08) rotate(8deg);}}'
      + '@keyframes lcvCoinUpgradePulse{0%{transform:scale(1);}45%{transform:scale(1.08);}100%{transform:scale(1);}}'
      + '@keyframes lcvCoinBurstRing{0%{opacity:0;transform:scale(.64);}24%{opacity:.78;}100%{opacity:0;transform:scale(1.46);}}'
      + '@keyframes lcvCoinBurstRays{0%{opacity:0;transform:scale(.78) rotate(0deg);}30%{opacity:.62;}100%{opacity:0;transform:scale(1.34) rotate(38deg);}}'
      + '@keyframes lcvCoinParticlePop{0%{opacity:0;transform:translate(-50%,-50%) scale(.4);}28%{opacity:.9;}100%{opacity:0;transform:translate(-50%,-50%) scale(1.2);}}'
      + '@keyframes lcvRailShimmer{0%{transform:translateX(-45%);}100%{transform:translateX(45%);}}'
      + '@media (max-width:640px){.lcv-overlay{padding:14px;}.lcv-shell{padding:26px 14px 18px;}.lcv-title{font-size:1.74rem;}.lcv-subtitle{font-size:.94rem;}.lcv-label-top,.lcv-label-bottom{font-size:.56rem;letter-spacing:.06em;min-height:34px;}.lcv-node{width:1.32rem;height:1.32rem;}}'
      + '.lcv-reduced-motion .lcv-overlay,.lcv-reduced-motion .lcv-overlay::before,.lcv-reduced-motion .lcv-shell,.lcv-reduced-motion .lcv-title,.lcv-reduced-motion .lcv-subtitle,.lcv-reduced-motion .lcv-progress,.lcv-reduced-motion .lcv-feedback,.lcv-reduced-motion .lcv-actions,.lcv-reduced-motion .lcv-track,.lcv-reduced-motion .lcv-col,.lcv-reduced-motion .lcv-rail-fill,.lcv-reduced-motion .lcv-node,.lcv-reduced-motion .lcv-check,.lcv-reduced-motion .lcv-glow,.lcv-reduced-motion .lcv-xp-coin-core,.lcv-reduced-motion .lcv-xp-burst-ring,.lcv-reduced-motion .lcv-xp-burst-rays,.lcv-reduced-motion .lcv-xp-burst-particle,.lcv-reduced-motion .lcv-xp-level-label-current,.lcv-reduced-motion .lcv-xp-level-label-next{transition:none !important;animation:none !important;}'
      + '.lcv-cert-icon{width:1em;height:1em;vertical-align:middle;display:inline-block;margin-right:.4ch;stroke:currentColor;}'
      + '.lcv-cert-label{font-size:.62rem;line-height:1.15;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;display:inline-flex;align-items:center;gap:.35rem;}'
      + '@keyframes lcv-cert-bounce{0%{transform:translateY(0) scale(1);}50%{transform:translateY(-4px) scale(1.06);}100%{transform:translateY(0) scale(1);}}'
      + '.lcv-cert-animate{animation:lcv-cert-bounce 2s ease-out 1 forwards;}'
      + '.lcv-reduced-motion .lcv-rank-pro,.lcv-reduced-motion .lcv-rank-veteran,.lcv-reduced-motion .lcv-rank-certified{animation:none !important;}'
      + '.lcv-reduced-motion .lcv-rank-veteran::after,.lcv-reduced-motion .lcv-rank-certified::before,.lcv-reduced-motion .lcv-rank-certified::after{animation:none !important;opacity:.55;}'
      + '.lcv-reduced-motion .lcv-xp-level-label[class*="is-rank-shift-"] .lcv-rank-name,.lcv-reduced-motion .lcv-xp-level-label[class*="is-rank-shift-"] .lcv-rank-stage::after,.lcv-reduced-motion .lcv-xp-level-label[class*="is-rank-shift-"] .lcv-rank-veteran::after,.lcv-reduced-motion .lcv-xp-level-label[class*="is-rank-shift-"] .lcv-rank-certified::before,.lcv-reduced-motion .lcv-xp-level-label[class*="is-rank-shift-"] .lcv-rank-certified::after{animation:none !important;}';
    var styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.appendChild(document.createTextNode(css));
    document.head.appendChild(styleEl);
  }

  function createRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = ''
      + '<div class="lcv-overlay" data-lcv-overlay="1" aria-hidden="true">'
      + '  <section class="lcv-shell" role="dialog" aria-modal="true" aria-labelledby="lcv-title" aria-describedby="lcv-subtitle">'
      + '    <button type="button" class="lcv-back" data-lcv-back="1" aria-label="Go back" title="Go back"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg></button>'
      + '    <header class="lcv-header"><h2 id="lcv-title" class="lcv-title">Congratulations!</h2><p id="lcv-subtitle" class="lcv-subtitle"></p></header>'
      + '    <div class="lcv-state" data-lcv-state="1">'
      + '    <div class="lcv-view is-visible" data-lcv-view="completion">'
      + '      <div class="lcv-progress" data-lcv-progress="1"><div class="lcv-columns" data-lcv-columns="1"><div class="lcv-rail"><div class="lcv-rail-fill" data-lcv-fill="1"></div></div></div></div>'
      + '      <div class="lcv-badge" data-lcv-badge="1"><span class="lcv-badge-counter" data-lcv-counter="1">+0</span><span>XP</span></div>'
      + '      <p class="lcv-feedback" data-lcv-feedback="1">Next Step Unlocked!</p>'
      + '    </div>'
      + '    <div class="lcv-view is-hidden" data-lcv-view="xpProgress">'
      + '      <div class="lcv-xp-section">'
      + '        <div class="lcv-xp-focus" data-lcv-xp-focus="1">'
      + '          <div class="lcv-xp-animation" data-lcv-xp-animation="1"></div>'
      + '          <div class="lcv-xp-user-icon" data-lcv-xp-user-icon="1" aria-hidden="true"><img data-lcv-xp-user-icon-img="1" src="' + getAvatarUrl() + '" alt="User avatar"></div>'
      + '        </div>'
      + '        <p class="lcv-xp-level-label" data-lcv-xp-level-label="1">You\'re now ranked as Beginner</p>'
      + '        <div class="lcv-xp-progress" data-lcv-xp-progress="1">'
      + '          <div class="lcv-xp-bar-container"><div class="lcv-xp-bar" data-lcv-xp-bar="1"></div></div>'
      + '          <div class="lcv-xp-text"><span data-lcv-xp-counter="1">0</span> / <span data-lcv-xp-max="1">20</span> XP</div>'
      + '        </div>'
      + '        <div class="lcv-title-upgrade" data-lcv-title-upgrade="1" style="display:none;">'
      + '          <div class="lcv-title-upgrade-text" data-lcv-title-upgrade-text="1">New Title Earned: Agent</div>'
      + '        </div>'
      + '      </div>'
      + '    </div>'
      + '    </div>'
      + '    <div class="lcv-actions" data-lcv-actions="1"><button type="button" class="lcv-btn" data-lcv-continue="1">Continue</button></div>'
      + '  </section></div>';
    document.body.appendChild(root);

    var overlay = root.querySelector('[data-lcv-overlay="1"]');
    var shell = root.querySelector('.lcv-shell');
    var btn = root.querySelector('[data-lcv-continue="1"]');

    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeModal(true); });
    shell.addEventListener('click', function (event) { event.stopPropagation(); });
    return root;
  }

  function setupContinueButton(root) {
    var btn = root.querySelector('[data-lcv-continue="1"]');
    if (!btn) return;
    
    // Remove any existing listeners by cloning
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', function () {
      if (modalState.currentView === 'completion') {
        transitionToXPProgress(root);
        return;
      }
      if (modalState.currentView === 'xpProgress') {
        closeModal(true);
      }
    });
  }

  function setupBackButton(root) {
    var backBtn = root.querySelector('[data-lcv-back="1"]');
    if (!backBtn) return;
    backBtn.addEventListener('click', function () {
      transitionToPreviousState(root);
    });
  }

  function setButtonTextSmooth(btn, text) {
    if (!btn) return;
    btn.classList.add('is-text-swap');
    modalState.timers.push(setTimeout(function () {
      btn.textContent = text;
      btn.classList.remove('is-text-swap');
    }, 90));
  }

  function transitionToPreviousState(root) {
    if (!root || modalState.currentView !== 'xpProgress') return;

    modalState.currentView = 'completion';

    var completionView = root.querySelector('[data-lcv-view="completion"]');
    var xpProgressView = root.querySelector('[data-lcv-view="xpProgress"]');
    var btn = root.querySelector('[data-lcv-continue="1"]');
    var backBtn = root.querySelector('[data-lcv-back="1"]');
    var shell = root.querySelector('.lcv-shell');
    if (!completionView || !xpProgressView) return;

    clearTimers();

    xpProgressView.classList.remove('is-visible');
    xpProgressView.classList.add('is-hidden');

    modalState.timers.push(setTimeout(function () {
      completionView.classList.remove('is-hidden');
      completionView.classList.add('is-visible');
      setButtonTextSmooth(btn, 'Continue');
      if (backBtn) backBtn.classList.remove('is-visible');
      if (shell) shell.classList.remove('is-xp-state');
    }, 220));
  }

  function initializeLottieAnimation(containerEl, animationPath, options) {
    if (!containerEl) return null;

    var opts = options || {};
    if (opts.clearContainer !== false) {
      containerEl.innerHTML = '';
    }

    var resolvedAnimationPath = resolveAnimationPath(animationPath);
    primeLottieJsonCache(resolvedAnimationPath).catch(function () {});
    var lottieRuntime = getLottieRuntime();

    if (!lottieRuntime) {
      renderLottieFallback(containerEl, resolvedAnimationPath);
      ensureLottieRuntimeLoaded().catch(function () {});
      queueLottieInitRetry(containerEl, resolvedAnimationPath, opts, 0);
      return null;
    }

    var cachedAnimationData = lottieJsonCache[resolvedAnimationPath];
    var loadOptions = {
      container: containerEl,
      renderer: 'svg',
      loop: opts.loop !== false,
      autoplay: opts.autoplay !== false,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true
      }
    };

    if (cachedAnimationData) {
      loadOptions.animationData = cloneAnimationData(cachedAnimationData);
    } else {
      loadOptions.path = resolvedAnimationPath;
    }

    var animationInstance = null;
    try {
      animationInstance = lottieRuntime.loadAnimation(loadOptions);
    } catch (error) {
      if (loadOptions.animationData) {
        delete loadOptions.animationData;
        loadOptions.path = resolvedAnimationPath;
        try {
          animationInstance = lottieRuntime.loadAnimation(loadOptions);
        } catch (fallbackError) {
          animationInstance = null;
        }
      }

      if (!animationInstance) {
        renderLottieFallback(containerEl, resolvedAnimationPath);
        queueLottieInitRetry(containerEl, resolvedAnimationPath, opts, 1);
        return null;
      }
    }
    containerEl.__lcvLottieRetryPending = false;

    var speed = Number(opts.speed);
    if (isFinite(speed) && speed > 0 && typeof animationInstance.setSpeed === 'function') {
      animationInstance.setSpeed(speed);
    }

    if (!Array.isArray(modalState.lottieInstances)) {
      modalState.lottieInstances = [];
    }
    modalState.lottieInstances.push(animationInstance);
    modalState.lottieInstance = animationInstance;
    return animationInstance;
  }

  function buildCoinAnimationScene(animationHost) {
    if (!animationHost) return null;

    animationHost.classList.remove('is-rankup-sequence');
    animationHost.classList.remove('is-material-shift');
    animationHost.classList.remove('is-upgraded');
    animationHost.innerHTML = ''
      + '<div class="lcv-xp-coin-scene" data-lcv-xp-coin-scene="1">'
      + '  <div class="lcv-xp-burst" data-lcv-xp-burst="1">'
      + '    <span class="lcv-xp-burst-ring"></span>'
      + '    <span class="lcv-xp-burst-rays"></span>'
      + '    <span class="lcv-xp-burst-particle p1"></span>'
      + '    <span class="lcv-xp-burst-particle p2"></span>'
      + '    <span class="lcv-xp-burst-particle p3"></span>'
      + '    <span class="lcv-xp-burst-particle p4"></span>'
      + '    <span class="lcv-xp-burst-particle p5"></span>'
      + '    <span class="lcv-xp-burst-particle p6"></span>'
      + '    <span class="lcv-xp-burst-particle p7"></span>'
      + '    <span class="lcv-xp-burst-particle p8"></span>'
      + '  </div>'
      + '  <div class="lcv-xp-coin-core" data-lcv-xp-coin-core="1">'
      + '    <div class="lcv-xp-coin-face lcv-xp-coin-face-bronze" data-lcv-xp-coin-bronze="1"></div>'
      + '    <div class="lcv-xp-coin-face lcv-xp-coin-face-silver" data-lcv-xp-coin-silver="1"></div>'
      + '  </div>'
      + '</div>';

    return {
      bronzeLayer: animationHost.querySelector('[data-lcv-xp-coin-bronze="1"]'),
      silverLayer: animationHost.querySelector('[data-lcv-xp-coin-silver="1"]')
    };
  }

  function playCoinUpgradeAnimation(animationHost, xpData) {
    if (!animationHost) return;

    var data = xpData || {};
    var reducedMotion = !!data.reducedMotion;
    var didRankUp = !!data.didRankUp;
    var bronzePath = String(data.previousAnimationPath || '/static/json/b_coin.json').trim() || '/static/json/b_coin.json';
    var silverPath = String(data.animationPath || '/static/json/c_coin.json').trim() || '/static/json/c_coin.json';
    var layers = buildCoinAnimationScene(animationHost);

    if (!layers) return;

    if (!getLottieRuntime() || reducedMotion) {
      animationHost.classList.add('is-upgraded');
      initializeLottieAnimation(layers.silverLayer, silverPath, {
        loop: true,
        autoplay: true,
        speed: COIN_SPEED_DEFAULT
      });
      return;
    }

    if (!didRankUp) {
      animationHost.classList.add('is-upgraded');
      initializeLottieAnimation(layers.silverLayer, silverPath, {
        loop: true,
        autoplay: true,
        speed: COIN_SPEED_DEFAULT
      });
      return;
    }

    var bronzeAnimation = initializeLottieAnimation(layers.bronzeLayer, bronzePath, {
      loop: true,
      autoplay: true,
      speed: COIN_SPEED_DEFAULT
    });

    var silverAnimation = initializeLottieAnimation(layers.silverLayer, silverPath, {
      loop: true,
      autoplay: true,
      speed: COIN_SPEED_DEFAULT
    });

    animationHost.classList.add('is-rankup-sequence');

    modalState.timers.push(setTimeout(function () {
      animationHost.classList.add('is-material-shift');
    }, COIN_MATERIAL_SHIFT_MS));

    modalState.timers.push(setTimeout(function () {
      animationHost.classList.add('is-upgraded');
      if (bronzeAnimation && typeof bronzeAnimation.pause === 'function') {
        bronzeAnimation.pause();
      }
    }, COIN_SETTLE_START_MS));
  }

  function transitionToXPProgress(root) {
    if (!root || modalState.currentView !== 'completion') return;
    
    modalState.currentView = 'xpProgress';
    
    var completionView = root.querySelector('[data-lcv-view="completion"]');
    var xpProgressView = root.querySelector('[data-lcv-view="xpProgress"]');
    var btn = root.querySelector('[data-lcv-continue="1"]');
    var backBtn = root.querySelector('[data-lcv-back="1"]');
    var shell = root.querySelector('.lcv-shell');
    
    if (!completionView || !xpProgressView) return;
    
    clearTimers();

    setButtonTextSmooth(btn, 'Go to Next Step');
    if (shell) shell.classList.add('is-xp-state');

    var xpData = modalState.xpData || { currentXP: 0, gainedXP: 0, maxXP: 20, titleUpgrade: null, animationPath: '/static/json/b_coin.json' };
    var xpStart = Math.max(0, Math.floor(Number(xpData.currentXP) || 0));
    var xpGain = Math.max(0, Math.floor(Number(xpData.gainedXP) || 0));
    var xpTarget = Math.max(xpStart, xpStart + xpGain);
    var xpMax = Math.max(1, Math.floor(Number(xpData.maxXP) || 20));
    var previousMaxXP = Math.max(1, Math.floor(Number(xpData.previousMaxXP) || xpMax));
    var didRankUp = !!xpData.didRankUp;
    var hasTierCapIncrease = previousMaxXP < xpMax;
    var initialCounterValue = hasTierCapIncrease ? previousMaxXP : xpStart;
    var finalCounterValue = hasTierCapIncrease ? Math.max(previousMaxXP, xpTarget) : xpTarget;
    var initialMaxXP = hasTierCapIncrease ? previousMaxXP : xpMax;
    var initialBarPercent = hasTierCapIncrease ? 100 : normalizePercent((xpStart / xpMax) * 100, 0);
    var finalBarPercent = hasTierCapIncrease ? 5 : normalizePercent((finalCounterValue / xpMax) * 100, 100);
    var showFinalXpPose = !!xpData.showFinalXpPose;
    var fallbackRankLabel = String(xpData.rankLabel || 'Rank: Beginner').trim() || 'Rank: Beginner';
    var previousRankLabel = 'Rank: ' + (String(xpData.previousRankName || 'Beginner').trim() || 'Beginner');
    var currentRankLabel = 'Rank: ' + (String(xpData.currentRankName || 'Intermediate').trim() || 'Intermediate');
    var shouldAnimateRankLabelSwap = didRankUp && !xpData.reducedMotion && previousRankLabel !== currentRankLabel;
    var xpProgressCountDelay = didRankUp ? (COIN_SETTLE_START_MS + 120) : 1820;
    var xpPoseRevealDelay = didRankUp ? (COIN_SETTLE_START_MS + 120) : 1600;
    var titleUpgradeDelay = didRankUp ? (COIN_SETTLE_START_MS + 220) : 1500;
    
    // Reset XP progress view to initial state
    var xpLevelLabel = xpProgressView.querySelector('[data-lcv-xp-level-label="1"]');
    var xpBar = xpProgressView.querySelector('[data-lcv-xp-bar="1"]');
    var xpFocus = xpProgressView.querySelector('[data-lcv-xp-focus="1"]');
    var xpAnimation = xpProgressView.querySelector('[data-lcv-xp-animation="1"]');
    var xpUserIcon = xpProgressView.querySelector('[data-lcv-xp-user-icon="1"]');
    var xpUserIconImg = xpProgressView.querySelector('[data-lcv-xp-user-icon-img="1"]');
    var xpCounter = xpProgressView.querySelector('[data-lcv-xp-counter="1"]');
    var xpMaxEl = xpProgressView.querySelector('[data-lcv-xp-max="1"]');
    var titleUpgrade = xpProgressView.querySelector('[data-lcv-title-upgrade="1"]');
    
    if (xpLevelLabel) xpLevelLabel.classList.remove('is-visible');
    if (xpFocus) xpFocus.classList.remove('is-compact');
    if (xpAnimation) {
      xpAnimation.classList.remove('is-visible');
      xpAnimation.classList.remove('is-rankup-sequence');
      xpAnimation.classList.remove('is-material-shift');
      xpAnimation.classList.remove('is-upgraded');
      xpAnimation.innerHTML = '';
    }
    if (xpUserIcon) xpUserIcon.classList.remove('is-visible');
    if (xpUserIconImg) xpUserIconImg.src = getAvatarUrl({ currentLevel: modalState.currentLevel });
    if (xpLevelLabel) {
      setRankLabelStatic(xpLevelLabel, shouldAnimateRankLabelSwap ? previousRankLabel : fallbackRankLabel);
    }
    if (xpBar) xpBar.style.width = initialBarPercent + '%';
    if (xpCounter) xpCounter.textContent = String(initialCounterValue);
    if (xpMaxEl) xpMaxEl.textContent = String(initialMaxXP);
    if (titleUpgrade) {
      titleUpgrade.classList.remove('is-visible');
      titleUpgrade.style.display = 'none';
    }
    
    // Fade out completion content
    completionView.classList.remove('is-visible');
    completionView.classList.add('is-hidden');
    
    // Fade in XP progress content after brief delay
    modalState.timers.push(setTimeout(function () {
      xpProgressView.classList.remove('is-hidden');
      xpProgressView.classList.add('is-visible');
      if (backBtn) backBtn.classList.add('is-visible');
      
      // Show animation
      if (xpAnimation) {
        modalState.timers.push(setTimeout(function () {
          xpAnimation.classList.add('is-visible');
          playCoinUpgradeAnimation(xpAnimation, xpData);
        }, 50));
      }
      
      // Show rank label while coin is still solo
      if (xpLevelLabel) {
        modalState.timers.push(setTimeout(function () {
          xpLevelLabel.classList.add('is-visible');
          if (shouldAnimateRankLabelSwap) {
            playRankLabelSwap(xpLevelLabel, previousRankLabel, currentRankLabel);
            return;
          }
          setRankLabelStatic(xpLevelLabel, fallbackRankLabel);
        }, 520));
      }

      if (showFinalXpPose) {
        if (xpFocus) xpFocus.classList.add('is-compact');
        if (xpUserIcon) xpUserIcon.classList.add('is-visible');
      } else {
        // Reveal the user icon after the coin transformation settles.
        modalState.timers.push(setTimeout(function () {
          if (xpFocus) xpFocus.classList.add('is-compact');
          if (xpUserIcon) xpUserIcon.classList.add('is-visible');
        }, xpPoseRevealDelay));
      }
      
      // Animate XP counter
      if (xpCounter) {
        modalState.timers.push(setTimeout(function () {
          animateXPCounter(xpCounter, initialCounterValue, finalCounterValue, { prefix: '' });
        }, xpProgressCountDelay));
      }
      
      // Animate XP bar
      if (xpBar) {
        modalState.timers.push(setTimeout(function () {
          if (hasTierCapIncrease) {
            if (xpMaxEl) xpMaxEl.textContent = String(xpMax);
            // Show the reset on the new cap before filling toward the new tier.
            xpBar.style.width = '5%';
            modalState.timers.push(setTimeout(function () {
              xpBar.style.width = finalBarPercent + '%';
            }, 220));
            return;
          }

          xpBar.style.width = finalBarPercent + '%';
        }, xpProgressCountDelay));
      }
      
      // Show title upgrade if applicable
      if (modalState.xpData.titleUpgrade && titleUpgrade) {
        modalState.timers.push(setTimeout(function () {
          titleUpgrade.style.display = 'block';
          modalState.timers.push(setTimeout(function () {
            titleUpgrade.classList.add('is-visible');
          }, 50));
        }, titleUpgradeDelay));
      }
      
    }, 300));
  }

  function normalizeInt(value, fallback) { var n = Number(value); return isFinite(n) ? Math.floor(n) : fallback; }
  function normalizePercent(value, fallback) { var n = Number(value); return isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback; }
  var XP_RANK_STAGES = [
    { threshold: 0, name: 'Beginner' },
    { threshold: 20, name: 'Intermediate' },
    { threshold: 40, name: 'Pro' },
    { threshold: 60, name: 'Veteran' },
    { threshold: 80, name: 'Certified' }
  ];

  var RANK_TITLE_CLASS_LOOKUP = {
    beginner: 'lcv-rank-beginner',
    intermediate: 'lcv-rank-intermediate',
    pro: 'lcv-rank-pro',
    veteran: 'lcv-rank-veteran',
    certified: 'lcv-rank-certified'
  };
  var RANK_TITLE_CLASSES = [
    'lcv-rank-beginner',
    'lcv-rank-intermediate',
    'lcv-rank-pro',
    'lcv-rank-veteran',
    'lcv-rank-certified'
  ];
  var RANK_TRANSITION_CLASS_LOOKUP = {
    'beginner->intermediate': 'is-rank-shift-beginner-intermediate',
    'intermediate->pro': 'is-rank-shift-intermediate-pro',
    'pro->veteran': 'is-rank-shift-pro-veteran',
    'veteran->certified': 'is-rank-shift-veteran-certified'
  };
  var RANK_TRANSITION_CLASSES = [
    'is-rank-shift-beginner-intermediate',
    'is-rank-shift-intermediate-pro',
    'is-rank-shift-pro-veteran',
    'is-rank-shift-veteran-certified'
  ];
  var RANK_TRANSITION_SETTLE_MS = {
    'is-rank-shift-beginner-intermediate': 2100,
    'is-rank-shift-intermediate-pro': 2180,
    'is-rank-shift-pro-veteran': 2550,
    'is-rank-shift-veteran-certified': 2680
  };

  function getCoinAnimationByXP(xp) {
    var value = clampXPValue(xp);
    if (value <= 19) return 'b_coin.json';
    if (value <= 39) return 'c_coin.json';
    if (value <= 59) return 'g_coin.json';
    if (value <= 79) return 'diamond.json';
    return 'gold_crown.json';
  }

  function clampXPValue(value) {
    var xp = Math.max(0, normalizeInt(value, 0));
    return Math.min(80, xp);
  }

  function getRankStageForXP(value) {
    var xp = clampXPValue(value);
    var selected = XP_RANK_STAGES[0];

    for (var i = 0; i < XP_RANK_STAGES.length; i += 1) {
      if (xp >= XP_RANK_STAGES[i].threshold) {
        selected = XP_RANK_STAGES[i];
      }
    }

    var nextLimit = selected.threshold;
    for (var j = 0; j < XP_RANK_STAGES.length; j += 1) {
      if (XP_RANK_STAGES[j].threshold > xp) {
        nextLimit = XP_RANK_STAGES[j].threshold;
        break;
      }
    }
    if (nextLimit < 20) nextLimit = 20;

    return {
      xp: xp,
      rankName: selected.name,
      rankIndex: XP_RANK_STAGES.indexOf(selected),
      nextLimit: nextLimit,
      animationPath: '/static/json/' + getCoinAnimationByXP(xp)
    };
  }

  function isBeginnerToIntermediateRankChange(data) {
    if (!data) return false;
    var fromRank = String(data.previousRankName || '').trim();
    var toRank = String(data.currentRankName || '').trim();
    return fromRank === 'Beginner' && toRank === 'Intermediate';
  }

  function clearRankTransitionClasses(labelEl) {
    if (!labelEl) return;
    for (var i = 0; i < RANK_TRANSITION_CLASSES.length; i += 1) {
      labelEl.classList.remove(RANK_TRANSITION_CLASSES[i]);
    }
  }

  function splitRankLabelText(text) {
    var raw = String(text || '').trim();
    if (!raw) raw = 'Rank: Beginner';

    var rankPrefixMatch = raw.match(/^(Rank:\s*)(.+)$/i);
    if (rankPrefixMatch) {
      return {
        prefix: rankPrefixMatch[1],
        rankName: String(rankPrefixMatch[2] || '').trim() || 'Beginner'
      };
    }

    var narrativeMatch = raw.match(/^(You\s*'?re\s+now\s+ranked\s+as\s+)(.+)$/i)
      || raw.match(/^(You\s+are\s+now\s+ranked\s+as\s+)(.+)$/i);
    if (narrativeMatch) {
      return {
        prefix: narrativeMatch[1],
        rankName: String(narrativeMatch[2] || '').trim() || 'Beginner'
      };
    }

    return {
      prefix: '',
      rankName: raw
    };
  }

  function getRankNameFromLabel(text) {
    var parts = splitRankLabelText(text);
    var rankName = String(parts.rankName || '').replace(/\s+/g, ' ').trim();
    if (!rankName) return '';
    return rankName.toLowerCase();
  }

  function buildRankLabelFrame(labelEl, prefixText) {
    if (!labelEl) return null;

    var prefix = String(prefixText || '').trim();
    labelEl.innerHTML = '';

    if (prefix) {
      var prefixNode = document.createElement('span');
      prefixNode.className = 'lcv-rank-prefix';
      prefixNode.textContent = prefix + ' ';
      labelEl.appendChild(prefixNode);
    }

    var rankStage = document.createElement('span');
    rankStage.className = 'lcv-rank-stage';
    labelEl.appendChild(rankStage);
    return rankStage;
  }

  function getRankTransitionClass(fromText, toText) {
    var fromRank = getRankNameFromLabel(fromText);
    var toRank = getRankNameFromLabel(toText);
    if (!fromRank || !toRank || fromRank === toRank) return '';

    var transitionKey = fromRank + '->' + toRank;
    return RANK_TRANSITION_CLASS_LOOKUP[transitionKey] || '';
  }

  function applyRankTitleClass(targetEl, rankLabelText) {
    if (!targetEl) return;
    for (var i = 0; i < RANK_TITLE_CLASSES.length; i += 1) {
      targetEl.classList.remove(RANK_TITLE_CLASSES[i]);
    }

    var rankName = getRankNameFromLabel(rankLabelText);
    var rankClass = rankName ? RANK_TITLE_CLASS_LOOKUP[rankName] : '';
    if (rankClass) targetEl.classList.add(rankClass);
  }

  function setRankLabelNodeContent(targetEl, rankText) {
    if (!targetEl) return;

    var rankName = String(rankText || '').replace(/\s+/g, ' ').trim() || 'Beginner';
    targetEl.textContent = '';

    var rankNameEl = document.createElement('span');
    rankNameEl.className = 'lcv-rank-name';
    rankNameEl.textContent = rankName;
    applyRankTitleClass(rankNameEl, rankName);
    targetEl.appendChild(rankNameEl);
  }

  function setRankLabelStatic(labelEl, text) {
    if (!labelEl) return;
    var rankText = String(text || '').trim() || 'Rank: Beginner';
    var parts = splitRankLabelText(rankText);
    labelEl.classList.remove('is-rank-swap');
    clearRankTransitionClasses(labelEl);

    var rankStage = buildRankLabelFrame(labelEl, parts.prefix);
    if (!rankStage) return;

    var current = document.createElement('span');
    current.className = 'lcv-xp-level-label-current is-visible';
    setRankLabelNodeContent(current, parts.rankName);
    rankStage.appendChild(current);
  }

  function playRankLabelSwap(labelEl, fromText, toText) {
    if (!labelEl) return;

    var outgoingText = String(fromText || '').trim() || 'Rank: Beginner';
    var incomingText = String(toText || '').trim() || outgoingText;
    var outgoingParts = splitRankLabelText(outgoingText);
    var incomingParts = splitRankLabelText(incomingText);
    var outgoingRank = String(outgoingParts.rankName || '').trim() || 'Beginner';
    var incomingRank = String(incomingParts.rankName || '').trim() || outgoingRank;
    var rankPrefix = String(incomingParts.prefix || outgoingParts.prefix || '').trim();
    var transitionClass = getRankTransitionClass(outgoingRank, incomingRank);
    var settleDelay = transitionClass
      ? (RANK_TRANSITION_SETTLE_MS[transitionClass] || 980)
      : 980;
    if (outgoingRank === incomingRank) {
      setRankLabelStatic(labelEl, (rankPrefix ? rankPrefix + ' ' : '') + incomingRank);
      return;
    }

    labelEl.classList.remove('is-rank-swap');
    clearRankTransitionClasses(labelEl);

    var rankStage = buildRankLabelFrame(labelEl, rankPrefix);
    if (!rankStage) return;

    var outgoingNode = document.createElement('span');
    outgoingNode.className = 'lcv-xp-level-label-current is-visible';
    setRankLabelNodeContent(outgoingNode, outgoingRank);

    var incomingNode = document.createElement('span');
    incomingNode.className = 'lcv-xp-level-label-next';
    setRankLabelNodeContent(incomingNode, incomingRank);

    rankStage.appendChild(outgoingNode);
    rankStage.appendChild(incomingNode);

    var stageWidth = Math.max(outgoingNode.offsetWidth || 0, incomingNode.offsetWidth || 0, 1);
    rankStage.style.width = stageWidth + 'px';

    modalState.timers.push(setTimeout(function () {
      labelEl.classList.add('is-rank-swap');
      if (transitionClass) labelEl.classList.add(transitionClass);
    }, 16));

    modalState.timers.push(setTimeout(function () {
      setRankLabelStatic(labelEl, (rankPrefix ? rankPrefix + ' ' : '') + incomingRank);
    }, settleDelay));
  }

  function prefersReducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function stageToRailPercent(completed, total) {
    if (total <= 0 || completed <= 0) return 0;
    var index = Math.min(completed, total) - 1;
    return ((index + 0.5) / total) * 100;
  }

  function normalizeProgressLabel(value, fallback) {
    var text = String(value || '').trim();
    if (!text) text = String(fallback || '').trim();
    text = text.replace(/^MODULE\s*\d+\s*:\s*/i, '');
    text = text.toUpperCase();
    if (text === 'WELCOME') text = 'INTRODUCTION';
    return text;
  }

  function ensureProgressWindowLabels(labels) {
    var source = Array.isArray(labels) ? labels : [];
    var list = [];
    for (var i = 0; i < 3; i += 1) {
      list.push(normalizeProgressLabel(source[i], 'STEP ' + (i + 1)));
    }
    return list;
  }

  function ensureProgressTrackLabels(labels) {
    var source = Array.isArray(labels) ? labels : [];
    var list = [];
    for (var i = 0; i < source.length; i += 1) {
      var normalized = normalizeProgressLabel(source[i], '');
      if (normalized) list.push(normalized);
    }
    if (!list.length) {
      list = ['INTRODUCTION', 'PROFILE AND CREDENTIALS', 'AGENT FOUNDATION'];
    }
    while (list.length < 3) {
      list.push('STEP ' + (list.length + 1));
    }
    return list;
  }

  function computeVisibleStartIndex(completedCount, maxStart) {
    var count = Math.max(0, normalizeInt(completedCount, 0));
    if (count < 3) return 0;
    var shifts = Math.floor((count - 1) / 2);
    var start = shifts * 2;
    return Math.max(0, Math.min(maxStart, start));
  }

  function sliceProgressWindow(labels, startIndex) {
    var out = [];
    var start = Math.max(0, normalizeInt(startIndex, 0));
    for (var i = 0; i < 3; i += 1) {
      out.push(normalizeProgressLabel(labels[start + i], 'STEP ' + (start + i + 1)));
    }
    return out;
  }

  function resolveProgressWindow(options) {
    options = options || {};

    var labels = ensureProgressTrackLabels(options.trackLabels || options.labels || []);
    var completedCount = Math.max(0, normalizeInt(options.completedCount, 0));
    var previousCount = Math.max(0, normalizeInt(options.previousCount, 0));
    var shouldAnimateProgress = !!options.shouldAnimateProgress;
    var reducedMotion = !!options.reducedMotion;
    var maxStart = Math.max(0, labels.length - 3);

    var conveyorState = modalState.progressConveyor || {
      lastCount: 0,
      windowLabels: [],
      visibleStartIndex: 0,
      trackLabels: [],
      pendingVisibleStartIndex: null,
      pendingCompletedCount: null
    };

    var previousTrackSignature = Array.isArray(conveyorState.trackLabels)
      ? conveyorState.trackLabels.join('|')
      : '';
    var nextTrackSignature = labels.join('|');
    var lastKnownCount = Math.max(0, normalizeInt(conveyorState.lastCount, 0));
    var staleCountState = lastKnownCount !== previousCount;

    var startIndex = normalizeInt(conveyorState.visibleStartIndex, -1);
    var pendingStartIndex = normalizeInt(conveyorState.pendingVisibleStartIndex, -1);
    var pendingCompletedCount = normalizeInt(conveyorState.pendingCompletedCount, -1);

    // If the previous slide was interrupted by an early close, carry the pending
    // window forward so the next completion can continue shifting correctly.
    if (pendingStartIndex >= 0 && pendingCompletedCount === previousCount) {
      startIndex = pendingStartIndex;
      conveyorState.visibleStartIndex = pendingStartIndex;
      conveyorState.pendingVisibleStartIndex = null;
      conveyorState.pendingCompletedCount = null;
    }

    if (startIndex < 0 || previousTrackSignature !== nextTrackSignature || staleCountState) {
      startIndex = computeVisibleStartIndex(previousCount, maxStart);
      conveyorState.pendingVisibleStartIndex = null;
      conveyorState.pendingCompletedCount = null;
    }
    startIndex = Math.max(0, Math.min(maxStart, startIndex));

    var startBefore = startIndex;
    var startAfter = startIndex;
    var shiftFrom = startBefore;
    var shiftTo = startBefore;
    var didShift = false;

    if (completedCount < previousCount) {
      startAfter = computeVisibleStartIndex(completedCount, maxStart);
    } else if (completedCount > previousCount) {
      for (var c = previousCount + 1; c <= completedCount; c += 1) {
        if (c === (startAfter + 3) && startAfter < maxStart) {
          shiftFrom = startAfter;
          startAfter = Math.max(0, Math.min(maxStart, startAfter + 2));
          shiftTo = startAfter;
          didShift = true;
        }
      }
    }

    var shouldConveyor = didShift && shouldAnimateProgress && !reducedMotion;

    var windowStart = startAfter;
    var beforeStart = shouldConveyor ? shiftFrom : windowStart;
    var windowLabels = sliceProgressWindow(labels, windowStart);
    var beforeWindowLabels = sliceProgressWindow(labels, beforeStart);

    var completedInWindow = Math.max(0, Math.min(3, completedCount - windowStart));
    var previousInWindow = shouldConveyor
      ? Math.max(0, Math.min(3, (completedCount - 1) - beforeStart))
      : Math.max(0, Math.min(3, previousCount - windowStart));
    var beforeCompletedInWindow = Math.max(0, Math.min(3, completedCount - beforeStart));

    conveyorState.lastCount = completedCount;
    conveyorState.trackLabels = labels.slice(0);
    if (shouldConveyor) {
      conveyorState.pendingVisibleStartIndex = windowStart;
      conveyorState.pendingCompletedCount = completedCount;
      // Keep the current window pinned until the slide finishes.
      conveyorState.windowLabels = beforeWindowLabels.slice(0, 3);
    } else {
      conveyorState.visibleStartIndex = windowStart;
      conveyorState.windowLabels = windowLabels.slice(0, 3);
      conveyorState.pendingVisibleStartIndex = null;
      conveyorState.pendingCompletedCount = null;
    }
    modalState.progressConveyor = conveyorState;

    var incomingMiddleLabel = normalizeProgressLabel(labels[shiftTo + 1], windowLabels[1]);
    var incomingRightLabel = normalizeProgressLabel(labels[shiftTo + 2], windowLabels[2]);

    return {
      labels: windowLabels,
      trackLabels: labels,
      beforeLabels: beforeWindowLabels,
      shouldConveyor: shouldConveyor,
      completedInWindow: completedInWindow,
      previousCompletedInWindow: previousInWindow,
      beforeCompletedInWindow: beforeCompletedInWindow,
      totalStages: 3,
      windowStartIndex: windowStart,
      beforeWindowStartIndex: beforeStart,
      incomingMiddleLabel: incomingMiddleLabel,
      incomingRightLabel: incomingRightLabel,
      currentStageIndex: completedInWindow > 0 ? Math.max(0, Math.min(2, completedInWindow - 1)) : 0
    };
  }

  function commitProgressConveyorWindow(targetStart, completedCount, trackLabels) {
    var labels = ensureProgressTrackLabels(trackLabels || []);
    var maxStart = Math.max(0, labels.length - 3);
    var start = Math.max(0, Math.min(maxStart, normalizeInt(targetStart, 0)));
    var count = Math.max(0, normalizeInt(completedCount, 0));

    var conveyorState = modalState.progressConveyor || {
      lastCount: 0,
      windowLabels: [],
      visibleStartIndex: 0,
      trackLabels: [],
      pendingVisibleStartIndex: null,
      pendingCompletedCount: null
    };

    conveyorState.visibleStartIndex = start;
    conveyorState.lastCount = count;
    conveyorState.trackLabels = labels.slice(0);
    conveyorState.windowLabels = sliceProgressWindow(labels, start);
    conveyorState.pendingVisibleStartIndex = null;
    conveyorState.pendingCompletedCount = null;

    modalState.progressConveyor = conveyorState;
  }

  function setFocusTrap(enabled) {
    if (!enabled) {
      if (modalState.removeTrapHandler) {
        modalState.removeTrapHandler();
        modalState.removeTrapHandler = null;
      }
      return;
    }

    function onKeydown(event) {
      var root = document.getElementById(ROOT_ID);
      if (!root) return;
      var overlay = root.querySelector('[data-lcv-overlay="1"]');
      if (!overlay || !overlay.classList.contains('is-open')) return;

      if (event.key === 'Escape') { event.preventDefault(); closeModal(true); return; }
      if (event.key !== 'Tab') return;

      var focusable = overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener('keydown', onKeydown);
    modalState.removeTrapHandler = function () { document.removeEventListener('keydown', onKeydown); };
  }

  function closeModal(triggerCallback) {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var overlay = root.querySelector('[data-lcv-overlay="1"]');
    if (!overlay) return;

    var wasOpen = modalState.isOpen;
    modalState.isOpen = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    setFocusTrap(false);

    // Preserve conveyor continuity even when the user closes before the slide timer
    // commits the new window state.
    var conveyorState = modalState.progressConveyor || {};
    var pendingStart = normalizeInt(conveyorState.pendingVisibleStartIndex, -1);
    var pendingCount = normalizeInt(conveyorState.pendingCompletedCount, -1);
    if (pendingStart >= 0 && pendingCount >= 0) {
      commitProgressConveyorWindow(
        pendingStart,
        pendingCount,
        Array.isArray(conveyorState.trackLabels) ? conveyorState.trackLabels : []
      );
    }

    clearTimers();

    if (modalState.previousFocusEl && typeof modalState.previousFocusEl.focus === 'function') {
      try { modalState.previousFocusEl.focus(); } catch (err) {}
    }

    if (triggerCallback && wasOpen && typeof modalState.onClose === 'function') {
      modalState.onClose();
    }
  }

  function openModal() {
    var root = createRoot();
    var overlay = root.querySelector('[data-lcv-overlay="1"]');
    var continueBtn = root.querySelector('[data-lcv-continue="1"]');

    var wasOpen = modalState.isOpen;
    if (!wasOpen) modalState.previousFocusEl = document.activeElement;
    modalState.isOpen = true;
    overlay.setAttribute('aria-hidden', 'false');
    setFocusTrap(true);

    if (!wasOpen) {
      // Force a paint in the closed state so the backdrop opacity ramp is visible.
      overlay.classList.remove('is-open');
      void overlay.offsetWidth;
      modalState.timers.push(setTimeout(function () {
        overlay.classList.add('is-open');
      }, 16));
    } else {
      overlay.classList.add('is-open');
    }

    modalState.timers.push(setTimeout(function () {
      if (continueBtn && typeof continueBtn.focus === 'function') continueBtn.focus();
    }, 20));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildStepKey(label, absoluteIndex) {
    var safeIndex = Math.max(0, normalizeInt(absoluteIndex, 0));
    var base = normalizeProgressLabel(label, 'STEP ' + (safeIndex + 1))
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!base) base = 'STEP-' + (safeIndex + 1);
    return 'STEP-' + (safeIndex + 1) + '-' + base;
  }

  function setColumnLabel(colEl, displayIndex, label) {
    if (!colEl) return;
    var topEl = colEl.querySelector('.lcv-label-top');
    var bottomEl = colEl.querySelector('.lcv-label-bottom');
    var safeLabel = escapeHtml(label || '');

    if (topEl) {
      topEl.innerHTML = (displayIndex % 2 === 0) ? safeLabel : '&nbsp;';
    }
    if (bottomEl) {
      bottomEl.innerHTML = (displayIndex % 2 === 1) ? safeLabel : '&nbsp;';
    }
  }

  function applyColumnStateFromModel(colEl, model) {
    if (!colEl || !model) return;

    var isDone = !!model.completed;
    var isCurrent = !!model.current;
    var labelClass = isCurrent ? 'is-active' : (isDone ? 'is-done' : '');

    var topEl = colEl.querySelector('.lcv-label-top');
    var bottomEl = colEl.querySelector('.lcv-label-bottom');
    if (topEl) {
      topEl.classList.remove('is-active');
      topEl.classList.remove('is-done');
      if (labelClass) topEl.classList.add(labelClass);
      topEl.classList.add('is-visible');
    }
    if (bottomEl) {
      bottomEl.classList.remove('is-active');
      bottomEl.classList.remove('is-done');
      if (labelClass) bottomEl.classList.add(labelClass);
      bottomEl.classList.add('is-visible');
    }

    var nodeEl = colEl.querySelector('.lcv-node');
    if (nodeEl) {
      nodeEl.classList.remove('is-new');
      nodeEl.classList.toggle('is-done', isDone);
      nodeEl.classList.toggle('is-current', isCurrent);
    }

    var checkEl = colEl.querySelector('.lcv-check');
    if (checkEl) {
      checkEl.classList.toggle('is-visible', !!model.checkVisible || isDone);
    }
  }

  function buildVisibleWindowModels(options) {
    options = options || {};

    var labels = ensureProgressTrackLabels(options.trackLabels || []);
    var startIndex = Math.max(0, normalizeInt(options.windowStartIndex, 0));
    var windowCount = Math.max(1, normalizeInt(options.windowCount, 3));
    var completedCount = Math.max(0, normalizeInt(options.completedCount, 0));
    var previousCompletedCount = Math.max(0, normalizeInt(options.previousCompletedCount, 0));
    var shouldAnimateProgress = !!options.shouldAnimateProgress;
    var reducedMotion = !!options.reducedMotion;
    var currentAbsoluteIndex = completedCount > 0 ? completedCount - 1 : -1;
    var out = [];

    for (var i = 0; i < windowCount; i += 1) {
      var absoluteIndex = startIndex + i;
      var label = normalizeProgressLabel(labels[absoluteIndex], 'STEP ' + (absoluteIndex + 1));
      var stepKey = buildStepKey(label, absoluteIndex);
      var isDone = absoluteIndex < completedCount;
      var wasDone = absoluteIndex < previousCompletedCount;

      out.push({
        stepKey: stepKey,
        absoluteIndex: absoluteIndex,
        label: label,
        completed: isDone,
        wasDone: wasDone,
        current: isDone && absoluteIndex === currentAbsoluteIndex,
        checkVisible: isDone && (wasDone || !shouldAnimateProgress || reducedMotion),
        isNewDone: isDone && !wasDone
      });
    }

    return out;
  }


  function buildConveyorConnectorMarkup(leftModel, rightModel) {
    var leftKey = escapeHtml(leftModel && leftModel.stepKey ? leftModel.stepKey : '');
    var rightKey = escapeHtml(rightModel && rightModel.stepKey ? rightModel.stepKey : '');
    var doneClass = rightModel && rightModel.completed ? ' is-done' : '';

    return ''
      + '<div class="lcv-track-connector' + doneClass + '" data-lcv-connector-left="' + leftKey + '" data-lcv-connector-right="' + rightKey + '">'
      + '  <div class="lcv-track-connector-fill"></div>'
      + '</div>';
  }

  function buildConveyorLeadMarkup(model) {
    var stepKey = escapeHtml(model && model.stepKey ? model.stepKey : '');
    var doneClass = model && model.completed ? ' is-done' : '';
    return ''
      + '<div class="lcv-track-lead' + doneClass + '" data-lcv-lead-key="' + stepKey + '">'
      + '  <div class="lcv-track-lead-fill"></div>'
      + '</div>';
  }

  function buildConveyorTrackMarkup(trackModels, reducedMotion) {
    var models = Array.isArray(trackModels) ? trackModels : [];
    var html = '<div class="lcv-track lcv-track-path" data-lcv-track="1">';

    for (var i = 0; i < models.length; i += 1) {
      var model = models[i];
      var nodeShell = document.createElement('div');
      nodeShell.innerHTML = buildColumnMarkup(i, model.label, {
        stepKey: model.stepKey,
        absoluteIndex: model.absoluteIndex,
        isDone: model.completed,
        wasDone: model.wasDone,
        isCurrent: model.current,
        forceCheckVisible: model.checkVisible,
        shouldAnimateProgress: false,
        reducedMotion: reducedMotion,
        colClass: 'lcv-track-node'
      });

      var nodeEl = nodeShell.firstChild;
      if (nodeEl) {
        if (i === 0) {
          var leadShell = document.createElement('div');
          leadShell.innerHTML = buildConveyorLeadMarkup(model);
          if (leadShell.firstChild) nodeEl.appendChild(leadShell.firstChild);
        }

        if (i < models.length - 1) {
          var connectorShell = document.createElement('div');
          connectorShell.innerHTML = buildConveyorConnectorMarkup(model, models[i + 1]);
          if (connectorShell.firstChild) nodeEl.appendChild(connectorShell.firstChild);
        }

        html += nodeEl.outerHTML;
      }
    }

    html += '</div>';
    return html;
  }

  function getConveyorSlideDistance(trackEl, trackModels) {
    if (!trackEl || !Array.isArray(trackModels) || trackModels.length < 3) return 0;

    var firstModel = trackModels[0];
    var thirdModel = trackModels[2];
    var firstCol = firstModel
      ? trackEl.querySelector('.lcv-track-node[data-lcv-step-key="' + firstModel.stepKey + '"]')
      : null;
    var thirdCol = thirdModel
      ? trackEl.querySelector('.lcv-track-node[data-lcv-step-key="' + thirdModel.stepKey + '"]')
      : null;

    if (firstCol && thirdCol) {
      var distance = thirdCol.getBoundingClientRect().left - firstCol.getBoundingClientRect().left;
      if (isFinite(distance) && distance > 0.5) return distance;
    }

    var sampleNode = trackEl.querySelector('.lcv-track-node');
    var sampleConnector = trackEl.querySelector('.lcv-track-connector');
    var nodeWidth = sampleNode ? sampleNode.getBoundingClientRect().width : 0;
    var connectorWidth = sampleConnector ? sampleConnector.getBoundingClientRect().width : 34;
    return Math.max(0, (nodeWidth + connectorWidth) * 2);
  }

  function buildColumnMarkup(index, label, options) {
    options = options || {};

    var isDone = !!options.isDone;
    var wasDone = !!options.wasDone;
    var isCurrent = !!options.isCurrent;
    var shouldAnimateProgress = !!options.shouldAnimateProgress;
    var reducedMotion = !!options.reducedMotion;
    var forceCheckVisible = !!options.forceCheckVisible;

    var safeLabel = escapeHtml(label || '');
    var nodeClass = 'lcv-node';
    var animateNewDone = !reducedMotion && shouldAnimateProgress && !!options.isNewDone;
    if (isDone && !animateNewDone) nodeClass += ' is-done';
    if (isCurrent && !animateNewDone) nodeClass += ' is-current';
    if (animateNewDone) nodeClass += ' is-new';

    var labelClass = options.labelClass || (isCurrent ? 'is-active' : (isDone ? 'is-done' : ''));
    var top = (index % 2 === 0) ? safeLabel : '&nbsp;';
    var bottom = (index % 2 === 1) ? safeLabel : '&nbsp;';
    var checkVisible = forceCheckVisible || (isDone && (wasDone || !shouldAnimateProgress || reducedMotion));
    var colClass = 'lcv-col' + (options.colClass ? ' ' + options.colClass : '');
    var absoluteIndex = normalizeInt(options.absoluteIndex, index);
    var stepKey = escapeHtml(String(options.stepKey || buildStepKey(label, absoluteIndex)));

    return ''
      + '<div class="' + colClass + '" data-lcv-col="' + index + '" data-lcv-step-key="' + stepKey + '" data-lcv-abs-index="' + absoluteIndex + '">'
      + '  <div class="lcv-label-top ' + labelClass + '">' + top + '</div>'
      + '  <div class="lcv-node-wrap">'
      + '    <span class="lcv-glow"></span>'
      + '    <span class="' + nodeClass + '" data-lcv-node="' + index + '" data-lcv-step-key="' + stepKey + '">'
      + '      <svg class="lcv-check' + (checkVisible ? ' is-visible' : '') + '" data-lcv-check="' + index + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>'
      + '    </span>'
      + '  </div>'
      + '  <div class="lcv-label-bottom ' + labelClass + '">' + bottom + '</div>'
      + '</div>';
  }

  function buildColumns(columnsEl, data) {
    var labels = Array.isArray(data.labels) ? data.labels : [];
    var trackLabels = ensureProgressTrackLabels(data.trackLabels || labels);
    var totalStages = Math.max(0, normalizeInt(data.totalStages, labels.length));
    var completedStages = Math.max(0, Math.min(totalStages, normalizeInt(data.completedStages, 0)));
    var previousCompletedStages = Math.max(0, Math.min(totalStages, normalizeInt(data.previousCompletedStages, 0)));
    var absoluteCompletedCount = Math.max(0, normalizeInt(data.absoluteCompletedCount, completedStages));
    var previousAbsoluteCompletedCount = Math.max(0, normalizeInt(data.previousAbsoluteCompletedCount, previousCompletedStages));
    var currentStageIndex = Math.max(0, Math.min(totalStages - 1, normalizeInt(data.currentStageIndex, 0)));
    var shouldAnimateProgress = !!data.shouldAnimateProgress;
    var reducedMotion = !!data.reducedMotion;
    var shouldConveyor = !!data.shouldConveyor && !reducedMotion;
    var windowStartIndex = Math.max(0, normalizeInt(data.windowStartIndex, 0));
    var beforeWindowStartIndex = Math.max(0, normalizeInt(data.beforeWindowStartIndex, windowStartIndex));

    columnsEl.style.setProperty('--lcv-visible-count', '3');
    columnsEl.style.setProperty('--lcv-connector-width', '34px');

    if (shouldConveyor) {
      var conveyorModels = buildVisibleWindowModels({
        trackLabels: trackLabels,
        windowStartIndex: beforeWindowStartIndex,
        windowCount: 5,
        completedCount: previousAbsoluteCompletedCount,
        previousCompletedCount: previousAbsoluteCompletedCount,
        shouldAnimateProgress: false,
        reducedMotion: reducedMotion
      });

      columnsEl.innerHTML = buildConveyorTrackMarkup(conveyorModels, reducedMotion);
      columnsEl.__lcvNodeModels = conveyorModels.slice(0);
      columnsEl.__lcvWindowStartIndex = beforeWindowStartIndex;
      columnsEl.__lcvTrackMode = 'full-path';
      return;
    }

    var renderShouldAnimate = shouldAnimateProgress;
    var windowModels = buildVisibleWindowModels({
      trackLabels: trackLabels,
      windowStartIndex: windowStartIndex,
      windowCount: 3,
      completedCount: absoluteCompletedCount,
      previousCompletedCount: previousAbsoluteCompletedCount,
      shouldAnimateProgress: renderShouldAnimate,
      reducedMotion: reducedMotion
    });

    var html = '';
    for (var i = 0; i < windowModels.length; i += 1) {
      var model = windowModels[i];
      html += buildColumnMarkup(i, model.label, {
        stepKey: model.stepKey,
        absoluteIndex: model.absoluteIndex,
        isDone: model.completed,
        wasDone: model.wasDone,
        isCurrent: model.current,
        isNewDone: renderShouldAnimate && model.isNewDone,
        forceCheckVisible: model.checkVisible,
        shouldAnimateProgress: renderShouldAnimate,
        reducedMotion: reducedMotion
      });
    }

    columnsEl.innerHTML = ''
      + '<div class="lcv-rail"><div class="lcv-rail-fill" data-lcv-fill="1"></div></div>'
      + '<div class="lcv-track" data-lcv-track="1">' + html + '</div>';
    columnsEl.__lcvNodeModels = windowModels.slice(0);
    columnsEl.__lcvWindowStartIndex = windowStartIndex;
    columnsEl.__lcvTrackMode = 'classic';
  }

  function playTextSequence(root, animated) {
    var title = root.querySelector('.lcv-title');
    var subtitle = root.querySelector('.lcv-subtitle');
    var progress = root.querySelector('[data-lcv-progress="1"]');
    var badge = root.querySelector('[data-lcv-badge="1"]');
    var counterEl = root.querySelector('[data-lcv-counter="1"]');
    var feedback = root.querySelector('[data-lcv-feedback="1"]');
    var actions = root.querySelector('[data-lcv-actions="1"]');

    title.classList.remove('is-visible');
    subtitle.classList.remove('is-visible');
    progress.classList.remove('is-visible');
    badge.classList.remove('is-visible');
    feedback.classList.remove('is-visible');
    actions.classList.remove('is-visible');

    if (!animated) {
      title.classList.add('is-visible');
      subtitle.classList.add('is-visible');
      progress.classList.add('is-visible');
      badge.classList.add('is-visible');
      feedback.classList.add('is-visible');
      actions.classList.add('is-visible');
      if (counterEl) animateXPCounter(counterEl, 5);
      return;
    }

    modalState.timers.push(setTimeout(function () { title.classList.add('is-visible'); }, 180));
    modalState.timers.push(setTimeout(function () { subtitle.classList.add('is-visible'); }, 320));
    modalState.timers.push(setTimeout(function () { progress.classList.add('is-visible'); }, 460));
    modalState.timers.push(setTimeout(function () { 
      badge.classList.add('is-visible');
    }, 540));
    modalState.timers.push(setTimeout(function () { 
      if (counterEl) animateXPCounter(counterEl, 5);
    }, 1000));
    modalState.timers.push(setTimeout(function () { feedback.classList.add('is-visible'); }, 620));
    modalState.timers.push(setTimeout(function () { actions.classList.add('is-visible'); }, 680));
  }

  function playConveyorSequence(root, data) {
    var columnsEl = root.querySelector('[data-lcv-columns="1"]');
    var trackEl = root.querySelector('[data-lcv-track="1"]');
    var labelEls = root.querySelectorAll('.lcv-label-top,.lcv-label-bottom');
    var completingNodeIndex = 2;
    var nodeModels = Array.isArray(columnsEl && columnsEl.__lcvNodeModels) ? columnsEl.__lcvNodeModels : [];
    var completingNodeModel = nodeModels.length > completingNodeIndex ? nodeModels[completingNodeIndex] : null;
    var completingStepKey = completingNodeModel && completingNodeModel.stepKey ? String(completingNodeModel.stepKey) : '';
    var completingColEl = null;
    if (trackEl) {
      completingColEl = completingStepKey
        ? trackEl.querySelector('.lcv-track-node[data-lcv-step-key="' + completingStepKey + '"]')
        : trackEl.querySelector('[data-lcv-col="' + completingNodeIndex + '"]');
    }
    var completingNodeEl = completingColEl ? completingColEl.querySelector('.lcv-node') : null;
    var completingGlowEl = completingColEl ? completingColEl.querySelector('.lcv-glow') : null;
    var completingCheckEl = completingColEl ? completingColEl.querySelector('.lcv-check') : null;
    var completingConnectorEl = completingStepKey
      ? trackEl.querySelector('[data-lcv-connector-right="' + completingStepKey + '"]')
      : null;
    var completingConnectorFillEl = completingConnectorEl
      ? completingConnectorEl.querySelector('.lcv-track-connector-fill')
      : null;

    var reducedMotion = !!data.reducedMotion;
    if (!columnsEl || !trackEl || reducedMotion) {
      playProgressSequence(root, data);
      return;
    }

    var fillStartDelay = 560;
    var fillDuration = 1400;
    var postFillPause = 130;
    var slideDuration = 960;
    var settleBuffer = 120;

    for (var i = 0; i < labelEls.length; i += 1) {
      labelEls[i].classList.remove('is-visible');
    }

    modalState.timers.push(setTimeout(function () {
      for (var j = 0; j < labelEls.length; j += 1) {
        labelEls[j].classList.add('is-visible');
      }
    }, 36));

    function setCompletingConnectorDone() {
      if (completingConnectorEl) completingConnectorEl.classList.add('is-done');
    }

    var completionMarked = false;
    function markCompletingNodeDone() {
      if (completionMarked) return;
      completionMarked = true;

      setCompletingConnectorDone();

      if (completingNodeModel) {
        completingNodeModel.completed = true;
        completingNodeModel.current = true;
        completingNodeModel.checkVisible = true;
        applyColumnStateFromModel(completingColEl, completingNodeModel);
      }

      if (completingNodeEl) {
        completingNodeEl.classList.remove('is-new');
        completingNodeEl.classList.remove('is-hit');
        void completingNodeEl.offsetWidth;
        completingNodeEl.classList.add('is-hit');
        completingNodeEl.classList.remove('is-conveyor-pulse');
        void completingNodeEl.offsetWidth;
        completingNodeEl.classList.add('is-conveyor-pulse');
      }

      if (completingGlowEl) {
        completingGlowEl.classList.remove('is-hit');
        void completingGlowEl.offsetWidth;
        completingGlowEl.classList.add('is-hit');
        completingGlowEl.classList.remove('is-conveyor-pulse');
        void completingGlowEl.offsetWidth;
        completingGlowEl.classList.add('is-conveyor-pulse');
      }

      if (completingCheckEl) completingCheckEl.classList.add('is-visible');
    }

    function getTargetTrackModels() {
      return buildVisibleWindowModels({
        trackLabels: data.trackLabels,
        windowStartIndex: data.targetWindowStartIndex,
        windowCount: 5,
        completedCount: data.absoluteCompletedCount,
        previousCompletedCount: data.absoluteCompletedCount,
        shouldAnimateProgress: false,
        reducedMotion: reducedMotion
      });
    }

    var finalized = false;
    function finalizeConveyor() {
      if (finalized) return;
      finalized = true;

      commitProgressConveyorWindow(
        data.targetWindowStartIndex,
        data.absoluteCompletedCount,
        data.trackLabels
      );

      var finalModels = getTargetTrackModels();
      columnsEl.innerHTML = buildConveyorTrackMarkup(finalModels, reducedMotion);
      trackEl = columnsEl.querySelector('[data-lcv-track="1"]') || trackEl;

      columnsEl.__lcvNodeModels = finalModels.slice(0);
      columnsEl.__lcvWindowStartIndex = Math.max(0, normalizeInt(data.targetWindowStartIndex, 0));
      columnsEl.__lcvTrackMode = 'full-path';

      var nextLabelEls = columnsEl.querySelectorAll('.lcv-label-top,.lcv-label-bottom');
      for (var k = 0; k < nextLabelEls.length; k += 1) {
        nextLabelEls[k].classList.add('is-visible');
      }

      var currentModel = null;
      for (var m = 0; m < finalModels.length; m += 1) {
        if (finalModels[m] && finalModels[m].current) {
          currentModel = finalModels[m];
          break;
        }
      }

      var currentColEl = currentModel
        ? columnsEl.querySelector('.lcv-track-node[data-lcv-step-key="' + currentModel.stepKey + '"]')
        : null;
      var currentNodeEl = currentColEl ? currentColEl.querySelector('.lcv-node') : null;
      var currentGlowEl = currentColEl ? currentColEl.querySelector('.lcv-glow') : null;
      var currentCheckEl = currentColEl ? currentColEl.querySelector('.lcv-check') : null;

      if (currentNodeEl) {
        currentNodeEl.classList.remove('is-hit');
        void currentNodeEl.offsetWidth;
        currentNodeEl.classList.add('is-hit');
      }
      if (currentGlowEl) {
        currentGlowEl.classList.remove('is-hit');
        void currentGlowEl.offsetWidth;
        currentGlowEl.classList.add('is-hit');
      }
      if (currentCheckEl) currentCheckEl.classList.add('is-visible');
    }

    var shiftStarted = false;
    function startTrackShift() {
      if (shiftStarted) return;
      shiftStarted = true;

      var slideDistance = getConveyorSlideDistance(trackEl, nodeModels);
      if (!(slideDistance > 0.5)) {
        finalizeConveyor();
        return;
      }

      function onTrackTransitionEnd(event) {
        if (event.target !== trackEl) return;
        if (event.propertyName && event.propertyName.indexOf('transform') === -1) return;
        trackEl.removeEventListener('transitionend', onTrackTransitionEnd);
        finalizeConveyor();
      }

      trackEl.addEventListener('transitionend', onTrackTransitionEnd);
      trackEl.classList.add('is-sliding');
      trackEl.style.transition = 'transform ' + slideDuration + 'ms cubic-bezier(0.22,1,0.36,1)';
      void trackEl.offsetWidth;
      trackEl.style.transform = 'translate3d(' + (-slideDistance) + 'px,0,0)';

      modalState.timers.push(setTimeout(function () {
        trackEl.removeEventListener('transitionend', onTrackTransitionEnd);
        finalizeConveyor();
      }, slideDuration + settleBuffer));
    }

    var completionPhaseStarted = false;
    function beginShiftAfterCompletion() {
      if (completionPhaseStarted) return;
      completionPhaseStarted = true;
      markCompletingNodeDone();
      modalState.timers.push(setTimeout(function () {
        startTrackShift();
      }, postFillPause));
    }

    function onConnectorFillTransitionEnd(event) {
      if (!completingConnectorFillEl || event.target !== completingConnectorFillEl) return;
      if (event.propertyName && event.propertyName.indexOf('transform') === -1) return;
      completingConnectorFillEl.removeEventListener('transitionend', onConnectorFillTransitionEnd);
      beginShiftAfterCompletion();
    }

    if (completingConnectorFillEl) {
      completingConnectorFillEl.addEventListener('transitionend', onConnectorFillTransitionEnd);
    }

    modalState.timers.push(setTimeout(function () {
      setCompletingConnectorDone();
    }, fillStartDelay));

    modalState.timers.push(setTimeout(function () {
      if (completingConnectorFillEl) {
        completingConnectorFillEl.removeEventListener('transitionend', onConnectorFillTransitionEnd);
      }
      beginShiftAfterCompletion();
    }, fillStartDelay + fillDuration + 48));
  }

  function playProgressSequence(root, data) {
    var fillEl = root.querySelector('[data-lcv-fill="1"]');
    var railEl = root.querySelector('.lcv-rail');
    var labelEls = root.querySelectorAll('.lcv-label-top,.lcv-label-bottom');
    var shouldAnimateProgress = data.shouldAnimateProgress;
    var reducedMotion = data.reducedMotion;
    var fromPercent = data.fromPercent;
    var toPercent = data.toPercent;
    var previousCompletedStages = data.previousCompletedStages;
    var completedStages = data.completedStages;
    var currentStageIndex = data.currentStageIndex;
    var totalStages = data.totalStages;
    var fillStartDelay = 560;
    var fillDuration = 1400;

    if (railEl) railEl.classList.remove('is-visible');
    for (var l = 0; l < labelEls.length; l += 1) {
      labelEls[l].classList.remove('is-visible');
    }

    fillEl.style.width = ((shouldAnimateProgress && !reducedMotion) ? fromPercent : toPercent) + '%';

    if (reducedMotion) {
      if (railEl) railEl.classList.add('is-visible');
      for (var k = 0; k < labelEls.length; k += 1) {
        labelEls[k].classList.add('is-visible');
      }
      fillEl.style.width = toPercent + '%';
      return;
    }

    if (!shouldAnimateProgress) {
      var quickFrom = Math.max(0, toPercent - 8);
      fillEl.style.width = quickFrom + '%';

      modalState.timers.push(setTimeout(function () {
        if (railEl) railEl.classList.add('is-visible');
      }, 220));

      modalState.timers.push(setTimeout(function () {
        for (var m = 0; m < labelEls.length; m += 1) {
          labelEls[m].classList.add('is-visible');
        }
      }, 340));

      modalState.timers.push(setTimeout(function () {
        fillEl.style.width = toPercent + '%';
      }, 520));

      modalState.timers.push(setTimeout(function () {
        var currentNode = root.querySelector('[data-lcv-node="' + currentStageIndex + '"]');
        var currentGlow = root.querySelector('[data-lcv-col="' + currentStageIndex + '"] .lcv-glow');
        if (currentNode) {
          currentNode.classList.add('is-done');
          currentNode.classList.add('is-current');
          currentNode.classList.remove('is-hit');
          void currentNode.offsetWidth;
          currentNode.classList.add('is-hit');
        }
        if (currentGlow) {
          currentGlow.classList.remove('is-hit');
          void currentGlow.offsetWidth;
          currentGlow.classList.add('is-hit');
        }
      }, 760));

      modalState.timers.push(setTimeout(function () {
        var currentCheck = root.querySelector('[data-lcv-check="' + currentStageIndex + '"]');
        if (currentCheck) currentCheck.classList.add('is-visible');
      }, 980));
      return;
    }

    modalState.timers.push(setTimeout(function () {
      if (railEl) railEl.classList.add('is-visible');
    }, 260));

    modalState.timers.push(setTimeout(function () {
      for (var j = 0; j < labelEls.length; j += 1) {
        labelEls[j].classList.add('is-visible');
      }
    }, 380));

    modalState.timers.push(setTimeout(function () { fillEl.style.width = toPercent + '%'; }, fillStartDelay));

    for (var i = previousCompletedStages; i < completedStages; i += 1) {
      (function (idx) {
        var nodeCenter = stageToRailPercent(idx + 1, totalStages);
        var span = Math.max(1, toPercent - fromPercent);
        var ratio = Math.max(0, Math.min(1, (nodeCenter - fromPercent) / span));
        var nodeDelay = fillStartDelay + Math.round(ratio * fillDuration);
        var checkDelay = nodeDelay + 260;

        modalState.timers.push(setTimeout(function () {
          var nodeEl = root.querySelector('[data-lcv-node="' + idx + '"]');
          var glowEl = root.querySelector('[data-lcv-col="' + idx + '"] .lcv-glow');
          if (nodeEl) {
            nodeEl.classList.add('is-done');
            if (idx === currentStageIndex) nodeEl.classList.add('is-current');
            nodeEl.classList.remove('is-hit');
            void nodeEl.offsetWidth;
            nodeEl.classList.add('is-hit');
          }
          if (glowEl) {
            glowEl.classList.remove('is-hit');
            void glowEl.offsetWidth;
            glowEl.classList.add('is-hit');
          }
        }, nodeDelay));

        modalState.timers.push(setTimeout(function () {
          var checkEl = root.querySelector('[data-lcv-check="' + idx + '"]');
          if (checkEl) checkEl.classList.add('is-visible');
        }, checkDelay));
      }(i));
    }
  }

  function renderLevelCompleteModal(props) {
    injectStyles();
    var root = createRoot();

    // Reset to completion view state for new render
    modalState.currentView = 'completion';
    var shell = root.querySelector('.lcv-shell');
    if (shell) shell.classList.remove('is-xp-state');

    var overlay = root.querySelector('[data-lcv-overlay="1"]');
    var subtitleEl = root.querySelector('.lcv-subtitle');
    var columnsEl = root.querySelector('[data-lcv-columns="1"]');

    var isOpen = !!(props && props.isOpen);
    modalState.onClose = typeof (props && props.onClose) === 'function' ? props.onClose : function () {};

    var currentLevel = normalizeInt(props && props.currentLevel, 1);
    var previousLevel = normalizeInt(props && props.previousLevel, 0);
    var xpCurrentLevel = normalizeInt(props && props.xpCurrentLevel, currentLevel);
    var xpPreviousLevel = normalizeInt(props && props.xpPreviousLevel, previousLevel);
    if (xpPreviousLevel > xpCurrentLevel) xpPreviousLevel = xpCurrentLevel;
    modalState.currentLevel = currentLevel;

    var inputLabels = props && Array.isArray(props.progressTrackLabels) ? props.progressTrackLabels : null;
    if (!inputLabels || !inputLabels.length) {
      inputLabels = props && Array.isArray(props.stepLabels) ? props.stepLabels : null;
    }
    var fallbackLabels = ['INTRODUCTION', 'PROFILE AND CREDENTIALS', 'AGENT FOUNDATION', 'CONGRATULATIONS'];
    var labels = (inputLabels && inputLabels.length ? inputLabels : fallbackLabels)
      .map(function (label) {
        return String(label || '')
          .trim()
          .replace(/^MODULE\s*\d+\s*:\s*/i, '')
          .toUpperCase();
      })
      .filter(function (label) { return !!label; });
    if (!labels.length) labels = fallbackLabels.slice();

    var completionLabel = String(props && props.completionLabel || '').trim();
    var absoluteCompletedStages = Math.max(0, xpCurrentLevel);
    var absolutePreviousCompletedStages = Math.max(0, xpPreviousLevel);
    if (absolutePreviousCompletedStages > absoluteCompletedStages) {
      absolutePreviousCompletedStages = absoluteCompletedStages;
    }
    var isNewCompletion = absoluteCompletedStages > absolutePreviousCompletedStages;
    var shouldAnimateProgress = !!(props && props.shouldAnimateProgress) && isNewCompletion;
    var reducedMotion = !!(props && props.reducedMotion);
    var showCertificateFeedback = !!(props && props.showCertificateFeedback);
    root.classList.toggle('lcv-reduced-motion', reducedMotion);

    var progressWindow = resolveProgressWindow({
      trackLabels: labels,
      completedCount: absoluteCompletedStages,
      previousCount: absolutePreviousCompletedStages,
      shouldAnimateProgress: shouldAnimateProgress,
      reducedMotion: reducedMotion
    });

    labels = progressWindow.labels;
    var totalStages = progressWindow.totalStages;
    var completedStages = progressWindow.completedInWindow;
    var previousCompletedStages = progressWindow.previousCompletedInWindow;
    var currentStageIndex = progressWindow.currentStageIndex;
    var shouldConveyor = progressWindow.shouldConveyor;

    var xpPerModule = normalizeInt(props && props.xpAward, 5);
    var xpStartRaw = Math.max(0, xpPreviousLevel * xpPerModule);
    var xpTargetRaw = Math.max(xpStartRaw, xpCurrentLevel * xpPerModule);
    var previousRankState = getRankStageForXP(xpStartRaw);
    var currentRankState = getRankStageForXP(xpTargetRaw);
    var xpStart = previousRankState.xp;
    var xpTarget = Math.max(xpStart, currentRankState.xp);
    var xpMax = currentRankState.nextLimit;
    var previousMaxXP = previousRankState.nextLimit;
    var hasCustomXPMax = Number(props && props.xpMax);
    if (isFinite(hasCustomXPMax) && hasCustomXPMax > 0) {
      xpMax = Math.max(1, Math.floor(hasCustomXPMax));
      if (xpMax < xpTarget) xpMax = xpTarget;
    }
    var didRankUp = currentRankState.rankIndex > previousRankState.rankIndex;
    var keepModuleOneXpPose = xpCurrentLevel <= 1;
    var showFinalXpPose = !didRankUp && !keepModuleOneXpPose;
    var rankLabel = keepModuleOneXpPose && currentRankState.rankName === 'Beginner'
      ? 'You\'re now ranked as Beginner'
      : ('Rank: ' + currentRankState.rankName);

    modalState.xpData = {
      currentXP: xpStart,
      gainedXP: Math.max(0, xpTarget - xpStart),
      maxXP: xpMax,
      previousMaxXP: previousMaxXP,
      didRankUp: didRankUp,
      previousRankName: previousRankState.rankName,
      currentRankName: currentRankState.rankName,
      rankLabel: rankLabel,
      showFinalXpPose: showFinalXpPose,
      previousAnimationPath: previousRankState.animationPath,
      animationPath: currentRankState.animationPath,
      reducedMotion: reducedMotion,
      titleUpgrade: props && props.titleUpgrade ? props.titleUpgrade : null
    };

    warmLottieJsonCache([
      modalState.xpData.previousAnimationPath,
      modalState.xpData.animationPath
    ]);

    // Fill targets node centers, so Module 1 visibly fills to the first node.
    var fromPercent = normalizePercent(stageToRailPercent(previousCompletedStages, totalStages), 0);
    var toPercent = normalizePercent(stageToRailPercent(completedStages, totalStages), 0);
    var conveyorFillFromPercent = fromPercent;
    var conveyorFillToPercent = toPercent;
    var conveyorPostShiftPercent = toPercent;

    if (shouldConveyor) {
      conveyorFillFromPercent = normalizePercent(stageToRailPercent(previousCompletedStages, totalStages), 0);
      conveyorFillToPercent = normalizePercent(
        stageToRailPercent(progressWindow.beforeCompletedInWindow, totalStages),
        conveyorFillFromPercent
      );
      if (conveyorFillToPercent < conveyorFillFromPercent) {
        conveyorFillToPercent = conveyorFillFromPercent;
      }
      conveyorPostShiftPercent = toPercent;
    }

    subtitleEl.textContent = completionLabel
      ? ('You completed ' + completionLabel)
      : ('You completed Module ' + Math.max(1, absoluteCompletedStages));

    var xpUserIconImg = root.querySelector('[data-lcv-xp-user-icon-img="1"]');
    if (xpUserIconImg) {
      xpUserIconImg.src = getAvatarUrl({ currentLevel: currentLevel });
    }

    clearTimers();
    buildColumns(columnsEl, {
      labels: labels,
      trackLabels: progressWindow.trackLabels,
      beforeLabels: progressWindow.beforeLabels,
      totalStages: totalStages,
      completedStages: completedStages,
      previousCompletedStages: previousCompletedStages,
      absoluteCompletedCount: absoluteCompletedStages,
      previousAbsoluteCompletedCount: absolutePreviousCompletedStages,
      currentStageIndex: currentStageIndex,
      shouldAnimateProgress: shouldAnimateProgress,
      reducedMotion: reducedMotion,
      shouldConveyor: shouldConveyor,
      windowStartIndex: progressWindow.windowStartIndex,
      beforeWindowStartIndex: progressWindow.beforeWindowStartIndex,
      incomingMiddleLabel: progressWindow.incomingMiddleLabel,
      incomingRightLabel: progressWindow.incomingRightLabel
    });

    // Update feedback text depending on module completed: only show cert for Agent Foundation
    try {
      var feedbackEl = root.querySelector('[data-lcv-feedback="1"]');
      if (feedbackEl) {
        if (showCertificateFeedback) {
          feedbackEl.innerHTML = '<span class="lcv-cert-animation" data-lcv-cert-animation="1" aria-hidden="true"></span><span class="lcv-cert-copy">New Certificate Sent To Email</span>';
          var certAnimationHost = feedbackEl.querySelector('[data-lcv-cert-animation="1"]');
          if (certAnimationHost) {
            initializeLottieAnimation(certAnimationHost, '/static/json/Cert.json', {
              loop: false,
              autoplay: true,
              speed: 0.5
            });
          }
        } else {
          feedbackEl.textContent = 'Next Step Unlocked!';
        }
      }
    } catch (err) {}

    if (!isOpen) {
      closeModal(false);
      overlay.setAttribute('aria-hidden', 'true');
      // Reset view state when closing
      var completionView = root.querySelector('[data-lcv-view="completion"]');
      var xpProgressView = root.querySelector('[data-lcv-view="xpProgress"]');
      var backBtn = root.querySelector('[data-lcv-back="1"]');
      if (completionView) {
        completionView.classList.remove('is-hidden');
        completionView.classList.add('is-visible');
      }
      if (xpProgressView) {
        xpProgressView.classList.remove('is-visible');
        xpProgressView.classList.add('is-hidden');
      }
      if (backBtn) backBtn.classList.remove('is-visible');
      return;
    }

    openModal();
    setupContinueButton(root);
    setupBackButton(root);
    playTextSequence(root, !reducedMotion);
    var progressPayload = {
      labels: labels,
      shouldAnimateProgress: shouldAnimateProgress,
      reducedMotion: reducedMotion,
      fromPercent: fromPercent,
      toPercent: toPercent,
      conveyorFillFromPercent: conveyorFillFromPercent,
      conveyorFillToPercent: conveyorFillToPercent,
      conveyorPostShiftPercent: conveyorPostShiftPercent,
      previousCompletedStages: previousCompletedStages,
      completedStages: completedStages,
      currentStageIndex: currentStageIndex,
      totalStages: totalStages,
      targetWindowStartIndex: progressWindow.windowStartIndex,
      absoluteCompletedCount: absoluteCompletedStages,
      trackLabels: progressWindow.trackLabels
    };

    if (shouldConveyor) {
      playConveyorSequence(root, progressPayload);
    } else {
      playProgressSequence(root, progressPayload);
    }
  }

  function destroyLevelCompleteModal() {
    clearTimers();
    setFocusTrap(false);
    var root = document.getElementById(ROOT_ID);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    modalState.isOpen = false;
  }

  if (!getLottieRuntime()) {
    ensureLottieRuntimeLoaded().catch(function () {});
  }
  warmLottieJsonCache(COIN_ANIMATION_PRELOAD_PATHS);

  window.renderLevelCompleteModal = renderLevelCompleteModal;
  window.destroyLevelCompleteModal = destroyLevelCompleteModal;

  try { document.dispatchEvent(new CustomEvent('floatingFire:modalReady')); } catch (err) {}
})();
