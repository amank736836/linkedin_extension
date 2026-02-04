# 🚀 LinkedIn Automator Pro

LinkedIn Automator Pro is a powerful, production-grade browser extension designed to streamline your LinkedIn experience. From automated job applications to smart network growth, this tool handles the repetitive tasks so you can focus on building meaningful professional connections.

---

## ✨ Key Features

### 🛠️ Smart Onboarding (Auto-Fill)
*   **Profile Analysis**: Automatically scrapes your Name, Headline, Location, and "About" section.
*   **Smart Seeding**: Automatically populates your Question Library with common application questions.
*   **guided Setup**: Seamlessly redirects you to critical settings to ensure you are ready for automation.

### 💼 Career Hub (Auto-Apply)
*   **High-Volume Applications**: Automate "Easy Apply" jobs with human-like delays.
*   **Filter Persistence**: Remembers your preferred Keywords, Location, and Seniority filters.
*   **Safety Limits**: Set a daily/session cap on applications to keep your account safe.

### 🤝 Network Growth (Auto-Connect)
*   **bulk Connection Requests**: Automatically sends invites to relevant professionals on the "Grow" page.
*   **Variable Delays**: Implements random wait times between requests to mimic human behavior.

### 🎂 Relation Manager (Catch-Up)
*   **Automated Greetings**: Sends personalized "Happy Birthday" or "Congratulations" messages for work anniversaries.
*   **Multiple Modes**: Choose to process all events or filter specifically for birthdays or career milestones.

### 🏢 Company Cleanup (Pages)
*   **Mass Unfollow/Follow**: Manage your following list by automatically processing company pages from search results.
*   **Scroll Limits**: Built-in protection to prevent infinite scrolling loops.

---

## 🛠️ Installation Guide

1.  **Download/Clone**: Ensure you have this project folder on your local machine.
2.  **Open Extensions Page**:
    *   Chrome: Go to `chrome://extensions/`
    *   Edge: Go to `edge://extensions/`
3.  **Developer Mode**: Toggle the **Developer mode** switch in the top-right corner.
4.  **Load Unpacked**: Click **Load unpacked** and select the `linkedin_extension` folder.
5.  **Pin for Ease**: Pin the "LinkedIn Automator Pro" icon for quick access.

---

## 📖 Guided Setup Flow

For new users, we recommend the following flow to get started in seconds:

1.  **Analyze Your Profile**:
    *   Navigate to your own LinkedIn Profile page.
    *   Open the extension and go to **Settings > Profile**.
    *   Click **✨ Auto-Fill Info from Profile**.
2.  **Setup the Library**:
    *   After auto-filling, you will be automatically taken to the **Library** tab.
    *   Answer the common questions seeded there (e.g., "Years of Experience"). These answers are used to fill job application forms automatically.
3.  **Set Your Filters**:
    *   Go to **Settings > Filters** and define your job search targets.
4.  **Start Automating**:
    *   Go to the **Apply** tab, set a target number, and click **Start**.

---

## 🛡️ Robustness & Safety

*   **Single-Task Mode**: The extension intelligently stops existing automation before starting a new one to prevent conflicts.
*   **Auto-Retry**: If the browser loses connection with the page, the extension will automatically reload the tab and retry the action after 5 seconds.
*   **DOM Resilience**: Uses multiple fallback selectors to identify UI elements even if LinkedIn changes their layout.

---

## 📂 Technical Architecture

This extension follows a **Modular Architecture** for maximum reliability:
*   `content.js`: The central orchestrator.
*   `features/*.js`: Dedicated logic for Apply, Connect, Catch-Up, and Pages.
*   `popup_scripts/*.js`: Clean separation of UI logic and state management.
*   `utils.js`: Shared utility and constant layer.

---

## ⚠️ Privacy & Ethics
*   **Data Locality**: All your data (Name, Email, Answers) is stored **locally** on your device using `chrome.storage`. No data is ever sent to external servers.
*   **Ethical Use**: This tool is designed for efficiency, not spam. We recommend using reasonable delays and following LinkedIn's professional community policies.

---

*Found a bug? Have a suggestion? Feel free to reach out!*

