// --- POPUP FEATURE: AUTO-CONNECT ---

if (startConnectBtn) {
    // Initialize Weekly Manager UI
    const weeklyLimitInput = document.getElementById('weeklyLimit');
    const distStrategyInput = document.getElementById('distStrategy');
    const weeklyCountDisplay = document.getElementById('weeklyCount');
    const weeklyLimitDisplay = document.getElementById('weeklyLimitDisplay');

    if (weeklyLimitInput && window.WeeklyManager) {
        window.WeeklyManager.init().then(state => {
            weeklyCountDisplay.innerText = state.weeklyConnectCount;
            weeklyLimitInput.value = localStorage.getItem('s_weeklyLimit') || 100;
            distStrategyInput.value = localStorage.getItem('s_distStrategy') || 'even';
            weeklyLimitDisplay.innerText = weeklyLimitInput.value;
        });

        weeklyLimitInput.addEventListener('change', () => {
            localStorage.setItem('s_weeklyLimit', weeklyLimitInput.value);
            weeklyLimitDisplay.innerText = weeklyLimitInput.value;
        });

        distStrategyInput.addEventListener('change', () => {
            localStorage.setItem('s_distStrategy', distStrategyInput.value);
        });
    }

    startConnectBtn.addEventListener('click', async () => {
        // Save delay setting
        const connectDelayInput = document.getElementById('connectDelay');
        if (connectDelayInput) {
            chrome.storage.local.set({ connectDelay: connectDelayInput.value });
        }

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (tabs[0]) {
                // 1. Check URL & Auto-Redirect
                if (!tabs[0].url.includes('mynetwork/grow/')) {
                    const targetUrl = 'https://www.linkedin.com/mynetwork/grow/';
                    chrome.tabs.update(tabs[0].id, { url: targetUrl });

                    const logItem = document.createElement('div');
                    logItem.style.color = '#e6b800';
                    logItem.innerText = "[CONNECT] Redirecting to 'Grow' page... Please click Start again once page loads. 🚀";
                    logDisplay.appendChild(logItem);
                    return;
                }

                // Grab settings
                const delayVal = connectDelayInput ? parseInt(connectDelayInput.value, 10) : 10;
                const weeklyLimit = parseInt(weeklyLimitInput.value, 10) || 100;
                const strategy = distStrategyInput.value;

                // Smart Scheduling Calculation
                await window.WeeklyManager.init(); // Refresh state
                const dailyTarget = window.WeeklyManager.getDailyTarget(weeklyLimit, strategy);

                const logItem = document.createElement('div');
                logItem.innerText = `[CONNECT] 🚀 Starting! Smart Target: ${dailyTarget} (Weekly Left: ${Math.max(0, weeklyLimit - window.WeeklyManager.state.weeklyConnectCount)})`;
                logDisplay.appendChild(logItem);

                if (dailyTarget <= 0) {
                    logItem.innerText = `[CONNECT] ⚠️ Weekly Limit Reached! (Used: ${window.WeeklyManager.state.weeklyConnectCount}/${weeklyLimit})`;
                    logItem.style.color = 'red';
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startConnect',
                    settings: {
                        delay: delayVal,
                        limit: dailyTarget // Pass the Calculated Daily Target 
                    }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Error handling...
                        const logItem = document.createElement('div');
                        logItem.style.color = '#ff0000';
                        logItem.innerText = "[CONNECT] Connection Lost. Please reload the page.";
                        logDisplay.appendChild(logItem);
                        return;
                    }

                    if (response) {
                        startConnectBtn.disabled = true;
                        stopConnectBtn.disabled = false;
                    }
                });
            }
        });
    });
}

if (stopConnectBtn) {
    stopConnectBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const logItem = document.createElement('div');
                logItem.innerText = "[CONNECT] 🛑 Stopping...";
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, { action: 'stopConnect' }, (response) => {
                    if (response) {
                        startConnectBtn.disabled = false;
                        stopConnectBtn.disabled = true;
                    }
                });
            }
        });
    });
}

// WITHDRAW OLD REQUESTS
const withdrawBtn = document.getElementById('withdrawBtn');
if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {

                // Redirect if wrong page
                if (!tabs[0].url.includes('invitation-manager/sent')) {
                    const targetUrl = 'https://www.linkedin.com/mynetwork/invitation-manager/sent/';
                    chrome.tabs.update(tabs[0].id, { url: targetUrl });

                    const logItem = document.createElement('div');
                    logItem.style.color = '#e6b800';
                    logItem.innerText = "[WITHDRAW] Redirecting to 'Sent' page... Please click Withdraw again once page loads.";
                    logDisplay.appendChild(logItem);
                    return;
                }

                const logItem = document.createElement('div');
                logItem.innerText = "[WITHDRAW] 📡 Requesting start from Content Script...";
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, { action: 'startWithdraw' }, (response) => {
                    if (chrome.runtime.lastError) {
                        const errItem = document.createElement('div');
                        errItem.style.color = 'red';
                        errItem.innerText = "[WITHDRAW] ❌ Connection Failed. Auto-reloading page in 1s...";
                        logDisplay.appendChild(errItem);

                        // Auto-reload as requested
                        setTimeout(() => {
                            chrome.tabs.reload(tabs[0].id);
                        }, 1000);
                    } else if (response && response.status === 'withdrawing') {
                        logItem.innerText += " ✅ Signal Received!";
                    }
                });
            }
        });
    });
}
