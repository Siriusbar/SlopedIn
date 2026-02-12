/**
 * worker.js – Runs the Xenova/roberta-base-openai-detector model
 * inside a Web Worker so inference never blocks the main thread.
 */

// ── Load Transformers.js (bundled locally, ES module) ──────────────────────
import { pipeline, env } from './lib/transformers.min.js';

// Disable local model check – always fetch from HuggingFace Hub
env.allowLocalModels = false;

// ── State ──────────────────────────────────────────────────────────────────
let classifierPipeline = null;
let isLoading = false;
const pendingQueue = []; // messages that arrive while model is loading

/**
 * Lazily initialise the text-classification pipeline.
 * The model is downloaded + cached automatically by transformers.js.
 */
async function getPipeline() {
  if (classifierPipeline) return classifierPipeline;

  if (isLoading) {
    // If already loading, return a promise that resolves when ready
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
  self.postMessage({ type: 'status', message: 'Loading AI model… (first run may take a moment)' });

  try {
    // `pipeline` is a global injected by importScripts above
    // eslint-disable-next-line no-undef
    classifierPipeline = await pipeline(
      'text-classification',
      'Xenova/roberta-base-openai-detector',
      { quantized: true }
    );
    self.postMessage({ type: 'status', message: 'Model loaded ✓' });
  } catch (err) {
    self.postMessage({ type: 'error', message: `Model failed to load: ${err.message}` });
    isLoading = false;
    throw err;
  }

  isLoading = false;

  // Drain anything that queued while we were loading
  while (pendingQueue.length) {
    const queued = pendingQueue.shift();
    handleClassify(queued);
  }

  return classifierPipeline;
}

/**
 * Run classification on a single piece of text.
 * @param {{ id: string, text: string }} data
 */
async function handleClassify(data) {
  const { id, text } = data;
  try {
    const clf = await getPipeline();

    // Truncate long texts to avoid OOM – the model context is 512 tokens
    const truncated = text.slice(0, 1500);

    const results = await clf(truncated, { topk: 2 });

    // results is an array of { label, score } sorted by score descending
    // Labels are "Real" and "Fake"
    let fakeProbability = 0;
    for (const r of results) {
      if (r.label.toLowerCase() === 'fake') {
        fakeProbability = r.score;
        break;
      }
    }

    self.postMessage({
      type: 'result',
      id,
      result: {
        label: fakeProbability >= 0.5 ? 'AI' : 'Human',
        score: fakeProbability,
        raw: results
      }
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      message: err.message
    });
  }
}

// ── Message Listener ───────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, id, text } = event.data;

  if (type === 'classify') {
    if (isLoading && !classifierPipeline) {
      pendingQueue.push({ id, text });
      getPipeline(); // make sure loading has started
    } else {
      handleClassify({ id, text });
    }
  }
});

// ── Kick off model download immediately on worker start ────────────────────
getPipeline();
