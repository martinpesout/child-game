/** How long the page must be hidden before we treat it as "the app went to the background". */
const MIN_HIDDEN_MS = 600;

/**
 * Pauses the game when the app really went to the background. iOS freezes timers while hidden,
 * so the decision is made when the page becomes visible again (by elapsed time), plus on pagehide.
 */
export function watchBackground(doc: Document, win: Window, now: () => number, onHide: () => void, onPause: () => void): void {
  let hiddenAt: number | null = null;
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) {
      hiddenAt = now();
      onHide();
    } else if (hiddenAt !== null) {
      if (now() - hiddenAt > MIN_HIDDEN_MS) onPause();
      hiddenAt = null;
    }
  });
  win.addEventListener('pagehide', () => {
    onHide();
    onPause();
  });
}

/** iOS only lets audio resume from certain gestures (touchend/click), so listen to all of them. */
export function installAudioUnlock(target: EventTarget, unlock: () => void): void {
  for (const n of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    target.addEventListener(n, () => unlock(), { capture: true, passive: true } as AddEventListenerOptions);
  }
}
