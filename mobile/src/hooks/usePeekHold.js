import { useCallback, useRef, useState } from 'react';

// Press-and-hold to "peek": holding still for `delay` ms sets peeking=true;
// releasing or moving more than `moveThreshold` px cancels it. A quick stationary
// release (no peek, no move) fires onTap(pageX) — used for left/right nav.
// The handlers go on a View's onTouch* props, which observe touches without
// claiming the responder, so an underlying ScrollView/FlatList still scrolls/pages.
export function usePeekHold({ delay = 220, moveThreshold = 12, onTap } = {}) {
  const [peeking, setPeeking] = useState(false);
  const timer = useRef(null);
  const start = useRef(null);
  const moved = useRef(false);
  const fired = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const point = (e) => e.nativeEvent.touches?.[0] || e.nativeEvent;

  const onTouchStart = useCallback((e) => {
    const t = point(e);
    start.current = { x: t.pageX, y: t.pageY };
    moved.current = false;
    fired.current = false;
    clearTimer();
    timer.current = setTimeout(() => {
      fired.current = true;
      setPeeking(true);
    }, delay);
  }, [clearTimer, delay]);

  const onTouchMove = useCallback((e) => {
    if (!start.current) return;
    const t = point(e);
    if (Math.abs(t.pageX - start.current.x) > moveThreshold
      || Math.abs(t.pageY - start.current.y) > moveThreshold) {
      moved.current = true;
      clearTimer();
      setPeeking(false);
    }
  }, [clearTimer, moveThreshold]);

  const end = useCallback(() => {
    if (start.current && !moved.current && !fired.current) {
      onTap?.(start.current.x, start.current.y);
    }
    clearTimer();
    setPeeking(false);
    start.current = null;
  }, [clearTimer, onTap]);

  return {
    peeking,
    handlers: { onTouchStart, onTouchMove, onTouchEnd: end, onTouchCancel: end }
  };
}
