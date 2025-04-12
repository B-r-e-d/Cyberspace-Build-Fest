# TrustLens - Amazon Review Analysis Chrome Extension

TrustLens is a Chrome browser extension designed to analyze product reviews on Amazon pages in real-time, providing users with insights into the potential authenticity of the reviews. It leverages the Google Gemini API to assess various factors within the review text.

## Features

* **Real-time Analysis:** Scans reviews directly on Amazon product pages.
* **Suspicion Score:** Calculates an overall suspicion score for the product based on analyzed reviews.
* **Gemini-Powered Insights:** Uses Google's Gemini API to evaluate reviews based on criteria like:
    * Use of excessive superlatives and punctuation.
    * Generic or vague content lacking detail.
    * Likelihood of AI generation.
    * Unusual textual patterns.
* **Individual Review Badges:** Adds a small score badge (Green/Orange/Red) directly to each review on the page.
* **Detailed Popup:** Provides a breakdown of the analysis for each review in the extension popup, highlighting potential issues detected.
* **UI Integration:** Injects a summary block near the top of the Amazon product page.

## Setup and Installation

1.  **Clone or Download:** Get the code from this repository.
    ```bash
    git clone [https://github.com/](https://github.com/)<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>.git
    # or download the ZIP file
    ```
2.  **Get API Key:** Obtain an API key for the Google Gemini API from [Google AI Studio](https://aistudio.google.com/app/apikey).
3.  **Add API Key:** Open the `background.js` file in a text editor. Find the line:
    ```javascript
    const GEMINI_API_KEY = "AIzaSyBZkA8wmp_zKr3owWK1HrqfDUX9JvbvtRQ"; // <-- PASTE YOUR KEY HERE
    ```
    Replace `"AIzaSyBZkA8wmp_zKr3owWK1HrqfDUX9JvbvtRQ"` (or the placeholder `"PASTE_YOUR_KEY_HERE"`) with your actual Gemini API key. **Save the file.**
    * **Security Note:** Be cautious about committing your API key directly if the repository is public. Consider using environment variables or other configuration methods for more secure key management in production or shared environments. For personal use, embedding it might be acceptable.
4.  **Load Extension in Chrome:**
    * Open Google Chrome.
    * Go to `chrome://extensions/`.
    * Enable "Developer mode" using the toggle in the top-right corner.
    * Click "Load unpacked".
    * Select the folder containing the extension's files (the `TrustLens` folder where `manifest.json` is located).
    * The TrustLens extension should now appear in your list of extensions.

## Usage

1.  Navigate to a product page on an Amazon domain (e.g., amazon.com, amazon.co.uk).
2.  The extension will automatically activate after the page loads.
3.  A "TrustLens Review Analysis (Powered by Gemini)" block will appear near the top of the page, showing the overall product suspicion score.
4.  Individual reviews further down the page will have small circular badges indicating their individual suspicion score percentage.
5.  Click the "View Details" button in the main TrustLens block or click the TrustLens extension icon in your Chrome toolbar to open the popup, which shows a detailed breakdown for each analyzed review.

## Key Files

* `manifest.json`: Defines the extension's permissions, scripts, and core properties.
* `content.js`: Injected into Amazon pages to scrape reviews, display badges, inject the UI block, and communicate with the background script.
* `background.js`: Service worker that handles communication with the Gemini API and stores analysis results. **Requires your API key.**
* `popup.html` / `popup.js` / `styles.css`: Define the structure, logic, and styling for the extension's popup window that shows detailed analysis results.
* `icons/`: Contains the extension icons.

---

*This extension uses the Google Gemini API for analysis. Ensure you adhere to Google's API usage policies.*
