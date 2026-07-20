let mobileNavMediaQuery = null;
const THEME_STORAGE_KEY = 'tpl2-theme';
const ACTIVE_SECTION_STORAGE_KEY = 'tpl2-active-section';
let sideProfileHideTimer = null;
const PORTAL_ADMIN_ROLE_ADMINISTRATOR = 'administrator';
const PORTAL_ADMIN_ROLE_REVIEWER = 'reviewer';
let superuserAccountsCache = [];
let activeRoleEditUserId = null;
let activePasswordUserId = null;

function getValidSectionName(sectionName) {
    const normalized = typeof sectionName === 'string' ? sectionName.trim() : '';
    if (!normalized) return '';
    return document.querySelector(`[data-section="${normalized}"]`) ? normalized : '';
}

function getSectionFromHash() {
    if (!window.location.hash || window.location.hash.length <= 1) return '';
    const rawSection = window.location.hash.slice(1);
    try {
        return decodeURIComponent(rawSection).trim();
    } catch (error) {
        return rawSection.trim();
    }
}

function getStoredActiveSectionName() {
    try {
        return (localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY) || '').trim();
    } catch (error) {
        return '';
    }
}

function setStoredActiveSectionName(sectionName) {
    try {
        localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, sectionName);
    } catch (error) {
        // Ignore storage errors and continue.
    }
}

function setLocationHashSection(sectionName) {
    if (!sectionName || typeof history.replaceState !== 'function') return;
    const nextUrl = `${window.location.pathname}${window.location.search}#${encodeURIComponent(sectionName)}`;
    history.replaceState(null, '', nextUrl);
}

function resolveInitialSectionName() {
    const hashSection = getValidSectionName(getSectionFromHash());
    if (hashSection) return hashSection;

    const storedSection = getValidSectionName(getStoredActiveSectionName());
    if (storedSection) return storedSection;

    const activeSection = document.querySelector('[data-section].active');
    const activeSectionName = activeSection ? getValidSectionName(activeSection.getAttribute('data-section')) : '';
    if (activeSectionName) return activeSectionName;

    return getValidSectionName('dashboard') || 'dashboard';
}

function getTpl2Root() {
    return document.getElementById('tpl2Root');
}

function getCurrentAdminRole() {
    const root = getTpl2Root();
    const role = root ? String(root.getAttribute('data-current-admin-role') || '').trim().toLowerCase() : '';
    return role === PORTAL_ADMIN_ROLE_REVIEWER ? PORTAL_ADMIN_ROLE_REVIEWER : PORTAL_ADMIN_ROLE_ADMINISTRATOR;
}

function currentUserIsReviewer() {
    return getCurrentAdminRole() === PORTAL_ADMIN_ROLE_REVIEWER;
}

function getCsrfTokenForRequests() {
    if (typeof window.getCSRFToken === 'function') {
        return window.getCSRFToken();
    }
    const cookieMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
}

function showPortalToast(message, tone) {
    if (!message) return;
    if (typeof window.showWorkflowToast === 'function') {
        window.showWorkflowToast(message, tone || 'success');
        return;
    }
    if (tone === 'error') {
        window.alert(message);
    } else {
        window.console.log(message);
    }
}

function syncBodyModalLockIfAvailable() {
    if (typeof window.syncModalBodyLock === 'function') {
        window.syncModalBodyLock();
    }
}

function applyReviewerRestrictions() {
    if (!currentUserIsReviewer()) return;
    document.querySelectorAll('[data-admin-only="true"]').forEach((el) => {
        el.setAttribute('hidden', '');
        if (el.matches('button, a, input, select, textarea')) {
            el.setAttribute('disabled', 'disabled');
        }
    });
}

function getPreferredThemeName() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch (error) {
        // Ignore storage errors and use light as default.
    }

    // Default theme should be light.
    return 'light';
}

function applyThemeName(themeName) {
    const name = themeName === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', name);

    const themeBtn = document.getElementById('tpl2Theme');
    if (themeBtn) {
        const isDark = name === 'dark';
        themeBtn.setAttribute('aria-pressed', String(isDark));
        themeBtn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        themeBtn.setAttribute('aria-label', isDark ? 'Enable light mode' : 'Enable dark mode');
    }
}

function toggleThemePreference() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyThemeName(next);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
        // Ignore storage errors; theme still applies for this session.
    }
}

function getCurrentUserLabel() {
    const userEl = document.getElementById('tpl2SideUserName');
    return (userEl && userEl.textContent ? userEl.textContent : 'Super User').trim();
}

function syncSidebarProfileTooltips(collapsed) {
    const showTitles = Boolean(collapsed);
    const userLabel = getCurrentUserLabel();

    const profileToggle = document.getElementById('tpl2SideProfileToggle');
    const sideAvatar = document.getElementById('tpl2SideAvatar');
    const accountSettingsBtn = document.getElementById('tpl2AccountSettings');
    const signOutBtn = document.getElementById('tpl2SignOut');
    const navItems = document.querySelectorAll('.tpl2-nav-item');

    navItems.forEach((item) => {
        const labelEl = item.querySelector('span:last-child');
        const label = labelEl ? labelEl.textContent.trim() : '';
        if (!label) return;
        if (showTitles) {
            item.setAttribute('title', label);
        } else {
            item.removeAttribute('title');
        }
    });

    if (sideAvatar) {
        if (showTitles) {
            sideAvatar.setAttribute('title', userLabel);
            sideAvatar.setAttribute('aria-label', userLabel);
        } else {
            sideAvatar.removeAttribute('title');
            sideAvatar.removeAttribute('aria-label');
        }
    }

    if (profileToggle) {
        if (showTitles) {
            profileToggle.setAttribute('title', `Profile actions for ${userLabel}`);
        } else {
            profileToggle.removeAttribute('title');
        }
    }

    [accountSettingsBtn, signOutBtn].forEach((button) => {
        if (!button) return;
        const label = button.getAttribute('aria-label') || button.textContent || '';
        if (showTitles) {
            button.setAttribute('title', label.trim());
        } else {
            button.removeAttribute('title');
        }
    });
}

function setSideProfileExpanded(expanded) {
    const isExpanded = Boolean(expanded);
    const sideProfile = document.getElementById('tpl2SideProfile');
    const profileToggle = document.getElementById('tpl2SideProfileToggle');
    const profileActions = document.getElementById('tpl2SideProfileActions');
    if (!profileToggle || !profileActions) return;

    if (sideProfileHideTimer) {
        window.clearTimeout(sideProfileHideTimer);
        sideProfileHideTimer = null;
    }

    const actionButtons = profileActions.querySelectorAll('.tpl2-side-profile-action');
    actionButtons.forEach((button) => {
        button.tabIndex = isExpanded ? 0 : -1;
    });

    if (isExpanded) {
        profileActions.hidden = false;
        profileActions.classList.remove('is-collapsed');
        profileActions.setAttribute('aria-hidden', 'false');
    } else {
        profileActions.classList.add('is-collapsed');
        profileActions.setAttribute('aria-hidden', 'true');
        sideProfileHideTimer = window.setTimeout(() => {
            if (profileActions.classList.contains('is-collapsed')) {
                profileActions.hidden = true;
            }
        }, 210);
    }

    if (sideProfile) {
        sideProfile.classList.toggle('open', isExpanded);
    }

    profileToggle.setAttribute('aria-expanded', String(isExpanded));
    profileToggle.setAttribute('title', isExpanded ? 'Hide profile actions' : 'Show profile actions');
}

