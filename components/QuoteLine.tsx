"use client";

import { useEffect, useRef, useState } from "react";
import { makeDeck, type Quote } from "@/lib/quotes";

type Props = {
  /** Freeze the rotation — a paused clock should not keep talking. */
  paused: boolean;
  /** Increment to deal the next line immediately. */
  advanceSignal: number;
  /** Milliseconds a line holds before the next one arrives. */
  holdMs?: number;
};

/**
 * A rotating line from the & bank. The deck is built on the client so the
 * shuffle never has to agree with the server.
 */
export default function QuoteLine({ paused, advanceSignal, holdMs = 18000 }: Props) {
  const dealRef = useRef<(() => Quote) | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [beat, setBeat] = useState(0);

  const deal = () => {
    if (!dealRef.current) dealRef.current = makeDeck();
    setQuote(dealRef.current());
    setBeat((b) => b + 1);
  };

  useEffect(() => {
    // Deal once on mount; the rotation below takes it from there.
    deal();
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(deal, holdMs);
    return () => window.clearInterval(id);
  }, [paused, holdMs]);

  const firstSignal = useRef(advanceSignal);
  useEffect(() => {
    if (advanceSignal === firstSignal.current) return;
    deal();
  }, [advanceSignal]);

  if (!quote) return <div aria-hidden className="h-full" />;

  return (
    <figure
      key={beat}
      className="quote-in mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-2 overflow-hidden px-6 text-center"
      aria-live="off"
    >
      <blockquote className="text-ash text-[clamp(0.8rem,1.5vw,1.25rem)] leading-snug text-balance">
        {quote.t}
      </blockquote>
      <figcaption className="text-ash/60 text-[clamp(0.6rem,0.85vw,0.8rem)] uppercase">
        {quote.b}
      </figcaption>
    </figure>
  );
}
