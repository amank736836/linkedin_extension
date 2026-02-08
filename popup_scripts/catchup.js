// --- POPUP FEATURE: CATCH-UP ---

// Load and display catchup count on popup open
chrome.storage.local.get(['stats'], (data) => {
    const catchUpCountDisplay = document.getElementById('catchUpCount');
    if (catchUpCountDisplay && data.stats && data.stats.catchup) {
        catchUpCountDisplay.innerText = data.stats.catchup.daily || 0;
    }
});

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
                const limit = parseInt(document.getElementById('catchUpLimit').value, 10) || 200;

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
                        logItem.style.color = '#ff9800';
                        logItem.innerText = "[CATCH-UP] Connection lost. Reloading page... Auto-resume in 4s ⏳";
                        logDisplay.appendChild(logItem);

                        // Persistence state already saved above - just reload
                        chrome.tabs.reload(tabs[0].id);
                        return;
                    }
                    if (response) {
                        startCatchUpBtn.disabled = true;
                        stopCatchUpBtn.disabled = false;
                        // Clear running state once automation starts successfully
                        chrome.storage.local.set({ catchUpRunning: false });
                    }
                });
            }
        });
    });

    // Init Count from Storage
    chrome.storage.local.get(['stats'], (data) => {
        const catchUpCount = document.getElementById('catchUpCount');
        if (data.stats && data.stats.catchup && catchUpCount) {
            catchUpCount.innerText = data.stats.catchup.daily || 0;
        }
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
