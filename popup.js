const fields = [
    'fullName', 'email', 'phone', 'salary', 'notice', 'maxApps',
    'keywords', 'location', 'datePosted', 'experienceLevel', 'workplaceType',
    'under10Apps', 'connectDelay'
];
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtnFilters = document.getElementById('saveBtnFilters');
const saveBtnProfile = document.getElementById('saveBtnProfile');
const startConnectBtn = document.getElementById('startConnectBtn');
const stopConnectBtn = document.getElementById('stopConnectBtn');
const countDisplay = document.getElementById('count');
const connectCountDisplay = document.getElementById('connectCount');
const logDisplay = document.getElementById('log');
const libraryContainer = document.getElementById('questionLibrary');

const defaultSettings = {
    fullName: "Aman Kumar",
    email: "amankarguwal1@gmail.com",
    phone: "+916284736836",
    salary: "8 LPA",
    notice: "1 month",
    maxApps: "43",
    keywords: "software developer",
    location: "Bengaluru",
    datePosted: "r86400",
    experienceLevel: "2",
    workplaceType: "2",
    under10Apps: false
};

// Load stored settings or use defaults
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
});

function syncStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
                if (response) {
                    updateUI(response);
                }
            });
        }
    });
}

function renderLibrary(unknown, library) {
    if (unknown.length === 0) {
        libraryContainer.innerHTML = 'No new questions detected yet.';
        return;
    }

    libraryContainer.innerHTML = '';
    unknown.forEach(q => {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.style.borderBottom = '1px solid #eee';
        div.style.paddingBottom = '8px';
        div.innerHTML = `
            <label style="color: #0a66c2; font-weight: bold;">${q}</label>
            <div style="display: flex; gap: 5px;">
                <input type="text" placeholder="Your answer..." id="answer-${btoa(q).substring(0, 10)}">
                <button class="btn" style="width: auto; padding: 5px 10px; font-size: 10px;" id="save-${btoa(q).substring(0, 10)}">Save</button>
            </div>
        `;
        libraryContainer.appendChild(div);

        div.querySelector('button').onclick = () => {
            const answer = div.querySelector('input').value;
            if (!answer) return;

            chrome.storage.local.get(['customLibrary', 'unknownQuestions'], (data) => {
                const lib = data.customLibrary || {};
                const unk = data.unknownQuestions || [];
                lib[q] = answer;
                const newUnk = unk.filter(item => item !== q);
                chrome.storage.local.set({ customLibrary: lib, unknownQuestions: newUnk }, () => {
                    div.remove();
                    if (newUnk.length === 0) libraryContainer.innerHTML = 'No new questions detected yet.';
                });
            });
        };
    });
}

// Save settings helper
function saveSettings() {
    const settings = {};
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) {
            settings[field] = el.type === 'checkbox' ? el.checked : el.value;
        }
    });
    chrome.storage.local.set(settings, () => {
        console.log('Settings saved');
    });
}

saveBtnFilters.addEventListener('click', () => {
    saveSettings();
    alert('Filters saved!');
});

saveBtnProfile.addEventListener('click', () => {
    saveSettings();
    alert('Profile saved!');
});

function updateUI(status) {
    startBtn.disabled = status.isRunning;
    stopBtn.disabled = !status.isRunning;

    startConnectBtn.disabled = status.isConnecting;
    stopConnectBtn.disabled = !status.isConnecting;

    const startCatchUpBtn = document.getElementById('startCatchUpBtn');
    const stopCatchUpBtn = document.getElementById('stopCatchUpBtn');
    const catchUpCountDisplay = document.getElementById('catchUpCount');

    if (startCatchUpBtn) {
        startCatchUpBtn.disabled = status.isCatchingUp;
        stopCatchUpBtn.disabled = !status.isCatchingUp;
    }

    const startPagesBtn = document.getElementById('startPagesBtn');
    const stopPagesBtn = document.getElementById('stopPagesBtn');
    const pagesCountDisplay = document.getElementById('pagesCount');

    if (startPagesBtn) {
        startPagesBtn.disabled = status.isPagesRunning;
        stopPagesBtn.disabled = !status.isPagesRunning;
    }

    countDisplay.innerText = status.applicationCount || 0;
    if (connectCountDisplay) connectCountDisplay.innerText = status.connectCount || 0;
    if (catchUpCountDisplay) catchUpCountDisplay.innerText = status.catchUpCount || 0;
    if (pagesCountDisplay) pagesCountDisplay.innerText = status.pagesCount || 0;
}

