// Smooth screen changes using the browser's View Transitions.
// Elements with the same view-transition-name on both screens (the logo, the
// hero circle, the text box / progress card) glide into place; the rest crossfades.
import { flushSync } from "react-dom";

/**
 * Runs a screen change as an animated transition when the browser supports it.
 * Safety net: if the animation can't start within half a second (for example the
 * tab isn't drawing), it's skipped and the screen changes straight away.
 */
export function withTransition(update: () => void) {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document === "undefined" || !document.startViewTransition || reduce || document.visibilityState !== "visible") {
    update();
    return;
  }
  let ran = false;
  const vt = document.startViewTransition(() => {
    ran = true;
    flushSync(update);
  });
  const timer = setTimeout(() => {
    if (!ran) vt.skipTransition();
  }, 500);
  vt.finished.finally(() => clearTimeout(timer)).catch(() => undefined);
}
