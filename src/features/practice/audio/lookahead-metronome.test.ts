import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LookaheadMetronome } from "./lookahead-metronome";

let audioTime = 0;
let resume: () => Promise<void>;
let starts: number[];
let stops: ReturnType<typeof vi.fn>[];

beforeEach(() => {
  vi.useFakeTimers();
  audioTime = 0;
  resume = () => Promise.resolve();
  starts = [];
  stops = [];
  const parameter = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal(
    "AudioContext",
    class {
      get currentTime() {
        return audioTime;
      }
      destination = {};
      resume() {
        return resume();
      }
      close() {
        return Promise.resolve();
      }
      createOscillator() {
        const stop = vi.fn();
        stops.push(stop);
        return {
          frequency: parameter,
          connect: vi.fn(),
          disconnect: vi.fn(),
          addEventListener: vi.fn(),
          start: (time: number) => starts.push(time),
          stop,
        };
      }
      createGain() {
        return { gain: parameter, connect: vi.fn(), disconnect: vi.fn() };
      }
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("keeps time after a stalled timer and skips past clicks without replaying them", async () => {
  const metronome = new LookaheadMetronome();
  await metronome.start({ bpm: 60, beatsPerBar: 4, volume: 0.5 });
  expect(metronome.getCurrentBeatOrdinal()).toBe(-1);
  audioTime = 0.09;
  expect(metronome.getCurrentBeatOrdinal()).toBe(0);
  audioTime = 10.57;
  expect(metronome.getCurrentBeatOrdinal()).toBe(10);
  await vi.advanceTimersByTimeAsync(25);
  expect(starts).toEqual([0.08]);
  expect(metronome.getCurrentBeatOrdinal()).toBe(10);
  audioTime = 11;
  await vi.advanceTimersByTimeAsync(25);
  expect(starts).toHaveLength(2);
  expect(starts[1]).toBeCloseTo(11.08);
  metronome.stop();
  expect(metronome.getCurrentBeatOrdinal()).toBe(-1);
  expect(stops.every((stop) => stop.mock.calls.some((args) => args.length === 0))).toBe(true);
});

it("cannot restart itself when audio permission resolves after the user stops", async () => {
  let allowAudio!: () => void;
  resume = () =>
    new Promise((resolve) => {
      allowAudio = resolve;
    });
  const metronome = new LookaheadMetronome();
  const pending = metronome.start({ bpm: 80, beatsPerBar: 4, volume: 0.5 });
  metronome.stop();
  allowAudio();
  await pending;
  expect(metronome.isRunning).toBe(false);
  expect(starts).toEqual([]);
});
