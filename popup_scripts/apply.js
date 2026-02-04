// --- POPUP FEATURE: AUTO-APPLY ---

if (startBtn) {
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
                    logItem.innerText = "[APPLY] Redirecting... Auto-starting in 10s... ⏳";
                    logDisplay.appendChild(logItem);
                    chrome.tabs.update(tabs[0].id, { url: targetUrl.toString() });

                    setTimeout(() => {
                        logItem.innerText = "[APPLY] Auto-starting now... 🚀";
                        startBtn.click();
                    }, 10000);
                    return;
                }

                const logItem = document.createElement('div');
                logItem.innerText = `[APPLY] 🚀 Starting! Target: ${settings.maxApps}`;
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, { action: 'start', settings }, (response) => {
                    if (response) {
                        startBtn.disabled = true;
                        stopBtn.disabled = false;
                    }
                });
            }
        });
    });
}

if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const logItem = document.createElement('div');
                logItem.innerText = "[APPLY] 🛑 Stopping...";
                logDisplay.appendChild(logItem);

                chrome.tabs.sendMessage(tabs[0].id, { action: 'stop' }, (response) => {
                    if (response) {
                        startBtn.disabled = false;
                        stopBtn.disabled = true;
                    }
                });
            }
        });
    });
}
