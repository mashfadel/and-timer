/**
 * Every sound here is synthesised in the browser — the app ships no audio
 * files, which keeps it instant on a conference wifi and silent until a human
 * has actually clicked something.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

/** Must be called from a real user gesture, or Safari keeps the context asleep. */
export function unlockAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Blip = {
  freq: number;
  /** Seconds from now. */
  at?: number;
  dur?: number;
  peak?: number;
  type?: OscillatorType;
  /** Bend to this frequency across the note — used for the low closing bloom. */
  glideTo?: number;
};

function blip(audio: AudioContext, { freq, at = 0, dur = 0.18, peak = 0.22, type = "sine", glideTo }: Blip) {
  const t0 = audio.currentTime + at;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);

  // A short attack and an exponential tail: a pip, never a click.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** The per-second pip through the closing seconds. Escalates as zero arrives. */
export function playTick(urgency: "soft" | "sharp"): void {
  const audio = unlockAudio();
  if (!audio) return;
  if (urgency === "soft") {
    blip(audio, { freq: 660, dur: 0.13, peak: 0.16 });
  } else {
    blip(audio, { freq: 990, dur: 0.16, peak: 0.3 });
    blip(audio, { freq: 1980, dur: 0.09, peak: 0.06, type: "triangle" });
  }
}

/** A round closed, but the session continues. Two notes, no fuss. */
export function playRoundEnd(): void {
  const audio = unlockAudio();
  if (!audio) return;
  blip(audio, { freq: 784, dur: 0.24, peak: 0.26 });
  blip(audio, { freq: 1046.5, at: 0.16, dur: 0.42, peak: 0.24 });
}

/** The whole session is done. This one is allowed to be a moment. */
export function playFinale(): void {
  const audio = unlockAudio();
  if (!audio) return;
  const arpeggio = [523.25, 659.25, 783.99, 1046.5];
  arpeggio.forEach((freq, i) => {
    blip(audio, { freq, at: i * 0.13, dur: 0.3, peak: 0.26 });
  });
  // A held fifth over a low bloom — the room knows it is over.
  blip(audio, { freq: 523.25, at: 0.56, dur: 1.5, peak: 0.2 });
  blip(audio, { freq: 783.99, at: 0.56, dur: 1.5, peak: 0.16 });
  blip(audio, { freq: 1567.98, at: 0.56, dur: 1.2, peak: 0.07, type: "triangle" });
  blip(audio, { freq: 130.81, at: 0.5, dur: 1.9, peak: 0.22, glideTo: 65.4 });
}

/** A quiet confirmation for taps that are not the clock itself. */
export function playBlip(): void {
  const audio = unlockAudio();
  if (!audio) return;
  blip(audio, { freq: 440, dur: 0.09, peak: 0.1 });
}
