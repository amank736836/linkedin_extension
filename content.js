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

async function startAutoConnect(settings = {}) {
    if (isConnecting) return;
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
    } else if (request.action === 'getStatus') {
        sendResponse({ isRunning, applicationCount, isConnecting, connectCount });
    }
});
