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
                        logItem.style.color = 'orange';
                        logItem.innerText = "⚠️ Connection Lost. Reloading page & Retrying in 5s...";

                        chrome.tabs.reload(tabs[0].id);
                        setTimeout(() => {
                            logItem.innerText = "🔄 Retrying Auto-Fill...";
                            autoFillBtn.click();
                        }, 5000);
                        return;
                    }

                    if (response && response.status === 'scraped' && response.data) {
                        const data = response.data;

                        // Populate Fields
                        if (data.fullName) document.getElementById('fullName').value = data.fullName;
                        if (data.location) document.getElementById('location').value = data.location;

                        // Save Public Profile URL (Silent)
                        if (data.publicProfileUrl) {
                            chrome.storage.local.set({ publicProfileUrl: data.publicProfileUrl });
                        }

                        if (data.keywords) {
                            let k = data.keywords;
                            if (data.openToWork) k += " (Open to Work)";
                            document.getElementById('keywords').value = k;
                        }
                        if (data.experienceLevel) document.getElementById('experienceLevel').value = data.experienceLevel;

                        // Save Immediately
                        saveSettings();

                        let successMsg = "✅ Info Auto-Filled! Now setting up Questions...";
                        if (data.openToWork) successMsg += " (Open To Work Detected)";

                        logItem.innerText = successMsg;
                        logItem.style.color = 'green';

                        // --- ONBOARDING: Seed Common Questions ---
                        chrome.storage.local.get(['unknownQuestions'], (res) => {
                            const currentQs = res.unknownQuestions || [];
                            const commonQs = [
                                "How many years of work experience do you have with " + (data.keywords || "Software Development") + "?",
                                "Are you willing to relocate with an employer?",
                                "Will you now, or in the future, require sponsorship for employment visa status (e.g. H-1B visa status)?",
                                "Do you have a valid driver's license?",
                                "What is your notice period?"
                            ];

                            // Add only unique new questions
                            const newQs = [...new Set([...currentQs, ...commonQs])];

                            chrome.storage.local.set({ unknownQuestions: newQs }, () => {
                                // Redirect to Library Tab
                                setTimeout(() => {
                                    document.querySelector('[data-tab="settings"]').click();
                                    document.querySelector('[data-subtab="library"]').click();

                                    // Trigger re-render if possible (hacky directly, but updateUI loop might catch it or we just reload)
                                    // Better: Call renderLibrary directly
                                    renderLibrary(newQs, {});

                                    alert("✅ Profile Loaded!\n\n👉 PLEASE ANSWER these common questions to automate applications faster!");
                                }, 1000);
                            });
                        });

                    } else {
                        logItem.innerText = "⚠️ Could not read profile. Make sure you are on your profile page.";
                        logItem.style.color = 'red';
                    }
                });
            }
        });
    });
}
