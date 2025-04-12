// background.js

// --- Configuration ---
const GEMINI_API_KEY = "AIzaSyBZkA8wmp_zKr3owWK1HrqfDUX9JvbvtRQ"; // <-- PASTE YOUR KEY HERE
const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + GEMINI_API_KEY; // Construct endpoint with the key constant

// --- Helper Functions ---

// Example prompt structure - **YOU WILL LIKELY NEED TO REFINE THIS**
function createGeminiPrompt(reviewText) {
  // Limit text length to avoid exceeding API limits
  const MAX_TEXT_LENGTH = 15000; // Adjust as needed based on API limits
  const truncatedText = reviewText.length > MAX_TEXT_LENGTH ? reviewText.substring(0, MAX_TEXT_LENGTH) + "..." : reviewText;

  // This prompt asks the API to return a JSON object with scores (0.0 to 1.0)
  return {
    "contents": [{
      "parts": [{
        "text": `Analyze the following product review and return a JSON object with scores between 0.0 (not present) and 1.0 (highly present) for each category:
          1.  "superlativesPunctuationScore": Assess the use of excessive superlatives (amazing, perfect, etc.) and excessive punctuation (!!!, ???).
          2.  "genericContentScore": Assess how generic, vague, or lacking in specific detail the review is.
          3.  "aiWrittenScore": Assess the likelihood that the review was written by an AI (e.g., overly formal, lacks personal touch, unusual phrasing).
          4.  "behaviorPatternsScore": Assess potential unusual patterns *within this single review's text* that might seem suspicious (e.g., repetition not typical of human writing, contradictory statements - Note: cannot assess cross-review patterns).

          Strictly return ONLY the JSON object with these four keys and their scores. Do not include any other text or explanations.

          Review Text:
          "${truncatedText}"

          JSON Output:`
      }]
    }]
    // Add generationConfig if needed (e.g., temperature, max output tokens)
    // "generationConfig": {
    //   "responseMimeType": "application/json", // Important if the model supports direct JSON output
    //   "temperature": 0.7,
    //   "maxOutputTokens": 500
    // }
  };
}

async function callGeminiAPI(reviewText) {
  // Check if the key constant itself is empty or still the placeholder
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_KEY_HERE") { // Adjusted check
      console.error("TrustLens (Background): Gemini API Key not set in background.js.");
      return { success: false, error: "API Key not configured." };
  }
  // No need to check the endpoint string specifically if the key is validated above

  const requestBody = createGeminiPrompt(reviewText);

  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TrustLens (Background): Gemini API Error ${response.status}: ${errorText}`);
      return { success: false, error: `API Error ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    // --- IMPORTANT: Parse the response based on YOUR API's output format ---
    let analysisJson = null;
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
       try {
           // Attempt to clean potential markdown/formatting around the JSON
           const rawJsonText = data.candidates[0].content.parts[0].text;
           const jsonMatch = rawJsonText.match(/\{[\s\S]*\}/); // Extract content between first { and last }
           if (jsonMatch) {
               analysisJson = JSON.parse(jsonMatch[0]);
           } else {
               throw new Error("Could not extract JSON object from response text.");
           }
       } catch (e) {
           console.error("TrustLens (Background): Error parsing JSON from Gemini response:", e);
           console.error("Raw Gemini Response Text:", data.candidates[0].content.parts[0].text);
           return { success: false, error: "Error parsing API response." };
       }
    } else {
        console.error("TrustLens (Background): Unexpected Gemini API response structure:", data);
        return { success: false, error: "Unexpected API response structure." };
    }

    // Validate expected fields (optional but recommended)
    if (analysisJson && typeof analysisJson.superlativesPunctuationScore === 'number' &&
        typeof analysisJson.genericContentScore === 'number' &&
        typeof analysisJson.aiWrittenScore === 'number' &&
        typeof analysisJson.behaviorPatternsScore === 'number') {
         return { success: true, analysis: analysisJson };
    } else {
        console.error("TrustLens (Background): Parsed JSON missing expected score fields:", analysisJson);
        return { success: false, error: "API response missing expected fields." };
    }


  } catch (error) {
    console.error("TrustLens (Background): Network or fetch error calling Gemini API:", error);
    return { success: false, error: `Network Error: ${error.message}` };
  }
}

// --- Message Listener ---

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "saveAnalysis") {
    // Existing logic to save analysis data
    chrome.storage.local.set({ reviewAnalysis: request.data }, function() {
      if (chrome.runtime.lastError) {
        console.error("TrustLens (Background): Error saving analysis:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Indicate async response for storage

  } else if (request.action === "analyzeWithGemini") {
    // New logic to handle API call
    if (request.text) {
      callGeminiAPI(request.text).then(result => {
        sendResponse(result); // Send { success: true, analysis: {...} } or { success: false, error: "..." }
      });
    } else {
        sendResponse({ success: false, error: "No text provided for analysis." });
    }
    return true; // Indicate async response for API call
  }

  // Handle other messages if needed
}); // <-- Added the missing closing brace here