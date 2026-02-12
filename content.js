/**
 * content.js – Injected into LinkedIn pages.
 * Observes the feed for new posts, sends text to the background service
 * worker (which relays to an offscreen doc for inference), and injects
 * colour-coded AI-probability badges.
 */

(() => {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────
    const MIN_TEXT_LENGTH = 50;
    const PROCESSED_ATTR = 'data-slopedin-processed';
    const BADGE_CLASS = 'ai-detect-badge';

    // Selectors LinkedIn uses for post containers and text blocks
    const POST_SELECTORS = [
        '.feed-shared-update-v2',
        'div[data-urn]'
    ];
    const TEXT_SELECTORS = [
        '.feed-shared-text',
        '.update-components-text',
        '.feed-shared-update-v2__description',
        '.feed-shared-inline-show-more-text',
        'span[dir="ltr"]'
    ];
    const HEADER_SELECTORS = [
        '.update-components-actor',
        '.feed-shared-actor',
        '.update-components-actor__meta',
        '.feed-shared-actor__meta'
    ];

    // ── State ──────────────────────────────────────────────────────────────
    let enabled = true;

    // ── Classification via Background ──────────────────────────────────────
    /**
     * Send text to the background service worker for classification.
     * Returns a Promise that resolves with { label, score }.
     */
    function classify(text) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'classify', text }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response && response.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response);
            });
        });
    }

    // ── Badge Injection ────────────────────────────────────────────────────
    /**
     * Create and inject a badge element into a post.
     * @param {Element} postEl  – The post container element
     * @param {{ label: string, score: number }} result
     */
    function injectBadge(postEl, result) {
        // Avoid duplicate badges
        if (postEl.querySelector(`.${BADGE_CLASS}`)) return;

        const badge = document.createElement('span');
        badge.classList.add(BADGE_CLASS);

        const pct = Math.round(result.score * 100);

        if (result.label === 'AI') {
            badge.classList.add('ai-detect-badge--ai');
            badge.textContent = `🤖 ${pct}% AI`;
            badge.title = `This post has a ${pct}% probability of being AI-generated.`;
        } else {
            badge.classList.add('ai-detect-badge--human');
            badge.textContent = `👤 Human`;
            badge.title = `This post appears to be human-written (${100 - pct}% confidence).`;
        }

        // Find a good injection point – prefer actor/header area
        let target = null;
        for (const sel of HEADER_SELECTORS) {
            target = postEl.querySelector(sel);
            if (target) break;
        }

        if (!target) {
            // Fall back to first text block
            for (const sel of TEXT_SELECTORS) {
                target = postEl.querySelector(sel);
                if (target) break;
            }
        }

        if (target) {
            target.style.position = 'relative';
            target.appendChild(badge);
        } else {
            // Absolute fallback
            postEl.style.position = 'relative';
            postEl.prepend(badge);
        }
    }

    // ── Post Processing ────────────────────────────────────────────────────
    /**
     * Extract text content from a post element.
     */
    function extractText(postEl) {
        let text = '';
        for (const sel of TEXT_SELECTORS) {
            const el = postEl.querySelector(sel);
            if (el) {
                text = el.innerText || el.textContent || '';
                if (text.trim().length >= MIN_TEXT_LENGTH) break;
            }
        }
        return text.trim();
    }

    /**
     * Process a single post element.
     */
    async function processPost(postEl) {
        if (!enabled) return;
        if (postEl.hasAttribute(PROCESSED_ATTR)) return;

        // Mark immediately so we don't double-process
        postEl.setAttribute(PROCESSED_ATTR, 'pending');

        const text = extractText(postEl);
        if (text.length < MIN_TEXT_LENGTH) {
            postEl.setAttribute(PROCESSED_ATTR, 'skipped');
            return;
        }

        try {
            const result = await classify(text);
            postEl.setAttribute(PROCESSED_ATTR, 'done');
            injectBadge(postEl, result);
        } catch (err) {
            console.warn('[SlopedIn] Classification failed for post:', err);
            postEl.setAttribute(PROCESSED_ATTR, 'error');
        }
    }

    /**
     * Scan the page for all unprocessed posts.
     */
    function scanPosts() {
        if (!enabled) return;

        for (const sel of POST_SELECTORS) {
            const posts = document.querySelectorAll(sel);
            posts.forEach((postEl) => {
                if (!postEl.hasAttribute(PROCESSED_ATTR)) {
                    processPost(postEl);
                }
            });
        }
    }

    // ── Mutation Observer ──────────────────────────────────────────────────
    let debounceTimer = null;

    function startObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan) {
                // Debounce slightly to batch rapid DOM updates
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(scanPosts, 300);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial scan
        scanPosts();
    }

    // ── Enabled/Disabled State ─────────────────────────────────────────────
    function loadState() {
        chrome.storage.local.get({ enabled: true }, (items) => {
            enabled = items.enabled;
            if (enabled) {
                startObserver();
                console.log('[SlopedIn] Extension active – scanning LinkedIn feed.');
            } else {
                console.log('[SlopedIn] Extension disabled by user.');
            }
        });

        // Listen for toggle changes from the popup
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.enabled) {
                enabled = changes.enabled.newValue;
                if (enabled) {
                    startObserver();
                }
                console.log(`[SlopedIn] ${enabled ? 'Enabled' : 'Disabled'}`);
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────────────────
    loadState();
})();
