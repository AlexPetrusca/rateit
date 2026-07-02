// Tiny pub/sub so tournament mutations (create, end, delete) can tell the
// globally-mounted LiveTourneyBanner to re-check immediately, instead of waiting
// for its background poll.
const listeners = new Set();

export const emitTourneyChanged = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
};

export const onTourneyChanged = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
