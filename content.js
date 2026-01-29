let isRunning = false;
let isConnecting = false;
let applicationCount = 0;
let connectCount = 0;
let userSettings = {
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
};

const log = (message, type = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    chrome.runtime.sendMessage({ action: 'log', message: logMessage });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fillForm() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    for (const input of inputs) {
        const labelText = (input.getAttribute('aria-label') ||
            input.getAttribute('placeholder') ||
            input.parentElement?.querySelector('label')?.innerText ||
            '').toLowerCase().trim();

        if (!labelText) continue;

        let value = "";
        if (labelText.includes('name') && labelText.includes('first')) value = userSettings.fullName.split(' ')[0];
        else if (labelText.includes('name') && labelText.includes('last')) value = userSettings.fullName.split(' ').pop();
        else if (labelText.includes('email')) value = userSettings.email;
        else if (labelText.includes('phone')) value = userSettings.phone;
        else if (labelText.includes('salary') || labelText.includes('expected')) value = userSettings.salary;
        else if (labelText.includes('notice')) value = userSettings.notice;
        else if (userSettings.customLibrary && userSettings.customLibrary[labelText]) {
            value = userSettings.customLibrary[labelText];
            log(`Found answer in library for: "${labelText}"`, 'SUCCESS');
        }

        if (value) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Radio buttons
    document.querySelectorAll('fieldset').forEach(fs => {
        const text = fs.innerText.toLowerCase();
        if (text.includes('authorized')) {
            const yes = Array.from(fs.querySelectorAll('label')).find(l => l.innerText.includes('Yes'));
            if (yes) yes.click();
        } else if (userSettings.customLibrary) {
            // Check library for fieldset questions
            const question = fs.querySelector('legend')?.innerText.toLowerCase().trim();
            if (question && userSettings.customLibrary[question]) {
                const answer = userSettings.customLibrary[question];
                const option = Array.from(fs.querySelectorAll('label')).find(l => l.innerText.trim() === answer);
                if (option) option.click();
            }
        }
    });
}

async function startAutomation(settings) {
    if (isRunning) return;
    isRunning = true;
    userSettings = settings;
    const targetCount = parseInt(settings.maxApps) || 43;

    log('🚀 Starting Automation Run...', 'INFO');

    while (applicationCount < targetCount && isRunning) {
        const cards = document.querySelectorAll('li[data-occludable-job-id]');
        log(`Found ${cards.length} jobs on this page.`, 'INFO');

        for (let i = 0; i < cards.length && applicationCount < targetCount && isRunning; i++) {
            log(`Processing job ${i + 1}/${cards.length} (Total: ${applicationCount}/${targetCount})`, 'INFO');
            cards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(2000);

            const link = cards[i].querySelector('a.job-card-list__title--link');
            if (link) {
                const jobUrl = link.href;
                link.click();
                await sleep(3000);

                const applyBtn = document.querySelector('button.jobs-apply-button');
                if (applyBtn && !applyBtn.innerText.includes('Applied')) {
                    log('Clicking Easy Apply...', 'INFO');
                    applyBtn.click();
                    await sleep(2000);

                    let formHandlingAttempts = 0;
                    let success = false;

                    while (formHandlingAttempts < 5 && isRunning) {
                        await fillForm();

                        const submit = document.querySelector('button[aria-label*="Submit"]');
                        if (submit) {
                            submit.click();
                            applicationCount++;
                            log(`✓ Applied! Waiting 45s...`, 'SUCCESS');
                            chrome.runtime.sendMessage({ action: 'updateCount', count: applicationCount });
                            await sleep(45000);
                            document.querySelector('button[aria-label*="Dismiss"]')?.click();
                            success = true;
                            break;
                        } else {
                            const next = document.querySelector('button[aria-label*="Next"], button[aria-label*="Review"]');
                            if (next) {
                                log('Moving to next step...', 'INFO');
                                next.click();
                                await sleep(2000);
                                formHandlingAttempts++;
                            } else {
                                log('⚠️ Form stalled or unknown question detected.', 'WARNING');
                                break;
                            }
                        }
                    }

                    if (!success && isRunning) {
                        log('⚠️ Saving unknown questions to library...', 'WARNING');
                        const unanswered = [];
                        document.querySelectorAll('input:invalid, .artdeco-text-input--error input').forEach(el => {
                            const lbl = el.parentElement?.querySelector('label')?.innerText || el.getAttribute('aria-label');
                            if (lbl) unanswered.push(lbl.trim());
                        });

                        if (unanswered.length > 0) {
                            chrome.storage.local.get('unknownQuestions', (data) => {
                                const existing = data.unknownQuestions || [];
                                const combined = [...new Set([...existing, ...unanswered])];
                                chrome.storage.local.set({ unknownQuestions: combined });
                            });
                        }

                        document.querySelector('button[aria-label*="Dismiss"]')?.click();
                    }
                } else {
                    log('Skipping job (already applied or no Easy Apply button)', 'DEBUG');
                }
            }
        }

        // Pagination: Look for "Next" button
        if (applicationCount < targetCount && isRunning) {
            log('Finished page, looking for Next page...', 'INFO');
            const nextLink = document.querySelector('button.jobs-search-pagination__button--next');
            const pageNumbers = document.querySelectorAll('.jobs-search-pagination__indicator');

            if (nextLink && !nextLink.disabled) {
                log('Moving to next page...', 'INFO');
                nextLink.click();
                await sleep(5000); // Wait for page load
            } else {
                log('No more pages found.', 'WARNING');
                break;
            }
        }
    }

    isRunning = false;
    log('🎉 Automation finished or stopped.', 'INFO');
}

// --- SAFETY: Check for Captcha/checkpoint ---
function checkForSecurityCheckpoint() {
    const bodyText = document.body.innerText.toLowerCase();
    const suspiciousPhrases = ['security check', 'verify you are human', 'suspicious activity', 'restricted account', 'captcha', 'verification required', 'please verify', 'identity verification'];
    const captchaFrame = document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha"]');
    const checkpointHeader = document.querySelector('.checkpoint-header, #captcha-challenge');

    if (captchaFrame || checkpointHeader || suspiciousPhrases.some(p => bodyText.includes(p) && bodyText.length < 5000)) {
        log('🚨 CRITICAL: Security Checkpoint Detected! Stopping all automation.', 'ERROR');
        isConnecting = false;
        isCatchingUp = false;
        isRunning = false;
        alert('⚠️ Automation STOPPED due to LinkedIn Security Check. Please verify manually.');
        return true;
    }
    return false;
}

async function startAutoConnect(settings = {}) {
    if (isConnecting) return;

    // SAFETY CHECK INIT
    if (checkForSecurityCheckpoint()) return;

    isConnecting = true;
    const delay = parseInt(settings.connectDelay) || 10;
    log(`🤝 Starting Refined Auto-Connect (Delay: ${delay}s)...`, 'INFO');

    const targetSections = [
        "People you may know based on your recent activity",
        "Software Engineers you may know",
        "People you may know in Greater Bengaluru Area",
        "People in the Software Development industry you may know",
        "People you may know from Chitkara University"
    ];

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

    while (isConnecting) {
        // Continuous Safety Check
        if (checkForSecurityCheckpoint()) break;

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
                    log('Reached end of available profile cards.', 'WARNING');
                    break;
                }
            }
            continue;
        }

        for (const btn of buttons) {
            if (!isConnecting) break;

            // Enhanced Limit Check (Modals & Toasts)
            const limitElement = document.querySelector('.artdeco-modal') || document.querySelector('div[role="alert"]') || document.querySelector('.artdeco-toast');
            if (limitElement) {
                const text = limitElement.innerText.toLowerCase();
                if (text.includes('reached the weekly limit') || text.includes('reached your weekly limit') || text.includes('invitation was not sent')) {
                    log('⛔ Weekly limit detected! Stopping.', 'WARNING');
                    isConnecting = false;
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
            connectCount++;
            chrome.runtime.sendMessage({ action: 'updateConnectCount', count: connectCount });

            // Post-click check (catch immediate toasts/modals)
            await sleep(2000);
            const postClickCheck = document.querySelector('.artdeco-modal') || document.querySelector('div[role="alert"]') || document.querySelector('.artdeco-toast');
            if (postClickCheck) {
                const text = postClickCheck.innerText.toLowerCase();
                if (text.includes('reached the weekly limit') || text.includes('reached your weekly limit') || text.includes('invitation was not sent')) {
                    log('⛔ Weekly limit detected immediately! Stopping.', 'WARNING');
                    isConnecting = false;
                    break;
                }
            }

            // Wait remaining time
            if (delay > 2) await sleep((delay - 2) * 1000);
        }
    }

    isConnecting = false;
    log('🎉 Auto-Connect operation complete.', 'INFO');
}

