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
                    logItem.innerText = "[CATCH-UP] Redirecting... Auto-starting in 10s... ⏳";
                    logDisplay.appendChild(logItem);

                    setTimeout(() => {
                        logItem.innerText = "[CATCH-UP] Auto-starting now... 🚀";
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

                const logItem = document.createElement('div');
                logItem.innerText = `[CATCH-UP] 🚀 Starting! Type: ${type}`;
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startCatchUp',
                    settings: { type }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        const logItem = document.createElement('div');
                        logItem.style.color = '#ff0000';
                        logItem.innerText = "[CATCH-UP] Connection Failed. Reloading... Auto-start in 10s... ⏳";
                        logDisplay.appendChild(logItem);

                        chrome.tabs.reload(tabs[0].id);
                        setTimeout(() => {
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
