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

    countDisplay.innerText = status.applicationCount || 0;
    if (connectCountDisplay) connectCountDisplay.innerText = status.connectCount || 0;
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
                logItem.innerText = "Redirecting to filtered results...";
                logDisplay.appendChild(logItem);
                chrome.tabs.update(tabs[0].id, { url: targetUrl.toString() });
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
            if (!tabs[0].url.includes('mynetwork/grow/')) {
                alert('Please navigate to the "Grow your network" page first!');
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startConnect' }, (response) => {
                if (response) {
                    startConnectBtn.disabled = true;
                    stopConnectBtn.disabled = false;
                } else {
                    const logItem = document.createElement('div');
                    logItem.style.color = '#ff0000';
                    logItem.innerText = "Error: Could not start. Please reload LinkedIn page.";
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

// Tab Switching Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
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
    }
});