function setSidebarCollapsed(collapsed) {
    const app = document.querySelector('.tpl2-app');
    const sideToggleBtn = document.getElementById('tpl2SideToggle');
    if (!app || !sideToggleBtn) return;

    if (isMobileViewport()) {
        app.classList.remove('sidebar-collapsed');
        const isOpen = document.getElementById('tpl2Root')?.classList.contains('sidebar-open') || false;
        sideToggleBtn.setAttribute('aria-expanded', String(isOpen));
        sideToggleBtn.setAttribute('aria-label', isOpen ? 'Close sidebar menu' : 'Open sidebar menu');
        syncSidebarProfileTooltips(false);
        setSideProfileExpanded(false);
        return;
    }

    const shouldCollapse = Boolean(collapsed);
    app.classList.toggle('sidebar-collapsed', shouldCollapse);
    sideToggleBtn.setAttribute('aria-expanded', String(!shouldCollapse));
    sideToggleBtn.setAttribute('aria-label', shouldCollapse ? 'Expand sidebar' : 'Collapse sidebar');

    if (shouldCollapse) {
        setSideProfileExpanded(false);
    }

    syncSidebarProfileTooltips(shouldCollapse);
}

function isMobileViewport() {
    return mobileNavMediaQuery ? mobileNavMediaQuery.matches : window.innerWidth <= 1024;
}

function openMobileSidebar() {
    if (!isMobileViewport()) return;

    const root = document.getElementById('tpl2Root');
    const menuButton = document.getElementById('tpl2MenuToggle');
    const sideToggleBtn = document.getElementById('tpl2SideToggle');
    const sidebar = document.getElementById('tpl2Sidebar');
    if (!root) return;

    root.classList.add('sidebar-open');
    document.body.classList.add('tpl2-no-scroll');
    if (sidebar) {
        sidebar.setAttribute('aria-hidden', 'false');
    }
    if (menuButton) {
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', 'Close sidebar menu');
    }
    if (sideToggleBtn) {
        sideToggleBtn.setAttribute('aria-expanded', 'true');
        sideToggleBtn.setAttribute('aria-label', 'Close sidebar menu');
    }
}

function closeMobileSidebar() {
    const root = document.getElementById('tpl2Root');
    const menuButton = document.getElementById('tpl2MenuToggle');
    const sideToggleBtn = document.getElementById('tpl2SideToggle');
    const sidebar = document.getElementById('tpl2Sidebar');
    if (!root) return;

    root.classList.remove('sidebar-open');
    document.body.classList.remove('tpl2-no-scroll');
    if (sidebar) {
        sidebar.setAttribute('aria-hidden', 'true');
    }
    if (menuButton) {
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open sidebar menu');
    }
    if (sideToggleBtn) {
        sideToggleBtn.setAttribute('aria-expanded', 'false');
        sideToggleBtn.setAttribute('aria-label', 'Open sidebar menu');
    }
}

function toggleMobileSidebar() {
    const root = document.getElementById('tpl2Root');
    if (!root) return;

    if (root.classList.contains('sidebar-open')) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

function initDashboardNavigation() {
    applyThemeName(getPreferredThemeName());

    const navButtons = document.querySelectorAll('[data-nav-section]');
    navButtons.forEach(btn => {
        const section = btn.getAttribute('data-nav-section');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            switchToSection(section);

            if (isMobileViewport()) {
                closeMobileSidebar();
            }
        });
    });

    const menuButton = document.getElementById('tpl2MenuToggle');
    const sideToggleBtn = document.getElementById('tpl2SideToggle');
    const themeBtn = document.getElementById('tpl2Theme');
    const profileToggle = document.getElementById('tpl2SideProfileToggle');
    const accountSettingsBtn = document.getElementById('tpl2AccountSettings');
    const signOutBtn = document.getElementById('tpl2SignOut');
    const topSignOutBtn = document.querySelector('[data-portal-logout]');
    const mobileBackdrop = document.getElementById('tpl2MobileBackdrop');

    if (menuButton) {
        menuButton.addEventListener('click', function(event) {
            event.preventDefault();
            toggleMobileSidebar();
        });
    }

    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', closeMobileSidebar);
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            toggleThemePreference();
        });
    }

    if (sideToggleBtn) {
        sideToggleBtn.addEventListener('click', function () {
            if (isMobileViewport()) {
                toggleMobileSidebar();
                return;
            }
            const app = document.querySelector('.tpl2-app');
            const isCollapsed = app ? app.classList.contains('sidebar-collapsed') : false;
            setSidebarCollapsed(!isCollapsed);
        });
        setSidebarCollapsed(false);
    }

    if (profileToggle) {
        profileToggle.addEventListener('click', function () {
            const isExpanded = profileToggle.getAttribute('aria-expanded') === 'true';
            setSideProfileExpanded(!isExpanded);
        });
    }

    if (accountSettingsBtn) {
        accountSettingsBtn.addEventListener('click', function () {
            setSideProfileExpanded(false);
            switchToSection('settings');
            if (isMobileViewport()) {
                closeMobileSidebar();
            }
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', function () {
            setSideProfileExpanded(false);
            if (topSignOutBtn) {
                topSignOutBtn.click();
                return;
            }
            // Perform logout similar to portal.js logout handler
            var target = '/';
            
            // Clear stored session data
            try {
                window.localStorage.removeItem('portal_session_hint');
                window.sessionStorage.removeItem('portal_session_hint');
            } catch (e) {}
            
            // Get CSRF token from cookie
            var csrfMatch = document.cookie.match(/(?:^|; *)csrftoken=([^;]+)/);
            var csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
            
            // Call logout API
            fetch('/portal-auth/logout/', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ ok: true })
            }).then(function() {
                window.location.href = target;
            }).catch(function() {
                window.location.href = target;
            });
        });
    }

    mobileNavMediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleViewportChange = (event) => {
        if (!event.matches) {
            closeMobileSidebar();
            const sidebar = document.getElementById('tpl2Sidebar');
            if (sidebar) {
                sidebar.removeAttribute('aria-hidden');
            }
        }
        if (event.matches) {
            setSidebarCollapsed(false);
        }
    };

    if (typeof mobileNavMediaQuery.addEventListener === 'function') {
        mobileNavMediaQuery.addEventListener('change', handleViewportChange);
    } else if (typeof mobileNavMediaQuery.addListener === 'function') {
        mobileNavMediaQuery.addListener(handleViewportChange);
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (isMobileViewport()) {
                closeMobileSidebar();
            }
            setSideProfileExpanded(false);
            closeSidePanel();
        }
    });

    setSideProfileExpanded(false);
    syncSidebarProfileTooltips(false);

    const sidebar = document.getElementById('tpl2Sidebar');
    if (isMobileViewport()) {
        closeMobileSidebar();
    } else if (sidebar) {
        sidebar.removeAttribute('aria-hidden');
    }

    switchToSection(resolveInitialSectionName(), {
        scrollToTop: false,
        persistState: true
    });
    initTrainingDetailToggle();
    initTrainingReminderButtons();
}

