"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Runner from "./Runner";
import Setup from "./Setup";
import { unlockAudio } from "@/lib/audio";
import { useFullscreen } from "@/lib/hooks";
import { clampSeconds } from "@/lib/time";
import { CONFIG_VERSION, defaultConfig, newRound, type Config } from "@/lib/types";

const STORE_KEY = `and-timer:v${CONFIG_VERSION}`;

/**
 * Read once, on the client, and remember the answer. Our own writes must not
 * change the snapshot, or every save would look like a change from outside.
 */
let snapshot: string | null | undefined;

function readStore(): string | null {
  if (snapshot === undefined) {
    try {
      snapshot = window.localStorage.getItem(STORE_KEY);
    } catch {
      snapshot = null;
    }
  }
  return snapshot;
}

/** Nothing else writes this key, so there is nothing to subscribe to. */
const noSubscribe = () => () => {};

/** Storage is user-editable and survives deploys — never trust its shape. */
function reviveConfig(raw: string | null): Config | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const r = parsed as Record<string, unknown>;
  if (!Array.isArray(r.rounds) || r.rounds.length === 0) return null;

  const rounds = r.rounds.slice(0, 30).map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    return newRound(
      clampSeconds(Number(e.seconds)),
      typeof e.label === "string" ? e.label.slice(0, 28) : "",
    );
  });

  return {
    base: clampSeconds(Number(r.base) || rounds[0].seconds),
    rounds,
    autoAdvance: r.autoAdvance !== false,
    sound: r.sound !== false,
    quotes: r.quotes !== false,
  };
}

export default function TimerApp() {
  // Server renders the defaults; the client swaps in last night's setup.
  const stored = useSyncExternalStore(noSubscribe, readStore, () => null);
  const remembered = useMemo(() => reviveConfig(stored) ?? defaultConfig(), [stored]);

  const [edited, setEdited] = useState<Config | null>(null);
  const config = edited ?? remembered;

  /** A frozen copy, so nothing can be edited out from under a live session. */
  const [live, setLive] = useState<Config | null>(null);
  const { enter } = useFullscreen();

  useEffect(() => {
    if (!edited) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(edited));
    } catch {
      // Private browsing. The timer works, it just forgets.
    }
  }, [edited]);

  const start = useCallback(() => {
    // Both of these need the click that got us here: audio needs a gesture to
    // wake up, and so does fullscreen.
    unlockAudio();
    enter();
    setLive(structuredClone(config));
  }, [config, enter]);

  const exit = useCallback(() => setLive(null), []);

  if (live) return <Runner config={live} onExit={exit} />;

  return <Setup config={config} onChange={setEdited} onStart={start} />;
}
