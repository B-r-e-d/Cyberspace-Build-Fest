// popup.js
document.addEventListener("DOMContentLoaded", function() {
  const reviewListDiv = document.getElementById("review-list");

  chrome.storage.local.get("reviewAnalysis", function(data) {
    const reviews = data.reviewAnalysis;

    // Clear previous results
    reviewListDiv.innerHTML = '';

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      reviewListDiv.innerText = "No review analysis available or analysis failed.";
      // Add a button to trigger re-analysis
      const retryButton = document.createElement('button');
      retryButton.textContent = "Try Analyzing Again";
      retryButton.style.marginTop = '10px';
      retryButton.onclick = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "rerunAnalysis" }, function(response) {
              if (chrome.runtime.lastError) {
                console.error("Error sending rerun message:", chrome.runtime.lastError);
                 reviewListDiv.innerText = "Failed to send rerun command. Please reload the page and try again.";
              } else {
                reviewListDiv.innerText = "Re-analysis requested. Please wait a few moments and reopen this popup.";
              }
            });
          }
        });
      };
      reviewListDiv.appendChild(retryButton);
      return;
    }

    // Calculate overall score from stored results (if needed again here)
    const totalScore = reviews.reduce((sum, review) => sum + (review.suspicionScore || 0), 0);
    const averageScore = reviews.length > 0 ? Math.round(totalScore / reviews.length) : 0;
    // You could display this average at the top if desired

    reviews.forEach((review, index) => {
        // Ensure review object and score exist
        if (!review || typeof review.suspicionScore === 'undefined') {
            console.warn(`TrustLens Popup: Skipping invalid review data at index ${index}`);
            return; // Skip this iteration
        }

      const reviewDiv = document.createElement("div");
      reviewDiv.className = "review-result";

      // Header with review number and badge
      const header = document.createElement("div");
      header.className = "review-header";

      const title = document.createElement("h3");
      title.innerText = `Review ${index + 1}`; // Use index + 1 for human-readable numbering

      const badge = document.createElement("div");
      badge.className = "circle-badge";
      badge.innerText = `${Math.round(review.suspicionScore)}%`;

      // Determine badge color (using same logic as content script)
      const score = review.suspicionScore;
      if (score < 40) badge.style.backgroundColor = "green";
      else if (score < 70) badge.style.backgroundColor = "orange"; // Use orange for consistency
      else badge.style.backgroundColor = "red";

      header.appendChild(title);
      header.appendChild(badge);
      reviewDiv.appendChild(header);

      // Review preview
      const preview = document.createElement("p");
      const reviewText = review.text || "[Review text missing]";
      // *** MODIFIED LINE BELOW: Use textContent for safer display ***
      preview.textContent = reviewText.length > 150 ? reviewText.substring(0, 150) + "..." : reviewText;
      preview.style.fontSize = '13px'; // Make preview slightly smaller
      preview.style.marginTop = '5px';
      preview.style.color = '#444';
      reviewDiv.appendChild(preview);

      // Issues list - Based on the NEW 'issues' structure from content.js
      if (review.issues && review.issues.length > 0) {
        const issueTitle = document.createElement("strong"); // Add title for clarity
        issueTitle.innerText = "Potential Issues Detected:";
        issueTitle.style.fontSize = '13px';
        issueTitle.style.display = 'block';
        issueTitle.style.marginTop = '8px';
        reviewDiv.appendChild(issueTitle);

        const issueList = document.createElement("ul");
        review.issues.forEach(issue => {
          const li = document.createElement("li");
          // Display criterion and its corresponding weight from the calculation
          // Score from Gemini (0-1) might also be useful: `(Score: ${issue.score.toFixed(2)})`
          li.innerText = `${issue.criterion} (Weight: ${issue.weight.toFixed(0)}%)`;
          issueList.appendChild(li);
        });
        reviewDiv.appendChild(issueList);
      } else {
        const noIssues = document.createElement("p");
        noIssues.innerText = "No major issues flagged by Gemini analysis.";
        noIssues.style.fontSize = '13px';
        noIssues.style.fontStyle = 'italic';
        noIssues.style.marginTop = '8px';
        reviewDiv.appendChild(noIssues);
      }

      reviewListDiv.appendChild(reviewDiv);
    });
  });
});