startBtn.addEventListener('click', () => {
    const settings = {};
    fields.forEach(field => {
        const el = document.getElementById(field);
        settings[field] = el.type === 'checkbox' ? el.checked : el.value;
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const currentUrl = tabs[0].url;
            const targetUrl = new URL("https://www.linkedin.com/jobs/search/");
            targetUrl.searchParams.set('f_AL', 'true');
            if (settings.keywords) targetUrl.searchParams.set('keywords', settings.keywords);
            if (settings.location) targetUrl.searchParams.set('location', settings.location);
            if (settings.datePosted) targetUrl.searchParams.set('f_TPR', settings.datePosted);
            if (settings.experienceLevel) targetUrl.searchParams.set('f_E', settings.experienceLevel);
            if (settings.workplaceType) targetUrl.searchParams.set('f_WT', settings.workplaceType);
            if (settings.under10Apps) targetUrl.searchParams.set('f_EA', 'true');

            const isTargetPage = currentUrl.includes('/jobs/search/') &&
                (!settings.keywords || currentUrl.includes(encodeURIComponent(settings.keywords)));

            if (!isTargetPage) {
                const logItem = document.createElement('div');
                logItem.style.color = '#e6b800';
                logItem.innerText = "Redirecting... Auto-starting in 10s... ⏳";
                logDisplay.appendChild(logItem);
                chrome.tabs.update(tabs[0].id, { url: targetUrl.toString() });

                setTimeout(() => {
                    logItem.innerText = "Auto-starting now... 🚀";
                    startBtn.click();
                }, 10000);
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { action: 'start', settings }, (response) => {
                if (response) {
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                }
            });
        }
    });
});

stopBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'stop' }, (response) => {
                if (response) {
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                }
            });
        }
    });
});

startConnectBtn.addEventListener('click', () => {
    // Save the setting immediately so it persists across redirects/reloads
    const connectDelayInput = document.getElementById('connectDelay');
    if (connectDelayInput) {
        chrome.storage.local.set({ connectDelay: connectDelayInput.value });
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            // 1. Check URL & Auto-Redirect
            if (!tabs[0].url.includes('mynetwork/grow/')) {
                const targetUrl = 'https://www.linkedin.com/mynetwork/grow/';
                chrome.tabs.update(tabs[0].id, { url: targetUrl });

                const logItem = document.createElement('div');
                logItem.style.color = '#e6b800';
                logItem.innerText = "Redirecting... Auto-starting in 10s... ⏳";
                logDisplay.appendChild(logItem);

                setTimeout(() => {
                    logItem.innerText = "Auto-starting now... 🚀";
                    startConnectBtn.click();
                }, 10000);
                return;
            }

            // Grab the delay setting from the UI
            const connectDelayInput = document.getElementById('connectDelay');
            const delayVal = connectDelayInput ? parseInt(connectDelayInput.value, 10) : 10;

            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'startConnect',
                settings: { delay: delayVal } // Pass the settings!
            }, (response) => {
                // Auto-Restart on Connection Error
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    const logItem = document.createElement('div');
                    logItem.style.color = '#ff0000';
                    logItem.innerText = "Connection Failed. Reloading... Auto-start in 10s... ⏳";
                    logDisplay.appendChild(logItem);
                    chrome.tabs.reload(tabs[0].id);

                    setTimeout(() => {
                        logItem.innerText = "Auto-starting now... 🚀";
                        startConnectBtn.click();
                    }, 10000);
                    return;
                }

                if (response) {
                    startConnectBtn.disabled = true;
                    stopConnectBtn.disabled = false;
                } else {
                    const logItem = document.createElement('div');
                    logItem.style.color = '#ff0000';
                    logItem.innerText = "Error: Unknown response. Reload page.";
                    logDisplay.appendChild(logItem);
                }
            });
        }
    });
});

stopConnectBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'stopConnect' }, (response) => {
                if (response) {
                    startConnectBtn.disabled = false;
                    stopConnectBtn.disabled = true;
                }
            });
        }
    });
});


// Pages Logic
const startPagesBtn = document.getElementById('startPagesBtn');
const stopPagesBtn = document.getElementById('stopPagesBtn');
const pagesMode = document.getElementById('pagesMode');
const pagesLimit = document.getElementById('pagesLimit');

if (startPagesBtn) {
    startPagesBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const currentUrl = tabs[0].url;

                // Flexible URL check for both Search and Network Manager
                const isPagesUrl = currentUrl.includes('/search/results/') ||
                    currentUrl.includes('/mynetwork/network-manager/company/');

                if (!isPagesUrl) {
                    const logItem = document.createElement('div');
                    logItem.style.color = '#e6b800';
                    logItem.innerText = `Redirecting to ${pagesMode.value === 'unfollow' ? 'Following' : 'Search'}... Auto-starting in 10s... ⏳`;
                    logDisplay.appendChild(logItem);
                    logDisplay.scrollTop = logDisplay.scrollHeight;

                    // Determine Target URL
                    const targetUrl = pagesMode.value === 'unfollow'
                        ? 'https://www.linkedin.com/mynetwork/network-manager/company/'
                        : 'https://www.linkedin.com/search/results/companies/';

                    chrome.tabs.update(tabs[0].id, { url: targetUrl });

                    setTimeout(() => {
                        logItem.innerText = "Auto-starting now... 🚀";
                        startPagesBtn.click();
                    }, 10000);
                    return;
                }

                // Explicitly Parse Limit
                const limitVal = parseInt(pagesLimit.value, 10);
                const appliedLimit = (isNaN(limitVal) || limitVal < 1) ? 50 : limitVal;

                // LOG IT
                const logItem = document.createElement('div');
                logItem.innerText = `Rocket Launch! 🚀 Mode: ${pagesMode.value}, Limit: ${appliedLimit}`;
                logDisplay.appendChild(logItem);
                logDisplay.scrollTop = logDisplay.scrollHeight;

                const settings = {
                    mode: pagesMode.value,
                    limit: appliedLimit
                };

                chrome.tabs.sendMessage(tabs[0].id, { action: 'startPages', settings }, (response) => {
                    if (chrome.runtime.lastError) {
                        const logItem = document.createElement('div');
                        logItem.style.color = '#ff0000';
                        logItem.innerText = "Connection Failed. Reloading... Auto-start in 10s... ⏳";
                        logDisplay.appendChild(logItem);

                        chrome.tabs.reload(tabs[0].id);
                        setTimeout(() => {
                            startPagesBtn.click();
                        }, 10000);
                        return;
                    }
                    if (response) {
                        startPagesBtn.disabled = true;
                        stopPagesBtn.disabled = false;
                    }
                });
            }
        });
    });
}

if (stopPagesBtn) {
    stopPagesBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'stopPages' }, (response) => {
                    if (response) {
                        startPagesBtn.disabled = false;
                        stopPagesBtn.disabled = true;
                    }
                });
            }
        });
    });
}

// Catch Up Logic
const startCatchUpBtn = document.getElementById('startCatchUpBtn');
const stopCatchUpBtn = document.getElementById('stopCatchUpBtn');
const catchUpType = document.getElementById('catchUpType');
const catchUpCountDisplay = document.getElementById('catchUpCount');

startCatchUpBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            // 1. Check URL and Redirect if needed
            if (!tabs[0].url.includes('mynetwork/catch-up')) {
                const targetUrl = 'https://www.linkedin.com/mynetwork/catch-up/all/';
                chrome.tabs.update(tabs[0].id, { url: targetUrl });

                const logItem = document.createElement('div');
                logItem.style.color = '#e6b800'; // Orange/Yellow
                logItem.innerText = "Redirecting... Auto-starting in 10s... ⏳";
                logDisplay.appendChild(logItem);
                logDisplay.scrollTop = logDisplay.scrollHeight;

                setTimeout(() => {
                    logItem.innerText = "Auto-starting now... 🚀";
                    startCatchUpBtn.click();
                }, 10000);
                return;
            }

            // PERSISTENCE: Save state so we can resume if redirected
            const type = catchUpType.value;
            chrome.storage.local.set({
                catchUpRunning: true,
                catchUpSettings: { type }
            });

            console.log('Sending startCatchUp message to tab:', tabs[0].id);

            chrome.tabs.sendMessage(tabs[0].id, { action: 'startCatchUp', settings: { type } }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);

                    const logItem = document.createElement('div');
                    logItem.style.color = '#ff0000';
                    logItem.innerText = "Connection Failed. Reloading... Auto-start in 10s... ⏳";
                    logDisplay.appendChild(logItem);
                    logDisplay.scrollTop = logDisplay.scrollHeight;

                    chrome.tabs.reload(tabs[0].id);

                    setTimeout(() => {
                        logItem.innerText = "Auto-starting now... 🚀";
                        startCatchUpBtn.click();
                    }, 10000);
                    return;
                }

                if (response) {
                    startCatchUpBtn.disabled = true;
                    stopCatchUpBtn.disabled = false;
                }
            });
        }
    });
});

stopCatchUpBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCatchUp' }, (response) => {
                if (response) {
                    startCatchUpBtn.disabled = false;
                    stopCatchUpBtn.disabled = true;
                }
            });
        }
    });
});

// Tab Switching Logic
// Tab Switching Logic
// 1. Main Tabs
const mainTabBtns = document.querySelectorAll('.tab-btn:not(.sub-tab-btn)');
const mainTabContents = document.querySelectorAll('.tab-content');

// Log Visibility Management
let isDeveloperMode = false;

function updateLogVisibility() {
    const logContainer = document.getElementById('log').parentElement;
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    if (isDeveloperMode && activeTab !== 'settings') {
        logContainer.style.display = 'block';
    } else {
        logContainer.style.display = 'none';
        // Note: We don't want logs in Settings even if Dev Mode is on, 
        // to keep the UI clean as requested.
    }
}

// Developer Mode Check
function checkDeveloperMode() {
    if (chrome.management && chrome.management.getSelf) {
        chrome.management.getSelf((info) => {
            if (info.installType === 'development') {
                isDeveloperMode = true;
                console.log('Developer Mode detected: Logs enabled.');
                updateLogVisibility();
            }
        });
    }
}

// Run check on load
document.addEventListener('DOMContentLoaded', checkDeveloperMode);

mainTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        if (!target) return; // ignore if no data-tab (safety)

        mainTabBtns.forEach(b => b.classList.remove('active'));
        mainTabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetEl = document.getElementById(target);
        if (targetEl) targetEl.classList.add('active');

        updateLogVisibility();
    });
});

// 2. Sub Tabs (Settings)
const subTabBtns = document.querySelectorAll('.sub-tab-btn');
const subTabContents = document.querySelectorAll('.sub-tab-content');

subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.subtab;
        if (!target) return;

        subTabBtns.forEach(b => b.classList.remove('active'));
        subTabContents.forEach(c => c.style.display = 'none');
        subTabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetEl = document.getElementById(target);
        if (targetEl) {
            targetEl.style.display = 'block';
            targetEl.classList.add('active');
        }
    });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'log') {
        const logItem = document.createElement('div');
        logItem.innerText = request.message;
        logDisplay.appendChild(logItem);
        logDisplay.scrollTop = logDisplay.scrollHeight;
    } else if (request.action === 'updateCount') {
        countDisplay.innerText = request.count;
    } else if (request.action === 'updateConnectCount') {
        if (connectCountDisplay) connectCountDisplay.innerText = request.count;
    } else if (request.action === 'updateCatchUpCount') {
        const catchUpCountDisplay = document.getElementById('catchUpCount');
        if (catchUpCountDisplay) catchUpCountDisplay.innerText = request.count;
    } else if (request.action === 'updatePagesCount') {
        const pagesCountDisplay = document.getElementById('pagesCount');
        if (pagesCountDisplay) pagesCountDisplay.innerText = request.count;
    } else if (request.action === 'pagesComplete') {
        startPagesBtn.disabled = false;
        stopPagesBtn.disabled = true;
    }
});
