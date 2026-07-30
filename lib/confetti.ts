/**
 * Celebration helpers built on canvas-confetti.
 *
 * canvas-confetti is imported lazily so its ~7 kB never lands in the initial
 * bundle — these only fire on success screens. Every helper is a no-op when the
 * user prefers reduced motion, and on the server.
 */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Brand palette — matches the red/orange gradient used across the site. */
const BRAND_COLORS = ["#dc2626", "#f97316", "#fbbf24", "#ffffff", "#fb7185"];

/** Sits above modals/overlays but below nothing else. */
const Z_INDEX = 10000;

async function load() {
  if (typeof window === "undefined" || prefersReducedMotion()) return null;
  const mod = await import("canvas-confetti");
  return mod.default;
}

/**
 * The standard booking/payment success burst: two angled cannons from the
 * bottom corners, then a soft overhead shower.
 */
export async function celebrate() {
  const confetti = await load();
  if (!confetti) return;

  const base = { colors: BRAND_COLORS, zIndex: Z_INDEX, disableForReducedMotion: true };

  confetti({ ...base, particleCount: 60, spread: 55, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...base, particleCount: 60, spread: 55, angle: 120, origin: { x: 1, y: 0.7 } });

  setTimeout(() => {
    confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 35, origin: { x: 0.5, y: 0.35 } });
  }, 250);
}

/** A single small burst — for inline wins like a submitted review. */
export async function celebrateSmall(origin: { x: number; y: number } = { x: 0.5, y: 0.5 }) {
  const confetti = await load();
  if (!confetti) return;

  confetti({
    colors: BRAND_COLORS,
    zIndex: Z_INDEX,
    disableForReducedMotion: true,
    particleCount: 40,
    spread: 60,
    scalar: 0.8,
    origin,
  });
}
