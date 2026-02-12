/**
 * offscreen.js – Runs inside the offscreen document (extension origin).
 * Loads the Transformers.js pipeline directly (no nested Worker needed –
 * the offscreen document is already a separate process from the main page).
 */

import { pipeline, env } from './lib/transformers.bundle.js';

// Disable local model check – always fetch from HuggingFace Hub
env.allowLocalModels = false;

// Point WASM files to the local copy bundled with the extension
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('lib/');

// Disable multi-threading to avoid dynamic import of threaded proxy worker
// (MV3 CSP blocks dynamic script imports from external URLs)
env.backends.onnx.wasm.numThreads = 1;

// ── Pipeline State ─────────────────────────────────────────────────────────
let classifierPipeline = null;
let isLoading = false;

/**
 * Lazily initialise the text-classification pipeline.
 */
async function getPipeline() {
    if (classifierPipeline) return classifierPipeline;

    if (isLoading) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (classifierPipeline) {
                    clearInterval(check);
                    resolve(classifierPipeline);
                }
            }, 200);
        });
    }

    isLoading = true;
    console.log('[SlopedIn/offscreen] Loading AI model…');

    try {
        classifierPipeline = await pipeline(
            'text-classification',
            'onnx-community/roberta-base-openai-detector-ONNX',
            { dtype: 'q8' }
        );
        console.log('[SlopedIn/offscreen] Model loaded ✓');
    } catch (err) {
        console.error('[SlopedIn/offscreen] Model failed to load:', err);
        isLoading = false;
        throw err;
    }

    isLoading = false;
    return classifierPipeline;
}

/**
 * Classify a piece of text.
 */
async function classify(text) {
    const clf = await getPipeline();
    const truncated = text.slice(0, 1500);
    const results = await clf(truncated, { topk: 2 });

    let fakeProbability = 0;
    for (const r of results) {
        if (r.label.toLowerCase() === 'fake') {
            fakeProbability = r.score;
            break;
        }
    }

    return {
        label: fakeProbability >= 0.5 ? 'AI' : 'Human',
        score: fakeProbability,
        raw: results
    };
}

/**
 * Listen for messages forwarded by the background service worker.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'classify') {
        classify(message.text)
            .then((result) => sendResponse(result))
            .catch((err) => sendResponse({ error: err.message }));
        return true;
    }
});

// Kick off model download immediately
getPipeline();
