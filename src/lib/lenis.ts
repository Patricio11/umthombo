import type Lenis from "lenis";

/**
 * Tiny global controller for the site-wide Lenis instance so overlays
 * (cart drawer, order modal) can pause smooth scroll while open — otherwise
 * Lenis keeps scrolling the page *behind* the overlay. Reference-counted so
 * nested overlays (modal opened over the drawer) unlock correctly.
 */
let instance: Lenis | null = null;
let locks = 0;

export function registerLenis(l: Lenis | null) {
  instance = l;
  // If something locked before Lenis mounted, honour it.
  if (instance && locks > 0) instance.stop();
}

export function lockScroll() {
  locks += 1;
  instance?.stop();
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) instance?.start();
}
