// --- UTILS & SHARED STATE ---

// Define Global State on Window to ensure accessibility across modules
window.LinkedInBot = {
    isRunning: false,
    isConnecting: false,
    isCatchingUp: false,
    isPagesRunning: false,
    applicationCount: 0,
    connectCount: 0,
    catchUpCount: 0,
    pagesCount: 0,
    userSettings: {
        fullName: "Aman Kumar",
        email: "amankarguwal1@gmail.com",
        phone: "+916284736836",
        salary: "8 LPA",
        notice: "1 month",
        maxApps: "43",
        keywords: "software developer",
        location: "Bengaluru",
        datePosted: "r86400",
        experienceLevel: "2",
        workplaceType: "2",
        under10Apps: false,
        customLibrary: {}
    }
};

// Shortcuts for readable access (optional, but functions need to use 'LinkedInBot.x')
// We will use LinkedInBot.x everywhere to be safe.

window.log = (message, type = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    try {
        chrome.runtime.sendMessage({ action: 'log', message: logMessage });
    } catch (e) {
        console.warn('Logging error (popup likely closed):', e);
    }
};

window.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

window.handleSecurityCheckpoint = async () => {
    // Check for "I'm not a robot" or "Verify" screens
    if (document.body.innerText.includes('security check') ||
        document.querySelector('.challenge-dialog') ||
        document.querySelector('iframe[src*="captcha"]')) {

        log('Security Trigger: Captcha Iframe detected', 'WARNING'); // Log for debugging

        // Check if user has opted to ignore or stop
        // For now, we will PAUSE/STOP if it looks serious.
        // But per previous user instruction: "IGNORING per user request".
        log('⚠️ Security checkpoint potentially detected, but IGNORING per user request. Continuing...', 'WARNING');

        // Un-comment this to actually stop:
        /*
        LinkedInBot.isRunning = false;
        LinkedInBot.isConnecting = false;
        LinkedInBot.isCatchingUp = false;
        LinkedInBot.isPagesRunning = false;
        log('🛑 Security checkpoint detected! Stopping all automation for safety.', 'ERROR');
        */

        await sleep(2000);
    }
};

window.getSmartLimit = (target, variance) => {
    // Ensure target is a number
    target = parseInt(target, 10);
    if (isNaN(target)) return 0;

    // Calculate random variance: e.g. -10 to +10
    const randomVar = Math.floor(Math.random() * (variance * 2 + 1)) - variance;

    // Calculate new target
    let smartTarget = target + randomVar;

    // Ensure it's at least 1
    if (smartTarget < 1) smartTarget = 1;

    return smartTarget;
};

// WEEKLY MANAGER (Smart Scheduling)
window.WeeklyManager = {
    // defaults
    state: {
        weeklyConnectCount: 0,
        weekStartDate: Date.now(),
        lastResetDate: Date.now()
    },

    init: async function () {
        return new Promise((resolve) => {
            chrome.storage.local.get(['weeklyConnectCount', 'weekStartDate'], (data) => {
                const now = Date.now();
                const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

                // Initialize or Load
                if (!data.weekStartDate || (now - data.weekStartDate > oneWeekMs)) {
                    // Reset if > 7 days or first run
                    this.state.weekStartDate = now;
                    this.state.weeklyConnectCount = 0;
                    chrome.storage.local.set(this.state);
                    log('📅 Weekly Cycle Reset! Starting fresh week.', 'INFO');
                } else {
                    this.state.weekStartDate = data.weekStartDate;
                    this.state.weeklyConnectCount = data.weeklyConnectCount || 0;
                }
                resolve(this.state);
            });
        });
    },

    incrementCount: function () {
        this.state.weeklyConnectCount++;
        chrome.storage.local.set({ weeklyConnectCount: this.state.weeklyConnectCount });
    },

    getDailyTarget: function (weeklyLimit, strategy) {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const daysElapsed = Math.floor((now - this.state.weekStartDate) / oneDayMs);
        const daysRemaining = Math.max(1, 7 - daysElapsed);
        const budgetLeft = Math.max(0, weeklyLimit - this.state.weeklyConnectCount);

        log(`📅 Weekly Status: ${this.state.weeklyConnectCount}/${weeklyLimit} used. Days Left: ${daysRemaining}.`, 'INFO');

        if (budgetLeft <= 0) return 0;

        let dailyTarget = 0;

        switch (strategy) {
            case 'front_load':
                // Send more earlier in the week (e.g., 1.5x average)
                // If it's early (day 0-2), be aggressive. Late (day 5-6), tapering.
                if (daysElapsed < 3) {
                    dailyTarget = Math.ceil((budgetLeft / daysRemaining) * 1.5);
                } else {
                    dailyTarget = Math.ceil(budgetLeft / daysRemaining);
                }
                break;

            case 'even':
                // Evenly distribute remaining
                dailyTarget = Math.ceil(budgetLeft / daysRemaining);
                break;

            case 'standard':
            default:
                // Just use the budget left, but capped reasonably to avoid 100 in one day?
                // Actually, 'standard' usually implies user sets a fixed daily limit elsewhere.
                // But here we return what the manager THINKS the target should be.
                // If standard, we might just return the whole budget as "available" 
                // and let the daily limit cap it.
                dailyTarget = budgetLeft;
                break;
        }

        // Add small variance to look human (except if budget is very tight)
        if (dailyTarget > 5) {
            const variance = Math.floor(Math.random() * 5) - 2; // +/- 2
            dailyTarget += variance;
        }

        return Math.max(0, dailyTarget);
    }
};
