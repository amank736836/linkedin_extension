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

    countDisplay.innerText = status.applicationCount || 0;
    if (connectCountDisplay) connectCountDisplay.innerText = status.connectCount || 0;
    if (catchUpCountDisplay) catchUpCountDisplay.innerText = status.catchUpCount || 0;
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

            chrome.tabs.sendMessage(tabs[0].id, { action: 'startConnect' }, (response) => {
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

            const type = catchUpType.value;
            // DEBUG LOG
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
    }
});