function initTrainingReminderButtons() {
    document.addEventListener('click', function (event) {
        const button = event.target.closest('[data-training-reminder-send]');
        if (!button) return;

        const userId = button.getAttribute('data-training-reminder-send');
        if (!userId) return;

        fetch('/portal-admin/send-training-reminder/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfTokenForRequests(),
            },
            body: JSON.stringify({ user_id: userId }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                } else {
                    alert('Unable to send reminder: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(err => {
                alert('Unable to send reminder: ' + err.message);
            });
    });
}

function initTrainingDetailToggle() {
    document.addEventListener('click', function (event) {
        const toggle = event.target.closest('[data-training-detail-toggle]');
        if (!toggle) return;
        const agentId = String(toggle.getAttribute('data-training-detail-toggle') || '').trim();
        if (!agentId) return;

        const detailRow = document.getElementById('trainingDetailRow-' + agentId);
        if (!detailRow) return;

        const isHidden = detailRow.hidden;
        detailRow.hidden = !isHidden;
        toggle.textContent = isHidden ? 'Hide breakdown' : 'View breakdown';
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardNavigation);
} else {
    initDashboardNavigation();
}

function switchToSection(sectionName, options) {
    const navOptions = options || {};
    const shouldScrollToTop = navOptions.scrollToTop !== false;
    const shouldPersistState = navOptions.persistState !== false;

    const normalizedRequestedSection = getValidSectionName(sectionName);
    sectionName = normalizedRequestedSection || getValidSectionName('dashboard') || 'dashboard';

    const requestedButton = document.querySelector(`[data-nav-section="${sectionName}"]`);
    const requestedSection = document.querySelector(`[data-section="${sectionName}"]`);
    const isRestrictedSection =
        (requestedButton && requestedButton.getAttribute('data-admin-only') === 'true') ||
        (requestedSection && requestedSection.getAttribute('data-admin-only') === 'true');

    if (currentUserIsReviewer() && isRestrictedSection) {
        showPortalToast('Administrator privileges are required for this section.', 'warning');
        sectionName = 'agents';
    }

    // Update nav items
    document.querySelectorAll('[data-nav-section]').forEach(item => {
        item.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-nav-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update sections
    document.querySelectorAll('[data-section]').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.querySelector(`[data-section="${sectionName}"]`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    if (shouldPersistState) {
        setStoredActiveSectionName(sectionName);
        setLocationHashSection(sectionName);
    }
    
    // Update header
    const headerTitles = {
        dashboard: {
            title: 'Super User Dashboard',
            subtitle: 'Monitor platform operations and critical tasks.'
        },
        training: {
            title: 'Agent Training Performance',
            subtitle: 'Track agent training progress across videos and modules.'
        },
        agents: {
            title: 'Agents Application Management',
            subtitle: 'Review and manage agent onboarding applications.'
        },
        accounts: {
            title: 'Account Management',
            subtitle: 'Manage user accounts, roles, and permissions.'
        },
        settings: {
            title: 'System Settings & Administration',
            subtitle: 'Configure system rules, security settings, and monitoring.'
        }
    };
    
    if (headerTitles[sectionName]) {
        document.getElementById('header-title').textContent = headerTitles[sectionName].title;
        document.getElementById('header-subtitle').textContent = headerTitles[sectionName].subtitle;
    }
    
    // Scroll to top
    const content = document.querySelector('.tpl2-content');
    if (shouldScrollToTop && content) {
        content.scrollTop = 0;
    }
    
}

// Side panel functionality
function openSidePanel(appId, name, email, status) {
    document.getElementById('panelAppId').textContent = appId;
    document.getElementById('panelName').textContent = name;
    document.getElementById('panelEmail').textContent = email;
    document.getElementById('panelStatus').textContent = status;
    document.getElementById('sidePanel').classList.add('active');
}

function closeSidePanel() {
    document.getElementById('sidePanel').classList.remove('active');
}

// Close side panel when clicking outside
document.addEventListener('click', function(event) {
    const sidePanel = document.getElementById('sidePanel');
    if (event.target === sidePanel) {
        closeSidePanel();
    }
});

// Toggle settings
function toggleSetting(event) {
    event.currentTarget.classList.toggle('active');
}

// Bulk actions - Select all checkboxes
document.addEventListener('DOMContentLoaded', function() {
    const masterCheckbox = document.querySelector('th input[type="checkbox"]');
    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', function() {
            document.querySelectorAll('tbody input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
});

// Notification center behavior
document.addEventListener('DOMContentLoaded', function () {
    const root = document.getElementById('tpl2Root');
    const notificationBell = document.getElementById('tpl2NotificationBell');
    const notificationPanel = document.getElementById('tpl2NotificationPanel');
    const notificationList = document.getElementById('tpl2NotificationList');
    const notificationBadge = document.getElementById('tpl2NotificationBadge');
    const refreshBtn = document.getElementById('tpl2NotificationRefresh');

    if (!root || !notificationBell || !notificationPanel || !notificationList) return;
    if (notificationBell.dataset.notificationsInit === 'true') return;
    notificationBell.dataset.notificationsInit = 'true';

    const notificationsApiUrl = root.getAttribute('data-notifications-api-url') || '';
    let isOpen = false;
    let isFetching = false;

    // Storage for clicked/viewed notifications
    const CLICKED_NOTIFICATIONS_KEY = 'tpl2-clicked-notifications';

    function generateNotificationId(item) {
        // Create unique ID based on notification content
        const kind = String(item.kind || '');
        const title = String(item.title || '');
        const userId = String(item.user_id || '');
        const appId = String(item.app_id || '');
        const stepKey = String(item.step_key || '');
        const combined = `${kind}|${title}|${userId}|${appId}|${stepKey}`;
        
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `notif-${Math.abs(hash)}`;
    }

    function getClickedNotifications() {
        try {
            const stored = localStorage.getItem(CLICKED_NOTIFICATIONS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    function saveClickedNotifications(ids) {
        try {
            localStorage.setItem(CLICKED_NOTIFICATIONS_KEY, JSON.stringify(ids));
        } catch (error) {
            // Ignore storage errors
        }
    }

    function markAsClicked(notificationId) {
        const clicked = getClickedNotifications();
        if (!clicked.includes(notificationId)) {
            clicked.push(notificationId);
            saveClickedNotifications(clicked);
        }
    }

    function isNotificationClicked(notificationId) {
        const clicked = getClickedNotifications();
        return clicked.includes(notificationId);
    }

    function filterClickedNotifications(items) {
        if (!Array.isArray(items)) return [];
        return items.filter((item) => {
            const id = generateNotificationId(item);
            return !isNotificationClicked(id);
        });
    }

    function getNotificationIcon(kind) {
        if (kind === 'registration') {
            return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        }
        if (kind === 'submission') {
            return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        }
        if (kind === 'log') {
            return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
        }
        if (kind === 'confirmation') {
            return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>';
        }
        if (kind === 'approval') {
            return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>';
        }
        if (kind === 'module') {
            return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    }

    function setBadgeCount(count) {
        if (!notificationBadge) return;
        const normalized = Math.max(0, Number(count) || 0);
        if (normalized <= 0) {
            notificationBadge.hidden = true;
            notificationBadge.textContent = '0';
            return;
        }
        notificationBadge.hidden = false;
        notificationBadge.textContent = normalized > 99 ? '99+' : String(normalized);
    }

    function setPanelOpen(nextOpen) {
        isOpen = Boolean(nextOpen);
        notificationPanel.classList.toggle('is-open', isOpen);
        notificationPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        notificationBell.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function renderNotifications(items) {
        if (!Array.isArray(items) || !items.length) {
            notificationList.innerHTML = '<div class="tpl2-notification-empty">No new notifications right now.</div>';
            return;
        }

        notificationList.innerHTML = items.map((item) => {
            const kind = (item && item.kind ? String(item.kind) : 'reminder').toLowerCase();
            const title = item && item.title ? item.title : 'Notification';
            const description = item && item.description ? item.description : '';
            const timestamp = item && item.timestamp ? item.timestamp : 'just now';
            const targetSection = item && item.target_section ? String(item.target_section) : '';
            const targetType = item && item.target_type ? String(item.target_type) : '';
            const appId = item && item.app_id ? String(item.app_id) : '';
            const userId = item && item.user_id != null ? String(item.user_id) : '';
            const accountId = item && item.account_id ? String(item.account_id) : '';
            const moduleNumber = item && item.module_number != null ? String(item.module_number) : '';
            const stepKey = item && item.step_key ? String(item.step_key) : '';
            const clickable = targetSection || targetType;
            const notifId = generateNotificationId(item);
            return `
                <article class="tpl2-notification-item${clickable ? ' is-clickable' : ''}" role="listitem"${clickable ? ' tabindex="0" role="button"' : ''} data-target-section="${escapeHtml(targetSection)}" data-target-type="${escapeHtml(targetType)}" data-app-id="${escapeHtml(appId)}" data-user-id="${escapeHtml(userId)}" data-account-id="${escapeHtml(accountId)}" data-module-number="${escapeHtml(moduleNumber)}" data-step-key="${escapeHtml(stepKey)}" data-notification-id="${escapeHtml(notifId)}">
                    <span class="tpl2-notification-icon ${kind}" aria-hidden="true">${getNotificationIcon(kind)}</span>
                    <div class="tpl2-notification-content">
                        <div class="tpl2-notification-title">${title}</div>
                        <div class="tpl2-notification-desc">${description}</div>
                    </div>
                    <time class="tpl2-notification-time">${timestamp}</time>
                </article>
            `;
        }).join('');
    }

    async function handleNotificationActivate(itemEl) {
        if (!itemEl) return;

        const notifId = itemEl.getAttribute('data-notification-id');
        if (notifId) {
            markAsClicked(notifId);
            // Remove the notification from DOM immediately
            itemEl.remove();
            
            // Update badge count
            const visibleItems = notificationList.querySelectorAll('.tpl2-notification-item').length;
            setBadgeCount(visibleItems);
            
            // Show empty state if no items left
            if (visibleItems === 0) {
                notificationList.innerHTML = '<div class="tpl2-notification-empty">No new notifications right now.</div>';
            }
        }

        const targetSection = String(itemEl.getAttribute('data-target-section') || '').trim();
        const targetType = String(itemEl.getAttribute('data-target-type') || '').trim();
        const appId = String(itemEl.getAttribute('data-app-id') || '').trim();
        const userId = String(itemEl.getAttribute('data-user-id') || '').trim();
        const accountId = String(itemEl.getAttribute('data-account-id') || '').trim();
        const moduleNumber = String(itemEl.getAttribute('data-module-number') || '').trim();

        if (targetSection) {
            switchToSection(targetSection, { persistState: true });
        }

        if (targetType === 'account' && accountId) {
            if (!allAccounts.length) {
                await fetchAccountDataFromBackend();
            }
            const account = allAccounts.find((entry) => String(entry.account_id || '') === accountId);
            if (account) {
                switchToSection('accounts', { persistState: true });
                viewAccountProfile(account.account_id, itemEl);
                return;
            }
        }

        if (targetType === 'application' && appId) {
            const row = document.querySelector(`[data-app-id="${CSS.escape(appId)}"]`);
            if (row) {
                const name = row.getAttribute('data-name') || '';
                const email = row.getAttribute('data-email') || '';
                const resolvedUserId = row.getAttribute('data-user-id') || userId || '';
                const stepKey = itemEl.getAttribute('data-step-key') || null;
                switchToSection('agents', { persistState: true });
                openApplicationReviewModal(appId, resolvedUserId, name, email, stepKey);
                return;
            }
        }

        if (targetType === 'module' && appId && moduleNumber) {
            switchToSection('agents', { persistState: true });
            openModuleHighlightView(appId, moduleNumber, itemEl);
            return;
        }
    }

    function fetchNotifications() {
        if (!notificationsApiUrl || isFetching) return;
        isFetching = true;
        notificationList.innerHTML = '<div class="tpl2-notification-empty">Loading notifications...</div>';

        fetch(notificationsApiUrl, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Unable to load notifications.');
                }
                return response.json();
            })
            .then((payload) => {
                const allNotifications = payload && Array.isArray(payload.notifications) ? payload.notifications : [];
                // Filter out clicked notifications
                const notifications = filterClickedNotifications(allNotifications);
                renderNotifications(notifications);
                setBadgeCount(notifications.length);
            })
            .catch(() => {
                notificationList.innerHTML = '<div class="tpl2-notification-empty">Unable to load notifications right now.</div>';
            })
            .finally(() => {
                isFetching = false;
            });
    }

    notificationBell.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const nextState = !isOpen;
        setPanelOpen(nextState);
        if (nextState) {
            fetchNotifications();
        }
    });

    notificationList.addEventListener('click', function (event) {
        const itemEl = event.target.closest('.tpl2-notification-item');
        if (!itemEl) return;
        if (!itemEl.classList.contains('is-clickable')) return;
        handleNotificationActivate(itemEl);
    });

    notificationList.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const itemEl = event.target.closest('.tpl2-notification-item');
        if (!itemEl) return;
        if (!itemEl.classList.contains('is-clickable')) return;
        event.preventDefault();
        handleNotificationActivate(itemEl);
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            fetchNotifications();
        });
    }

    notificationPanel.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    document.addEventListener('click', function (event) {
        if (!isOpen) return;
        if (notificationPanel.contains(event.target) || notificationBell.contains(event.target)) return;
        setPanelOpen(false);
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && isOpen) {
            setPanelOpen(false);
        }
    });

    fetchNotifications();
});

// ==================== MODULE NOTIFICATION REDIRECT ====================
function openModuleHighlightView(appId, moduleNumber, triggerElement) {
    if (!appId || !moduleNumber) return;

    // Find the application row in the table to get user details
    const row = document.querySelector(`[data-app-id="${CSS.escape(appId)}"]`);
    if (!row) {
        console.warn('Application row not found for appId:', appId);
        return;
    }

    const userId = row.getAttribute('data-user-id') || '';
    const name = row.getAttribute('data-name') || '';
    const email = row.getAttribute('data-email') || '';

    if (!userId) {
        console.warn('User ID not found for application:', appId);
        return;
    }

    // Open the application review modal
    openApplicationReviewModal(appId, userId, name, email);

    // Highlight the specific module after a short delay to ensure modal is rendered
    setTimeout(() => {
        highlightModuleCard(Number(moduleNumber));
    }, 100);
}

function highlightModuleCard(moduleNumber) {
    if (!moduleNumber) return;

    // Find all module cards
    const moduleCards = document.querySelectorAll('.tpl2-module-card');
    if (!moduleCards.length) return;

    // Remove any existing highlights
    moduleCards.forEach(card => card.classList.remove('tpl2-module-card-highlighted'));

    // Find and highlight the target module
    for (let card of moduleCards) {
        const chipText = card.querySelector('.tpl2-module-card-chip');
        if (chipText && chipText.textContent.includes(`Module ${moduleNumber}`)) {
            card.classList.add('tpl2-module-card-highlighted');
            // Scroll the card into view
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
    }
}

// Export functionality
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button');
    const csvBtn = Array.from(buttons).find(btn => btn.textContent.includes('CSV'));
    const pdfBtn = Array.from(buttons).find(btn => btn.textContent.includes('PDF'));
    
    if (csvBtn) {
        csvBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('CSV export would be generated here with all filtered results');
        });
    }
    
    if (pdfBtn) {
        pdfBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('PDF report would be generated and downloaded');
        });
    }
});

