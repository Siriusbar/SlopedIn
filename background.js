/**
 * background.js – MV3 Service Worker.
 * Creates an offscreen document for inference and relays messages
 * between the content script and the offscreen document.
 */

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

let creatingOffscreen = null;

/**
 * Ensure the offscreen document exists (create it if it doesn't).
 */
async function ensureOffscreenDocument() {
    // Check if one already exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    if (existingContexts.length > 0) {
        return; // already created
    }

    // Avoid race conditions if multiple messages arrive at once
    if (creatingOffscreen) {
        await creatingOffscreen;
        return;
    }

    creatingOffscreen = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['DOM_PARSER'],
        justification: 'Run Transformers.js AI model inference off the main thread'
    });

    await creatingOffscreen;
    creatingOffscreen = null;
}

/**
 * Listen for messages from the content script, relay to offscreen,
 * and send the response back.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'classify') {
        (async () => {
            try {
                await ensureOffscreenDocument();

                // Forward to the offscreen document and wait for its response
                const result = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'classify',
                    text: message.text
                });

                sendResponse(result);
            } catch (err) {
                sendResponse({ error: err.message });
            }
        })();

        // Return true to indicate we'll respond asynchronously
        return true;
    }
});
