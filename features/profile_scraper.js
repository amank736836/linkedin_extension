// --- FEATURE: PROFILE SCRAPER ---

window.scrapeProfileData = async function () {
    log('🔍 Analyzing LinkedIn Profile...', 'INFO');

    // 1. Verify we are on a profile page
    if (!window.location.href.includes('/in/')) {
        log('⚠️ Not on a Profile Page. Please open your LinkedIn Profile.', 'WARNING');
        return null;
    }

    const data = {};

    // 2. Scrape Name
    // Usually h1.text-heading-xlarge or similar
    const nameEl = document.querySelector('h1.text-heading-xlarge, h1.text-heading-large');
    if (nameEl) {
        data.fullName = nameEl.innerText.trim();
        log(`   ✅ Name: ${data.fullName}`, 'SUCCESS');
    }

    // 3. Scrape Headline
    const headlineEl = document.querySelector('div.text-body-medium.break-words');
    if (headlineEl) {
        data.keywords = headlineEl.innerText.trim(); // Use headline as keywords? Or just part of it.
        // Or store it as 'about' if we had that field. 
        // For now, let's map it to "keywords" or ignore if too long.
        // Actually, user headline often contains "Software Engineer | React", which is perfect for keywords.
        log(`   ✅ Headline (Keywords): ${data.keywords}`, 'SUCCESS');
    }

    // 4. Scrape Location
    const locEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words');
    if (locEl) {
        data.location = locEl.innerText.trim();
        log(`   ✅ Location: ${data.location}`, 'SUCCESS');
    }

    // 5. Infer Experience Level (Naive check)
    // Looking for "years" or "Senior" in headline
    if (data.keywords) {
        const lower = data.keywords.toLowerCase();
        if (lower.includes('student') || lower.includes('intern')) data.experienceLevel = "1"; // Internship
        else if (lower.includes('junior') || lower.includes('entry')) data.experienceLevel = "2"; // Entry
        else if (lower.includes('senior') || lower.includes('lead')) data.experienceLevel = "4"; // Mid-Senior
        else data.experienceLevel = "3"; // Associate (Default)
    }

    log('✅ Profile Analysis Complete.', 'INFO');
    return data;
};
