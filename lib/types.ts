export type Round = {
  /** Stable key so React does not reorder inputs under the facilitator’s cursor. */
  id: string;
  seconds: number;
  /** Optional name shown on the running clock — “Breakouts”, “Debrief”. */
  label: string;
};

export type Config = {
  /**
   * The time every round starts life with. Changing it re-times the whole
   * session; a round edited by hand keeps its own value until it does.
   */
  base: number;
  rounds: Round[];
  /** With more than one round: roll straight into the next, or wait for a human. */
  autoAdvance: boolean;
  sound: boolean;
  quotes: boolean;
};

export const CONFIG_VERSION = 1;

let seq = 0;

export function newRound(seconds: number, label = ""): Round {
  seq += 1;
  return { id: `r${seq}-${seconds}-${Math.random().toString(36).slice(2, 7)}`, seconds, label };
}

export const DEFAULT_SECONDS = 5 * 60;

export function defaultConfig(): Config {
  return {
    base: DEFAULT_SECONDS,
    rounds: [newRound(DEFAULT_SECONDS)],
    autoAdvance: true,
    sound: true,
    quotes: true,
  };
}

/** Seconds the whole session will take, ignoring pauses. */
export function totalSeconds(rounds: readonly Round[]): number {
  return rounds.reduce((sum, r) => sum + r.seconds, 0);
}
