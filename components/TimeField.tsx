"use client";

import { useEffect, useRef, useState } from "react";
import { clampSeconds } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");

type Props = {
  seconds: number;
  onChange: (seconds: number) => void;
  /** The hero field on the setup screen, or a row in the per-round list. */
  hero?: boolean;
  labelPrefix?: string;
};

/**
 * Minutes and seconds as two plain fields. No spinners, no dropdowns — the
 * facilitator types the number they already have in their head.
 */
export default function TimeField({ seconds, onChange, hero = false, labelPrefix = "" }: Props) {
  const [mm, setMm] = useState(() => pad(Math.floor(seconds / 60)));
  const [ss, setSs] = useState(() => pad(seconds % 60));
  /** The last value we pushed upward, so our own echo never rewrites the caret. */
  const mine = useRef(seconds);

  useEffect(() => {
    if (seconds === mine.current) return;
    mine.current = seconds;
    setMm(pad(Math.floor(seconds / 60)));
    setSs(pad(seconds % 60));
  }, [seconds]);

  const commit = (nextMm: string, nextSs: string) => {
    const value = clampSeconds(Number(nextMm || 0) * 60 + Number(nextSs || 0));
    mine.current = value;
    onChange(value);
  };

  const digits = (raw: string) => raw.replace(/\D/g, "").slice(0, 2);

  const normalise = () => {
    setMm(pad(Math.floor(mine.current / 60)));
    setSs(pad(mine.current % 60));
  };

  const size = hero
    ? "w-[2ch] text-[clamp(3.4rem,13vw,7.5rem)] leading-none"
    : "w-[2ch] text-base sm:text-lg";

  return (
    <div className={`tnum flex items-baseline ${hero ? "gap-0" : "gap-0.5"}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`${labelPrefix}minutes`}
        value={mm}
        onChange={(e) => {
          const v = digits(e.target.value);
          setMm(v);
          commit(v, ss);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={normalise}
        className={`${size} text-center outline-none`}
      />
      <span aria-hidden className={hero ? "text-[clamp(3.4rem,13vw,7.5rem)] leading-none" : ""}>
        :
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`${labelPrefix}seconds`}
        value={ss}
        onChange={(e) => {
          const v = digits(e.target.value);
          setSs(v);
          commit(mm, v);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={normalise}
        className={`${size} text-center outline-none`}
      />
    </div>
  );
}
