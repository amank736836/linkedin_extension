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
