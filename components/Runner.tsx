"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Ampersand from "./Ampersand";
import QuoteLine from "./QuoteLine";
import { playFinale, playRoundEnd, playTick } from "@/lib/audio";
import { useFullscreen, useIdle, usePrefersReducedMotion, useWakeLock } from "@/lib/hooks";
import { clock, human, MAX_SECONDS } from "@/lib/time";
import type { Config } from "@/lib/types";

/** Seconds of runway that get a pip and a flash. */
const COUNTDOWN_WINDOW = 10;
/** Inside this, the pip sharpens and the flash goes full inversion. */
const URGENT_WINDOW = 5;

type Phase = "running" | "paused" | "awaiting" | "done";

type Props = {
  config: Config;
  onExit: () => void;
};

export default function Runner({ config, onExit }: Props) {
  const { rounds, autoAdvance, sound, quotes } = config;
  const multi = rounds.length > 1;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  /** Whole seconds left in the current round — the only thing that re-renders each tick. */
  const [left, setLeft] = useState(rounds[0].seconds);
  /** The current round’s length, which the facilitator can stretch mid-round. */
  const [roundTotal, setRoundTotal] = useState(rounds[0].seconds);
  const [quoteSignal, setQuoteSignal] = useState(0);
  const [spent, setSpent] = useState(0);
  const [runKey, setRunKey] = useState(0);

  const deadline = useRef(0);
  const held = useRef(0);
  const lastWhole = useRef(-1);

  const reduced = usePrefersReducedMotion();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useWakeLock(phase !== "done");
  const idle = useIdle(4500, phase === "running");

  const round = rounds[index];

  const startRound = useCallback(
    (i: number) => {
      const seconds = rounds[i].seconds;
      setIndex(i);
      setRoundTotal(seconds);
      setLeft(seconds);
      lastWhole.current = -1;
      deadline.current = performance.now() + seconds * 1000;
      setPhase("running");
    },
    [rounds],
  );

  // The first round starts the moment the screen mounts.
  useEffect(() => {
    deadline.current = performance.now() + rounds[0].seconds * 1000;
    lastWhole.current = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const finishSession = useCallback(() => {
    setLeft(0);
    setPhase("done");
    if (sound) playFinale();
  }, [sound]);

  const closeRound = useCallback(
    (creditSeconds: number) => {
      setSpent((s) => s + creditSeconds);
      if (index >= rounds.length - 1) {
        finishSession();
        return;
      }
      if (sound) playRoundEnd();
      if (autoAdvance) startRound(index + 1);
      else {
        setLeft(0);
        setPhase("awaiting");
      }
    },
    [autoAdvance, finishSession, index, rounds.length, sound, startRound],
  );

  /*
    A 100 ms interval rather than an animation frame: frames stop dead in a
    background tab, intervals only slow down. Either way the remaining time is
    read from a deadline, so the clock is right even after the laptop sleeps.
  */
  useEffect(() => {
    if (phase !== "running") return;

    const tick = () => {
      const ms = deadline.current - performance.now();
      const whole = Math.max(0, Math.ceil(ms / 1000));

      if (whole !== lastWhole.current) {
        lastWhole.current = whole;
        setLeft(whole);
        if (sound && whole > 0 && whole <= COUNTDOWN_WINDOW) {
          playTick(whole <= URGENT_WINDOW ? "sharp" : "soft");
        }
      }

      if (ms <= 0) closeRound(roundTotal);
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [closeRound, phase, roundTotal, sound]);

  const togglePause = useCallback(() => {
    setPhase((p) => {
      if (p === "running") {
        held.current = Math.max(0, deadline.current - performance.now());
        return "paused";
      }
      if (p === "paused") {
        deadline.current = performance.now() + held.current;
        lastWhole.current = -1;
        return "running";
      }
      return p;
    });
  }, []);

  /** Stretch or trim the round in flight — rooms never run to plan. */
  const adjust = useCallback(
    (deltaSeconds: number) => {
      if (phase !== "running" && phase !== "paused") return;
      setRoundTotal((t) => Math.min(MAX_SECONDS, Math.max(1, t + deltaSeconds)));
      if (phase === "paused") {
        held.current = Math.min(MAX_SECONDS * 1000, Math.max(1000, held.current + deltaSeconds * 1000));
        setLeft(Math.ceil(held.current / 1000));
        return;
      }
      const remaining = Math.max(0, deadline.current - performance.now());
      const next = Math.min(MAX_SECONDS * 1000, Math.max(1000, remaining + deltaSeconds * 1000));
      deadline.current = performance.now() + next;
      lastWhole.current = -1;
      setLeft(Math.ceil(next / 1000));
    },
    [phase],
  );

  const goNext = useCallback(() => {
    if (phase === "done") return;
    if (phase === "awaiting") {
      startRound(index + 1);
      return;
    }
    closeRound(Math.max(0, roundTotal - left));
  }, [closeRound, index, left, phase, roundTotal, startRound]);

  const goPrev = useCallback(() => {
    if (phase === "done") return;
    startRound(Math.max(0, index - 1));
  }, [index, phase, startRound]);

  const restartRound = useCallback(() => {
    if (phase === "done") return;
    startRound(index);
  }, [index, phase, startRound]);

  const restartSession = useCallback(() => {
    setSpent(0);
    setRunKey((k) => k + 1);
    startRound(0);
  }, [startRound]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === " " || key === "spacebar") {
        e.preventDefault();
        if (phase === "awaiting") goNext();
        else if (phase === "done") restartSession();
        else togglePause();
        return;
      }
      if (key === "arrowright" || key === "n") {
        e.preventDefault();
        goNext();
        return;
      }
      if (key === "arrowleft" || key === "p") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (key === "r") {
        e.preventDefault();
        if (phase === "done") restartSession();
        else restartRound();
        return;
      }
      if (key === "f") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (key === "q") {
        e.preventDefault();
        setQuoteSignal((s) => s + 1);
        return;
      }
      if (key === "+" || key === "=" || key === "arrowup") {
        e.preventDefault();
        adjust(60);
        return;
      }
      if (key === "-" || key === "_" || key === "arrowdown") {
        e.preventDefault();
        adjust(-60);
        return;
      }
      if (key === "escape" || key === "x") {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjust, goNext, goPrev, onExit, phase, restartRound, restartSession, toggleFullscreen, togglePause]);

  const finalStretch = phase === "running" && left > 0 && left <= COUNTDOWN_WINDOW;
  const urgent = phase === "running" && left > 0 && left <= URGENT_WINDOW;
  const progress = phase === "done" ? 1 : Math.min(1, Math.max(0, 1 - left / Math.max(1, roundTotal)));

  const plannedTotal = useMemo(() => rounds.reduce((sum, r) => sum + r.seconds, 0), [rounds]);

  if (phase === "done") {
    return (
      <div className="relative isolate flex h-dvh flex-col items-center justify-center overflow-hidden bg-paper px-6 text-ink">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ring absolute aspect-square w-[46vh] rounded-full border border-ink/15"
              style={{ "--delay": `${i * 800}ms` } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="bloom relative flex flex-col items-center gap-8">
          <Ampersand className="h-[30vh] max-h-72 w-auto" />
          <div className="text-center">
            <p className="text-[clamp(1.6rem,5vw,3.5rem)] leading-none uppercase">That’s time</p>
            <p className="text-muted mt-4 text-xs uppercase sm:text-sm">
              {rounds.length} {rounds.length === 1 ? "round" : "rounds"} · {human(spent || plannedTotal)}
            </p>
          </div>
        </div>

        <div className="relative mt-14 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={restartSession}
            className="border-ink hover:bg-ink hover:text-paper border px-6 py-3 text-xs uppercase transition-colors"
          >
            Run it again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="border-hairline text-muted hover:border-ink hover:text-ink border px-6 py-3 text-xs uppercase transition-colors"
          >
            New timer
          </button>
        </div>

        <div key={`finale-${runKey}`} className="flash flash-finale z-50" aria-hidden />
      </div>
    );
  }

  return (
    <div className="bg-ink text-paper relative isolate flex h-dvh flex-col overflow-hidden">
      {/* A static frame marks the closing seconds even when motion is switched off. */}
      {finalStretch && (
        <div
          className={`pointer-events-none absolute inset-2 border sm:inset-4 ${urgent ? "border-paper/80" : "border-paper/25"}`}
          aria-hidden
        />
      )}

      <header
        className={`relative flex shrink-0 items-center justify-between px-5 pt-5 transition-opacity duration-700 sm:px-9 ${idle ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <div className="flex items-center gap-3">
          <Ampersand className="h-5 w-auto sm:h-6" />
          <span className="text-ash text-[0.65rem] uppercase sm:text-xs">timer</span>
        </div>

        {multi && (
          <div className="flex items-center gap-3">
            {rounds.length <= 12 && (
              <div className="flex items-end gap-1" aria-hidden>
                {rounds.map((r, i) => (
                  <span
                    key={r.id}
                    className={`w-1 transition-all duration-300 ${
                      i === index
                        ? "bg-paper h-5"
                        : i < index
                          ? "bg-paper/70 h-3"
                          : "bg-paper/20 h-3"
                    }`}
                  />
                ))}
              </div>
            )}
            <span className="text-ash text-[0.65rem] uppercase sm:text-xs">
              round {String(index + 1).padStart(2, "0")} / {String(rounds.length).padStart(2, "0")}
            </span>
          </div>
        )}
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        {round.label && (
          <p className="text-ash mb-2 text-center text-[clamp(0.7rem,1.6vw,1.1rem)] uppercase sm:mb-4">
            {round.label}
          </p>
        )}

        <div
          role="timer"
          aria-live="off"
          className={`tnum text-[min(28vw,46vh)] leading-[0.85] ${urgent && !reduced ? "urgent" : ""}`}
        >
          {clock(left)}
        </div>

        <div className="mt-3 h-6 sm:mt-5">
          {phase === "paused" && (
            <p className="text-ash waiting text-xs uppercase sm:text-sm">Paused</p>
          )}
          {phase === "awaiting" && (
            <p className="text-paper text-xs uppercase sm:text-sm">
              Round {String(index + 1).padStart(2, "0")} complete
            </p>
          )}
        </div>

        {phase === "awaiting" && (
          <button
            type="button"
            onClick={goNext}
            className="border-paper hover:bg-paper hover:text-ink waiting mt-4 border px-6 py-3 text-xs uppercase transition-colors"
          >
            Next round →
          </button>
        )}
      </main>

      {quotes && (
        <div
          className={`relative h-[6.5rem] shrink-0 transition-opacity duration-500 sm:h-[7.5rem] ${
            finalStretch ? "opacity-0" : "opacity-100"
          }`}
        >
          <QuoteLine paused={phase !== "running" || finalStretch} advanceSignal={quoteSignal} />
        </div>
      )}

      <div className="bg-paper/15 relative h-px w-full shrink-0" aria-hidden>
        <div
          className="bg-paper h-full origin-left"
          style={{
            transform: `scaleX(${progress})`,
            transition: phase === "running" ? "transform 1s linear" : "none",
          }}
        />
      </div>

      <footer
        className={`relative flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-4 transition-opacity duration-700 sm:gap-x-7 sm:px-9 ${idle ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <Control label={phase === "paused" ? "Resume" : "Pause"} hint="space" onClick={togglePause} />
        {multi && <Control label="Next" hint="→" onClick={goNext} />}
        {multi && index > 0 && <Control label="Back" hint="←" onClick={goPrev} />}
        <Control label="Restart" hint="r" onClick={restartRound} />
        <Control label="+1:00" hint="+" onClick={() => adjust(60)} />
        <Control label="−1:00" hint="−" onClick={() => adjust(-60)} />
        {quotes && <Control label="Quote" hint="q" onClick={() => setQuoteSignal((s) => s + 1)} />}
        <Control label={isFullscreen ? "Windowed" : "Fullscreen"} hint="f" onClick={toggleFullscreen} />
        <Control label="End" hint="esc" onClick={onExit} />
      </footer>

      {finalStretch && !reduced && (
        <div
          key={`${index}-${left}`}
          className={`flash z-50 ${urgent ? "flash-hard" : "flash-soft"}`}
          aria-hidden
        />
      )}
    </div>
  );
}

function Control({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-ash hover:text-paper group flex items-baseline gap-1.5 text-[0.65rem] uppercase transition-colors sm:text-xs"
    >
      <span>{label}</span>
      <span className="text-paper/25 group-hover:text-paper/50">[{hint}]</span>
    </button>
  );
}
