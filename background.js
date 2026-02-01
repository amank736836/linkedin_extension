chrome.runtime.onInstalled.addListener(() => {
    console.log("LinkedIn Automator Extension Installed.");
});

// We can also use this for persistent logging if needed later
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logBackground') {
        console.log("Background Log:", request.message);
    }
});