// ==================== ADD AGENT FUNCTIONALITY ====================
let nextAgentId = 3046;

function openAddAgentModal() {
    document.getElementById('addAgentModal').style.display = 'flex';
}

function closeAddAgentModal() {
    document.getElementById('addAgentModal').style.display = 'none';
    document.getElementById('addAgentForm').reset();
}

function handleAddAgentSubmit(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('agentFullName').value.trim();
    const email = document.getElementById('agentEmail').value.trim();
    const phone = document.getElementById('agentPhone').value.trim();
    
    // Validate fields
    if (!fullName || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Validate phone format (basic)
    if (phone.length < 10) {
        alert('Please enter a valid phone number');
        return;
    }
    
    // Get today's date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    // Create new table row
    const appId = 'APP-' + nextAgentId;
    nextAgentId++;
    
    const tableBody = document.querySelector('.tpl2-table tbody');
    const newRow = document.createElement('tr');
    newRow.onclick = function() {
        openSidePanel(appId, fullName, email, 'Pending');
    };
    
    newRow.innerHTML = `
        <td><input type="checkbox" class="tpl2-table-checkbox"></td>
        <td><strong>${appId}</strong></td>
        <td>${fullName}</td>
        <td>${email}</td>
        <td>${dateStr}</td>
        <td><span class="tpl2-status-badge tpl2-status-pending">Pending</span></td>
        <td><span class="tpl2-risk-low">Low</span></td>
        <td>
            <div class="tpl2-action-group">
                <button class="tpl2-action-btn" type="button">Review</button>
                <button class="tpl2-action-btn tpl2-action-btn-approve" type="button"><svg class="tpl2-inline-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Approve</button>
            </div>
        </td>
    `;
    
    // Insert at the top of the table
    tableBody.insertBefore(newRow, tableBody.firstChild);
    
    // Close modal and reset form
    closeAddAgentModal();
    
    // Show success message
    alert(`Agent ${fullName} has been successfully added!`);
}

// ==================== ACCOUNTS MANAGEMENT FUNCTIONALITY ====================
const ACCOUNT_DOCUMENT_LABELS = {
    valid_government_id: 'Gov ID',
    proof_of_education: 'Education',
    government_clearance_nbi: 'NBI',
    psa_birth_certificate: 'PSA',
    tin_verification: 'TIN',
    prc_accreditation_id: 'PRC',
    dhsud_certificate: 'DHSUD'
};

let allAccounts = [];
let filteredAccounts = [];
let viewProfileLastTrigger = null;

const ACCOUNT_DOCUMENT_ORDER = [
    'valid_government_id',
    'proof_of_education',
    'government_clearance_nbi',
    'psa_birth_certificate',
    'tin_verification',
    'prc_accreditation_id',
    'dhsud_certificate'
];

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatSubmittedDate(value) {
    if (!value) return 'Not submitted';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not submitted';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function statusBadgeHtml(status) {
    const normalized = (status || '').trim();
    const cssClass = normalized === 'Submitted' ? 'tpl2-status-submitted' : 'tpl2-status-pending';
    const label = normalized || 'Pending';
    return `<span class="tpl2-status-badge ${cssClass}">${escapeHtml(label)}</span>`;
}

function documentsCellHtml(documents) {
    const safeDocs = documents || {};
    const keys = Object.keys(ACCOUNT_DOCUMENT_LABELS);
    const available = keys.filter((key) => Boolean(safeDocs[key]));
    if (!available.length) {
        return '<span class="tpl2-text-muted-sm">Missing</span>';
    }

    return available
        .map((key) => {
            const label = ACCOUNT_DOCUMENT_LABELS[key];
            const url = String(safeDocs[key]);
            return `<a class="tpl2-doc-tag" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
        })
        .join(' ');
}

function setAccountsMessage(message, tone) {
    const messageEl = document.getElementById('accountsInlineMessage');
    if (!messageEl) return;

    if (!message) {
        messageEl.style.display = 'none';
        messageEl.textContent = '';
        return;
    }

    messageEl.style.display = 'block';
    messageEl.textContent = message;

    if (tone === 'error') {
        messageEl.style.color = '#b42318';
    } else if (tone === 'warning') {
        messageEl.style.color = '#b54708';
    } else {
        messageEl.style.color = 'var(--muted)';
    }
}

function updateAccountStatsFromData(accounts) {
    const total = accounts.length;
    const submitted = accounts.filter((item) => item.activation_status === 'Submitted').length;
    const pending = total - submitted;
    const withDocs = accounts.filter((item) => {
        const docs = item.documents || {};
        return Object.values(docs).some(Boolean);
    }).length;

    const totalEl = document.getElementById('accountsTotalCount');
    const submittedEl = document.getElementById('accountsSubmittedCount');
    const pendingEl = document.getElementById('accountsPendingCount');
    const withDocsEl = document.getElementById('accountsWithDocsCount');

    if (totalEl) totalEl.textContent = String(total);
    if (submittedEl) submittedEl.textContent = String(submitted);
    if (pendingEl) pendingEl.textContent = String(pending);
    if (withDocsEl) withDocsEl.textContent = String(withDocs);
}

function renderAccountsRows(accounts, options = {}) {
    const emptyMessage = options.emptyMessage || 'No onboarding accounts found.';
    const tableBody = document.getElementById('accountsTableBody');
    if (!tableBody) return;

    if (!accounts.length) {
        tableBody.innerHTML = `<tr><td colspan="6" class="tpl2-text-muted-sm tpl2-accounts-empty">${escapeHtml(emptyMessage)}</td></tr>`;
        return;
    }

    tableBody.innerHTML = accounts.map((account) => {
        const accountId = escapeHtml(account.account_id || `ACC-${account.user_id || ''}`);
        const fullName = escapeHtml(account.full_name || 'No name');
        const email = escapeHtml(account.email || '');
        const submittedDate = escapeHtml(formatSubmittedDate(account.submitted_at));

        return `
            <tr class="tpl2-account-row" data-status="${escapeHtml(account.activation_status || 'Pending')}">
                <td class="tpl2-col-account-id"><strong>${accountId}</strong></td>
                <td>${fullName}</td>
                <td>${email}</td>
                <td>${statusBadgeHtml(account.activation_status)}</td>
                <td>${submittedDate}</td>
                <td>
                    <div class="tpl2-action-group">
                        <button class="tpl2-view-profile-btn js-view-profile" type="button" data-account-id="${accountId}" title="View profile" aria-label="View profile for ${fullName}">View Profile</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function parseDateFilterDays() {
    const dateFilter = document.getElementById('dateFilter');
    if (!dateFilter || !dateFilter.value) return null;
    const days = Number(dateFilter.value);
    return Number.isFinite(days) ? days : null;
}

function applyAccountFilters() {
    const searchInput = document.getElementById('accountSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const searchValue = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const statusValue = statusFilter ? statusFilter.value : '';
    const dateDays = parseDateFilterDays();
    const now = Date.now();

    filteredAccounts = allAccounts.filter((account) => {
        const haystack = [
            account.account_id,
            account.full_name,
            account.email,
            account.activation_status
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (searchValue && !haystack.includes(searchValue)) {
            return false;
        }

        if (statusValue && account.activation_status !== statusValue) {
            return false;
        }

        if (dateDays) {
            if (!account.submitted_at) {
                return false;
            }
            const submittedTs = new Date(account.submitted_at).getTime();
            if (Number.isNaN(submittedTs)) {
                return false;
            }
            const ageMs = now - submittedTs;
            if (ageMs > dateDays * 24 * 60 * 60 * 1000) {
                return false;
            }
        }

        return true;
    });

    const emptyMessage = allAccounts.length ? 'No accounts match your current filters.' : 'No onboarding accounts found.';
    renderAccountsRows(filteredAccounts, { emptyMessage });
    updateAccountStatsFromData(filteredAccounts);
    if (!filteredAccounts.length && allAccounts.length) {
        setAccountsMessage('No accounts match the current filters.', 'info');
    } else {
        setAccountsMessage('', 'info');
    }
}

function resetAccountFilters() {
    const searchInput = document.getElementById('accountSearchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';

    applyAccountFilters();
}

function addApprovedAccountToList(account) {
    if (!account || !account.user_id) return;

    const normalized = {
        account_id: account.account_id || `ACC-${account.user_id}`,
        user_id: account.user_id,
        full_name: account.full_name || 'No name',
        email: account.email || '',
        phone_number: account.phone_number || '',
        residential_address: account.residential_address || '',
        activation_status: account.activation_status || 'Submitted',
        submitted_at: account.submitted_at || new Date().toISOString(),
        documents: account.documents || {}
    };

    const existingIndex = allAccounts.findIndex((item) => Number(item.user_id) === Number(normalized.user_id));
    if (existingIndex >= 0) {
        allAccounts[existingIndex] = {
            ...allAccounts[existingIndex],
            ...normalized
        };
    } else {
        allAccounts.unshift(normalized);
    }

    applyAccountFilters();
}

window.portalAddApprovedAccount = addApprovedAccountToList;

window.addEventListener('tpl2:add-approved-account', function (event) {
    if (!event || !event.detail) return;
    addApprovedAccountToList(event.detail);
});

function ensureViewProfileModal() {
    return document.getElementById('viewProfileModal');
}

function getViewProfileFocusableElements() {
    const modal = ensureViewProfileModal();
    if (!modal) return [];
    return Array.from(
        modal.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
    ).filter((el) => !el.hidden && el.offsetParent !== null);
}

function getAccountInitials(account) {
    const name = String(account.full_name || '').trim();
    if (!name) return 'SU';
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'SU';
    const initials = (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
    return initials.toUpperCase() || 'SU';
}

function getProfileStatusClass(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'approved') return 'tpl2-profile-status-approved';
    if (normalized === 'rejected') return 'tpl2-profile-status-rejected';
    if (normalized === 'submitted') return 'tpl2-profile-status-submitted';
    return 'tpl2-profile-status-pending';
}

function renderProfileDocuments(documents) {
    const docs = documents || {};
    return ACCOUNT_DOCUMENT_ORDER.map((key) => {
        const label = ACCOUNT_DOCUMENT_LABELS[key];
        const url = docs[key] ? String(docs[key]) : '';
        if (!url) {
            return `
                <span class="tpl2-profile-doc-chip missing" aria-disabled="true">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    <span>${escapeHtml(label)} (Missing)</span>
                </span>
            `;
        }

        return `
            <a class="tpl2-profile-doc-chip uploaded" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>${escapeHtml(label)}</span>
            </a>
        `;
    }).join('');
}

function handleViewProfileModalKeydown(event) {
    const modal = ensureViewProfileModal();
    if (!modal || modal.hidden) return;

    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeViewProfileModal();
        return;
    }

    if (event.key !== 'Tab') return;

    const focusables = getViewProfileFocusableElements();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}

function viewAccountProfile(accountId, triggerElement) {
    const account = allAccounts.find((item) => item.account_id === accountId);
    if (!account) return;

    const modal = ensureViewProfileModal();
    if (!modal) return;

    viewProfileLastTrigger = triggerElement || document.activeElement;

    const accountIdEl = document.getElementById('profileAccId');
    const accountNameEl = document.getElementById('profileAccName');
    const accountAvatarInitialsEl = document.getElementById('profileAccAvatarInitials');
    const accountAvatarImageEl = document.getElementById('profileAccAvatarImage');
    const accountEmailEl = document.getElementById('profileAccEmail');
    const accountPhoneEl = document.getElementById('profileAccPhone');
    const accountAddressEl = document.getElementById('profileAccAddress');
    const accountStatusBadgeEl = document.getElementById('profileAccStatusBadge');
    const accountDateEl = document.getElementById('profileAccDate');
    const docsContainer = document.getElementById('profileAccDocuments');

    if (accountIdEl) accountIdEl.textContent = account.account_id || '-';
    if (accountNameEl) accountNameEl.textContent = account.full_name || 'No name';
    if (accountAvatarInitialsEl) accountAvatarInitialsEl.textContent = getAccountInitials(account);
    if (accountAvatarImageEl) {
        const avatarUrl = String(account.avatar_url || account.profile_image || account.photo_url || '').trim();
        if (avatarUrl) {
            accountAvatarImageEl.src = avatarUrl;
            accountAvatarImageEl.hidden = false;
            if (accountAvatarInitialsEl) accountAvatarInitialsEl.hidden = true;
            accountAvatarImageEl.onerror = function () {
                accountAvatarImageEl.hidden = true;
                if (accountAvatarInitialsEl) accountAvatarInitialsEl.hidden = false;
            };
        } else {
            accountAvatarImageEl.src = '';
            accountAvatarImageEl.hidden = true;
            if (accountAvatarInitialsEl) accountAvatarInitialsEl.hidden = false;
        }
    }
    if (accountEmailEl) accountEmailEl.textContent = account.email || '-';
    if (accountPhoneEl) accountPhoneEl.textContent = account.phone_number || '-';
    if (accountAddressEl) accountAddressEl.textContent = account.residential_address || '-';
    if (accountDateEl) accountDateEl.textContent = formatSubmittedDate(account.submitted_at);

    if (accountStatusBadgeEl) {
        const statusLabel = account.activation_status || 'Pending';
        accountStatusBadgeEl.textContent = statusLabel;
        accountStatusBadgeEl.className = `tpl2-profile-status-badge ${getProfileStatusClass(statusLabel)}`;
    }

    if (docsContainer) {
        docsContainer.innerHTML = renderProfileDocuments(account.documents);
    }

    modal.hidden = false;
    document.body.classList.add('tpl2-modal-open');
    document.addEventListener('keydown', handleViewProfileModalKeydown);

    const closeBtn = document.getElementById('viewProfileClose');
    if (closeBtn) closeBtn.focus();
}

function closeViewProfileModal() {
    const modal = document.getElementById('viewProfileModal');
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove('tpl2-modal-open');
    document.removeEventListener('keydown', handleViewProfileModalKeydown);

    if (viewProfileLastTrigger && typeof viewProfileLastTrigger.focus === 'function') {
        viewProfileLastTrigger.focus();
    }
}

function bindViewProfileModalControls() {
    const modal = ensureViewProfileModal();
    if (!modal) return;

    const backdrop = document.getElementById('viewProfileBackdrop');
    const closeBtn = document.getElementById('viewProfileClose');

    if (backdrop) {
        backdrop.addEventListener('click', closeViewProfileModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeViewProfileModal);
    }
}

async function fetchAccountDataFromBackend() {
    const root = document.getElementById('tpl2Root');
    const endpoint = root ? root.getAttribute('data-accounts-api-url') : '';
    if (!endpoint) {
        setAccountsMessage('Accounts API URL is not configured.', 'error');
        return;
    }

    setAccountsMessage('Loading onboarding accounts...', 'info');

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        let payload = {};
        try {
            payload = await response.json();
        } catch (jsonError) {
            payload = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                setAccountsMessage('Sign in is required to view account records.', 'warning');
            } else if (response.status === 403) {
                setAccountsMessage('Superuser access is required for account records.', 'warning');
            } else {
                setAccountsMessage('Unable to load accounts right now. Please try again.', 'error');
            }
            renderAccountsRows([]);
            updateAccountStatsFromData([]);
            return;
        }

        const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
        allAccounts = accounts;
        applyAccountFilters();

        if (!accounts.length) {
            setAccountsMessage('No onboarding accounts found yet.', 'info');
        } else {
            setAccountsMessage('', 'info');
        }
    } catch (error) {
        renderAccountsRows([]);
        updateAccountStatsFromData([]);
        setAccountsMessage('Network error while loading accounts. Check your connection and retry.', 'error');
    }
}

function bindAccountFilters() {
    const searchInput = document.getElementById('accountSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    let filterDebounce = null;

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            window.clearTimeout(filterDebounce);
            filterDebounce = window.setTimeout(applyAccountFilters, 80);
        });
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyAccountFilters);
    }

    const tableBody = document.getElementById('accountsTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', function (event) {
            const button = event.target.closest('.js-view-profile');
            if (!button) return;
            const accountId = button.getAttribute('data-account-id');
            if (!accountId) return;
            viewAccountProfile(accountId, button);
        });
    }
}

