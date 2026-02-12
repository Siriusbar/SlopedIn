/**
 * popup.js – Reads/writes the enabled state to chrome.storage.local.
 */
(() => {
    'use strict';

    const toggle = document.getElementById('toggleEnabled');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    function updateUI(isEnabled) {
        toggle.checked = isEnabled;
        statusDot.className = `dot ${isEnabled ? 'on' : 'off'}`;
        statusText.innerHTML = `<span class="dot ${isEnabled ? 'on' : 'off'}" id="statusDot"></span> ${isEnabled ? 'Scanning feed…' : 'Detection paused'
            }`;
    }

    // Load current state
    chrome.storage.local.get({ enabled: true }, (items) => {
        updateUI(items.enabled);
    });

    // Handle toggle
    toggle.addEventListener('change', () => {
        const newState = toggle.checked;
        chrome.storage.local.set({ enabled: newState }, () => {
            updateUI(newState);
        });
    });
})();
