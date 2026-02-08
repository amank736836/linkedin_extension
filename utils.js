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
        customLibrary: {},
        dailyConnectLimit: 1000,
        distributionStrategy: 'standard'
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

// Randomized sleep for human-like behavior (base ± variance)
window.randomSleep = (baseMs, varianceMs = 1000) => {
    const randomDelay = baseMs + (Math.random() * varianceMs * 2) - varianceMs;
    return new Promise(resolve => setTimeout(resolve, Math.max(500, randomDelay)));
};

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

        await randomSleep(2000, 1000); // 1-3 seconds
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

// STATS MANAGER (Comprehensive Analytics)
window.StatsManager = {
    // Default state structure
    defaults: {
        apply: { total: 0, weekly: 0, daily: 0, lastReset: Date.now() },
        connect: { total: 0, weekly: 0, daily: 0, lastReset: Date.now() },
        catchup: { total: 0, weekly: 0, daily: 0, lastReset: Date.now() },
        pages: { total: 0, weekly: 0, daily: 0, lastReset: Date.now() },
        withdraw: { total: 0, weekly: 0, daily: 0, lastReset: Date.now() },
        weekStartDate: Date.now()
    },

    state: null,

    init: async function () {
        return new Promise((resolve) => {
            chrome.storage.local.get(['stats'], (data) => {
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000;
                const oneWeekMs = 7 * oneDayMs;

                let stats = data.stats || JSON.parse(JSON.stringify(this.defaults));

                // Calculate Monday-Sunday week boundaries
                const getMondayOfWeek = (timestamp) => {
                    const date = new Date(timestamp);
                    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                    const diff = (day === 0 ? -6 : 1 - day); // If Sunday, go back 6 days; otherwise go back to Monday
                    const monday = new Date(date);
                    monday.setDate(date.getDate() + diff);
                    monday.setHours(0, 0, 0, 0); // Start of Monday
                    return monday.getTime();
                };

                const currentWeekStart = getMondayOfWeek(now);
                const previousWeekStart = stats.weekStartDate || 0;

                // Helper to reset daily/weekly if needed
                const checkReset = (type) => {
                    const last = stats[type].lastReset || 0;

                    // Daily Reset Check (using date comparison)
                    const lastDate = new Date(last).toDateString();
                    const nowDate = new Date(now).toDateString();

                    if (lastDate !== nowDate) {
                        stats[type].daily = 0;
                        stats[type].lastReset = now;
                    }

                    // Weekly Reset Check (Monday-Sunday boundary)
                    if (currentWeekStart > previousWeekStart) {
                        stats[type].weekly = 0;
                    }
                };

                // Check resets for all types
                ['apply', 'connect', 'catchup', 'pages', 'withdraw'].forEach(checkReset);

                // Global Weekly Timer Reset (Monday-Sunday boundary)
                if (currentWeekStart > previousWeekStart) {
                    stats.weekStartDate = currentWeekStart;
                    log('📅 Stats Weekly Cycle Reset! (Monday Start)', 'INFO');
                }

                this.state = stats;
                chrome.storage.local.set({ stats: this.state });
                resolve(this.state);
            });
        });
    },

    increment: function (type) {
        if (!this.state) return; // Should run init first

        // Ensure type exists
        if (!this.state[type]) this.state[type] = { total: 0, weekly: 0, daily: 0, lastReset: Date.now() };

        this.state[type].total++;
        this.state[type].weekly++;
        this.state[type].daily++;

        chrome.storage.local.set({ stats: this.state });

        // Broadcast update for UI
        try {
            chrome.runtime.sendMessage({ action: 'statsUpdated', stats: this.state });
        } catch (e) { }
    },

    getStats: function () {
        return this.state;
    }
};

// --- LEGACY WeeklyManager (Kept for backward compatibility if needed, but StatsManager supersedes) ---
// We can now alias or deprecate it, but let's keep it simple and just use StatsManager moving forward.
// The WeeklyManager.increment is handled by StatsManager.increment('connect') now.
window.WeeklyManager = {
    init: async function () { await window.StatsManager.init(); return window.StatsManager.state.connect; }, // Adapt return to expected? No, refactor consumers.
    getDailyTarget: function (weeklyLimit, strategy) {
        // Use StatsManager data
        if (!window.StatsManager.state) return 0;

        const state = window.StatsManager.state;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const daysElapsed = Math.floor((now - state.weekStartDate) / oneDayMs);
        const daysRemaining = Math.max(1, 7 - daysElapsed);
        const budgetLeft = Math.max(0, weeklyLimit - state.connect.weekly);

        log(`📅 Weekly Status: ${state.connect.weekly}/${weeklyLimit} used. Days Left: ${daysRemaining}.`, 'INFO');

        if (budgetLeft <= 0) return 0;

        let dailyTarget = 0;
        switch (strategy) {
            case 'front_load':
                if (daysElapsed < 3) dailyTarget = Math.ceil((budgetLeft / daysRemaining) * 1.5);
                else dailyTarget = Math.ceil(budgetLeft / daysRemaining);
                break;
            case 'even':
            case 'standard':
            default:
                dailyTarget = Math.ceil(budgetLeft / daysRemaining); // Even split usually safer for standard calculation base
                if (strategy === 'standard') dailyTarget = budgetLeft; // Standard = allow full access up to daily cap
                break;
        }

        // Add variance
        if (dailyTarget > 5) {
            dailyTarget += (Math.floor(Math.random() * 5) - 2);
        }
        return Math.max(0, dailyTarget);
    }
};