// ==================== USER MANAGEMENT SUPERUSER FUNCTIONALITY ====================
function getUserManagementApiUrls() {
    const root = getTpl2Root();
    if (!root) {
        return {
            listUrl: '',
            roleUpdateUrl: '',
            passwordUpdateUrl: ''
        };
    }
    return {
        listUrl: root.getAttribute('data-superusers-api-url') || '',
        roleUpdateUrl: root.getAttribute('data-superuser-role-update-api-url') || '',
        passwordUpdateUrl: root.getAttribute('data-superuser-password-update-api-url') || ''
    };
}

function setUserManagementEmptyState(message) {
    const tableBody = document.getElementById('userManagementTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="6" class="tpl2-text-muted-sm">${escapeHtml(message || 'No data')}</td></tr>`;
}

function roleLabelForValue(role) {
    return String(role || '').toLowerCase() === PORTAL_ADMIN_ROLE_REVIEWER ? 'Reviewer' : 'Administrator';
}

async function fetchSuperuserDataFromBackend() {
    const endpoint = getUserManagementApiUrls().listUrl;
    if (!endpoint) {
        setUserManagementEmptyState('Superusers API URL is not configured.');
        return;
    }

    setUserManagementEmptyState('Loading superuser accounts...');

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        let payload = {};
        try {
            payload = await response.json();
        } catch (jsonError) {
            payload = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                setUserManagementEmptyState('Sign in is required to view superuser accounts.');
            } else if (response.status === 403) {
                setUserManagementEmptyState('Administrator role is required to view superuser accounts.');
            } else {
                setUserManagementEmptyState('Unable to load superuser accounts right now.');
            }
            return;
        }

        const superusers = Array.isArray(payload.superusers) ? payload.superusers : [];
        superuserAccountsCache = superusers;
        renderSuperuserRows(superusers);
    } catch (error) {
        console.error('Network error while loading superusers:', error);
        setUserManagementEmptyState('Network error. Check your connection and retry.');
    }
}

