// --- POPUP FEATURE: AUTO-CONNECT ---

if (startConnectBtn) {
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
                    logItem.innerText = "[CONNECT] Redirecting to 'Grow' page... Please click Start again once page loads. 🚀";
                    logDisplay.appendChild(logItem);
                    return;
                }

                // Grab the delay setting from the UI
                const connectDelayInput = document.getElementById('connectDelay');
                const delayVal = connectDelayInput ? parseInt(connectDelayInput.value, 10) : 10;

                const logItem = document.createElement('div');
                logItem.innerText = `[CONNECT] 🚀 Starting! Delay: ${delayVal}s`;
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startConnect',
                    settings: { delay: delayVal } // Pass the settings!
                }, (response) => {
                    // Auto-Restart on Connection Error
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        const logItem = document.createElement('div');
                        logItem.style.color = '#ff0000';
                        logItem.innerText = "[CONNECT] Connection Lost. Please reload the page and click Start again.";
                        logDisplay.appendChild(logItem);
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
