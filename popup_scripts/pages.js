// --- POPUP FEATURE: PAGES AUTOMATION ---

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
                    logItem.innerText = `[PAGES] Redirecting to ${pagesMode.value === 'unfollow' ? 'Following' : 'Search'}... Auto-starting in 10s... ⏳`;
                    logDisplay.appendChild(logItem);
                    logDisplay.scrollTop = logDisplay.scrollHeight;

                    // Determine Target URL
                    const targetUrl = pagesMode.value === 'unfollow'
                        ? 'https://www.linkedin.com/mynetwork/network-manager/company/'
                        : 'https://www.linkedin.com/search/results/companies/';

                    chrome.tabs.update(tabs[0].id, { url: targetUrl });

                    setTimeout(() => {
                        logItem.innerText = "[PAGES] Auto-starting now... 🚀";
                        startPagesBtn.click();
                    }, 10000);
                    return;
                }

                // Explicitly Parse Limit
                const limitVal = parseInt(pagesLimit.value, 10);
                const appliedLimit = (isNaN(limitVal) || limitVal < 1) ? 500 : limitVal;

                // LOG IT
                const logItem = document.createElement('div');
                logItem.innerText = `[PAGES] 🚀 Starting! Mode: ${pagesMode.value}, Limit: ${appliedLimit}`;
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
                        logItem.innerText = "[PAGES] Connection Failed. Reloading... Auto-start in 10s... ⏳";
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

    // Init Count from Storage
    chrome.storage.local.get(['stats', 'pagesCount'], (data) => {
        if (data.stats && data.stats.pages) {
            pagesCountDisplay.innerText = data.stats.pages.daily || 0; // Show daily progress by default
        } else if (data.pagesCount) {
            pagesCountDisplay.innerText = data.pagesCount || 0; // Fallback to legacy count
        }
    });
}

if (stopPagesBtn) {
    stopPagesBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const logItem = document.createElement('div');
                logItem.innerText = "[PAGES] 🛑 Stopping...";
                logDisplay.appendChild(logItem);

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
