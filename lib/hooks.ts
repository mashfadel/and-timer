"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Sentinel = { release: () => Promise<void>; released: boolean };
type NavWithLock = {
  wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
};

/**
 * Keeps the display awake while a session runs — a timer that sleeps halfway
 * through an activity is worse than no timer.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const nav = navigator as unknown as NavWithLock;
    if (!nav.wakeLock) return;

    let sentinel: Sentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const next = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void next.release();
          return;
        }
        sentinel = next;
      } catch {
        // Denied or unsupported: the clock still runs, the screen may dim.
      }
    };

    void acquire();

    // Switching tabs drops the lock; take it back on return.
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}

type FsElement = { webkitRequestFullscreen?: () => Promise<void> };
type FsDocument = { webkitExitFullscreen?: () => Promise<void>; webkitFullscreenElement?: Element | null };

export function useFullscreen(): { isFullscreen: boolean; toggle: () => void; enter: () => void } {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const doc = document as unknown as FsDocument;
      setIsFullscreen(Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement));
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const enter = useCallback(() => {
    const el = document.documentElement as HTMLElement & FsElement;
    try {
      if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) void el.webkitRequestFullscreen();
    } catch {
      // Fullscreen is a nicety, never a requirement.
    }
  }, []);

  const toggle = useCallback(() => {
    const doc = document as unknown as FsDocument;
    const active = Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement);
    if (active) {
      if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) void doc.webkitExitFullscreen();
    } else {
      enter();
    }
  }, [enter]);

  return { isFullscreen, toggle, enter };
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True once the visitor has asked their system to calm animation down. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Fades the facilitator chrome out of the way once the room has settled, and
 * brings it straight back on any input.
 */
export function useIdle(delayMs: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const bump = () => {
      setIdle(false);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setIdle(true), delayMs);
    };
    const events: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    timer.current = window.setTimeout(() => setIdle(true), delayMs);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [delayMs, enabled]);

  // Derived rather than reset, so switching off never writes state from an effect.
  return enabled && idle;
}
