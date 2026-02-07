// --- POPUP INITIALIZATION ---

// (Feature logic is now in popup_scripts/*.js)
// This file handles initialization, loading settings, and TABS.

// 1. Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.sub-tab-content').forEach(c => c.style.display = 'none');

        // Add active to clicked tab
        btn.classList.add('active');

        // Show content
        const tabId = btn.getAttribute('data-tab');
        if (tabId) {
            const content = document.getElementById(tabId);
            if (content) content.classList.add('active');
        }

        // Sub-tabs logic (if clicked a sub-tab)
        const subTabId = btn.getAttribute('data-subtab');
        if (subTabId) {
            // Keep parent 'Settings' tab active if we are in subtabs
            const settingsTab = document.querySelector('[data-tab="settings"]');
            if (settingsTab) {
                settingsTab.classList.add('active');
                document.getElementById('settings').classList.add('active');
            }

            // Show sub-tab content
            const subContent = document.getElementById(subTabId);
            if (subContent) subContent.style.display = 'block';
        }
    });
});

// 2. Load stored settings or use defaults
chrome.storage.local.get([...fields, 'unknownQuestions', 'customLibrary'], (data) => {
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (!el) return;
        const value = data[field] !== undefined ? data[field] : defaultSettings[field];
        if (el.type === 'checkbox') {
            el.checked = value;
        } else {
            el.value = value;
        }
    });

    renderLibrary(data.unknownQuestions || [], data.customLibrary || {});

    // Sync button states with Content Script immediately
    syncStatus();

    // Poll for status updates every second
    setInterval(syncStatus, 1000);

    // --- PROACTIVE ONBOARDING ---
    if (!data.onboardingComplete) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url.includes('linkedin.com/in/')) {
                // Not on profile, ensure banner is visible (it is by default in HTML, but good to be explicit)
                if (onboardingBanner) onboardingBanner.style.display = 'block';
            } else {
                // Not on profile, ensure banner is visible
                if (onboardingBanner) onboardingBanner.style.display = 'block';
            }
        });
    } else {
        // Setup done, hide banner
        if (onboardingBanner) onboardingBanner.style.display = 'none';
    }
});

function syncStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Could not sync status (Content script maybe inactive/reloading)');
                    return;
                }
                if (response) {
                    updateUI(response);
                }
            });
        }
    });
}

// "Save" buttons for the tabs (Global Settings)
if (saveBtnFilters) {
    saveBtnFilters.addEventListener('click', () => {
        saveSettings();
    });
}

if (saveBtnProfile) {
    saveBtnProfile.addEventListener('click', () => {
        saveSettings();
    });
}
