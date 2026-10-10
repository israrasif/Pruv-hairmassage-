// utils/syncSignal.ts
// A tiny "something changed, please back it up soon" signal.
// Other files call requestSync() after saving locally. dataSync.ts registers the handler.
// Kept separate so storage/settings files can call it without importing the sync code (no import loops).
let handler: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function setSyncHandler(fn: (() => void) | null) {
  handler = fn;
}

/** Waits a moment (so several quick changes become one sync), then runs the sync. */
export function requestSync(delayMs = 2500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    handler?.();
  }, delayMs);
}