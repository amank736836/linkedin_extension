// --- CONTENT SCRIPT ORCHESTRATOR ---

// Ensure LinkedInBot is initialized
window.LinkedInBot = window.LinkedInBot || {};

log('LinkedIn Automator Content Script Loaded (Modular).', 'INFO');

// --- HELPER: Stop All Automation ---
function stopAllAutomation() {
    log('🛑 Stopping ALL other automation tasks (Single-Task Mode).', 'INFO');

    // Stop Flags
    LinkedInBot.isRunning = false;      // Apply
    LinkedInBot.isConnecting = false;   // Connect
    LinkedInBot.isCatchingUp = false;   // CatchUp
    LinkedInBot.isPagesRunning = false; // Pages

    // Clear Persistence Flags
    chrome.storage.local.set({
        autoConnectRunning: false,
        catchUpRunning: false
    });
}

// --- MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 1. Start Automation (Easy Apply)
    if (request.action === 'start') {
        stopAllAutomation(); // Enforce mutual exclusion

        setTimeout(() => {
            startAutomation(request.settings);
        }, 500);
        sendResponse({ status: 'started' });
    }
    // 2. Stop Automation
    else if (request.action === 'stop') {
        LinkedInBot.isRunning = false;
        sendResponse({ status: 'stopped' });
    }
    // 3. Start Auto-Connect
    else if (request.action === 'startConnect') {
        log('📩 Received startConnect command!', 'INFO');
        stopAllAutomation(); // Enforce mutual exclusion

        setTimeout(() => {
            startAutoConnect(request.settings);
        }, 500);
        sendResponse({ status: 'connecting' });
    }
    // 4. Stop Connect
    else if (request.action === 'stopConnect') {
        LinkedInBot.isConnecting = false;
        chrome.storage.local.set({ autoConnectRunning: false });
        sendResponse({ status: 'stopped' });
    }
    // 5. Start Catch-Up
    else if (request.action === 'startCatchUp') {
        log('📩 Received startCatchUp command!', 'INFO');
        stopAllAutomation(); // Enforce mutual exclusion

        setTimeout(() => {
            startAutoCatchUp(request.settings);
        }, 500);
        sendResponse({ status: 'catchingUp' });
    }
    // 6. Stop Catch-Up
    else if (request.action === 'stopCatchUp') {
        LinkedInBot.isCatchingUp = false;
        sendResponse({ status: 'stopped' });
    }
    // 7. Start Pages
    else if (request.action === 'startPages') {
        stopAllAutomation(); // Enforce mutual exclusion

        setTimeout(() => {
            runPagesAutomation(request.settings);
        }, 500);
        sendResponse({ status: 'pagesRunning' });
    }
    // 8. Stop Pages
    else if (request.action === 'stopPages') {
        LinkedInBot.isPagesRunning = false;
        sendResponse({ status: 'stopped' });
    }
    // 9. Get Status (Sync UI)
    else if (request.action === 'getStatus') {
        sendResponse({
            isRunning: LinkedInBot.isRunning,
            applicationCount: LinkedInBot.applicationCount,
            isConnecting: LinkedInBot.isConnecting,
            connectCount: LinkedInBot.connectCount,
            isCatchingUp: LinkedInBot.isCatchingUp,
            catchUpCount: LinkedInBot.catchUpCount,
            isPagesRunning: LinkedInBot.isPagesRunning,
            pagesCount: LinkedInBot.pagesCount
        });
    }
    // 10. Scrape Profile (Onboarding)
    else if (request.action === 'scrapeProfile') {
        if (typeof window.scrapeProfileData === 'function') {
            window.scrapeProfileData().then(data => {
                sendResponse({ status: 'scraped', data });
            });
            return true;
        } else {
            sendResponse({ status: 'error', message: 'Scraper not loaded' });
        }
    }
    // 11. Start Auto-Withdraw
    else if (request.action === 'startWithdraw') {
        log('📩 Received startWithdraw command! Checking for feature script...', 'INFO');
        stopAllAutomation();

        setTimeout(() => {
            if (typeof window.startAutoWithdraw === 'function') {
                log('🚀 Invoking window.startAutoWithdraw()...', 'INFO');
                window.startAutoWithdraw();
            } else {
                log('❌ CRITICAL ERROR: window.startAutoWithdraw is NOT defined.', 'ERROR');
                log('   Ensure features/withdraw.js is loaded in manifest.json', 'ERROR');
            }
        }, 500);
        sendResponse({ status: 'withdrawing' });
    }
});

// --- PERSISTENCE INIT ---

// 1. Check Auto-Connect Persistence
chrome.storage.local.get(['autoConnectRunning', 'connectSettings', 'connectCount'], (data) => {
    if (data.autoConnectRunning) {
        if (window.location.href.includes('mynetwork/grow/')) {
            log('🔄 Persistent Auto-Resume detected. Restarting Auto-Connect in 4s... ⏱️', 'INFO');
            if (data.connectCount) LinkedInBot.connectCount = data.connectCount;

            // Ensure others are off
            LinkedInBot.isCatchingUp = false;
            LinkedInBot.isRunning = false;

            setTimeout(() => startAutoConnect(data.connectSettings || {}), 4000);
        } else {
            log('⚠️ Auto-Connect persistence flag is ON, but we are off-page. Pausing.', 'DEBUG');
        }
    }
});

// 2. Check Catch-Up Persistence (Redirect Recovery)
chrome.storage.local.get(['catchUpRunning', 'catchUpSettings'], (data) => {
    if (data.catchUpRunning) {
        const currentUrl = window.location.href;

        // CASE A: We are on the Catch-Up page (Resume)
        if (currentUrl.includes('mynetwork/catch-up/')) {
            log('🔄 Catch-Up Persistence detected. Resuming in 4s... 🎂', 'INFO');

            // Ensure others are off
            LinkedInBot.isConnecting = false;

            setTimeout(() => startAutoCatchUp(data.catchUpSettings || {}), 4000);
        }
        // CASE B: We got navigated away (Redirect Back)
        else {
            log('🔀 Navigation away from Catch-Up detected! Redirecting back in 3s... 🔙', 'WARNING');
            setTimeout(() => {
                window.location.href = 'https://www.linkedin.com/mynetwork/catch-up/all/';
            }, 3000);
        }
    }
});
