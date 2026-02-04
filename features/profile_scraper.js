// --- FEATURE: PROFILE SCRAPER ---

window.scrapeProfileData = async function () {
    log('🔍 Analyzing LinkedIn Profile...', 'INFO');

    // 1. Verify we are on a profile page
    if (!window.location.href.includes('/in/')) {
        log('⚠️ Not on a Profile Page. Please open your LinkedIn Profile.', 'WARNING');
        return null;
    }

    const data = {};

    // --- 2. SCRAPE NAME (Robust Strategy) ---
    // Try standard classes
    let nameEl = document.querySelector('h1.text-heading-xlarge, h1.text-heading-large');

    // Fallback 1: Any H1 in the top card
    if (!nameEl) nameEl = document.querySelector('.pv-top-card-profile-picture')?.nextElementSibling?.querySelector('h1');

    // Fallback 2: Generic H1 (last resort, checking if it looks like a name)
    if (!nameEl) {
        const h1s = Array.from(document.querySelectorAll('h1'));
        // usually the first H1 is the name on profile pages
        if (h1s.length > 0) nameEl = h1s[0];
    }

    // Fallback 3: Meta tag fallback
    if (!nameEl) {
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
            data.fullName = metaTitle.content.split(' - ')[0]; // "Name - Title | LinkedIn"
            log(`   ✅ Name (from Meta): ${data.fullName}`, 'SUCCESS');
        }
    }

    if (nameEl && !data.fullName) {
        data.fullName = nameEl.innerText.trim();
        log(`   ✅ Name: ${data.fullName}`, 'SUCCESS');
    }

    if (!data.fullName) log('   ❌ Name extraction failed (Please report this).', 'ERROR');


    // --- 3. SCRAPE HEADLINE ---
    const headlineEl = document.querySelector('.text-body-medium.break-words, [data-generated-suggestion-target]');
    if (headlineEl) {
        data.headline = headlineEl.innerText.trim();
        log(`   ✅ Headline: ${data.headline}`, 'SUCCESS');
    }


    // --- 4. SCRAPE LOCATION ---
    const locEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words, .pv-text-details__left-panel .text-body-small');
    if (locEl) {
        data.location = locEl.innerText.trim();
        log(`   ✅ Location: ${data.location}`, 'SUCCESS');
    }


    // --- 5. SCRAPE ABOUT (Summary) ---
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
        // LinkedIn sections usually have a sibling div with the content or is inside a section
        // Finding the text content nearby
        const aboutContainer = aboutSection.closest('section')?.querySelector('.inline-show-more-text, .pv-about__summary-text');
        if (aboutContainer) {
            const rawAbout = aboutContainer.innerText.trim();
            // Clean up "see more" artifacts
            data.about = rawAbout.replace(/\.\.\.\s*see more$/i, '').trim();
            log(`   ✅ About Section found (${data.about.length} chars).`, 'SUCCESS');
        }
    }


    // --- 6. SCRAPE OPEN TO WORK ---
    const openToSection = document.querySelector('main .pv-open-to-carousel');
    if (openToSection) {
        data.openToWork = true;
        log('   ✅ "Open to Work" badge detected.', 'SUCCESS');
    }

    // --- 7. SCRAPE PUBLIC PROFILE URL ---
    // Look for the "Public profile & URL" section in the right rail
    // Strategy: Find the header, then finding the link in the sibling container
    const rightRailHeaders = Array.from(document.querySelectorAll('h3, h2, div'));
    const publicProfileHeader = rightRailHeaders.find(el => el.innerText.trim() === "Public profile & URL");

    if (publicProfileHeader) {
        // Usually, the link is in a sibling or parent's sibling
        // DOM structure: Section -> Header ... Section -> Div -> Link
        // Let's look for an anchor tag in the closest container
        const container = publicProfileHeader.closest('section') || publicProfileHeader.parentElement.parentElement;
        const link = container ? container.querySelector('a[href*="linkedin.com/in/"]') : null;

        if (link) {
            data.publicProfileUrl = link.href;
            log(`   ✅ Public Profile URL: ${data.publicProfileUrl}`, 'SUCCESS');
        } else {
            // Fallback: Just use current URL if it looks canonical
            if (window.location.href.includes('/in/')) {
                data.publicProfileUrl = window.location.href.split('?')[0]; // Clean query params
                log(`   ⚠️ Could not find explicit link, using current URL: ${data.publicProfileUrl}`, 'WARNING');
            }
        }
    }


    // --- 8. POST-PROCESS KEYWORDS ---
    // Combine Headline + About for rich keywords
    let keywords = data.headline || "";
    if (data.about) {
        // Extract top skills? For now, we just prepend headline.
        // If headline is short, maybe we don't need to do much.
    }
    data.keywords = keywords; // Store for auto-fill


    // --- 8. INFER EXPERIENCE LEVEL ---
    if (data.keywords) {
        const lower = data.keywords.toLowerCase();
        if (lower.includes('student') || lower.includes('intern')) data.experienceLevel = "1"; // Internship
        else if (lower.includes('junior') || lower.includes('entry') || lower.includes('associate')) data.experienceLevel = "2"; // Entry
        else if (lower.includes('senior') || lower.includes('lead') || lower.includes('manager')) data.experienceLevel = "4"; // Mid-Senior
        else data.experienceLevel = "3"; // Associate (Default)
    }

    log('✅ Profile Analysis Complete.', 'INFO');
    return data;
};