function renderSuperuserRows(superusers) {
    const tableBody = document.getElementById('userManagementTableBody');
    if (!tableBody) return;

    if (!superusers.length) {
        tableBody.innerHTML = '<tr><td colspan="6" class="tpl2-text-muted-sm">No superuser accounts found.</td></tr>';
        return;
    }

    const reviewerMode = currentUserIsReviewer();
    tableBody.innerHTML = superusers.map((user) => {
        const userId = Number(user.id || 0);
        const fullName = escapeHtml(user.name || user.username || 'Unknown');
        const email = escapeHtml(user.email || '-');
        const role = String(user.role || PORTAL_ADMIN_ROLE_ADMINISTRATOR).toLowerCase() === PORTAL_ADMIN_ROLE_REVIEWER
            ? PORTAL_ADMIN_ROLE_REVIEWER
            : PORTAL_ADMIN_ROLE_ADMINISTRATOR;
        const roleLabel = escapeHtml(user.role_label || roleLabelForValue(role));
        const lastLogin = escapeHtml(user.last_login || 'Never');
        const statusClass = user.is_active ? 'tpl2-status-chip' : 'tpl2-status-chip tpl2-status-inactive';
        const statusLabel = user.is_active ? 'Active' : 'Inactive';
        const roleBadgeClass = role === PORTAL_ADMIN_ROLE_REVIEWER
            ? 'tpl2-status-chip tpl2-role-chip-reviewer'
            : 'tpl2-status-chip tpl2-role-chip-admin';
        const disabledAttr = reviewerMode ? 'disabled' : '';

        return `
            <tr>
                <td><strong>${fullName}</strong></td>
                <td>${email}</td>
                <td><span class="${roleBadgeClass}">${roleLabel}</span></td>
                <td>${lastLogin}</td>
                <td><span class="${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="tpl2-action-group">
                        <button class="tpl2-action-btn tpl2-btn-small" type="button" title="Edit role" ${disabledAttr} onclick="openEditRoleModal(${userId})">Edit Role</button>
                        <button class="tpl2-action-btn tpl2-btn-small" type="button" title="Change password" ${disabledAttr} onclick="openChangePasswordModal(${userId})">Change Password</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getSuperuserRecord(userId) {
    const id = Number(userId);
    return superuserAccountsCache.find((item) => Number(item.id) === id) || null;
}

function openEditRoleModal(userId) {
    if (currentUserIsReviewer()) {
        showPortalToast('Only administrators can edit roles.', 'warning');
        return;
    }
    const target = getSuperuserRecord(userId);
    const modal = document.getElementById('editRoleModal');
    const select = document.getElementById('editRoleSelect');
    const subtitle = document.getElementById('editRoleModalSubtitle');
    if (!target || !modal || !select) return;

    activeRoleEditUserId = Number(target.id);
    select.value = String(target.role || PORTAL_ADMIN_ROLE_ADMINISTRATOR).toLowerCase() === PORTAL_ADMIN_ROLE_REVIEWER
        ? PORTAL_ADMIN_ROLE_REVIEWER
        : PORTAL_ADMIN_ROLE_ADMINISTRATOR;
    if (subtitle) {
        subtitle.textContent = `Select a role for ${target.name || target.username || 'this user'}.`;
    }

    modal.removeAttribute('hidden');
    syncBodyModalLockIfAvailable();
}

function closeEditRoleModal() {
    const modal = document.getElementById('editRoleModal');
    const saveBtn = document.getElementById('editRoleSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Role';
    }
    activeRoleEditUserId = null;
    if (modal) {
        modal.setAttribute('hidden', '');
    }
    syncBodyModalLockIfAvailable();
}

async function submitEditRole() {
    if (currentUserIsReviewer()) {
        showPortalToast('Only administrators can edit roles.', 'warning');
        return;
    }

    const userId = Number(activeRoleEditUserId || 0);
    const select = document.getElementById('editRoleSelect');
    const saveBtn = document.getElementById('editRoleSaveBtn');
    const roleUpdateUrl = getUserManagementApiUrls().roleUpdateUrl;
    if (!userId || !select || !saveBtn || !roleUpdateUrl) return;

    const selectedRole = String(select.value || PORTAL_ADMIN_ROLE_ADMINISTRATOR).toLowerCase() === PORTAL_ADMIN_ROLE_REVIEWER
        ? PORTAL_ADMIN_ROLE_REVIEWER
        : PORTAL_ADMIN_ROLE_ADMINISTRATOR;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const response = await fetch(roleUpdateUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfTokenForRequests(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                user_id: userId,
                role: selectedRole
            })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
            throw new Error(payload.message || 'Unable to update role.');
        }

        superuserAccountsCache = superuserAccountsCache.map((item) => {
            if (Number(item.id) !== userId) return item;
            return {
                ...item,
                role: payload.superuser && payload.superuser.role ? payload.superuser.role : selectedRole,
                role_label: payload.superuser && payload.superuser.role_label
                    ? payload.superuser.role_label
                    : roleLabelForValue(selectedRole)
            };
        });

        renderSuperuserRows(superuserAccountsCache);
        closeEditRoleModal();
        showPortalToast('Role updated successfully.', 'success');
    } catch (error) {
        showPortalToast(error.message || 'Unable to update role.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Role';
        }
    }
}

function openChangePasswordModal(userId) {
    if (currentUserIsReviewer()) {
        showPortalToast('Only administrators can change passwords.', 'warning');
        return;
    }
    const target = getSuperuserRecord(userId);
    const modal = document.getElementById('changePasswordModal');
    const subtitle = document.getElementById('changePasswordModalSubtitle');
    const input = document.getElementById('changePasswordInput');
    if (!target || !modal || !input) return;

    activePasswordUserId = Number(target.id);
    input.value = '';
    if (subtitle) {
        subtitle.textContent = `Set a new password for ${target.name || target.username || 'this user'}.`;
    }
    modal.removeAttribute('hidden');
    syncBodyModalLockIfAvailable();
    input.focus();
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    const input = document.getElementById('changePasswordInput');
    const saveBtn = document.getElementById('changePasswordSaveBtn');
    activePasswordUserId = null;
    if (input) {
        input.value = '';
    }
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
    }
    if (modal) {
        modal.setAttribute('hidden', '');
    }
    syncBodyModalLockIfAvailable();
}

async function submitChangePassword() {
    if (currentUserIsReviewer()) {
        showPortalToast('Only administrators can change passwords.', 'warning');
        return;
    }

    const userId = Number(activePasswordUserId || 0);
    const input = document.getElementById('changePasswordInput');
    const saveBtn = document.getElementById('changePasswordSaveBtn');
    const passwordUpdateUrl = getUserManagementApiUrls().passwordUpdateUrl;
    if (!userId || !input || !saveBtn || !passwordUpdateUrl) return;

    const password = String(input.value || '').trim();
    if (!password) {
        showPortalToast('Password is required.', 'warning');
        input.focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Updating...';

    try {
        const response = await fetch(passwordUpdateUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfTokenForRequests(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                user_id: userId,
                password
            })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
            throw new Error(payload.message || 'Unable to update password.');
        }

        closeChangePasswordModal();
        showPortalToast('Password changed', 'success');
    } catch (error) {
        showPortalToast(error.message || 'Unable to update password.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Update Password';
        }
    }
}

window.openEditRoleModal = openEditRoleModal;
window.closeEditRoleModal = closeEditRoleModal;
window.submitEditRole = submitEditRole;
window.openChangePasswordModal = openChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.submitChangePassword = submitChangePassword;

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    applyReviewerRestrictions();
    bindAccountFilters();
    bindViewProfileModalControls();
    if (!currentUserIsReviewer()) {
        fetchAccountDataFromBackend();
        fetchSuperuserDataFromBackend();
    }

    const addAgentBtn = document.getElementById('addAgentBtn');
    if (addAgentBtn) {
        addAgentBtn.addEventListener('click', openAddAgentModal);
    }

    const modal = document.getElementById('addAgentModal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeAddAgentModal();
            }
        });
    }
});