let isCatchingUp = false;
let catchUpCount = 0;

async function startAutoCatchUp(settings = {}) {
    if (isCatchingUp) return;
    isCatchingUp = true;
    catchUpCount = 0;
    const type = settings.type || 'all';

    log(`🎂 Starting Catch-Up (${type})...`, 'INFO');

    // Scroll Loop: Retry up to 5 times if no contacts found or exhausted
    let scrollAttempts = 0;
    const maxScrolls = 5;

    // Load processed names from Storage (Persistent Memory)
    let processedNames = new Set();
    try {
        const data = await chrome.storage.local.get('catchUpProcessed');
        if (data.catchUpProcessed) {
            processedNames = new Set(data.catchUpProcessed);
            log(`🧠 Loaded ${processedNames.size} known contacts from memory.`, 'INFO');
        }
    } catch (e) { console.error(e); }

    while (isCatchingUp && scrollAttempts < maxScrolls) {

        if (checkForSecurityCheckpoint()) break; // SAFETY STOP

        // 1. Find all visible Cards (more robust than just finding links)
        const cards = Array.from(document.querySelectorAll('div[data-view-name="nurture-card"], li.artdeco-list__item'));

        log(`Found ${cards.length} cards on this screen. (Scroll ${scrollAttempts}/${maxScrolls})`, 'INFO');

        if (cards.length === 0) {
            log('No cards found. Scrolling down...', 'INFO');
            window.scrollBy(0, 800);
            await sleep(3000);
            scrollAttempts++;
            continue;
        }

        let actionTakenOnPage = false;

        for (const card of cards) {
            if (!isCatchingUp) break;

            const nameLines = card.innerText.split('\n');
            const name = nameLines ? nameLines[0].trim() : "Connection";

            if (processedNames.has(name)) {
                // log(`   ⏭️ Already processed ${name} (History). Skipping.`, 'DEBUG');
                continue;
            }

            // Mark as seen & SAVE to storage
            processedNames.add(name);
            chrome.storage.local.set({ 'catchUpProcessed': Array.from(processedNames) });

            const cardText = card.innerText.toUpperCase();

            // Filter by Type (Soft check based on text)
            if (type === 'birthday' && !cardText.includes('BIRTHDAY')) continue;
            if (type === 'career' && !(cardText.includes('ANNIVERSARY') || cardText.includes('JOB') || cardText.includes('POSITION'))) continue;

            // 1. LIKE ACTION (Independent check)
            // Strategy: Look for specific CTA first, then generic Like/React button
            // "Open reactions menu" is the key selector found in inspection (lowercase)
            let likeBtn = card.querySelector('button[aria-label="Open reactions menu"], button[aria-label*="reactions"], button[aria-label*="Say happy birthday"], button[aria-label*="Congratulate"], button[aria-label*="React"], button[aria-label^="Like"], .react-button__trigger');

            // Fallback: Check for ANY button with text "Like" inside the card if we couldn't find one
            if (!likeBtn) {
                const allCardBtns = Array.from(card.querySelectorAll('button'));
                likeBtn = allCardBtns.find(b => b.innerText.trim() === 'Like');
            }

            // RELIABLE CHECK: Check text color or SVG fill of the trigger button
            // If it is "Blue" (LinkedIn Blue is usually #0a66c2), it is Liked.
            // If it is "Grey" (rgba(0,0,0,0.6) or similar), it is Unliked.
            let isLiked = false;

            if (likeBtn) {
                // Check 1: Aria Pressed
                if (likeBtn.getAttribute('aria-pressed') === 'true') isLiked = true;

                // Check 2: Class "active"
                if (likeBtn.className.includes('active') || likeBtn.classList.contains('artdeco-button--primary')) isLiked = true;

                // Check 3: Computed Color (The real MVP)
                // Check 3: The "Blue Circle" (Definitive User Proof)
                // We check the RAW HTML for the hex code of the blue circle
                // User provided: <circle cx="12" ... fill="#378fe9">
                if (likeBtn.innerHTML.includes('#378fe9')) {
                    isLiked = true;
                }
            }

            if (likeBtn && !isLiked) {
                log(`   👍 Clicking Like for ${name}...`, 'INFO');
                likeBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await sleep(500);

                // STEP 1: Click the trigger to open the menu
                likeBtn.click();
                await sleep(800);

                // STEP 2: Find the specific "Like" reaction button in the document (it's often a portal outside the card)
                // Look for the "Like" tooltip or aria-label in the active reaction menu
                const reactionTray = document.querySelector('.artdeco-hoverable-content__content, .reactions-menu');
                let reactionOption = null;

                if (reactionTray) {
                    // Try to find the "Like" button inside the tray
                    reactionOption = reactionTray.querySelector('button[aria-label="Like"]');
                }

                // Fallback: If tray logic fails, sometimes the trigger click ITSELF is enough if it's not a hover menu?
                // But the user says it "only hover activates".
                // If we can't find the tray, maybe we need to double click or mouseover?
                // Let's try clicking the "Like" option if found, otherwise assume standard click worked? 
                // Actually, if the user sees the menu, we MUST click an option.

                if (reactionOption) {
                    log('      Found reaction tray option. Clicking...', 'DEBUG');
                    reactionOption.click();
                } else {
                    // Try searching globally for the "Like" button that just appeared (high z-index?)
                    const allLikeOptions = Array.from(document.querySelectorAll('button[aria-label="Like"]'));
                    // The one that is visible?
                    const visibleOption = allLikeOptions.find(b => b.offsetParent !== null && b !== likeBtn);
                    if (visibleOption) {
                        visibleOption.click();
                        log('      Found global reaction option. Clicked.', 'DEBUG');
                    } else {
                        log('      Could not find specific reaction option. Hoping standard click worked.', 'WARNING');
                    }
                }

                await sleep(1500);
                actionTakenOnPage = true;
            } else if (likeBtn && isLiked) {
                // log(`   👍 Already liked update for ${name}.`, 'DEBUG');
            } else {
                // Handle "Missing" case
                if (cardText.includes('MESSAGE SENT')) {
                    log(`   ℹ️ Like button unavailable for ${name} (Normal for sent Birthdays).`, 'DEBUG');
                } else {
                    log(`   ⚠️ Could not find Like button for ${name}.`, 'WARNING');
                }
            }

            // 2. MESSAGE ACTION
            if (cardText.includes('MESSAGE SENT')) {
                // log(`   Skipping Message for ${name} (Already Sent).`, 'DEBUG');
                continue;
            }

            const messageLink = card.querySelector('a[href*="/messaging/compose/"]');
            if (messageLink && messageLink.href.toUpperCase().includes('PROPURN')) {

                log(`🎂 Sending request to: ${name}...`, 'INFO');
                messageLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await sleep(1000);
                messageLink.click();
                await sleep(3500);
                actionTakenOnPage = true;

                // ... (Send Button Logic - EXACT SAME AS BEFORE) ...
                // Helper to find the button
                const findSendButton = () => {
                    // Strategy 1: SHADOW DOM (Confirmed location)
                    const shadowHost = document.querySelector('#interop-outlet');
                    if (shadowHost && shadowHost.shadowRoot) {
                        const shadowBtns = Array.from(shadowHost.shadowRoot.querySelectorAll('button.msg-form__send-button, button[type="submit"]'));
                        // Prefer the LAST one that is ENABLED
                        const enabledBtn = shadowBtns.reverse().find(b => !b.disabled);
                        if (enabledBtn) return enabledBtn;
                        if (shadowBtns.length > 0) return shadowBtns[shadowBtns.length - 1];
                    }
                    // Strategy 2: Global Search (Fallback for standard DOM)
                    const allBtns = Array.from(document.querySelectorAll('button'));
                    const candidates = allBtns.filter(b => {
                        const text = b.innerText.trim().toUpperCase();
                        return (text === 'SEND' || text === 'SUBMIT' || b.classList.contains('msg-form__send-button')) && b.offsetParent !== null;
                    });

                    // Prefer ENABLED one
                    const enabledGlobal = candidates.reverse().find(b => !b.disabled);
                    if (enabledGlobal) return enabledGlobal;

                    if (candidates.length > 0) return candidates[candidates.length - 1];
                    return null;
                };

                let sendBtn = null;
                for (let k = 0; k < 10; k++) { sendBtn = findSendButton(); if (sendBtn) break; await sleep(500); }

                if (sendBtn) {
                    // Wait for it to be enabled (Poll for 3s)
                    for (let k = 0; k < 6; k++) {
                        if (!sendBtn.disabled) break;
                        await sleep(500);
                    }

                    // Wake up logic...
                    if (sendBtn.disabled) {
                        log('   ⚠️ Send button is DISABLED. Form wake-up...', 'WARNING');
                        let textarea = null;
                        const shadowHost = document.querySelector('#interop-outlet');
                        if (shadowHost && shadowHost.shadowRoot) {
                            const textareas = shadowHost.shadowRoot.querySelectorAll('textarea, div[role="textbox"]');
                            if (textareas.length > 0) textarea = textareas[textareas.length - 1];
                        }
                        if (!textarea) textarea = document.querySelector('textarea, div[role="textbox"]');

                        if (textarea) {
                            textarea.focus();
                            // Dispatch multiple event types to force validation update
                            ['input', 'change', 'keydown', 'keyup'].forEach(eventType => {
                                textarea.dispatchEvent(new Event(eventType, { bubbles: true }));
                            });
                            await sleep(500);
                        }
                    }

                    // FINAL ATTEMPT: Click it anyway even if it says disabled (UI might be ahead of DOM)
                    log(`   ✉️ Clicking Send (Text: "${sendBtn.innerText.trim()}", Disabled: ${sendBtn.disabled})...`, 'DEBUG');

                    try {
                        sendBtn.disabled = false; // Force enable in DOM just in case
                        sendBtn.click();
                        sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    } catch (e) { log('   ❌ Click error: ' + e.message, 'ERROR'); }

                    catchUpCount++;
                    chrome.runtime.sendMessage({ action: 'updateCatchUpCount', count: catchUpCount });

                    log('   👀 Verifying message sent...', 'INFO');
                    let verified = false;
                    for (let v = 0; v < 10; v++) {
                        const c = messageLink.closest('.artdeco-card, li');
                        if (c && c.innerText.includes('Message sent')) { verified = true; log('   ✅ Verified.', 'SUCCESS'); break; }
                        await sleep(500);
                    }
                } else {
                    log('   ❌ Send button disabled.', 'ERROR');
                }
                await sleep(1500);
                const closeBtn = document.querySelector('button[aria-label*="Dismiss"], .msg-overlay-bubble-header__control--close-btn');
                if (closeBtn) closeBtn.click();
            } else {
                const closeBtn = document.querySelector('button[aria-label*="Dismiss"], .msg-overlay-bubble-header__control--close-btn');
                if (closeBtn) closeBtn.click();
            }

            await sleep(1000);
        }

        // --- SCROLL STRATEGY ---
        log(`FINISHED VIEW. Attempting to scroll...`, 'INFO');

        const workspace = document.getElementById('workspace');
        if (workspace) {
            const previousTop = workspace.scrollTop;

            // 1. Scroll ID="workspace" to Bottom
            log('   Usage: Scrolling "workspace" container...', 'DEBUG');
            workspace.scrollTop = workspace.scrollHeight;

            await sleep(2000);

            // 2. Incremental Scroll (to ensure trigger)
            workspace.scrollTop += 1000;

            await sleep(1000);

            // 3. Look for "Show more results" button
            const showMoreBtn = document.querySelector('button.scaffold-finite-scroll__load-button');
            if (showMoreBtn) {
                log('Found "Show more results" button. Clicking...', 'INFO');
                showMoreBtn.click();
                await sleep(3000);
            }

            // 5. Stuck Detection
            const currentTop = workspace.scrollTop;

            await sleep(3000);

            if (actionTakenOnPage) {
                scrollAttempts = 0;
            } else {
                if (Math.abs(currentTop - previousTop) < 10) {
                    log('⚠️ Workspace scroll stuck. Forcing...', 'WARNING');
                    workspace.scrollTop += 5000;
                    await sleep(2000);
                }
                scrollAttempts++;
            }
        } else {
            // Fallback to Window if workspace missing (unlikely now)
            window.scrollTo({ top: document.body.scrollHeight + 1000, behavior: 'smooth' });
            await sleep(3000);
            scrollAttempts++;
        }
    }

    isCatchingUp = false;
    log('🎉 Catch-Up operation complete.', 'INFO');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start') {
        startAutomation(request.settings);
        sendResponse({ status: 'started' });
    } else if (request.action === 'stop') {
        isRunning = false;
        sendResponse({ status: 'stopped' });
    } else if (request.action === 'startConnect') {
        startAutoConnect(request.settings);
        sendResponse({ status: 'connecting' });
    } else if (request.action === 'stopConnect') {
        isConnecting = false;
        sendResponse({ status: 'stopped' });
    } else if (request.action === 'startCatchUp') {
        log('📩 Received startCatchUp command!', 'INFO');
        startAutoCatchUp(request.settings);
        sendResponse({ status: 'catchingUp' });
    } else if (request.action === 'stopCatchUp') {
        isCatchingUp = false;
        sendResponse({ status: 'stopped' });
    } else if (request.action === 'getStatus') {
        sendResponse({ isRunning, applicationCount, isConnecting, connectCount, isCatchingUp, catchUpCount });
    }
});
