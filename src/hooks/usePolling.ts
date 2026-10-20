"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` immediately and then every `intervalMs`, but ONLY while the
 * browser tab is visible. When the tab is hidden the interval is cleared; when it
 * becomes visible again the callback runs at once and polling resumes.
 *
 * `callback` is always the latest version (kept in a ref), so callers can pass
 * inline functions without re-creating the interval on every render.
 */
export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true,
  deps: readonly unknown[] = []
) {
  const savedCallback = useRef(callback);

  // Keep the latest callback without re-creating the interval. Declared before the
  // polling effect so it runs first within the same commit.
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      void savedCallback.current();
    };

    const start = () => {
      if (timer) return;
      tick();
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, ...deps]);
}
