// --- FEATURE: AUTO-WITHDRAW ---

window.startAutoWithdraw = async function () {
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

    while (scrollAttempts < MAX_SCROLLS) {
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
                    btn.click();
                    await sleep(1500);

                    // Handle Confirmation Modal
                    const modal = document.querySelector('.artdeco-modal');
                    if (modal) {
                        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b =>
                            b.innerText.trim() === 'Withdraw' || b.classList.contains('artdeco-button--primary')
                        );
                        if (confirmBtn) {
                            confirmBtn.click();
                            await sleep(1500);
                            withdrawCount++;
                            cycleWithdrawals++;
                        }
                    }
                }
            }
        }

        // SCROLL / LOAD MORE LOGIC
        log(`Cycle Complete. Withdrew: ${cycleWithdrawals}. Scrolling...`, 'INFO');

        // Revised Scroll Logic: Target specific LinkedIn layout containers
        const scrollSelectors = [
            'section.scaffold-layout__list',
            'div.scaffold-layout__list',
            '#workspace',
            'div.artdeco-card' // Occasionally the card container itself
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

    log(`🎉 Auto-Withdraw complete. Removed ${withdrawCount} old requests.`, 'INFO');
};
