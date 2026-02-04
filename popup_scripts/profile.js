// --- POPUP FEATURE: PROFILE ONBOARDING ---

const autoFillBtn = document.getElementById('autoFillBtn');

if (autoFillBtn) {
    autoFillBtn.addEventListener('click', () => {
        const logItem = document.createElement('div');
        logItem.style.color = '#0288d1';
        logItem.innerText = "🔍 Auto-Filling info from Profile...";
        logDisplay.appendChild(logItem);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const currentUrl = tabs[0].url;

                // 1. Check if we are on a profile page
                if (!currentUrl.includes('linkedin.com/in/')) {
                    logItem.innerText = "⚠️ Please go to your LinkedIn Profile page first!";
                    logItem.style.color = 'red';

                    // Helper redirect
                    const targetUrl = "https://www.linkedin.com/in/"; // Redirect to 'me' usually works or feed
                    // No, let's just warn.
                    return;
                }

                // 2. Send Scrape Command
                chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeProfile' }, (response) => {
                    if (chrome.runtime.lastError) {
                        logItem.style.color = 'red';
                        logItem.innerText = "⚠️ Error: Connection failed. Reload page.";
                        return;
                    }

                    if (response && response.status === 'scraped' && response.data) {
                        const data = response.data;

                        // Populate Fields
                        if (data.fullName) document.getElementById('fullName').value = data.fullName;
                        if (data.location) document.getElementById('location').value = data.location;
                        if (data.keywords) document.getElementById('keywords').value = data.keywords;
                        if (data.experienceLevel) document.getElementById('experienceLevel').value = data.experienceLevel;

                        // Save Immediately
                        saveSettings();

                        logItem.innerText = "✅ Info Auto-Filled! Please check Phone/Email.";
                        logItem.style.color = 'green';

                        // Switch to Settings tab to show results
                        document.querySelector('[data-tab="settings"]').click();
                        document.querySelector('[data-subtab="profile"]').click();

                        // Warn about missing critical info
                        const missing = [];
                        if (!document.getElementById('email').value) missing.push("Email");
                        if (!document.getElementById('phone').value) missing.push("Phone");
                        if (!document.getElementById('salary').value) missing.push("Salary");

                        if (missing.length > 0) {
                            alert(`✅ Profile details loaded!\n\n⚠️ IMPORTANT: We could not find your ${missing.join(', ')}.\n\nPlease fill these manually in the Settings tab before starting.`);
                        }

                    } else {
                        logItem.innerText = "⚠️ Could not read profile. Make sure you are on your profile page.";
                        logItem.style.color = 'red';
                    }
                });
            }
        });
    });
}
