(function() {
  'use strict';

  // --- Configuration ---
  const WEIGHTS = {
    superlativesPunctuation: 0.40, // Matches background prompt key (adjusted for JS naming)
    genericContent: 0.30,
    aiWritten: 0.15,
    behaviorPatterns: 0.15,
  };

  // Helper function to get color based on score
  function getScoreColor(score) {
    if (score >= 70) return 'red';
    if (score >= 40) return 'orange';
    return 'green';
  }

  // Helper function to add score badge to individual reviews
  function addScoreBadgeToReview(reviewElement, score) {
     if (!reviewElement) return;
     const existingBadge = reviewElement.querySelector('.trustlens-review-badge');
     if (existingBadge) existingBadge.remove();

     const scoreBadge = document.createElement("div");
     scoreBadge.className = 'trustlens-review-badge';
     scoreBadge.style.position = "absolute";
     scoreBadge.style.top = "5px";
     scoreBadge.style.right = "5px";
     scoreBadge.style.width = "28px";
     scoreBadge.style.height = "28px";
     scoreBadge.style.borderRadius = "50%";
     scoreBadge.style.display = "flex";
     scoreBadge.style.alignItems = "center";
     scoreBadge.style.justifyContent = "center";
     scoreBadge.style.fontSize = "11px";
     scoreBadge.style.fontWeight = "bold";
     scoreBadge.style.color = "#fff";
     scoreBadge.style.backgroundColor = getScoreColor(score);
     scoreBadge.style.zIndex = "100";
     scoreBadge.style.boxShadow = "0 1px 1px rgba(0,0,0,0.2)";
     scoreBadge.textContent = `${Math.round(score)}%`;
     scoreBadge.title = `TrustLens Suspicion Score: ${Math.round(score)}%`;

     reviewElement.style.position = "relative"; // Ensure parent is relative
     reviewElement.appendChild(scoreBadge);
  }

  // --- Core Logic ---

  // Function to send text to background for Gemini analysis
  async function analyzeReviewWithGemini(reviewText) {
    console.log("TrustLens: Sending text to background for Gemini analysis:", reviewText.substring(0, 60) + "...");

    try {
      const response = await chrome.runtime.sendMessage({
        action: "analyzeWithGemini",
        text: reviewText
      });

      if (response && response.success && response.analysis) {
        const analysis = response.analysis;
        let suspicionScore = 0;
        let issues = []; // For popup details

        suspicionScore = ( (analysis.superlativesPunctuationScore || 0) * WEIGHTS.superlativesPunctuation) +
                         ( (analysis.genericContentScore || 0) * WEIGHTS.genericContent) +
                         ( (analysis.aiWrittenScore || 0) * WEIGHTS.aiWritten) +
                         ( (analysis.behaviorPatternsScore || 0) * WEIGHTS.behaviorPatterns);

        suspicionScore = Math.min(100, Math.round(suspicionScore * 100)); // Scale to percentage

        if (analysis.superlativesPunctuationScore >= 0.6) issues.push({ criterion: "Superlatives/Punctuation", score: analysis.superlativesPunctuationScore, weight: WEIGHTS.superlativesPunctuation*100 });
        if (analysis.genericContentScore >= 0.6) issues.push({ criterion: "Generic Content", score: analysis.genericContentScore, weight: WEIGHTS.genericContent*100 });
        if (analysis.aiWrittenScore >= 0.5) issues.push({ criterion: "Potential AI Content", score: analysis.aiWrittenScore, weight: WEIGHTS.aiWritten*100 });
        if (analysis.behaviorPatternsScore >= 0.5) issues.push({ criterion: "Textual Patterns", score: analysis.behaviorPatternsScore, weight: WEIGHTS.behaviorPatterns*100 });

        console.log(`TrustLens: Gemini analysis received for review (Score: ${suspicionScore}%)`);
        return {
          text: reviewText, // Return the cleaned text
          issues: issues,
          suspicionScore: suspicionScore
        };

      } else {
        console.error("TrustLens: Failed to get Gemini analysis from background.", response ? response.error : "No response");
        return null;
      }
    } catch (error) {
      if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
          console.error("TrustLens: Connection error sending message to background. Is the extension enabled/updated?", error.message);
      } else {
          console.error("TrustLens: Error sending message to background script:", error);
      }
      return null;
    }
  }

  // Function to inject the TrustLens UI block into the page
  function injectTrustLensUI(score, analysisResults) {
      const potentialTargets = ['#rightCol', '#centerCol', '#desktop_buybox', '#buybox', '#detailBulletsWrapper_feature_div'];
      let targetContainer = null;
      for (const selector of potentialTargets) {
          const element = document.querySelector(selector);
          if (element) {
              targetContainer = element;
              console.log("TrustLens: Found target container:", selector);
              break;
          }
      }

      if (!targetContainer) {
          console.error("TrustLens: Could not find suitable target container for UI injection.");
          return;
      }

      const existingBlock = document.getElementById('trustlens-ui-block');
      if (existingBlock) existingBlock.remove();

      const uiBlock = document.createElement('div');
      uiBlock.id = 'trustlens-ui-block';
      uiBlock.style.border = '1px solid #ccc';
      uiBlock.style.borderRadius = '4px';
      uiBlock.style.padding = '15px';
      uiBlock.style.marginTop = '15px';
      uiBlock.style.marginBottom = '15px';
      uiBlock.style.backgroundColor = '#f8f8f8';
      uiBlock.style.fontFamily = 'Arial, sans-serif';
      uiBlock.style.fontSize = '14px';
      uiBlock.style.lineHeight = '1.5';
      uiBlock.style.color = '#333';
      uiBlock.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

      const title = document.createElement('h3');
      title.textContent = 'TrustLens Review Analysis (Powered by Gemini)'; // Uses updated text
      title.style.fontSize = '16px'; title.style.fontWeight = 'bold'; title.style.marginBottom = '12px'; title.style.marginTop = '0'; title.style.color = '#0F1111';
      uiBlock.appendChild(title);

      const scoreRow = document.createElement('div');
      scoreRow.style.display = 'flex'; scoreRow.style.alignItems = 'center'; scoreRow.style.justifyContent = 'space-between'; scoreRow.style.marginBottom = '15px'; scoreRow.style.gap = '10px';

      const scoreDisplay = document.createElement('div');
      scoreDisplay.style.fontWeight = 'bold';
      scoreDisplay.innerHTML = `Product Suspicion Score: <strong style="font-size: 1.2em; color: ${getScoreColor(score)};">${score}%</strong>`;

      const analyzeButton = document.createElement('button');
      analyzeButton.textContent = 'View Details';
      analyzeButton.style.padding = '8px 15px'; analyzeButton.style.fontSize = '13px'; analyzeButton.style.fontWeight = 'bold'; analyzeButton.style.cursor = 'pointer'; analyzeButton.style.color = '#0F1111'; analyzeButton.style.backgroundColor = '#FFD814'; analyzeButton.style.border = '1px solid #FCD200'; analyzeButton.style.borderRadius = '8px'; analyzeButton.style.boxShadow = '0 2px 5px rgba(213,217,217,.5)'; analyzeButton.style.textAlign = 'center';
      analyzeButton.onmouseover = () => { analyzeButton.style.backgroundColor = '#F7CA00'; };
      analyzeButton.onmouseout = () => { analyzeButton.style.backgroundColor = '#FFD814'; };

      analyzeButton.onclick = () => {
          chrome.runtime.sendMessage({ action: "showDetails" }, response => {
              if (chrome.runtime.lastError) {
                  console.warn("TrustLens: Error sending showDetails message (normal if popup opens):", chrome.runtime.lastError.message);
                   alert(`TrustLens Gemini Analysis:\nOverall Suspicion Score: ${score}%\n${analysisResults.length} reviews analyzed.\n\nDetails based on Gemini analysis are in the extension popup.`);
              }
          });
      };

      scoreRow.appendChild(scoreDisplay);
      scoreRow.appendChild(analyzeButton);
      uiBlock.appendChild(scoreRow);

      const infoText = document.createElement('p');
      infoText.textContent = `Analysis based on ${analysisResults.length} review(s) using Gemini API. Score reflects potential flags.`;
      infoText.style.fontSize = '12px'; infoText.style.color = '#555'; infoText.style.margin = '10px 0 0 0'; infoText.style.paddingTop = '10px'; infoText.style.borderTop = '1px solid #eee';
      uiBlock.appendChild(infoText);

      if (targetContainer.firstChild) {
          targetContainer.insertBefore(uiBlock, targetContainer.firstChild);
      } else {
          targetContainer.appendChild(uiBlock);
      }
      console.log("TrustLens: Gemini UI Injected successfully into", targetContainer.id || targetContainer.tagName);
  }


  // --- Main Execution Function ---

  async function runAnalysis() {
    if (!window.location.hostname.includes("amazon.") || window.self !== window.top) {
      return;
    }

    const reviewSelectors = ['[data-hook="review"]', '.review', '.customer-review'];
    // *** MODIFIED SECTION BELOW: Refined text selectors and extraction logic ***
    // Prioritize selectors that are more likely to contain only the user text.
    const primaryTextSelector = '[data-hook="review-body"] span'; // Look for spans inside the main hook first
    const fallbackTextSelectors = ['[data-hook="review-body"]', '.review-text-content', '.review-text']; // Fallbacks if the primary doesn't work

    const reviews = document.querySelectorAll(reviewSelectors.join(', '));
    if (!reviews || reviews.length === 0) {
      return;
    }

    console.log(`TrustLens: Found ${reviews.length} potential review elements. Starting Gemini analysis...`);
    let analysisPromises = [];

    reviews.forEach((reviewEl) => {
      let reviewText = null;
      let textElement = null;

      // Try the primary, more specific selector first
      textElement = reviewEl.querySelector(primaryTextSelector);
      if (textElement && textElement.textContent) {
          reviewText = textElement.textContent.trim();
          console.log("TrustLens: Extracted text using primary selector:", reviewText.substring(0, 50) + "...");
      } else {
          // If primary fails, try the fallback selectors
          for (const selector of fallbackTextSelectors) {
              textElement = reviewEl.querySelector(selector);
              if (textElement && textElement.textContent) {
                  // Get textContent, but try to remove potential script nodes first
                  // Clone the node to avoid modifying the live page element directly
                  const clonedElement = textElement.cloneNode(true);
                  // Remove script tags from the clone
                  clonedElement.querySelectorAll('script').forEach(script => script.remove());
                  // Remove elements that might contain the problematic P.when code (adjust selectors if needed)
                  clonedElement.querySelectorAll('div[id^="expander"]').forEach(exp => exp.remove()); // Example removal

                  reviewText = clonedElement.textContent.trim();
                  console.log("TrustLens: Extracted text using fallback selector and basic cleaning:", reviewText.substring(0, 50) + "...");
                  break; // Stop after finding the first successful fallback
              }
          }
      }


      // --- End of Modified Section ---

      if (reviewText && reviewText.length > 10) { // Minimum length check
        const promise = analyzeReviewWithGemini(reviewText).then(result => {
            if (result) {
                addScoreBadgeToReview(reviewEl, result.suspicionScore);
                return result;
            }
            return null;
        }).catch(error => {
            console.error("TrustLens: Error during analysis of one review:", error);
            return null;
        });
        analysisPromises.push(promise);
      } else if (reviewText) {
          console.log("TrustLens: Skipping very short review element.");
      } else {
          console.log("TrustLens: Could not extract review text from an element.");
      }
    });

    const settledResults = await Promise.allSettled(analysisPromises);
    let analysisResults = settledResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

    let analyzedCount = analysisResults.length;

    if (analyzedCount === 0) {
      console.log("TrustLens: Could not successfully analyze any reviews using Gemini.");
      return;
    }

    console.log(`TrustLens: Successfully analyzed ${analyzedCount} reviews using Gemini.`);

    const totalSuspicion = analysisResults.reduce((sum, res) => sum + res.suspicionScore, 0);
    const averageSuspicionScore = analyzedCount > 0 ? Math.round(totalSuspicion / analyzedCount) : 0;

    injectTrustLensUI(averageSuspicionScore, analysisResults);

    chrome.runtime.sendMessage({ action: "saveAnalysis", data: analysisResults }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("TrustLens: Error sending saveAnalysis message:", chrome.runtime.lastError.message);
      }
    });
  }

  // --- Run the analysis ---
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(runAnalysis, 3000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(runAnalysis, 3500);
    });
  }

  // Optional: Listener for rerunning analysis
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "rerunAnalysis") {
      console.log("TrustLens: Rerun analysis requested.");
      runAnalysis();
      sendResponse({ status: "Gemini analysis triggered" });
      return true;
    }
  });

})(); // End of IIFE