// --- POPUP FEATURE: CATCH-UP ---

if (startCatchUpBtn) {
    startCatchUpBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // 1. Check URL and Redirect if needed
                if (!tabs[0].url.includes('mynetwork/catch-up')) {
                    const targetUrl = 'https://www.linkedin.com/mynetwork/catch-up/all/';
                    chrome.tabs.update(tabs[0].id, { url: targetUrl });

                    const logItem = document.createElement('div');
                    logItem.style.color = '#e6b800'; // Orange/Yellow
                    logItem.innerText = "[CATCH-UP] Redirecting to 'Catch-Up' page... Please click Start again once page loads. 🚀";
                    logDisplay.appendChild(logItem);
                    return;
                }

                // PERSISTENCE: Save state so we can resume if redirected
                const type = catchUpType.value;
                const limit = parseInt(document.getElementById('catchUpLimit').value, 10) || 20;

                chrome.storage.local.set({
                    catchUpRunning: true,
                    catchUpSettings: { type, limit }
                });

                const logItem = document.createElement('div');
                logItem.innerText = `[CATCH-UP] 🚀 Starting! Type: ${type}, Limit: ${limit}`;
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startCatchUp',
                    settings: { type, limit }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        const logItem = document.createElement('div');
                        logItem.style.color = '#ff0000';
                        logItem.innerText = "[CATCH-UP] Connection Lost. Please reload the page and click Start again.";
                        logDisplay.appendChild(logItem);
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
}

if (stopCatchUpBtn) {
    stopCatchUpBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const logItem = document.createElement('div');
                logItem.innerText = "[CATCH-UP] 🛑 Stopping...";
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCatchUp' }, (response) => {
                    if (response) {
                        startCatchUpBtn.disabled = false;
                        stopCatchUpBtn.disabled = true;
                        chrome.storage.local.set({ catchUpRunning: false });
                    }
                });
            }
        });
    });
}
