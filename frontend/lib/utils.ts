import { useState, useEffect, useCallback, useRef } from "react";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function usePolling(
  callback: () => Promise<boolean>,
  intervalMs: number = 3000
) {
  const [isPolling, setIsPolling] = useState(false);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const start = useCallback(() => setIsPolling(true), []);
  const stop = useCallback(() => setIsPolling(false), []);

  useEffect(() => {
    if (!isPolling) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const done = await callbackRef.current();
        if (!done) {
          timeoutId = setTimeout(poll, intervalMs);
        } else {
          setIsPolling(false);
        }
      } catch {
        timeoutId = setTimeout(poll, intervalMs);
      }
    };
    poll();
    return () => clearTimeout(timeoutId);
  }, [isPolling, intervalMs]);

  return { isPolling, start, stop };
}
