// --- FEATURE: AUTO-CONNECT ---

// Heuristics for skipping likely male profiles (if requested logic is active)
// Note: This logic was in the original file. Keeping it local to this feature.
const femaleHeuristics = {
    suffixes: ['a', 'i', 'shree', ' Lakshmi', ' Kumari', ' Kaur', ' Begum', ' Khatun', 'shika', 'nita', 'vya', 'mya', 'tya'],
    names: ['Anjali', 'Priya', 'Sneha', 'Deepika', 'Priyanka', 'Neha', 'Ritu', 'Kajal', 'Simran', 'Pooja', 'Sakshi', 'Ananya', 'Ishita']
};

function isLikelyFemale(name) {
    if (!name) return false;
    const n = name.toLowerCase().trim();
    if (femaleHeuristics.names.some(hn => n.startsWith(hn.toLowerCase()))) return true;
    if (n.endsWith('a') || n.endsWith('i') || n.endsWith('e')) return true;
    return femaleHeuristics.suffixes.some(s => n.endsWith(s.toLowerCase()));
}

window.startAutoConnect = async function (settings = {}) {
    if (LinkedInBot.isConnecting) return;

    // SAFETY CHECK INIT
    await handleSecurityCheckpoint();

    LinkedInBot.isConnecting = true;
    // Restore count if passed or valid
    LinkedInBot.connectCount = settings.startCount || LinkedInBot.connectCount || 0;
    const delay = settings.delay || 10;

    // PERSISTENCE: Save state so we can resume after reload
    chrome.storage.local.set({
        autoConnectRunning: true,
        connectSettings: settings,
        connectCount: LinkedInBot.connectCount
    });

    log(`🤝 Starting Refined Auto-Connect (Delay: ${delay}s)...`, 'INFO');

    const targetSections = [
        "People you may know based on your recent activity",
        "Software Engineers you may know",
        "People you may know in Greater Bengaluru Area",
        "People in the Software Development industry you may know",
        "People you may know from Chitkara University"
    ];

    while (LinkedInBot.isConnecting) {
        // Continuous Safety Check - PAUSE if needed
        await handleSecurityCheckpoint();
        if (!LinkedInBot.isConnecting) break; // Check if user stopped it manually during pause

        // Find and expand "Show all" buttons in target sections
        const sections = Array.from(document.querySelectorAll('section, .artdeco-card'));
        for (const section of sections) {
            const header = section.querySelector('h2, h3, h4')?.innerText || "";
            if (targetSections.some(ts => header.includes(ts))) {
                const showAllBtn = section.querySelector('button[aria-label*="Show all"], button[aria-label*="See all"]');
                if (showAllBtn) {
                    log(`Expanding section: ${header}`, 'DEBUG');
                    showAllBtn.click();
                    await sleep(3000); // Wait for modal to open
                }
            }
        }

        // Check if a modal is open
        const modal = document.querySelector('.artdeco-modal');
        const container = modal || document;

        if (modal) {
            log('Processing profiles in popup modal...', 'DEBUG');
        }

        // Find all connect buttons
        const buttons = Array.from(container.querySelectorAll('button'))
            .filter(btn => btn.innerText.trim() === 'Connect' && !btn.disabled);

        if (buttons.length === 0) {
            if (modal) {
                const scrollable = modal.querySelector('.artdeco-modal__content') || modal;
                log('No more buttons in modal. Scrolling modal...', 'DEBUG');
                scrollable.scrollBy(0, 500);
                await sleep(2000);

                // If we scrolled and still no buttons, maybe we're done with the modal
                const stillNoButtons = Array.from(container.querySelectorAll('button'))
                    .filter(btn => btn.innerText.trim() === 'Connect' && !btn.disabled).length === 0;

                if (stillNoButtons) {
                    log('Finished with modal. Closing...', 'INFO');
                    modal.querySelector('button[aria-label*="Dismiss"], .artdeco-modal__dismiss')?.click();
                    await sleep(1000);
                }
            } else {
                log('No more connect buttons found. Scrolling page...', 'INFO');
                window.scrollBy(0, 1000);
                await sleep(3000);

                if (document.body.scrollHeight - window.scrollY < 1500) {
                    log('Reached end of available profile cards. Reloading for fresh leads in 5s...', 'WARNING');
                    await sleep(5000);
                    window.scrollTo(0, 0);
                    // Save state is handled in the main loop, but ensure we don't lose the flag
                    chrome.storage.local.set({ autoConnectRunning: true });
                    window.location.reload();
                    return; // Stop script execution here
                }
            }
            continue;
        }

        for (const btn of buttons) {
            if (!LinkedInBot.isConnecting) break;

            // Enhanced Limit Check (Modals & Toasts)
            const limitElement = document.querySelector('.artdeco-modal') || document.querySelector('div[role="alert"]') || document.querySelector('.artdeco-toast');
            if (limitElement) {
                const text = limitElement.innerText.toLowerCase();
                if (text.includes('reached the weekly limit') || text.includes('reached your weekly limit') || text.includes('invitation was not sent')) {
                    log('⛔ Weekly limit detected! Stopping.', 'WARNING');
                    LinkedInBot.isConnecting = false;
                    break;
                }
            }

            const card = btn.closest('.artdeco-card, li, div[class*="discover-entity-type-card"], .artdeco-modal__content li');
            const name = card?.querySelector('[class*="name"], [class*="title"]')?.innerText || "";

            if (name && !isLikelyFemale(name)) {
                log(`Skipping ${name} (Likely Male)`, 'DEBUG');
                continue;
            }

            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(1000);

            log(`🤝 Connecting with: ${name || 'Member'}. Waiting ${delay}s...`, 'SUCCESS');
            btn.click();
            LinkedInBot.connectCount++;
            chrome.runtime.sendMessage({ action: 'updateConnectCount', count: LinkedInBot.connectCount });

            // Post-click check (catch immediate toasts/modals)
            await sleep(2000);
            const postClickCheck = document.querySelector('.artdeco-modal') || document.querySelector('div[role="alert"]') || document.querySelector('.artdeco-toast');
            if (postClickCheck) {
                const text = postClickCheck.innerText.toLowerCase();
                if (text.includes('reached the weekly limit') || text.includes('reached your weekly limit') || text.includes('invitation was not sent')) {
                    log('⛔ Weekly limit detected immediately! Stopping.', 'WARNING');
                    LinkedInBot.isConnecting = false;
                    break;
                }
            }

            // Wait remaining time
            if (delay > 2) await sleep((delay - 2) * 1000);
        }
    }

    LinkedInBot.isConnecting = false;
    log('🎉 Auto-Connect operation complete.', 'INFO');
};
