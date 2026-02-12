# Contributing to SlopedIn

Thank you for your interest in contributing! Whether it's a bug report, feature request, or code contribution — every bit helps make SlopedIn better.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Making Changes](#-making-changes)
- [Pull Request Process](#-pull-request-process)
- [Reporting Bugs](#-reporting-bugs)
- [Feature Requests](#-feature-requests)
- [Style Guide](#-style-guide)

## 📜 Code of Conduct

By participating, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## 🚀 Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/Siriusbar/SlopedIn.git
   cd SlopedIn
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🔧 Development Setup

### Prerequisites
- Google Chrome (v116+)
- Node.js (v18+) and npm

### Install dependencies
```bash
npm install
```

### Load the extension in Chrome
1. Navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the project directory
4. After making changes, click the **reload ↻** button on the extension card

### Rebuild the library bundle
If you modify dependencies or update Transformers.js:
```bash
npx esbuild node_modules/@huggingface/transformers/src/transformers.js \
  --bundle --format=esm --outfile=lib/transformers.bundle.js \
  --platform=browser --target=es2020 --minify

cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs lib/
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm lib/
```

## ✏️ Making Changes

### Key files and what they do

| File | Purpose |
|------|---------|
| `content.js` | DOM observation, text extraction, badge injection |
| `background.js` | Service worker, offscreen document management |
| `offscreen.js` | AI model loading and inference |
| `styles.css` | Badge and UI styling |
| `popup.html` / `popup.js` | Extension popup UI |
| `manifest.json` | Extension configuration |

### Tips
- **Test on LinkedIn** — the extension only activates on `https://www.linkedin.com/*`
- **Check the console** — logs are prefixed with `[SlopedIn]` or `[SlopedIn/offscreen]`
- **Inspect the offscreen page** — go to `chrome://extensions`, find SlopedIn, and click "Inspect views: offscreen.html"
- **First load is slow** — the model (~120 MB) downloads on first run, subsequent loads use the cache

### MV3 constraints to keep in mind
- No `eval()` or dynamic code execution
- Scripts can only be loaded from `'self'` (no external CDNs at runtime)
- WASM requires `'wasm-unsafe-eval'` in the CSP
- Content scripts cannot directly create Workers with extension-origin URLs
- Use `chrome.runtime.sendMessage` for all cross-context communication

## 🔀 Pull Request Process

1. **Keep PRs focused** — one feature or fix per PR
2. **Update documentation** if your change affects the README or user-facing behavior
3. **Test manually** — load the extension, navigate to LinkedIn, and verify:
   - Posts get scanned and badges appear
   - The popup toggle works
   - No errors in the extension's error page (`chrome://extensions` → Errors)
4. **Write descriptive commit messages**:
   ```
   feat: add confidence threshold slider to popup
   fix: handle empty post text gracefully
   docs: update rebuild instructions for ONNX v2
   ```
5. **Submit your PR** against the `main` branch with a clear description of what changed and why

## 🐛 Reporting Bugs

When reporting a bug, please include:

1. **Browser version** — `chrome://version`
2. **Extension version** — visible on `chrome://extensions`
3. **Steps to reproduce** — what you did before the error occurred
4. **Expected vs actual behavior**
5. **Console errors** — from both:
   - The LinkedIn tab console (`F12`)
   - The extension errors page (`chrome://extensions` → Errors)
6. **Screenshots** if applicable

Use the [Bug Report](https://github.com/Siriusbar/SlopedIn/issues/new?template=bug_report.md) issue template.

## 💡 Feature Requests

We'd love to hear your ideas! When suggesting a feature:

- **Check existing issues** first to avoid duplicates
- **Describe the use case** — what problem does it solve?
- **Propose a solution** if you have one in mind
- **Consider scope** — does it align with the extension's goal of local, privacy-first AI detection?

### Ideas we'd love help with
- 🎯 Support for additional social platforms (Twitter/X, Facebook)
- 📊 Detection statistics dashboard
- 🎚️ Configurable confidence threshold
- 🌍 Multi-language support
- 🧪 Better AI models for detecting newer LLM outputs
- ♿ Accessibility improvements

## 🎨 Style Guide

### JavaScript
- Use `const` / `let`, never `var`
- Use descriptive variable and function names
- Add JSDoc comments for functions
- Prefix console logs with `[SlopedIn]` or `[SlopedIn/offscreen]`
- Use `async`/`await` over raw Promises where possible

### CSS
- Use CSS custom properties for recurring values
- Keep badge styles in `styles.css`
- Popup styles stay inline in `popup.html`

### Commits
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `style:` — formatting, no logic change
- `refactor:` — code restructure, no behavior change
- `chore:` — maintenance tasks

---

Thank you for helping make SlopedIn better! 🎉
