<p align="center">
  <img src="icons/icon128.png" alt="SlopedIn Logo" width="100" />
</p>

<h1 align="center">SlopedIn</h1>

<p align="center">
  <strong>AI Content Detector for LinkedIn</strong><br/>
  A Chrome extension that flags AI-generated posts directly in your feed — 100% local, zero data leaves your browser.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/inference-local-green" alt="Local Inference" />
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="MIT License" />
</p>

---

## ✨ Features

- 🔍 **Real-time detection** — scans LinkedIn posts as you scroll
- 🧠 **Local AI inference** — runs a RoBERTa model entirely in your browser via [Transformers.js](https://huggingface.co/docs/transformers.js)
- 🔒 **Privacy first** — no data sent to external servers, ever
- 🏷️ **Visual badges** — color-coded labels on each post (🟢 Human · 🔴 AI-generated)
- ⚡ **Toggle on/off** — enable or disable detection from the popup

<!-- ## 🖥️ Screenshots

| Popup | Feed Badge |
|-------|------------|
| Clean dark-mode popup with on/off toggle | Posts get a colored badge with confidence score | -->

## 🏗️ Architecture

```
LinkedIn Tab                     Extension (background)
┌─────────────┐   message    ┌────────────────────────┐
│ content.js  │ ──────────►  │ background.js          │
│ (DOM scan)  │              │ (service worker)       │
└─────────────┘              └────────┬───────────────┘
                                      │ message
                             ┌────────▼───────────────┐
                             │ offscreen.html          │
                             │ ┌────────────────────┐  │
                             │ │ offscreen.js        │  │
                             │ │ Transformers.js     │  │
                             │ │ + ONNX Runtime WASM │  │
                             │ └────────────────────┘  │
                             └─────────────────────────┘
```

- **content.js** — observes the LinkedIn DOM, extracts post text, injects badges
- **background.js** — service worker that manages the offscreen document lifecycle
- **offscreen.js** — loads the AI model and runs inference using ONNX Runtime (WebAssembly)
- **worker.js** — standalone inference worker (unused in current architecture, kept for reference)

## 🚀 Installation

### Prerequisites
- Google Chrome (v116+)
- Node.js & npm (only needed to rebuild the bundle)

### Load as unpacked extension

1. **Clone the repo**
   ```bash
   git clone https://github.com/Siriusbar/SlopedIn.git
   cd SlopedIn
   ```

2. **Install dependencies** (for bundled library)
   ```bash
   npm install
   ```

3. **Open Chrome** and navigate to `chrome://extensions`

4. Enable **Developer mode** (top-right toggle)

5. Click **Load unpacked** and select the `SlopedIn` directory

6. Navigate to [linkedin.com](https://www.linkedin.com/feed/) — posts will be scanned automatically

> **Note:** The first run downloads the AI model (~120 MB) from HuggingFace. This is cached by the browser for subsequent loads.

## ⚙️ How It Works

1. `content.js` uses a `MutationObserver` to detect new posts in the LinkedIn feed
2. Post text is extracted and sent to `background.js` via `chrome.runtime.sendMessage`
3. `background.js` forwards the request to an offscreen document
4. `offscreen.js` runs the [`onnx-community/roberta-base-openai-detector-ONNX`](https://huggingface.co/onnx-community/roberta-base-openai-detector-ONNX) model using Transformers.js with ONNX Runtime (WASM backend)
5. The result (label + confidence) is sent back and displayed as a badge on the post

## 📁 Project Structure

```
SlopedIn/
├── manifest.json          # Chrome extension manifest (MV3)
├── background.js          # Service worker – offscreen doc lifecycle
├── offscreen.html         # Hosts the inference script
├── offscreen.js           # AI model loading & inference
├── content.js             # DOM observation & badge injection
├── styles.css             # Badge styling
├── popup.html             # Extension popup UI
├── popup.js               # Toggle enable/disable
├── worker.js              # Standalone worker (reference)
├── icons/
│   ├── icon.svg           # Source icon
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   ├── transformers.bundle.js              # Bundled Transformers.js + ONNX Runtime
│   ├── ort-wasm-simd-threaded.jsep.mjs     # ONNX WASM JS proxy
│   └── ort-wasm-simd-threaded.jsep.wasm    # ONNX WASM binary (~22 MB)
└── package.json
```

## 🔧 Rebuilding the Bundle

If you need to update Transformers.js or ONNX Runtime:

```bash
# Install/update dependencies
npm install @huggingface/transformers@latest

# Bundle with esbuild
npx esbuild node_modules/@huggingface/transformers/src/transformers.js \
  --bundle --format=esm --outfile=lib/transformers.bundle.js \
  --platform=browser --target=es2020 --minify

# Copy ONNX runtime files
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs lib/
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm lib/
```

## 🤖 Model Details

| Property | Value |
|----------|-------|
| **Model** | `onnx-community/roberta-base-openai-detector-ONNX` |
| **Base** | `openai-community/roberta-base-openai-detector` |
| **Task** | Binary text classification (Real vs Fake) |
| **Quantization** | INT8 (`q8`) |
| **Runtime** | ONNX Runtime Web (WASM backend, single-threaded) |

> ⚠️ **Disclaimer:** This model was trained to detect GPT-2 generated text. It may not accurately detect text from newer models (GPT-4, Claude, etc.). Results should not be used as definitive proof of AI authorship.

## 📜 License

This project is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md) before submitting a PR.
