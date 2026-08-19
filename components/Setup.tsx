"use client";

import { useMemo, useState } from "react";
import Ampersand from "./Ampersand";
import TimeField from "./TimeField";
import { human } from "@/lib/time";
import { newRound, totalSeconds, type Config, type Round } from "@/lib/types";

const PRESETS = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];
const MAX_ROUNDS = 30;

type Props = {
  config: Config;
  onChange: (next: Config) => void;
  onStart: () => void;
};

export default function Setup({ config, onChange, onStart }: Props) {
  const { base, rounds, autoAdvance, sound, quotes } = config;
  const multi = rounds.length > 1;
  const [openRounds, setOpenRounds] = useState(false);

  const total = useMemo(() => totalSeconds(rounds), [rounds]);
  const custom = useMemo(() => rounds.some((r) => r.seconds !== base), [rounds, base]);
  const ready = rounds.length > 0 && rounds.every((r) => r.seconds >= 1);

  /** The time above is the session’s tempo: setting it re-times every round. */
  const setBase = (seconds: number) =>
    onChange({ ...config, base: seconds, rounds: rounds.map((r) => ({ ...r, seconds })) });

  const setCount = (count: number) => {
    const next = Math.min(MAX_ROUNDS, Math.max(1, count));
    if (next === rounds.length) return;
    const list: Round[] =
      next > rounds.length
        ? [...rounds, ...Array.from({ length: next - rounds.length }, () => newRound(base))]
        : rounds.slice(0, next);
    onChange({ ...config, rounds: list });
  };

  const patchRound = (id: string, patch: Partial<Round>) =>
    onChange({ ...config, rounds: rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 sm:px-8">
      <header className="settle flex items-center justify-between py-7 sm:py-10">
        <div className="flex items-center gap-3">
          <Ampersand className="h-7 w-auto sm:h-9" />
          <span className="text-xs uppercase sm:text-sm">timer</span>
        </div>
        <p className="text-muted tnum text-[0.65rem] uppercase sm:text-xs">
          {human(total)} · {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
        </p>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-11 pb-4 sm:gap-14">
        {/* ── Time ───────────────────────────────────────────────── */}
        <section className="settle" style={{ "--delay": "60ms" } as React.CSSProperties}>
          <SectionTitle>time</SectionTitle>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
            <TimeField seconds={base} onChange={setBase} hero labelPrefix="round length: " />
            <div className="flex max-w-md flex-wrap gap-x-1 gap-y-1 pb-2">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBase(m * 60)}
                  aria-pressed={base === m * 60}
                  className={`tnum border px-2.5 py-1.5 text-[0.7rem] uppercase transition-colors sm:px-3 ${
                    base === m * 60
                      ? "border-ink bg-ink text-paper"
                      : "border-hairline text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
          {custom && (
            <p className="text-muted mt-4 text-[0.65rem] uppercase">
              Some rounds have their own time. Setting the time here resets all of them.
            </p>
          )}
        </section>

        {/* ── Rounds ─────────────────────────────────────────────── */}
        <section className="settle" style={{ "--delay": "140ms" } as React.CSSProperties}>
          <SectionTitle>rounds</SectionTitle>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
            <div className="flex items-center gap-5">
              <Stepper
                label="one fewer round"
                sign="−"
                disabled={rounds.length <= 1}
                onClick={() => setCount(rounds.length - 1)}
              />
              <span className="tnum w-[2ch] text-center text-3xl sm:text-4xl">
                {String(rounds.length).padStart(2, "0")}
              </span>
              <Stepper
                label="one more round"
                sign="+"
                disabled={rounds.length >= MAX_ROUNDS}
                onClick={() => setCount(rounds.length + 1)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  aria-pressed={rounds.length === n}
                  className={`tnum border px-2.5 py-1.5 text-[0.7rem] transition-colors sm:px-3 ${
                    rounds.length === n
                      ? "border-ink bg-ink text-paper"
                      : "border-hairline text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Handover ───────────────────────────────────────────── */}
        {multi && (
          <section className="settle" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <SectionTitle>when a round ends</SectionTitle>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Choice
                selected={autoAdvance}
                onClick={() => onChange({ ...config, autoAdvance: true })}
                title="Roll straight on"
                note="The next round starts itself."
              />
              <Choice
                selected={!autoAdvance}
                onClick={() => onChange({ ...config, autoAdvance: false })}
                title="Wait for my cue"
                note="It holds at zero until you say go."
              />
            </div>
          </section>
        )}

        {/* ── Per round ──────────────────────────────────────────── */}
        {multi && (
          <section className="settle" style={{ "--delay": "260ms" } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => setOpenRounds((o) => !o)}
              className="group flex w-full items-center gap-4 text-left"
              aria-expanded={openRounds}
            >
              <h2 className="text-muted group-hover:text-ink text-[0.65rem] uppercase transition-colors">
                each round
              </h2>
              <div className="bg-hairline h-px flex-1" />
              <span className="text-muted group-hover:text-ink text-[0.65rem] uppercase transition-colors">
                {openRounds ? "close" : "edit"}
              </span>
            </button>

            {openRounds && (
              <ul className="mt-5 flex flex-col">
                {rounds.map((r, i) => (
                  <li
                    key={r.id}
                    className="border-hairline flex items-center gap-4 border-b py-3 first:border-t"
                  >
                    <span className="tnum text-muted w-[3ch] text-xs">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <TimeField
                      seconds={r.seconds}
                      onChange={(seconds) => patchRound(r.id, { seconds })}
                      labelPrefix={`round ${i + 1} `}
                    />
                    <input
                      type="text"
                      value={r.label}
                      onChange={(e) => patchRound(r.id, { label: e.target.value.slice(0, 28) })}
                      placeholder="name this round"
                      aria-label={`round ${i + 1} name`}
                      className="placeholder:text-faint min-w-0 flex-1 text-sm outline-none"
                    />
                    {r.seconds !== base && (
                      <button
                        type="button"
                        onClick={() => patchRound(r.id, { seconds: base })}
                        className="text-muted hover:text-ink text-[0.65rem] uppercase transition-colors"
                      >
                        reset
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Extras ─────────────────────────────────────────────── */}
        <section className="settle" style={{ "--delay": "320ms" } as React.CSSProperties}>
          <SectionTitle>in the room</SectionTitle>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            <Check
              checked={sound}
              onClick={() => onChange({ ...config, sound: !sound })}
              label="Sound through the last ten seconds"
            />
            <Check
              checked={quotes}
              onClick={() => onChange({ ...config, quotes: !quotes })}
              label="Show lines from the & bank"
            />
          </div>
        </section>

        <section className="settle pt-2" style={{ "--delay": "380ms" } as React.CSSProperties}>
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            className="border-ink bg-ink text-paper hover:bg-paper hover:text-ink w-full border px-6 py-5 text-sm uppercase transition-colors disabled:opacity-30"
          >
            Start
          </button>
        </section>
      </main>

      <footer className="text-muted border-hairline mt-8 flex flex-wrap gap-x-5 gap-y-1 border-t py-5 text-[0.6rem] uppercase">
        <span>space pauses</span>
        <span>→ next round</span>
        <span>± a minute</span>
        <span>f fullscreen</span>
        <span>esc ends</span>
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="text-muted text-[0.65rem] uppercase">{children}</h2>
      <div className="bg-hairline h-px flex-1" />
    </div>
  );
}

function Stepper({
  sign,
  label,
  onClick,
  disabled,
}: {
  sign: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="border-hairline hover:border-ink hover:bg-ink hover:text-paper flex h-11 w-11 items-center justify-center border text-lg transition-colors disabled:pointer-events-none disabled:opacity-25"
    >
      {sign}
    </button>
  );
}

function Choice({
  selected,
  onClick,
  title,
  note,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`border p-4 text-left transition-colors ${
        selected ? "border-ink bg-ink text-paper" : "border-hairline hover:border-ink"
      }`}
    >
      <span className="block text-sm">{title}</span>
      <span className={`mt-1 block text-[0.7rem] ${selected ? "text-paper/60" : "text-muted"}`}>
        {note}
      </span>
    </button>
  );
}

function Check({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={checked}
      className="group flex items-center gap-3 text-left"
    >
      <span
        className={`border-ink flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
          checked ? "bg-ink" : "bg-paper group-hover:bg-hairline"
        }`}
      >
        {checked && <span className="bg-paper h-1.5 w-1.5" />}
      </span>
      <span className="text-muted group-hover:text-ink text-xs transition-colors">{label}</span>
    </button>
  );
}
