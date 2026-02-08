// --- FEATURE: AUTO-WITHDRAW ---

window.startAutoWithdraw = async function () {
    if (LinkedInBot.isWithdrawing) return;
    LinkedInBot.isWithdrawing = true;

    // Confirm execution visually
    console.log('✅ Auto-Withdraw Script INVOKED!');

    log('🛡️ Starting Auto-Withdraw (Target: requests older than 2 weeks)...', 'INFO');

    // Ensure we are on the right page
    if (!window.location.href.includes('invitation-manager/sent')) {
        log('Redirecting to Sent Invitations page...', 'INFO');
        window.location.href = 'https://www.linkedin.com/mynetwork/invitation-manager/sent/';
        return;
    }

    await sleep(3000);

    let withdrawCount = 0;
    let scrollAttempts = 0;
    const MAX_SCROLLS = 50;

    log('🛡️ Starting Deep Clean (Limit: 50 scrolls)...', 'INFO');

    while (LinkedInBot.isWithdrawing && scrollAttempts < MAX_SCROLLS) {
        // SAFETY CHECK
        await handleSecurityCheckpoint();
        if (!LinkedInBot.isWithdrawing) break;

        scrollAttempts++;
        log(`🔄 Scan Cycle ${scrollAttempts}/${MAX_SCROLLS}...`, 'INFO');

        // 1. Find all "Withdraw" buttons directly
        const allButtons = Array.from(document.querySelectorAll('button'));
        const withdrawBtns = allButtons.filter(b =>
            b.innerText.trim() === 'Withdraw' ||
            (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Withdraw'))
        );

        let cycleWithdrawals = 0;

        for (const btn of withdrawBtns) {
            if (!LinkedInBot.isWithdrawing) break;

            // Check if button is still in DOM (might have been removed if list shifted)
            if (!document.body.contains(btn)) continue;

            // Safety check
            await handleSecurityCheckpoint();

            // 2. Find container with "Sent" text nearby
            let container = btn.parentElement;
            let foundCard = false;
            let timeTextFound = "";
            let nameFound = "Unknown";

            // Traverse up to find the text
            for (let i = 0; i < 6; i++) {
                if (!container) break;
                const text = container.innerText.toLowerCase();

                // Check for "Sent" AND time unit (heuristic)
                if (text.includes('sent') && (text.includes('ago') || text.includes('week') || text.includes('month'))) {
                    foundCard = true;

                    // Extract just the line with "Sent" if possible for logging
                    const lines = container.innerText.split('\n');
                    const sentLine = lines.find(l => l.toLowerCase().includes('sent') && (l.toLowerCase().includes('ago') || l.toLowerCase().includes('week') || l.toLowerCase().includes('month')));

                    // Use full text if line not found
                    timeTextFound = sentLine ? sentLine.trim() : container.innerText;

                    // Try to grab name
                    const nameEl = container.querySelector('strong, .artdeco-entity-lockup__title, .invitation-card__title');
                    if (nameEl) nameFound = nameEl.innerText.trim();
                    else if (lines.length > 0) nameFound = lines[0].trim();

                    break;
                }
                container = container.parentElement;
            }

            if (!foundCard) continue;

            let shouldWithdraw = false;
            const lowerTimeText = timeTextFound.toLowerCase();

            // PARSING LOGIC
            if (lowerTimeText.includes('year') || lowerTimeText.includes('month')) {
                shouldWithdraw = true;
            } else if (lowerTimeText.includes('week')) {
                const match = lowerTimeText.match(/(\d+)\s+week/);
                if (match && parseInt(match[1]) >= 2) {
                    shouldWithdraw = true;
                }
            }

            if (shouldWithdraw) {
                log(`🗑️ Withdrawing request to ${nameFound} (${timeTextFound})...`, 'INFO');

                // The 'btn' variable is already the withdraw button we found
                if (btn) {
                    // Use same simple click as Auto-Connect works (line 145 in connect.js)
                    btn.click();

                    // Wait loop for modal (up to 3s)
                    let modal = null;
                    for (let i = 0; i < 6; i++) {
                        await sleep(500);
                        // LinkedIn's modal has id="dialog-header", not role="dialog"
                        modal = document.querySelector('.artdeco-modal') ||
                            document.getElementById('dialog-header')?.parentElement ||
                            document.querySelector('[role="main"]');
                        if (modal) break;
                    }

                    let confirmBtn = null;
                    if (modal) {
                        // Find Primary Button (Blue one) inside Modal
                        confirmBtn = Array.from(modal.querySelectorAll('button')).find(b =>
                            b.classList.contains('artdeco-button--primary') ||
                            b.innerText.trim() === 'Withdraw' ||
                            (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Withdraw'))
                        );
                    } else {
                        // Fallback: Global search for Primary Withdraw Button (if modal container not found)
                        log('   ⚠️ Modal container not found. Scanning globally for Confirm button...', 'WARNING');
                        const allPrimary = Array.from(document.querySelectorAll('button.artdeco-button--primary'));
                        confirmBtn = allPrimary.find(b => b.innerText.trim() === 'Withdraw' && b !== btn && b.offsetParent !== null);
                    }

                    if (confirmBtn) {
                        log('   ✅ Clicking Confirm Button...', 'INFO');
                        confirmBtn.click(); // Simple click like Auto-Connect
                        await sleep(3000); // Wait for modal to close
                        withdrawCount++;
                        cycleWithdrawals++;
                        break; // Process one withdrawal per cycle to avoid rapid-fire
                    } else {
                        log('   ❌ Confirm button NOT found (Modal or Global).', 'ERROR');
                    }
                }
            }
        }

        if (!LinkedInBot.isWithdrawing) break;

        // SCROLL / LOAD MORE LOGIC
        log(`Cycle Complete. Withdrew: ${cycleWithdrawals}. Scrolling...`, 'INFO');

        // Revised Scroll Logic: Target specific LinkedIn layout containers (and ensure they exist)
        const scrollSelectors = [
            'section.scaffold-layout__list',
            'div.scaffold-layout__list',
            '#workspace',
            'div.artdeco-card'
        ];

        let scrolled = false;
        for (const selector of scrollSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                log(`   Found scroll container: ${selector}`, 'DEBUG');
                el.scrollTop = el.scrollHeight;
                scrolled = true;
                break;
            }
        }

        if (!scrolled) {
            // Fallback to window scroll
            window.scrollTo(0, document.body.scrollHeight);
        }

        await sleep(3000); // Wait for load

        // Check for "Show more results" button
        const showMoreBtn = Array.from(document.querySelectorAll('button')).find(b =>
            b.innerText.toLowerCase().includes('show more results') ||
            b.classList.contains('scaffold-layout__list-show-more-button')
        );

        if (showMoreBtn) {
            log('Found "Show more results" button. Clicking...', 'INFO');
            showMoreBtn.click();
            await sleep(3000);
        } else {
            // If we didn't find one, check if we are truly at the end (maybe via a footer or logic).
            // For now, let's keep scrolling until MAX_SCROLLS to be safe, as infinite scroll might just need scrolling.
        }
    }

    // Clear flag on complete
    LinkedInBot.isWithdrawing = false;
    chrome.storage.local.set({ withdrawRunning: false });
    log(`🎉 Auto-Withdraw complete (or stopped). Removed ${withdrawCount} old requests.`, 'INFO');
};

window.stopAutoWithdraw = function () {
    LinkedInBot.isWithdrawing = false;
    chrome.storage.local.set({ withdrawRunning: false });
    log('🛑 Stopping Auto-Withdraw...', 'WARNING');
};

// --- INITIALIZATION ---
// Check if we should auto-start (after reload)
(async function init() {
    const data = await chrome.storage.local.get('withdrawRunning');
    if (data.withdrawRunning) {
        log('🔄 Auto-Withdraw Persistence Detected. Resuming...', 'INFO');
        setTimeout(() => {
            if (typeof window.startAutoWithdraw === 'function') {
                window.startAutoWithdraw();
            }
        }, 2000);
    }
})();
