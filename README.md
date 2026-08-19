# & timer

A full-screen timer for & community activities. One screen to set it up, one
screen that owns the room.

## What it does

- **A timer.** Minutes and seconds, typed or picked from presets.
- **Rounds.** One to thirty. When a round ends it either rolls straight on or
  holds at zero until you give the cue.
- **Per-round edits.** Any round can keep its own length and its own name
  (“Pitch”, “Feedback”, “Close”) — the name shows above the clock while it runs.
- **Pause** any time, add or take a minute mid-round, restart a round, step back.
- **The last ten seconds** get a sound and a flash: a soft pulse from ten, a
  full screen inversion from five. A static frame marks the stretch too, so the
  cue survives `prefers-reduced-motion`.
- **Zero** is a moment — three inversions, then the & mark blooms on paper.
- **Lines from the & bank** rotate through the run: 253 of them on leadership,
  togetherness, courage, craft and time.

## In the room

| key | |
| --- | --- |
| `space` | pause / resume — and the cue on a held round |
| `→` `n` | next round |
| `←` `p` | previous round |
| `r` | restart this round |
| `+` `−` | add or take a minute |
| `q` | next line |
| `f` | fullscreen |
| `esc` | end the session |

The screen is asked to stay awake for the duration, and the setup you used last
time is remembered.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export of one page
```

Next.js 16, React 19, Tailwind v4. No database, no API routes, no environment
variables — the whole thing is one static page.

## House notes

- **The brand is the design system.** SF Mono at -7% tracking, paper and ink,
  nothing else. No font files ship: `ui-monospace` resolves to SF Mono on Apple
  hardware and degrades to the nearest local equivalent elsewhere.
- **The flash is a white sheet in `mix-blend-mode: difference`.** It inverts
  whatever is under it, so urgency is built from the two brand tones rather than
  a red we borrowed from somewhere else.
- **Sound is synthesised** with the Web Audio API — no audio assets, and
  silent until a real click has woken the context.
- **The clock reads from a deadline**, not from counting intervals, so it stays
  honest through a background tab or a sleeping laptop.
- **Base CSS lives in `@layer base`.** Unlayered rules outrank every Tailwind
  utility, and an unlayered `button { color: inherit }` will quietly eat
  `text-paper` on the start button. It did, once.
- **Quote attributions** carry what each line is commonly published under;
  proverbs are credited as proverbs rather than pinned to someone we cannot
  verify. Lines credited to `&` are house lines written for this community.
