(function () {
    // Temporary development toggle: allow free onboarding navigation without removing lock logic.
    var DEV_UNLOCK_ALL_ONBOARDING_STEPS = true;

    function setError(id, message) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = message || '';
        }
    }

    function validateEmail(value) {
        return /\S+@\S+\.\S+/.test(value);
    }

    function getCsrfToken() {
        var cookieMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
        if (cookieMatch) {
            return decodeURIComponent(cookieMatch[1]);
        }

        var tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (tokenInput && tokenInput.value) {
            return tokenInput.value;
        }

        return '';
    }

    function postJson(endpoint, payload) {
        var csrfToken = getCsrfToken();
        var headers = {
            'Content-Type': 'application/json'
        };

        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        return fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
            body: JSON.stringify(payload || {})
        }).then(function (response) {
            return response.json().then(function (data) {
                return {
                    ok: response.ok,
                    data: data || {}
                };
            }).catch(function () {
                return {
                    ok: response.ok,
                    data: {}
                };
            });
        }).catch(function () {
            return {
                ok: false,
                data: {}
            };
        });
    }

    function updatePortalSession(isLoggedIn, payload) {
        var endpoint = isLoggedIn ? '/portal-auth/login/' : '/portal-auth/logout/';
        return postJson(endpoint, payload || { ok: true });
    }

    var PORTAL_SESSION_STORAGE_KEY = 'portal_session_hint';
    var PORTAL_REMEMBER_PREFERENCE_KEY = 'portal_remember_preference';
    var SIGNIN_LOCKOUT_UNTIL_KEY = 'portal_signin_lockout_until';
    var signInLockoutIntervalId = null;

    function getStorage(type) {
        try {
            var storage = type === 'local' ? window.localStorage : window.sessionStorage;
            var probe = '__portal_storage_probe__';
            storage.setItem(probe, '1');
            storage.removeItem(probe);
            return storage;
        } catch (error) {
            return null;
        }
    }

    function parseStoredSession(rawValue, source) {
        if (!rawValue) return null;

        try {
            var parsed = JSON.parse(rawValue);
            if (!parsed || typeof parsed !== 'object') return null;

            var email = (parsed.email || '').trim();
            if (!email) return null;

            return {
                email: email,
                source: source,
                rememberMe: source === 'local'
            };
        } catch (error) {
            return null;
        }
    }

    function getStoredPortalSession() {
        var localStorageRef = getStorage('local');
        var sessionStorageRef = getStorage('session');
        var localSession = localStorageRef ? parseStoredSession(localStorageRef.getItem(PORTAL_SESSION_STORAGE_KEY), 'local') : null;
        var sessionSession = sessionStorageRef ? parseStoredSession(sessionStorageRef.getItem(PORTAL_SESSION_STORAGE_KEY), 'session') : null;
        return localSession || sessionSession;
    }

    function clearStoredPortalSession() {
        var localStorageRef = getStorage('local');
        var sessionStorageRef = getStorage('session');

        if (localStorageRef) {
            localStorageRef.removeItem(PORTAL_SESSION_STORAGE_KEY);
        }

        if (sessionStorageRef) {
            sessionStorageRef.removeItem(PORTAL_SESSION_STORAGE_KEY);
        }
    }

    function saveStoredPortalSession(email, rememberMe) {
        var localStorageRef = getStorage('local');
        var sessionStorageRef = getStorage('session');
        var safeEmail = (email || '').trim();

        if (!safeEmail) return;

        var payload = JSON.stringify({
            email: safeEmail,
            saved_at: Date.now()
        });

        if (rememberMe && localStorageRef) {
            localStorageRef.setItem(PORTAL_SESSION_STORAGE_KEY, payload);
            if (sessionStorageRef) {
                sessionStorageRef.removeItem(PORTAL_SESSION_STORAGE_KEY);
            }
        } else if (sessionStorageRef) {
            sessionStorageRef.setItem(PORTAL_SESSION_STORAGE_KEY, payload);
            if (localStorageRef) {
                localStorageRef.removeItem(PORTAL_SESSION_STORAGE_KEY);
            }
        }

        if (localStorageRef) {
            localStorageRef.setItem(PORTAL_REMEMBER_PREFERENCE_KEY, rememberMe ? '1' : '0');
        }
    }

    function getRememberPreference() {
        var existingSession = getStoredPortalSession();
        if (existingSession) {
            return existingSession.rememberMe;
        }

        var localStorageRef = getStorage('local');
        if (!localStorageRef) return false;

        return localStorageRef.getItem(PORTAL_REMEMBER_PREFERENCE_KEY) === '1';
    }

    function setSignInStatus(message, state) {
        var statusEl = document.getElementById('signin-status');
        if (!statusEl) return;

        statusEl.textContent = message || '';
        statusEl.classList.remove('is-success', 'is-error', 'is-lockout');

        if (state === 'success') {
            statusEl.classList.add('is-success');
        } else if (state === 'lockout') {
            statusEl.classList.add('is-lockout');
        } else if (state === 'error') {
            statusEl.classList.add('is-error');
        }
    }

    function getSignInSubmitButton() {
        return document.getElementById('signin-submit-btn');
    }

    function setSignInButtonLocked(isLocked) {
        var submitBtn = getSignInSubmitButton();
        if (!submitBtn) return;
        submitBtn.disabled = Boolean(isLocked);
    }

    function clearSignInLockoutTimer() {
        if (signInLockoutIntervalId) {
            window.clearInterval(signInLockoutIntervalId);
            signInLockoutIntervalId = null;
        }
    }

    function getSignInLockoutStorage() {
        return getStorage('session') || getStorage('local');
    }

    function saveSignInLockoutUntil(untilIso) {
        var storage = getSignInLockoutStorage();
        if (!storage) return;
        if (!untilIso) {
            storage.removeItem(SIGNIN_LOCKOUT_UNTIL_KEY);
            return;
        }
        storage.setItem(SIGNIN_LOCKOUT_UNTIL_KEY, String(untilIso));
    }

    function readSignInLockoutUntil() {
        var storage = getSignInLockoutStorage();
        if (!storage) return null;
        var raw = storage.getItem(SIGNIN_LOCKOUT_UNTIL_KEY);
        if (!raw) return null;
        var parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    }

    function formatLockoutRemaining(targetDate) {
        var remainingMs = targetDate.getTime() - Date.now();
        if (remainingMs <= 0) return '';
        var totalSeconds = Math.ceil(remainingMs / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        if (minutes <= 0) {
            return seconds + 's';
        }
        return minutes + 'm ' + String(seconds).padStart(2, '0') + 's';
    }

    function clearSignInLockoutState(clearStatusMessage) {
        clearSignInLockoutTimer();
        saveSignInLockoutUntil('');
        setSignInButtonLocked(false);
        if (clearStatusMessage) {
            setSignInStatus('', '');
        }
    }

    function applySignInLockout(untilIso, baseMessage) {
        var lockoutUntil = new Date(untilIso || '');
        if (Number.isNaN(lockoutUntil.getTime())) {
            setSignInStatus(baseMessage || 'Account is temporarily locked.', 'lockout');
            setSignInButtonLocked(true);
            return;
        }

        if (lockoutUntil.getTime() <= Date.now()) {
            clearSignInLockoutState(true);
            return;
        }

        saveSignInLockoutUntil(lockoutUntil.toISOString());
        setSignInButtonLocked(true);

        var messagePrefix = baseMessage || 'Account is temporarily locked.';
        var renderLockoutStatus = function () {
            var remaining = formatLockoutRemaining(lockoutUntil);
            if (!remaining) {
                clearSignInLockoutState(true);
                return;
            }
            setSignInStatus(messagePrefix + ' Try again in ' + remaining + '.', 'lockout');
        };

        clearSignInLockoutTimer();
        renderLockoutStatus();
        signInLockoutIntervalId = window.setInterval(renderLockoutStatus, 1000);
    }

    function restoreSignInLockoutFromStorage() {
        var lockoutUntil = readSignInLockoutUntil();
        if (!lockoutUntil) {
            clearSignInLockoutState(false);
            return;
        }

        if (lockoutUntil.getTime() <= Date.now()) {
            clearSignInLockoutState(true);
            return;
        }

        applySignInLockout(lockoutUntil.toISOString(), 'Account is temporarily locked.');
    }

    function updatePasswordToggleIcon(button, isMasked) {
        var eye = button.querySelector('.icon-eye');
        var eyeOff = button.querySelector('.icon-eye-off');
        if (!eye || !eyeOff) return;

        // Hidden password => show closed eye; visible password => show open eye.
        eye.classList.toggle('password-icon-hidden', isMasked);
        eyeOff.classList.toggle('password-icon-hidden', !isMasked);
    }

    window.togglePasswordVisibility = function (button) {
        var passwordInput = null;

        if (button && button.closest) {
            var scope = button.closest('form, .modal-panel, .auth-card') || document;
            var inputId = button.getAttribute('data-toggle-password');
            if (inputId) {
                passwordInput = scope.querySelector('#' + inputId) || document.getElementById(inputId);
            }
            if (!passwordInput && button.parentElement) {
                passwordInput = button.parentElement.querySelector('input[type="password"], input[type="text"]');
            }
        }

        if (!passwordInput) {
            passwordInput = document.getElementById('password') || document.getElementById('signin-password');
        }
        if (!passwordInput) return false;

        var isMasked = passwordInput.type === 'password';
        passwordInput.type = isMasked ? 'text' : 'password';
        var nowMasked = passwordInput.type === 'password';

        if (button) {
            button.setAttribute('aria-label', nowMasked ? 'Show password' : 'Hide password');
            updatePasswordToggleIcon(button, nowMasked);
        }

        return false;
    };

    function initSignIn() {
        var form = document.getElementById('sign-in-form');
        if (!form) return;
        var rememberCheckbox = document.getElementById('signin-remember-me');

        if (rememberCheckbox) {
            rememberCheckbox.checked = getRememberPreference();
        }

        restoreSignInLockoutFromStorage();

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var email = document.getElementById('signin-email').value.trim();
            var password = document.getElementById('signin-password').value;
            var rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

            var storedLockout = readSignInLockoutUntil();
            if (storedLockout && storedLockout.getTime() > Date.now()) {
                applySignInLockout(storedLockout.toISOString(), 'Account is temporarily locked.');
                return;
            }

            setSignInStatus('', '');

            var valid = true;
            if (!email) {
                setError('signin-email-error', 'Email is required.');
                valid = false;
            } else if (!validateEmail(email)) {
                setError('signin-email-error', 'Please enter a valid email.');
                valid = false;
            } else {
                setError('signin-email-error', '');
            }

            if (!password) {
                setError('signin-password-error', 'Password is required.');
                valid = false;
            } else if (password.length < 6) {
                setError('signin-password-error', 'Password must be at least 6 characters.');
                valid = false;
            } else {
                setError('signin-password-error', '');
            }

            if (!valid) return;

            updatePortalSession(true, {
                email: email,
                password: password,
                remember_me: rememberMe
            }).then(function (result) {
                if (!result.ok) {
                    // Render backend auth errors in one place only to avoid duplicate messages.
                    setError('signin-password-error', '');
                    if (result.data && result.data.code === 'ACCOUNT_LOCKED') {
                        applySignInLockout(result.data.lockout_until, result.data.message || 'Account is temporarily locked.');
                        return;
                    }
                    clearSignInLockoutState(false);
                    setSignInStatus(result.data.message || 'Sign in failed. Please check your credentials.', 'error');
                    return;
                }

                clearSignInLockoutState(false);

                saveStoredPortalSession(email, rememberMe);
                setSignInStatus('Sign in successful. Redirecting...', 'success');

                var redirectUrl = result.data.redirect_url || '/template-beta/';
                window.location.href = redirectUrl;
            });
        });
    }

    function initSignUp() {
        var form = document.getElementById('sign-up-form');
        if (!form) return;

        var signupPhoneInput = form.querySelector('#signup-phone');
        if (signupPhoneInput) {
            signupPhoneInput.addEventListener('input', function () {
                var digitsOnly = signupPhoneInput.value.replace(/\D/g, '').slice(0, 10);
                if (signupPhoneInput.value !== digitsOnly) {
                    signupPhoneInput.value = digitsOnly;
                }
            });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var first = document.getElementById('signup-first-name').value.trim();
            var last = document.getElementById('signup-last-name').value.trim();
            var email = document.getElementById('signup-email').value.trim();
            var phone = document.getElementById('signup-phone').value.trim();
            var countryCode = document.getElementById('signup-country-code').value;
            var password = document.getElementById('signup-password').value;
            var confirm = document.getElementById('signup-confirm-password').value;
            var rememberMe = false;
            var terms = document.getElementById('signup-terms').checked;

            var valid = true;

            if (!first || !last) {
                setError('signup-name-error', 'First and last name are required.');
                valid = false;
            } else {
                setError('signup-name-error', '');
            }

            if (!email) {
                setError('signup-email-error', 'Email is required.');
                valid = false;
            } else if (!validateEmail(email)) {
                setError('signup-email-error', 'Please enter a valid email.');
                valid = false;
            } else {
                setError('signup-email-error', '');
            }

            var digits = phone.replace(/\D/g, '');
            if (digits.length !== 10) {
                setError('signup-phone-error', 'Please enter a valid 10-digit phone number.');
                valid = false;
            } else {
                setError('signup-phone-error', '');
            }

            if (!password || password.length < 8) {
                setError('signup-password-error', 'Password must be at least 8 characters.');
                valid = false;
            } else if (password !== confirm) {
                setError('signup-password-error', 'Passwords do not match.');
                valid = false;
            } else {
                setError('signup-password-error', '');
            }

            if (!terms) {
                setError('signup-terms-error', 'You must agree to the terms.');
                valid = false;
            } else {
                setError('signup-terms-error', '');
            }

            if (!valid) return;

            postJson('/portal-auth/signup/', {
                first_name: first,
                last_name: last,
                email: email,
                phone: phone,
                country_code: countryCode,
                password: password,
                confirm_password: confirm,
                remember_me: rememberMe,
                terms_accepted: terms
            }).then(function (result) {
                var fieldErrors = result.data.field_errors || {};

                if (!result.ok) {
                    if (fieldErrors.name) setError('signup-name-error', fieldErrors.name);
                    if (fieldErrors.email) setError('signup-email-error', fieldErrors.email);
                    if (fieldErrors.phone) setError('signup-phone-error', fieldErrors.phone);
                    if (fieldErrors.password) setError('signup-password-error', fieldErrors.password);
                    if (fieldErrors.terms) setError('signup-terms-error', fieldErrors.terms);

                    if (!Object.keys(fieldErrors).length) {
                        setError('signup-password-error', result.data.message || 'Unable to create account. Please try again.');
                    }
                    return;
                }

                saveStoredPortalSession(email, rememberMe);
                window.location.href = result.data.redirect_url || '/?openModal=signin-modal';
            });
        });
    }

    function initAutoLogin() {
        var signInForm = document.getElementById('sign-in-form');
        if (!signInForm) return;

        var storedSession = getStoredPortalSession();
        if (!storedSession) return;

        fetch('/portal-auth/status/', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        }).then(function (response) {
            return response.json().then(function (data) {
                return {
                    ok: response.ok,
                    data: data || {}
                };
            }).catch(function () {
                return {
                    ok: response.ok,
                    data: {}
                };
            });
        }).then(function (result) {
            if (!result.ok || !result.data.authenticated) {
                clearStoredPortalSession();
                return;
            }

            var redirectUrl = result.data.redirect_url || '/dashboard/';
            if (window.location.pathname !== redirectUrl) {
                window.location.href = redirectUrl;
            }
        }).catch(function () {
            // Keep user on login page when status check fails.
        });
    }

    function initPasswordToggles() {
        if (document.body.dataset.passwordToggleInit === 'true') return;
        document.body.dataset.passwordToggleInit = 'true';

        document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
            var scope = button.closest('form, .modal-panel, .auth-card') || document;
            var inputId = button.getAttribute('data-toggle-password');
            var input = inputId ? (scope.querySelector('#' + inputId) || document.getElementById(inputId)) : null;
            var isMasked = !input || input.type === 'password';
            button.setAttribute('aria-label', isMasked ? 'Show password' : 'Hide password');
            updatePasswordToggleIcon(button, isMasked);
        });
    }

    function initPortalLogout() {
        var logoutLinks = document.querySelectorAll('[data-portal-logout]');
        if (!logoutLinks.length) return;

        logoutLinks.forEach(function (link) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                var target = link.getAttribute('href') || '/';

                clearStoredPortalSession();
                setSignInStatus('', '');

                updatePortalSession(false).then(function () {
                    window.location.href = target;
                });
            });
        });
    }

    function initDashboardFaqPage() {
        var page = document.getElementById('dashboard-faq-page');
        if (!page) return;

        var search = page.querySelector('#dashboard-faq-search');
        var emptyState = page.querySelector('#dashboard-faq-empty');
        var items = Array.from(page.querySelectorAll('.dashboard-faq-item'));
        var sections = Array.from(page.querySelectorAll('[data-section]'));
        if (!items.length) return;

        var entries = Array.from(page.querySelectorAll('.faq-enter'));
        entries.forEach(function (entry) {
            var delay = Number(entry.getAttribute('data-faq-delay') || '0');
            if (!Number.isNaN(delay)) {
                entry.style.setProperty('--faq-delay', delay + 'ms');
            }
            entry.classList.add('is-visible');
        });

        function closeItem(item) {
            item.classList.remove('is-open');
            var trigger = item.querySelector('.dashboard-faq-trigger');
            var icon = item.querySelector('.dashboard-faq-icon');
            var content = item.querySelector('.dashboard-faq-content');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
            if (icon) icon.textContent = '+';
            if (content) {
                content.style.maxHeight = '0px';
            }
        }

        function openItem(item) {
            item.classList.add('is-open');
            var trigger = item.querySelector('.dashboard-faq-trigger');
            var icon = item.querySelector('.dashboard-faq-icon');
            var content = item.querySelector('.dashboard-faq-content');
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
            if (icon) icon.textContent = '-';
            if (content) {
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        }

        items.forEach(function (item) {
            var trigger = item.querySelector('.dashboard-faq-trigger');
            if (!trigger) return;

            trigger.addEventListener('click', function () {
                if (item.hidden) return;

                var isOpen = item.classList.contains('is-open');
                items.forEach(function (candidate) {
                    if (candidate !== item) closeItem(candidate);
                });

                if (isOpen) {
                    closeItem(item);
                } else {
                    openItem(item);
                }
            });
        });

        function applyFilter() {
            var query = search ? search.value.trim().toLowerCase() : '';
            var visibleCount = 0;

            items.forEach(function (item) {
                var question = (item.getAttribute('data-question') || '').toLowerCase();
                var answer = (item.getAttribute('data-answer') || '').toLowerCase();
                var matches = !query || question.indexOf(query) !== -1 || answer.indexOf(query) !== -1;

                item.hidden = !matches;
                if (!matches) {
                    closeItem(item);
                    return;
                }

                item.style.setProperty('--faq-delay', (80 + visibleCount * 40) + 'ms');
                item.classList.remove('is-visible');
                void item.offsetHeight;
                item.classList.add('is-visible');
                visibleCount += 1;
            });

            sections.forEach(function (section) {
                var sectionItems = Array.from(section.querySelectorAll('.dashboard-faq-item'));
                var hasVisibleItems = sectionItems.some(function (item) {
                    return !item.hidden;
                });
                section.hidden = !hasVisibleItems;
            });

            if (emptyState) {
                emptyState.hidden = visibleCount !== 0;
            }
        }

        if (search) {
            search.addEventListener('input', applyFilter);
        }

        applyFilter();
    }

    function initDashboardTabs() {
        var buttons = document.querySelectorAll('.tab-btn');
        if (!buttons.length) return;

        buttons.forEach(function (button) {
            button.addEventListener('click', function () {
                var tabId = button.getAttribute('data-tab');

                document.querySelectorAll('.tab-btn').forEach(function (b) {
                    b.classList.remove('active');
                });
                button.classList.add('active');

                document.querySelectorAll('.tab-panel').forEach(function (panel) {
                    panel.classList.add('hidden');
                });

                var activePanel = document.getElementById(tabId);
                if (activePanel) {
                    activePanel.classList.remove('hidden');
                }
            });
        });
    }

    function switchToTab(tabId) {
        var button = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
        if (button) {
            button.click();
        }
    }

    function initThemeToggle() {
        var toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        var stored = window.localStorage.getItem('theme');
        // Default dashboard theme is light unless user explicitly chose dark.
        var isDark = stored ? stored === 'dark' : false;

        function applyTheme(dark) {
            document.documentElement.classList.toggle('dark', dark);
            window.localStorage.setItem('theme', dark ? 'dark' : 'light');
            toggle.checked = dark;
        }

        applyTheme(isDark);

        toggle.addEventListener('change', function () {
            applyTheme(toggle.checked);
        });
    }

    function initThemeDropdown() {
        var dropdown = document.getElementById('theme-dropdown');
        if (!dropdown) return;

        var menu = dropdown.querySelector('.sidebar-dropdown-menu');
        if (!menu) return;

        function closeMenu() {
            dropdown.classList.remove('open');
            dropdown.setAttribute('aria-expanded', 'false');
        }

        function toggleMenu(event) {
            event.stopPropagation();
            var isOpen = dropdown.classList.toggle('open');
            dropdown.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        dropdown.addEventListener('click', toggleMenu);
        menu.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        document.addEventListener('click', closeMenu);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }

    function initUserMenu() {
        var menu = document.getElementById('user-menu');
        if (!menu) return;

        var button = menu.querySelector('.user-menu-button');
        var dropdown = menu.querySelector('.user-menu-dropdown');
        if (!button || !dropdown) return;

        function closeMenu() {
            menu.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
        }

        function toggleMenu(event) {
            event.stopPropagation();
            var isOpen = menu.classList.toggle('open');
            button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        button.addEventListener('click', toggleMenu);
        dropdown.addEventListener('click', function (event) {
            event.stopPropagation();

            // Close menu when a menu item is selected (navigation occurs).
            if (event.target.closest('a')) {
                closeMenu();
            }
        });

        document.addEventListener('click', closeMenu);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }

    function initStepDetails() {
        var steps = Array.from(document.querySelectorAll('details.step-item'));

        steps.forEach(function (details) {
            var toggle = details.querySelector('.step-toggle');
            if (!toggle) return;

            var update = function () {
                toggle.setAttribute('aria-expanded', details.open ? 'true' : 'false');
                toggle.setAttribute('aria-label', details.open ? 'Collapse details' : 'Expand details');
            };

            details.addEventListener('toggle', function () {
                // Keep only one step open at a time.
                if (details.open) {
                    steps.forEach(function (other) {
                        if (other !== details) {
                            other.open = false;
                        }
                    });
                }

                update();
            });

            update();

            // Prevent toggling when the step is locked.
            details.querySelector('summary').addEventListener('click', function (event) {
                if (!DEV_UNLOCK_ALL_ONBOARDING_STEPS && details.classList.contains('locked')) {
                    event.preventDefault();
                }
            });
        });
    }

    function updateProgressCard() {
        var steps = Array.from(document.querySelectorAll('details.step-item'));
        var completedCount = steps.filter(function (step) {
            return step.classList.contains('completed');
        }).length;

        var total = steps.length;
        var progressPct = total ? Math.round((completedCount / total) * 100) : 0;

        var summary = document.querySelector('.progress-card .progress-meta');
        if (summary) {
            summary.textContent = completedCount + ' of ' + total + ' steps completed';
        }

        var progressFill = document.querySelector('.progress-card .progress-fill');
        if (progressFill) {
            progressFill.style.setProperty('--progress', progressPct + '%');
        }
    }

    function unlockRequirementsSteps() {
        var firstStep = document.getElementById('requirements-step-1');
        if (!firstStep) return;

        firstStep.classList.remove('locked');
        firstStep.classList.add('current');
        firstStep.open = true;

        var status = firstStep.querySelector('.step-status');
        if (status) {
            status.textContent = 'In Progress';
            status.classList.remove('status-upcoming');
            status.classList.add('status-current');
        }

        firstStep.querySelectorAll('.step-fields input').forEach(function (input) {
            input.removeAttribute('disabled');
        });

        // Ensure finish button can show on unlocked step.
        var finishBtn = firstStep.querySelector('.finish-btn');
        if (finishBtn) {
            finishBtn.hidden = false;
            finishBtn.disabled = false;
        }
    }

    function initStepCompletion() {
        var steps = Array.from(document.querySelectorAll('details.step-item'));

        function updateFinishButton(step) {
            var finishBtn = step.querySelector('.finish-btn');
            if (!finishBtn) return;

            var inputs = Array.from(step.querySelectorAll('.step-fields input'));
            var allFilled = inputs.length && inputs.every(function (input) {
                return input.value.trim() !== '';
            });

            if ((DEV_UNLOCK_ALL_ONBOARDING_STEPS || step.classList.contains('current')) && allFilled) {
                finishBtn.hidden = false;
                finishBtn.disabled = false;
            } else {
                finishBtn.hidden = true;
                finishBtn.disabled = true;
            }
        }

        function updateStepLockIcon(step) {
            var lockEl = step.querySelector('.step-lock');
            if (!lockEl) return;

            var isCompleted = step.classList.contains('completed');

            if (isCompleted) {
                lockEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            } else {
                lockEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 10V7a5 5 0 0 0-10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
            }
        }

        steps.forEach(function (step, idx) {
            // Open completed steps by default
            if (step.classList.contains('completed')) {
                step.open = true;
            }

            // Lock all steps except current/completed.
            if (!DEV_UNLOCK_ALL_ONBOARDING_STEPS && !step.classList.contains('current') && !step.classList.contains('completed')) {
                step.classList.add('locked');
            }

            if (DEV_UNLOCK_ALL_ONBOARDING_STEPS) {
                step.classList.remove('locked');
            }

            // Enable inputs for current and completed steps.
            if (DEV_UNLOCK_ALL_ONBOARDING_STEPS || step.classList.contains('current') || step.classList.contains('completed')) {
                step.querySelectorAll('.step-fields input').forEach(function (input) {
                    input.removeAttribute('disabled');
                });
            }

            // Ensure the lock icon reflects completion state.
            updateStepLockIcon(step);

            // Update finish button on input change.
            step.querySelectorAll('.step-fields input').forEach(function (input) {
                input.addEventListener('input', function () {
                    updateFinishButton(step);
                });
            });

            var finishBtn = step.querySelector('.finish-btn');
            if (!finishBtn) return;

            finishBtn.addEventListener('click', function () {
                // Mark current step completed.
                step.classList.remove('current');
                step.classList.add('completed');

                var status = step.querySelector('.step-status');
                if (status) {
                    status.textContent = 'Completed';
                    status.classList.remove('status-current', 'status-upcoming');
                    status.classList.add('status-completed');
                }

                // Close this step dropdown after completing.
                step.open = false;

                // Update icon on completed step.
                updateStepLockIcon(step);

                // Unlock next step.
                var nextStep = steps[idx + 1];
                if (nextStep) {
                    nextStep.classList.remove('locked');
                    nextStep.classList.add('current');
                    nextStep.open = true;

                    // Update status to In Progress
                    var nextStatus = nextStep.querySelector('.step-status');
                    if (nextStatus) {
                        nextStatus.textContent = 'In Progress';
                        nextStatus.classList.remove('status-upcoming');
                        nextStatus.classList.add('status-current');
                    }

                    // Enable its inputs, and allow finish button to show.
                    nextStep.querySelectorAll('.step-fields input').forEach(function (input) {
                        input.removeAttribute('disabled');
                    });
                    updateFinishButton(nextStep);
                }

                // Update UI after completion.
                updateFinishButton(step);
                updateProgressCard();

                // If this is the final overview step, unlock the requirements list and redirect.
                if (step.classList.contains('final-step')) {
                    // Add a slight delay so the user sees the completed state before switching tabs.
                    window.setTimeout(function () {
                        unlockRequirementsSteps();
                        switchToTab('requirements');

                        // Ensure the first requirements step is expanded and visible.
                        var firstReq = document.getElementById('requirements-step-1');
                        if (firstReq) {
                            firstReq.open = true;
                            firstReq.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 150);
                }
            });

            // Initial setup for finish button.
            updateFinishButton(step);
            updateProgressCard();
        });
    }

    function initScrollMotion() {
        var pages = document.querySelectorAll('.landing-page, .contact-page');
        if (!pages.length) return;

        var motionEls = [];
        pages.forEach(function (page) {
            page.querySelectorAll('.motion').forEach(function (el) {
                motionEls.push(el);
            });
        });
        if (!motionEls.length) return;

        motionEls.forEach(function (el) {
            var delay = Number(el.getAttribute('data-delay') || '0');
            if (!Number.isNaN(delay)) {
                el.style.setProperty('--motion-delay', delay + 'ms');
            }
        });

        if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
            motionEls.forEach(function (el) {
                el.classList.add('visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -10% 0px'
        });

        motionEls.forEach(function (el) {
            observer.observe(el);
        });
    }

    function initLandingAnchorScroll() {
        var landing = document.querySelector('.landing-page');
        if (!landing) return;

        var links = landing.querySelectorAll('a[href^="#"]');
        if (!links.length) return;

        links.forEach(function (link) {
            link.addEventListener('click', function (event) {
                var targetId = link.getAttribute('href');
                if (!targetId || targetId === '#') return;

                var target = document.querySelector(targetId);
                if (!target) return;

                event.preventDefault();
                var header = landing.querySelector('.site-header');
                var offset = header ? header.offsetHeight + 16 : 0;
                var top = target.getBoundingClientRect().top + window.pageYOffset - offset;

                window.scrollTo({ top: top, behavior: 'smooth' });
            });
        });
    }

    function initDynamicHomepage() {
        var landing = document.querySelector('.landing-page');
        if (!landing) return;

        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var hero = landing.querySelector('.hero');
        var featureCards = Array.from(landing.querySelectorAll('.feature-card'));

        featureCards.forEach(function (card, index) {
            card.style.setProperty('--feature-index', String(index));
        });

        if ('IntersectionObserver' in window && featureCards.length) {
            var cardObserver = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-in-view');
                    obs.unobserve(entry.target);
                });
            }, {
                threshold: 0.2,
                rootMargin: '0px 0px -8% 0px'
            });

            featureCards.forEach(function (card) {
                cardObserver.observe(card);
            });
        } else {
            featureCards.forEach(function (card) {
                card.classList.add('is-in-view');
            });
        }

        if (!hero || reduceMotion) return;

        var rafId = null;
        var pointerX = 0;
        var pointerY = 0;
        var scrollY = 0;

        function renderHeroDepth() {
            rafId = null;
            hero.style.setProperty('--hero-pointer-x', pointerX.toFixed(2) + 'px');
            hero.style.setProperty('--hero-pointer-y', pointerY.toFixed(2) + 'px');
            hero.style.setProperty('--hero-scroll-y', scrollY.toFixed(2) + 'px');
        }

        function requestHeroRender() {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(renderHeroDepth);
        }

        function onPointerMove(event) {
            var rect = hero.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            var normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            var normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

            pointerX = normalizedX * 10;
            pointerY = normalizedY * 14;
            requestHeroRender();
        }

        function onPointerLeave() {
            pointerX = 0;
            pointerY = 0;
            requestHeroRender();
        }

        function onScroll() {
            var rect = hero.getBoundingClientRect();
            var progress = 1 - Math.max(0, Math.min(1, rect.bottom / (window.innerHeight + rect.height)));
            scrollY = progress * 20;
            requestHeroRender();
        }

        hero.addEventListener('mousemove', onPointerMove);
        hero.addEventListener('mouseleave', onPointerLeave);
        window.addEventListener('scroll', onScroll, { passive: true });

        onScroll();
    }

    function initAuthModals() {
        var page = document.querySelector('.landing-page, .contact-page, .verify-page');
        if (!page) return;

        var modals = Array.from(page.querySelectorAll('.modal-backdrop'));
        if (!modals.length) return;

        function setBodyLock(locked) {
            document.body.style.overflow = locked ? 'hidden' : '';
        }

        function closeAll() {
            modals.forEach(function (modal) {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
            });
            setBodyLock(false);
        }

        function openModal(id) {
            closeAll();
            var target = document.getElementById(id);
            if (!target) return;
            target.classList.add('is-open');
            target.setAttribute('aria-hidden', 'false');
            setBodyLock(true);
        }

        page.querySelectorAll('[data-open-modal]').forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
                var modalId = trigger.getAttribute('data-open-modal');
                if (!modalId) return;
                event.preventDefault();
                openModal(modalId);
            });
        });

        page.querySelectorAll('[data-switch-modal]').forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
                var modalId = trigger.getAttribute('data-switch-modal');
                if (!modalId) return;
                event.preventDefault();
                openModal(modalId);
            });
        });

        page.querySelectorAll('.forgot-modal-form').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                openModal('verify-reset-modal');
            });
        });

        page.querySelectorAll('.verify-reset-form').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                var resetSuccessModal = document.getElementById('reset-success-modal');
                if (resetSuccessModal) {
                    openModal('reset-success-modal');
                    return;
                }
                var signInModal = document.getElementById('signin-modal');
                if (signInModal) {
                    openModal('signin-modal');
                    return;
                }
                window.location.href = '/sign-in/';
            });
        });

        page.querySelectorAll('[data-reset-success-confirm]').forEach(function (button) {
            button.addEventListener('click', function () {
                var resetPasswordModal = document.getElementById('reset-password-modal');
                if (resetPasswordModal) {
                    openModal('reset-password-modal');
                    return;
                }
                var signInModal = document.getElementById('signin-modal');
                if (signInModal) {
                    openModal('signin-modal');
                    return;
                }
                window.location.href = '/sign-in/';
            });
        });

        page.querySelectorAll('.reset-password-form').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();

                var passwordInput = form.querySelector('input[id^="reset-new-password"]');
                var confirmInput = form.querySelector('input[id^="reset-confirm-password"]');
                var error = form.querySelector('.reset-password-error');
                var password = passwordInput ? passwordInput.value : '';
                var confirm = confirmInput ? confirmInput.value : '';

                if (error) error.textContent = '';

                if (!password || !confirm) {
                    if (error) error.textContent = 'Both password fields are required.';
                    return;
                }

                if (password.length < 8) {
                    if (error) error.textContent = 'Password must be at least 8 characters.';
                    return;
                }

                if (password !== confirm) {
                    if (error) error.textContent = 'Passwords do not match.';
                    return;
                }

                var resetDoneModal = document.getElementById('reset-done-modal');
                if (resetDoneModal) {
                    openModal('reset-done-modal');
                    return;
                }

                var signInModal = document.getElementById('signin-modal');
                if (signInModal) {
                    openModal('signin-modal');
                    return;
                }
                window.location.href = '/sign-in/';
            });
        });

        page.querySelectorAll('[data-reset-done-continue]').forEach(function (button) {
            button.addEventListener('click', function () {
                var signInModal = document.getElementById('signin-modal');
                if (signInModal) {
                    openModal('signin-modal');
                    return;
                }
                window.location.href = '/sign-in/';
            });
        });

        page.querySelectorAll('.verify-signup-form').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                window.location.href = '/dashboard/';
            });
        });

        page.querySelectorAll('.contact-modal-form').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();

                var firstName = (form.querySelector('[name="firstName"]') || {}).value || '';
                var lastName = (form.querySelector('[name="lastName"]') || {}).value || '';
                var email = (form.querySelector('[name="email"]') || {}).value || '';
                var subject = (form.querySelector('[name="subject"]') || {}).value || '';
                var message = (form.querySelector('[name="message"]') || {}).value || '';
                var terms = (form.querySelector('[name="terms"]') || {}).checked || false;

                firstName = firstName.trim();
                lastName = lastName.trim();
                email = email.trim();
                subject = subject.trim();
                message = message.trim();

                function setModalFieldError(field, text) {
                    var error = form.querySelector('[data-error-for="' + field + '"]');
                    if (error) error.textContent = text || '';
                }

                setModalFieldError('firstName', '');
                setModalFieldError('lastName', '');
                setModalFieldError('email', '');
                setModalFieldError('subject', '');
                setModalFieldError('message', '');
                setModalFieldError('terms', '');

                var success = form.querySelector('.contact-success');
                if (success) success.textContent = '';

                var valid = true;
                if (!firstName) {
                    setModalFieldError('firstName', 'First name is required.');
                    valid = false;
                }
                if (!lastName) {
                    setModalFieldError('lastName', 'Last name is required.');
                    valid = false;
                }
                if (!email) {
                    setModalFieldError('email', 'Email is required.');
                    valid = false;
                } else if (!validateEmail(email)) {
                    setModalFieldError('email', 'Please enter a valid email address.');
                    valid = false;
                }
                if (!subject) {
                    setModalFieldError('subject', 'Subject is required.');
                    valid = false;
                }
                if (!message) {
                    setModalFieldError('message', 'Message is required.');
                    valid = false;
                } else if (message.length < 10) {
                    setModalFieldError('message', 'Please enter at least 10 characters.');
                    valid = false;
                }
                if (!terms) {
                    setModalFieldError('terms', 'You must agree before sending.');
                    valid = false;
                }

                if (!valid) return;

                window.alert('Thanks! Your message has been sent.');
                window.location.href = '/';
            });
        });

        page.querySelectorAll('[data-close-modal]').forEach(function (button) {
            button.addEventListener('click', function () {
                closeAll();
            });
        });

        page.querySelectorAll('[data-open-chatbot]').forEach(function (button) {
            button.addEventListener('click', function () {
                closeAll();
                setTimeout(function () {
                    var t = document.getElementById('chatbotTrigger');
                    if (t) t.click();
                }, 80);
            });
        });

        modals.forEach(function (modal) {
            modal.addEventListener('click', function (event) {
                if (event.target === modal) {
                    closeAll();
                }
            });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeAll();
            }
        });

        var query = new URLSearchParams(window.location.search);
        var requestedModal = query.get('openModal') || query.get('modal') || (window.location.hash || '').replace('#', '');
        if (requestedModal === 'signin-modal' || requestedModal === 'signup-modal' || requestedModal === 'forgot-modal' || requestedModal === 'contact-modal' || requestedModal === 'verify-reset-modal' || requestedModal === 'verify-signup-modal' || requestedModal === 'reset-success-modal' || requestedModal === 'reset-password-modal' || requestedModal === 'reset-done-modal') {
            openModal(requestedModal);

            // Keep URL clean so refresh does not repeatedly force-open modals.
            if (window.history && window.history.replaceState) {
                var cleanUrl = window.location.pathname + (window.location.search ? window.location.search.replace(/([?&])(openModal|modal)=[^&]*&?/g, '$1').replace(/[?&]$/, '') : '');
                window.history.replaceState({}, document.title, cleanUrl);
            }
        }
    }

    function initContactForm() {
        var form = document.getElementById('contact-form');
        if (!form) return;

        var success = document.getElementById('contact-success');

        function field(id) {
            return document.getElementById(id);
        }

        function showFieldError(id, message) {
            var el = field(id + '-error');
            if (el) {
                el.textContent = message || '';
            }
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            var firstName = field('contact-first-name').value.trim();
            var lastName = field('contact-last-name').value.trim();
            var email = field('contact-email').value.trim();
            var subject = field('contact-subject').value.trim();
            var message = field('contact-message').value.trim();
            var terms = field('contact-terms').checked;

            var valid = true;
            showFieldError('contact-first-name', '');
            showFieldError('contact-last-name', '');
            showFieldError('contact-email', '');
            showFieldError('contact-subject', '');
            showFieldError('contact-message', '');
            showFieldError('contact-terms', '');
            if (success) success.textContent = '';

            if (!firstName) {
                showFieldError('contact-first-name', 'First name is required.');
                valid = false;
            }

            if (!lastName) {
                showFieldError('contact-last-name', 'Last name is required.');
                valid = false;
            }

            if (!email) {
                showFieldError('contact-email', 'Email is required.');
                valid = false;
            } else if (!validateEmail(email)) {
                showFieldError('contact-email', 'Please enter a valid email address.');
                valid = false;
            }

            if (!subject) {
                showFieldError('contact-subject', 'Subject is required.');
                valid = false;
            }

            if (!message) {
                showFieldError('contact-message', 'Message is required.');
                valid = false;
            }

            if (!terms) {
                showFieldError('contact-terms', 'You must accept terms and privacy policy.');
                valid = false;
            }

            if (!valid) {
                return;
            }

            form.reset();
            if (success) {
                success.textContent = 'Message sent successfully. We will contact you soon.';
            }
        });
    }

    function initSidebarToggle() {
        var button = document.getElementById('sidebar-toggle');
        var layout = document.querySelector('.dashboard-layout');
        var icon = document.querySelector('.hamburger-icon svg');

        if (!button || !layout || !icon) return;

        var stored = window.localStorage.getItem('sidebar-collapsed');
        var isCollapsed = stored ? stored === 'true' : (window.innerWidth <= 768);

        // Keep initial UI state in sync with persisted/mobile preference.
        layout.classList.toggle('sidebar-collapsed', isCollapsed);

        function updateIcon() {
            if (isCollapsed) {
                icon.innerHTML = '<path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            } else {
                icon.innerHTML = '<path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            }
        }

        function toggleSidebar() {
            isCollapsed = !isCollapsed;
            layout.classList.toggle('sidebar-collapsed', isCollapsed);
            window.localStorage.setItem('sidebar-collapsed', isCollapsed);
            updateIcon();
        }

        updateIcon();

        button.addEventListener('click', toggleSidebar);

        // Close sidebar when clicking backdrop on mobile
        var backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function() {
                if (!isCollapsed) {
                    toggleSidebar();
                }
            });
        }
    }

    function initNavScroll() {
        var nav = document.querySelector('.nav');
        if (!nav) return;

        var isScrolled = false;
        var ticking = false;

        function updateNavState() {
            var shouldBeScrolled = window.scrollY > 50;
            
            if (shouldBeScrolled !== isScrolled) {
                isScrolled = shouldBeScrolled;
                nav.classList.toggle('scrolled', isScrolled);
            }
            
            ticking = false;
        }

        function handleScroll() {
            if (!ticking) {
                window.requestAnimationFrame(updateNavState);
                ticking = true;
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        updateNavState(); // Initial check
    }

    function initVerifyDigits() {
        var otpInputs = Array.from(document.querySelectorAll('.verify-otp-row input'));
        if (!otpInputs.length) return;

        otpInputs.forEach(function (input, index) {
            input.addEventListener('keydown', function (event) {
                var key = event.key;
                var isDigit = /^[0-9]$/.test(key);
                var allowed = key === 'Backspace' || key === 'Delete' || key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight';

                if (!isDigit && !allowed) {
                    event.preventDefault();
                }

                if (key === 'Backspace' && !input.value && otpInputs[index - 1]) {
                    otpInputs[index - 1].focus();
                }
            });

            input.addEventListener('input', function () {
                var digit = input.value.replace(/\D/g, '').slice(0, 1);
                input.value = digit;

                if (digit && otpInputs[index + 1]) {
                    otpInputs[index + 1].focus();
                }
            });

            input.addEventListener('paste', function (event) {
                event.preventDefault();
                var text = (event.clipboardData || window.clipboardData).getData('text') || '';
                var digits = text.replace(/\D/g, '').slice(0, otpInputs.length);
                if (!digits) return;

                digits.split('').forEach(function (char, offset) {
                    if (otpInputs[index + offset]) {
                        otpInputs[index + offset].value = char;
                    }
                });

                var nextIndex = Math.min(index + digits.length, otpInputs.length - 1);
                otpInputs[nextIndex].focus();
            });
        });
    }

    function initChatbotAssistant() {
        var trigger = document.getElementById('chatbotTrigger');
        var overlay = document.getElementById('chatbotOverlay');
        var modal = document.getElementById('chatbotModal');
        var closeBtn = document.getElementById('chatbotClose');
        var body = document.getElementById('chatbotBody');
        var quickReplies = document.getElementById('chatbotQuickReplies');
        var input = document.getElementById('chatbotInput');
        var sendBtn = document.getElementById('chatbotSend');

        if (!trigger || !overlay || !modal || !closeBtn || !body || !quickReplies || !input || !sendBtn) {
            return;
        }

        var EMAIL = 'innersparcrealtyservices@gmail.com';
        var MAX_HISTORY_MESSAGES = 12;
        var MAX_MESSAGE_LENGTH = 500;
        var initialized = false;
        var busy = false;
        var history = [];

        function hasOpenAuthModal() {
            return !!document.querySelector('.modal-backdrop.is-open');
        }

        function setBodyLock(locked) {
            if (locked) {
                document.body.style.overflow = 'hidden';
                return;
            }

            if (!hasOpenAuthModal()) {
                document.body.style.overflow = '';
            }
        }

        function scrollBottom() {
            window.requestAnimationFrame(function () {
                body.scrollTop = body.scrollHeight;
            });
        }

        function escapeHtml(text) {
            return String(text || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatBotText(text) {
            var safe = escapeHtml(text || '');
            return safe
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        }

        function setQuickReplies(options) {
            quickReplies.innerHTML = '';
            (options || []).slice(0, 3).forEach(function (option) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'chatbot-qr';
                button.textContent = option;
                button.addEventListener('click', function () {
                    if (busy) return;
                    quickReplies.innerHTML = '';
                    appendUserMessage(option);
                    sendToClaude(option);
                });
                quickReplies.appendChild(button);
            });
        }

        function appendTyping() {
            var wrap = document.createElement('div');
            wrap.className = 'chatbot-msg bot';
            wrap.id = 'chatbotTyping';
            wrap.innerHTML = '<div class="chatbot-avatar">IS</div><div class="chatbot-bubble"><span class="chatbot-typing"><span></span><span></span><span></span></span></div>';
            body.appendChild(wrap);
            scrollBottom();
        }

        function removeTyping() {
            var typing = document.getElementById('chatbotTyping');
            if (typing) typing.remove();
        }

        function appendUserMessage(text) {
            var wrap = document.createElement('div');
            wrap.className = 'chatbot-msg user';

            var bubble = document.createElement('div');
            bubble.className = 'chatbot-bubble';
            bubble.textContent = text;

            wrap.appendChild(bubble);
            body.appendChild(wrap);
            scrollBottom();
        }

        function appendBotMessage(text, withAiLabel, gmail, gmailSubject, gmailBody) {
            var wrap = document.createElement('div');
            wrap.className = 'chatbot-msg bot';

            var avatar = document.createElement('div');
            avatar.className = 'chatbot-avatar';
            avatar.textContent = 'IS';

            var content = document.createElement('div');
            content.className = 'chatbot-content';
            var bubble = document.createElement('div');
            bubble.className = 'chatbot-bubble';
            bubble.innerHTML = formatBotText(text);

            content.appendChild(bubble);

            if (gmail) {
                var subject = gmailSubject || 'Inquiry - Inner SPARC Realty';
                var mailBody = gmailBody || 'Hi Inner SPARC team,\n\nI would like to inquire about:\n\n';
                var link = document.createElement('a');
                link.className = 'chatbot-gmail';
                link.target = '_blank';
                link.rel = 'noopener';
                link.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(EMAIL) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(mailBody);
                link.textContent = 'Open Gmail draft';
                content.appendChild(link);
            }

            if (withAiLabel) {
                var aiLabel = document.createElement('div');
                aiLabel.className = 'chatbot-ai-label';
                aiLabel.textContent = 'AI-generated response';
                content.appendChild(aiLabel);
            }

            wrap.appendChild(avatar);
            wrap.appendChild(content);
            body.appendChild(wrap);
            scrollBottom();
        }

        function detectUserLanguage(userText) {
            var text = String(userText || '').toLowerCase();
            var padded = ' ' + text + ' ';
            var tagalogSignals = [
                ' po ', ' opo ', ' ba ', ' naman ', ' kasi ', ' saan ', ' magkano ', ' puwede ', ' pwede ',
                ' kailan ', ' bukas ', ' salamat ', ' paki ', ' kayo ', ' kami ', ' namin ', ' nyo ', ' mo ',
                ' ko ', ' hindi ', ' oo ', ' ng ', ' mag-'
            ];
            var englishSignals = [
                'hello', 'hi', 'where', 'when', 'price', 'cost', 'payment', 'contact',
                'location', 'schedule', 'visit', 'office', 'hours', 'please', 'thanks'
            ];

            var tagalogScore = 0;
            var englishScore = 0;

            tagalogSignals.forEach(function (token) {
                if (padded.indexOf(token) !== -1) tagalogScore += 1;
            });

            englishSignals.forEach(function (token) {
                if (text.indexOf(token) !== -1) englishScore += 1;
            });

            if (tagalogScore >= 2 && tagalogScore >= englishScore) {
                return 'tl';
            }

            return 'en';
        }

        function localFallbackReply(userText) {
            var text = String(userText || '').toLowerCase();
            var normalized = text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            var isTagalog = detectUserLanguage(userText) === 'tl';
            var fallback = {
                reply: isTagalog
                    ? 'Nandito ako para tumulong sa Inner SPARC inquiries. Sabihin mo lang kung hours, location, site tripping, payment options, o contact details ang kailangan mo.'
                    : 'I can help with Inner SPARC essentials right now. Tell me if you need business hours, location, site tripping, payment options, or contact details.',
                quickReplies: isTagalog
                    ? ['Business hours', 'Lokasyon', 'Contact numbers']
                    : ['Business hours', 'Location', 'Contact numbers'],
                gmail: false,
                gmailSubject: 'Inquiry - Inner SPARC Realty',
                gmailBody: 'Hi Inner SPARC team,\n\nI would like to inquire about:\n\n'
            };

            function hasIntent(pattern) {
                return pattern.test(text) || pattern.test(normalized);
            }

            var asksGreeting = hasIntent(/(^|\s)(hi|hello|hey|good morning|good afternoon|good evening|kamusta|kumusta)(\s|$)/);
            var asksThanks = hasIntent(/(^|\s)(thanks|thank you|salamat|ty)(\s|$)/);
            var asksWhatIsSparc = hasIntent(/what\s+is\s+inner\s+sparc|inner\s+sparc\s+is|about\s+inner\s+sparc|ano\s+ang\s+inner\s+sparc/);
            var asksCreateAccount = hasIntent(/create\s+(an\s+)?account|how\s+to\s+create\s+account|how\s+do\s+i\s+register|sign\s*up|register|gumawa\s+ng\s+account|mag\s*register/);
            var asksVerifyEmail = hasIntent(/verify\s+(my\s+)?email|email\s+verification|verification\s+code|verify\s+code|email\s+code|otp/);
            var asksForgotPassword = hasIntent(/forgot\s+password|reset\s+password|nakalimutan\s+ang\s+password|forgot/);
            var asksRequiredDocs = hasIntent(/required\s+documents|what\s+documents|anong\s+documents|required\s+files|valid\s+id|requirements|ano\s+ang\s+kailangan/);
            var asksProgress = hasIntent(/check\s+progress|track\s+progress|my\s+progress|dashboard|completed\s+steps|pending\s+steps|application\s+progress|status\s+of\s+application/);
            var asksNoCode = hasIntent(/did\s+not\s+receive|didn\s*t\s+receive|walang\s+code|no\s+code|resend\s+code|spam\s+folder|hindi\s+ko\s+natanggap\s+ang\s+code/);
            var asksCantLogin = hasIntent(/can\s*t\s+log\s*in|cannot\s+log\s*in|cant\s+login|invalid\s+password|invalid\s+email|hindi\s+maka\s*login|how\s+can\s+i\s+log\s*in|how\s+to\s+log\s*in|paano\s+mag\s*log\s*in|how\s+do\s+i\s+login|how\s+to\s+login/);
            var asksContinueLater = hasIntent(/continue\s+later|resume\s+later|save\s+progress|balikan\s+later|continue\s+application|ituloy\s+later/);
            var asksSupport = hasIntent(/contact\s+support|support\s+team|help\s+desk|customer\s+support|need\s+help|customer\s+service|contact\s+us/);
            var asksHours = hasIntent(/hour|oras|open|bukas|sarado|business\s*hours|opening|closing|time/);
            var asksLocation = hasIntent(/saan|where|location|address|office|pumunta|punta|map/);
            var asksContact = hasIntent(/contact|number|phone|tawag|email|reach/);
            var asksContactNumber = hasIntent(/contact\s*number|phone|number|call|tawag/);
            var asksContactAgent = hasIntent(/contact\s+(an\s+)?agent|talk\s+to\s+(an\s+)?agent|speak\s+to\s+(an\s+)?agent|kausap\s+ng\s+agent/);
            var asksVisit = hasIntent(/visit|site|tripping|ocular|tour|schedule|appointment|viewing/);
            var asksPrice = hasIntent(/price|presyo|magkano|cost|budget|down|payment|financing|loan/);
            var asksProperty = hasIntent(/properties|property|available\s+properties|availability|bahay|house|lot|townhouse|condo|unit|units/);
            var asksUnrelated = hasIntent(/weather|news|sports|basketball|nba|music|song|movie|recipe|coding|programming|python|javascript|assignment|homework|politics|election|crypto|bitcoin|stock/);

            // Deterministic quick-reply handling: prevent generic fallback for this common CTA.
            if (normalized === 'available properties' || normalized.indexOf('available properties') !== -1) {
                fallback.reply = isTagalog
                    ? 'May available kaming **house and lot, townhouse, at condo units** sa Avida Residences Sta. Catalina at nearby Cavite developments. Para sa updated availability per project, puwede kitang i-connect sa agent.'
                    : 'We currently offer **house and lot, townhouse, and condo units** in Avida Residences Sta. Catalina and nearby Cavite developments. For updated per-project availability, I can connect you with an agent.';
                fallback.quickReplies = isTagalog
                    ? ['Price list', 'Mag-schedule ng visit', 'Kausap ng agent']
                    : ['Price list', 'Schedule a visit', 'Contact an agent'];
                fallback.gmail = false;
                return fallback;
            }

            if (asksGreeting) {
                fallback.reply = isTagalog
                    ? 'Hello! Welcome sa **Inner SPARC Realty Services**. Puwede kitang tulungan sa properties, payment options, site tripping, at contact details.'
                    : 'Hello! Welcome to **Inner SPARC Realty Services**. I can help with properties, payment options, site tripping, and contact details.';
                fallback.quickReplies = isTagalog
                    ? ['Available properties', 'Payment options', 'Mag-schedule ng visit']
                    : ['Available properties', 'Payment options', 'Schedule a visit'];
                return fallback;
            }

            if (asksThanks) {
                fallback.reply = isTagalog
                    ? 'Walang anuman. Kung may iba ka pang tanong, ready akong tumulong.'
                    : 'You are welcome. If you have more questions, I am ready to help.';
                fallback.quickReplies = isTagalog
                    ? ['Business hours', 'Lokasyon', 'Kausap ng agent']
                    : ['Business hours', 'Location', 'Contact an agent'];
                fallback.gmail = false;
                return fallback;
            }

            if (asksWhatIsSparc) {
                fallback.reply = isTagalog
                    ? 'Ang **Inner SPARC** ay platform na tumutulong sa new real estate agents para ma-complete ang onboarding requirements step by step.'
                    : '**Inner SPARC** is a platform that helps new real estate agents complete onboarding requirements step by step.';
                fallback.quickReplies = isTagalog
                    ? ['Paano gumawa ng account?', 'Required documents', 'Paano i-check ang progress?']
                    : ['How to create an account?', 'Required documents', 'How to check progress?'];
                return fallback;
            }

            if (asksCreateAccount) {
                fallback.reply = isTagalog
                    ? 'I-click ang **Create Account** sa homepage, punan ang details, at i-submit ang form para makapag-register.'
                    : 'Click **Create Account** on the homepage, fill in your details, and submit the form to register.';
                fallback.quickReplies = isTagalog
                    ? ['Email verification', 'Hindi makapag-login', 'Required documents']
                    : ['Email verification', 'Can\'t log in', 'Required documents'];
                return fallback;
            }

            if (asksVerifyEmail) {
                fallback.reply = isTagalog
                    ? 'Pagkatapos mag-register, may verification code na ipapadala sa email mo. I-enter ang code sa verification page para magpatuloy.'
                    : 'After registering, a verification code is sent to your email. Enter that code on the verification page to continue.';
                fallback.quickReplies = isTagalog
                    ? ['Walang verification code', 'Hindi makapag-login', 'Forgot password']
                    : ['Did not receive code', 'Can\'t log in', 'Forgot password'];
                return fallback;
            }

            if (asksForgotPassword) {
                fallback.reply = isTagalog
                    ? 'I-click ang **Forgot Password** sa login page at sundan ang instructions para ma-reset ang password mo.'
                    : 'Click **Forgot Password** on the login page and follow the instructions to reset your password.';
                fallback.quickReplies = isTagalog
                    ? ['Hindi makapag-login', 'Email verification', 'Contact support']
                    : ['Can\'t log in', 'Email verification', 'Contact support'];
                return fallback;
            }

            if (asksRequiredDocs) {
                fallback.reply = isTagalog
                    ? 'Kadalasan kailangan ng **valid ID**, personal information, at iba pang files depende sa onboarding step.'
                    : 'You may need a **valid ID**, personal information, and other required files depending on the onboarding step.';
                fallback.quickReplies = isTagalog
                    ? ['Paano i-check ang progress?', 'Pwede bang ituloy later?', 'Contact support']
                    : ['How to check progress?', 'Can I continue later?', 'Contact support'];
                return fallback;
            }

            if (asksProgress) {
                fallback.reply = isTagalog
                    ? 'Mag-login sa account mo at buksan ang **Dashboard** para makita ang completed at pending steps.'
                    : 'Log in to your account and open the **Dashboard** to see completed and pending steps.';
                fallback.quickReplies = isTagalog
                    ? ['Pwede bang ituloy later?', 'Required documents', 'Contact support']
                    : ['Can I continue later?', 'Required documents', 'Contact support'];
                return fallback;
            }

            if (asksNoCode) {
                fallback.reply = isTagalog
                    ? 'I-check muna ang spam folder. Kapag wala pa rin, i-click ang **Resend Code** sa verification page.'
                    : 'Check your spam folder first. If it is still not there, click **Resend Code** on the verification page.';
                fallback.quickReplies = isTagalog
                    ? ['Email verification', 'Hindi makapag-login', 'Contact support']
                    : ['Email verification', 'Can\'t log in', 'Contact support'];
                return fallback;
            }

            if (asksCantLogin) {
                fallback.reply = isTagalog
                    ? 'Siguraduhing tama ang email at password at verified ang account mo. Pwede mo ring i-reset ang password kung kailangan.'
                    : 'Make sure your email and password are correct and your account is verified. You can also reset your password if needed.';
                fallback.quickReplies = isTagalog
                    ? ['Forgot password', 'Email verification', 'Contact support']
                    : ['Forgot password', 'Email verification', 'Contact support'];
                return fallback;
            }

            if (asksContinueLater) {
                fallback.reply = isTagalog
                    ? 'Oo. Naka-save ang progress mo, kaya pwede kang mag-login anytime at ituloy ang application mo.'
                    : 'Yes. Your progress is saved, so you can log in anytime and continue your application.';
                fallback.quickReplies = isTagalog
                    ? ['Paano i-check ang progress?', 'Required documents', 'Contact support']
                    : ['How to check progress?', 'Required documents', 'Contact support'];
                return fallback;
            }

            if (asksSupport) {
                fallback.reply = isTagalog
                    ? 'Pumunta sa **Contact Us** section ng website o gamitin ang chatbot para i-send ang concern mo sa support team.'
                    : 'Go to the **Contact Us** section on the website or use this chatbot to send your concern to support.';
                fallback.quickReplies = isTagalog
                    ? ['Contact numbers', 'Business hours', 'Lokasyon']
                    : ['Contact numbers', 'Business hours', 'Location'];
                return fallback;
            }

            if (asksContactAgent) {
                fallback.reply = isTagalog
                    ? 'Sige, iko-connect kita sa agent support. I-click ang button sa ibaba para makapag-send agad ng message sa team.'
                    : 'Sure, I can connect you with agent support. Click the button below to send your message directly to our team.';
                fallback.quickReplies = isTagalog
                    ? ['Contact numbers', 'Mag-schedule ng visit', 'Business hours']
                    : ['Contact numbers', 'Schedule a visit', 'Business hours'];
                fallback.gmail = true;
                fallback.gmailSubject = 'Agent Support Request - Inner SPARC Realty';
                fallback.gmailBody = 'Hi Inner SPARC team,\n\nI would like to speak with an agent regarding:\n\n';
                return fallback;
            }

            if (asksLocation) {
                fallback.reply = isTagalog
                    ? 'Ang office namin ay nasa **Blk 26 Lot 4 Phase 3, Avida Residences Sta. Catalina, Brgy. Salawag, Dasmarinas, Cavite, Philippines**.'
                    : 'Our office is at **Blk 26 Lot 4 Phase 3, Avida Residences Sta. Catalina, Brgy. Salawag, Dasmarinas, Cavite, Philippines**.';
                fallback.quickReplies = isTagalog
                    ? ['Business hours', 'Contact numbers', 'Mag-schedule ng visit']
                    : ['Business hours', 'Contact numbers', 'Schedule a visit'];
                return fallback;
            }

            if (asksContact) {
                fallback.reply = isTagalog
                    ? 'Maaari ninyo kaming tawagan sa **(046) 458-0706**, **0917-853-4875 (Globe/TM)**, **0999-994-3304 (Smart/T&T)**, o mag-email sa **innersparcrealtyservices@gmail.com**.'
                    : 'You can contact us at **(046) 458-0706**, **0917-853-4875 (Globe/TM)**, **0999-994-3304 (Smart/T&T)**, or email **innersparcrealtyservices@gmail.com**.';
                fallback.quickReplies = isTagalog
                    ? ['Business hours', 'Lokasyon', 'Mag-schedule ng visit']
                    : ['Business hours', 'Location', 'Schedule a visit'];
                // Gmail CTA should appear for contact-number intent.
                fallback.gmail = asksContactNumber || asksContactAgent;
                return fallback;
            }

            if (asksVisit) {
                fallback.reply = isTagalog
                    ? 'Oo, puwede tayong mag-arrange ng **site tripping by appointment**. I-send mo lang preferred date/time at property type mo, tapos iko-confirm ng team namin.'
                    : 'Yes, we can arrange **site tripping by appointment**. Send your preferred date/time and property type, then our team will confirm.';
                fallback.quickReplies = isTagalog
                    ? ['House and lot options', 'Business hours', 'Kausap ng agent']
                    : ['House and lot options', 'Business hours', 'Contact an agent'];
                fallback.gmail = true;
                fallback.gmailSubject = 'Site Tripping Request - Inner SPARC Realty';
                fallback.gmailBody = 'Hi Inner SPARC team,\n\nI want to schedule a site tripping.\nPreferred date/time:\nProperty type:\nBudget range:\n\nThank you.';
                return fallback;
            }

            if (asksHours) {
                fallback.reply = isTagalog
                    ? 'Office hours namin: **Monday to Sunday, 9:00 AM - 5:00 PM**. Kung gusto mo, puwede akong gumawa ng message draft para ma-confirm agad sa team.'
                    : 'Our office hours are **Monday to Sunday, 9:00 AM - 5:00 PM**. If you want, I can prepare a message draft so our team can confirm quickly.';
                fallback.quickReplies = isTagalog
                    ? ['Lokasyon', 'Contact numbers', 'Mag-schedule ng visit']
                    : ['Location', 'Contact numbers', 'Schedule a visit'];
                return fallback;
            }

            if (asksPrice) {
                fallback.reply = isTagalog
                    ? 'Para sa exact prices at availability, mas okay na i-confirm sa agent para updated at accurate. May flexible terms, in-house financing, at bank loan options din kami.'
                    : 'For exact prices and availability, it is best to confirm with our agent so details stay updated and accurate. We also offer flexible terms, in-house financing, and bank loan options.';
                fallback.quickReplies = isTagalog
                    ? ['Kausap ng agent', 'Mag-schedule ng visit', 'Payment options']
                    : ['Contact an agent', 'Schedule a visit', 'Payment options'];
                fallback.gmail = false;
                fallback.gmailSubject = 'Price List Request - Inner SPARC Realty';
                fallback.gmailBody = 'Hi Inner SPARC team,\n\nPlease send me the latest price list and payment terms for:\nProperty type:\nPreferred area/project:\nBudget range:\n\nThank you.';
                return fallback;
            }

            if (asksProperty) {
                fallback.reply = isTagalog
                    ? 'May available kaming **house and lot, townhouse, at condo units** sa Avida Residences Sta. Catalina at nearby Cavite developments. Para sa current availability, puwede kitang i-connect sa agent.'
                    : 'We offer **house and lot, townhouse, and condo units** in Avida Residences Sta. Catalina and nearby Cavite developments. For current availability, I can connect you with an agent.';
                fallback.quickReplies = isTagalog
                    ? ['Price list', 'Mag-schedule ng visit', 'Kausap ng agent']
                    : ['Price list', 'Schedule a visit', 'Contact an agent'];
                fallback.gmail = false;
                fallback.gmailSubject = 'Property Availability Inquiry - Inner SPARC Realty';
                fallback.gmailBody = 'Hi Inner SPARC team,\n\nI am interested in available properties.\nProperty type:\nPreferred location/project:\nBudget range:\n\nThank you.';
                return fallback;
            }

            var hasKnownIntent = asksGreeting || asksThanks || asksWhatIsSparc || asksCreateAccount || asksVerifyEmail || asksForgotPassword || asksRequiredDocs || asksProgress || asksNoCode || asksCantLogin || asksContinueLater || asksSupport || asksHours || asksLocation || asksContact || asksContactAgent || asksVisit || asksPrice || asksProperty;
            var looksComplex = text.length > 140 && !hasKnownIntent;
            if (asksUnrelated || looksComplex) {
                fallback.reply = isTagalog
                    ? 'Mukhang medyo complex o hindi real-estate related ang tanong. Para accurate at mabilis, mas mainam na **makipag-usap sa agent** para matulungan ka nang maayos.'
                    : 'That looks complex or outside our real estate scope. For accurate help, it is best to **contact an agent** so they can assist you properly.';
                fallback.quickReplies = isTagalog
                    ? ['Kausap ng agent', 'Contact numbers', 'Mag-schedule ng visit']
                    : ['Contact an agent', 'Contact numbers', 'Schedule a visit'];
                fallback.gmail = false;
                return fallback;
            }

            return fallback;
        }

        function openChatbot() {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            setBodyLock(true);

            if (!initialized) {
                initialized = true;
                appendBotMessage(
                    'Hi there! Welcome to Inner SPARC Realty Services. Ask me about properties, payment options, site trippings, or direct contact details.',
                    false,
                    false,
                    '',
                    ''
                );
                setQuickReplies(['Available properties', 'Pricing and payment', 'Schedule a visit']);
            }

            window.setTimeout(function () {
                input.focus();
            }, 200);
        }

        function closeChatbot() {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            setBodyLock(false);
        }

        function parseClaudeJson(rawText) {
            var clean = String(rawText || '')
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/```$/i, '')
                .trim();

            try {
                return JSON.parse(clean);
            } catch (error) {
                return {
                    reply: clean || 'I could not parse that response. Please try again.',
                    quickReplies: ['Talk to an agent', 'Business hours', 'Location'],
                    gmail: false,
                    gmailSubject: '',
                    gmailBody: ''
                };
            }
        }

        function sendToClaude(messageText) {
            if (!messageText || busy) return;

            busy = true;
            sendBtn.disabled = true;
            appendTyping();

            history.push({ role: 'user', content: String(messageText).slice(0, MAX_MESSAGE_LENGTH) });
            if (history.length > MAX_HISTORY_MESSAGES) {
                history = history.slice(-MAX_HISTORY_MESSAGES);
            }
            window.setTimeout(function () {
                removeTyping();
                var fallback = localFallbackReply(messageText);
                history.push({ role: 'assistant', content: fallback.reply || '' });
                appendBotMessage(
                    fallback.reply,
                    false,
                    fallback.gmail,
                    fallback.gmailSubject,
                    fallback.gmailBody
                );
                setQuickReplies(fallback.quickReplies);
                busy = false;
                sendBtn.disabled = false;
                input.focus();
            }, 280);
        }

        function sendCurrentInput() {
            var text = input.value.trim();
            if (!text || busy) return;
            input.value = '';
            quickReplies.innerHTML = '';
            appendUserMessage(text);
            sendToClaude(text);
        }

        trigger.addEventListener('click', openChatbot);
        closeBtn.addEventListener('click', closeChatbot);
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeChatbot();
        });
        sendBtn.addEventListener('click', sendCurrentInput);

        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendCurrentInput();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
                closeChatbot();
            }
        });
    }

    function initTemplate2Admin() {
        var accountSearchInput = document.getElementById('accountSearchInput');
        var roleFilter = document.getElementById('roleFilter');
        var statusFilter = document.getElementById('statusFilter');
        var dateFilter = document.getElementById('dateFilter');
        var accountsTableBody = document.getElementById('accountsTableBody');

        if (!accountsTableBody) return;

        function filterAccountsTable() {
            if (!accountsTableBody) return;

            var searchQuery = (accountSearchInput ? accountSearchInput.value.trim().toLowerCase() : '');
            var selectedRole = (roleFilter ? roleFilter.value : '');
            var selectedStatus = (statusFilter ? statusFilter.value : '');
            var selectedDate = (dateFilter ? dateFilter.value : '');

            var rows = accountsTableBody.querySelectorAll('tr');
            var now = new Date();

            rows.forEach(function (row) {
                var accountId = row.querySelector('td:nth-child(2)').textContent.trim().toLowerCase();
                var name = row.querySelector('td:nth-child(3)').textContent.trim().toLowerCase();
                var email = row.querySelector('td:nth-child(4)').textContent.trim().toLowerCase();
                var roleCell = row.querySelector('td:nth-child(6)').textContent.trim();
                var statusCell = row.querySelector('td:nth-child(7)').textContent.trim();
                var createdDateText = row.querySelector('td:nth-child(8)').textContent.trim();

                // Check search query
                var matchesSearch = !searchQuery || 
                    accountId.indexOf(searchQuery) !== -1 || 
                    name.indexOf(searchQuery) !== -1 || 
                    email.indexOf(searchQuery) !== -1;

                // Check role filter
                var matchesRole = !selectedRole || roleCell === selectedRole;

                // Check status filter
                var matchesStatus = !selectedStatus || statusCell === selectedStatus;

                // Check date filter
                var matchesDate = true;
                if (selectedDate) {
                    try {
                        var createdDate = new Date(createdDateText);
                        var daysAgo = parseInt(selectedDate, 10);
                        var cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
                        matchesDate = createdDate >= cutoffDate;
                    } catch (e) {
                        matchesDate = true; // If date parsing fails, show the row
                    }
                }

                // Show or hide row based on all filters
                row.style.display = (matchesSearch && matchesRole && matchesStatus && matchesDate) ? '' : 'none';
            });
        }

        // Expose resetAccountFilters globally
        window.resetAccountFilters = function () {
            if (accountSearchInput) accountSearchInput.value = '';
            if (roleFilter) roleFilter.value = '';
            if (statusFilter) statusFilter.value = '';
            if (dateFilter) dateFilter.value = '';
            filterAccountsTable();
        };

        // Add event listeners for dynamic filtering
        if (accountSearchInput) {
            accountSearchInput.addEventListener('input', filterAccountsTable);
        }
        if (roleFilter) {
            roleFilter.addEventListener('change', filterAccountsTable);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', filterAccountsTable);
        }
        if (dateFilter) {
            dateFilter.addEventListener('change', filterAccountsTable);
        }
    }

    function initApplicationsSearch() {
        // Get the dashboard section with applications table
        var dashboardSection = document.querySelector('.tpl2-section[data-section="dashboard"]');
        if (!dashboardSection) return;

        var filterBar = dashboardSection.querySelector('.tpl2-filter-bar');
        if (!filterBar) return;

        // Get the search input and filter selects from the filter bar
        var searchInput = filterBar.querySelector('.tpl2-search-input');
        var statusFilter = filterBar.querySelectorAll('.tpl2-filter-select')[0];
        var dateFilter = filterBar.querySelectorAll('.tpl2-filter-select')[1];
        var resetBtn = filterBar.querySelector('.tpl2-filter-reset-btn');

        // Get the applications table
        var applicationsTable = dashboardSection.querySelector('.tpl2-table tbody');
        if (!applicationsTable) return;

        function filterApplicationsTable() {
            var searchQuery = (searchInput ? searchInput.value.trim().toLowerCase() : '');
            var selectedStatus = (statusFilter ? statusFilter.value : '');
            var selectedDate = (dateFilter ? dateFilter.value : '');

            var rows = applicationsTable.querySelectorAll('tr');
            var now = new Date();

            rows.forEach(function (row) {
                var appId = row.querySelector('td:nth-child(2)').textContent.trim().toLowerCase();
                var name = row.querySelector('td:nth-child(3)').textContent.trim().toLowerCase();
                var email = row.querySelector('td:nth-child(4)').textContent.trim().toLowerCase();
                var submissionDate = row.querySelector('td:nth-child(5)').textContent.trim();
                var statusCell = row.querySelector('td:nth-child(6)').textContent.trim();

                // Check search query
                var matchesSearch = !searchQuery || 
                    appId.indexOf(searchQuery) !== -1 || 
                    name.indexOf(searchQuery) !== -1 || 
                    email.indexOf(searchQuery) !== -1;

                // Check status filter
                var matchesStatus = !selectedStatus || selectedStatus === 'All Status' || statusCell === selectedStatus;

                // Check date filter
                var matchesDate = true;
                if (selectedDate && selectedDate !== 'All Submission Dates') {
                    try {
                        var submittedDate = new Date(submissionDate);
                        var daysAgo = 30; // Default
                        if (selectedDate === 'Last 7 Days') daysAgo = 7;
                        if (selectedDate === 'Last 24 Hours') daysAgo = 1;
                        
                        var cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
                        matchesDate = submittedDate >= cutoffDate;
                    } catch (e) {
                        matchesDate = true;
                    }
                }

                // Show or hide row based on all filters
                row.style.display = (matchesSearch && matchesStatus && matchesDate) ? '' : 'none';
            });
        }

        // Add event listeners
        if (searchInput) {
            searchInput.addEventListener('input', filterApplicationsTable);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', filterApplicationsTable);
        }
        if (dateFilter) {
            dateFilter.addEventListener('change', filterApplicationsTable);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = 'All Status';
                if (dateFilter) dateFilter.value = 'All Submission Dates';
                filterApplicationsTable();
            });
        }
    }

    function initAgentApplicationsSearch() {
        // Get the agents section with applications table
        var agentsSection = document.querySelector('.tpl2-section[data-section="agents"]');
        if (!agentsSection) return;

        var filterBar = agentsSection.querySelector('.tpl2-filter-bar');
        if (!filterBar) return;

        // Get the search input and filter selects from the filter bar
        var searchInput = filterBar.querySelector('.tpl2-search-input');
        var statusFilter = filterBar.querySelectorAll('.tpl2-filter-select')[0];
        var dateFilter = filterBar.querySelectorAll('.tpl2-filter-select')[1];
        var resetBtn = filterBar.querySelector('.tpl2-filter-reset-btn');

        // Get the applications table
        var applicationsTable = agentsSection.querySelector('.tpl2-table tbody');
        if (!applicationsTable) return;

        function filterAgentApplicationsTable() {
            var searchQuery = (searchInput ? searchInput.value.trim().toLowerCase() : '');
            var selectedStatus = (statusFilter ? statusFilter.value : '');
            var selectedDate = (dateFilter ? dateFilter.value : '');

            var rows = applicationsTable.querySelectorAll('tr');
            var now = new Date();

            rows.forEach(function (row) {
                var appId = row.querySelector('td:nth-child(2)').textContent.trim().toLowerCase();
                var name = row.querySelector('td:nth-child(3)').textContent.trim().toLowerCase();
                var email = row.querySelector('td:nth-child(4)').textContent.trim().toLowerCase();
                var submissionDate = row.querySelector('td:nth-child(5)').textContent.trim();
                var statusCell = row.querySelector('td:nth-child(6)').textContent.trim();

                // Check search query
                var matchesSearch = !searchQuery || 
                    appId.indexOf(searchQuery) !== -1 || 
                    name.indexOf(searchQuery) !== -1 || 
                    email.indexOf(searchQuery) !== -1;

                // Check status filter
                var matchesStatus = !selectedStatus || selectedStatus === 'All Status' || statusCell === selectedStatus;

                // Check date filter
                var matchesDate = true;
                if (selectedDate && selectedDate !== 'All Submission Dates') {
                    try {
                        var submittedDate = new Date(submissionDate);
                        var daysAgo = 30; // Default
                        if (selectedDate === 'Last 7 Days') daysAgo = 7;
                        if (selectedDate === 'Last 24 Hours') daysAgo = 1;
                        
                        var cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
                        matchesDate = submittedDate >= cutoffDate;
                    } catch (e) {
                        matchesDate = true;
                    }
                }

                // Show or hide row based on all filters
                row.style.display = (matchesSearch && matchesStatus && matchesDate) ? '' : 'none';
            });
        }

        // Add event listeners
        if (searchInput) {
            searchInput.addEventListener('input', filterAgentApplicationsTable);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', filterAgentApplicationsTable);
        }
        if (dateFilter) {
            dateFilter.addEventListener('change', filterAgentApplicationsTable);
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = 'All Status';
                if (dateFilter) dateFilter.value = 'All Submission Dates';
                filterAgentApplicationsTable();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initAutoLogin();
        initSignIn();
        initSignUp();
        initVerifyDigits();
        initPasswordToggles();
        initDashboardTabs();
        initThemeToggle();
        initThemeDropdown();
        initUserMenu();
        initStepDetails();
        initStepCompletion();
        initSidebarToggle();
        initPortalLogout();
        initDashboardFaqPage();
        initScrollMotion();
        initNavScroll();
        initLandingAnchorScroll();
        initDynamicHomepage();
        initAuthModals();
        initContactForm();
        initChatbotAssistant();
        initTemplate2Admin();
        initApplicationsSearch();
        initAgentApplicationsSearch();
    });
})();
