import { describe, expect, it } from "vitest";
import { centsFrom, detectPitch, nearestString, TUNING_STRINGS } from "./pitch";

function wave(frequency: number, sampleRate: number, harmonics = false) {
  return Float32Array.from({ length: 4096 }, (_, i) => {
    const phase = (2 * Math.PI * frequency * i) / sampleRate;
    return (
      0.3 * Math.sin(phase) +
      (harmonics ? 0.5 * Math.sin(2 * phase) + 0.15 * Math.sin(3 * phase) : 0)
    );
  });
}

describe("single string tuning", () => {
  for (const sampleRate of [44100, 48000])
    for (const string of TUNING_STRINGS) {
      it(`finds ${string.label}${string.octave} at ${sampleRate} Hz`, () => {
        const result = detectPitch(wave(string.frequency, sampleRate), sampleRate);
        expect(result).not.toBeNull();
        expect(Math.abs(centsFrom(result!.frequency, string.frequency))).toBeLessThan(2);
        expect(nearestString(result!.frequency)).toBe(TUNING_STRINGS.indexOf(string));
      });
    }
  it("finds the fundamental even with a louder second harmonic", () => {
    const result = detectPitch(wave(110, 48000, true), 48000);
    expect(result!.frequency).toBeCloseTo(110, 0);
  });
  it("detects quiet sustained guitar strings without accepting low-level noise", () => {
    for (const string of TUNING_STRINGS) {
      const samples = wave(string.frequency, 48000).map((v) => v * 0.01);
      const result = detectPitch(samples, 48000);
      expect(result).not.toBeNull();
      expect(Math.abs(centsFrom(result!.frequency, string.frequency))).toBeLessThan(2);
    }
    expect(
      detectPitch(
        wave(110, 48000).map((v) => v * 0.0001),
        48000,
      ),
    ).toBeNull();
  });
  it("does not claim a pitch for silence, noise or invalid samples", () => {
    expect(detectPitch(new Float32Array(4096), 48000)).toBeNull();
    expect(detectPitch(new Float32Array(4096).fill(NaN), 48000)).toBeNull();
    let seed = 123;
    const noise = Float32Array.from({ length: 4096 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32 - 0.5;
    });
    expect(detectPitch(noise, 48000)).toBeNull();
  });
  it("measures flat and sharp pitch symmetrically in cents", () => {
    expect(centsFrom(440 * 2 ** (10 / 1200), 440)).toBeCloseTo(10);
    expect(centsFrom(440 * 2 ** (-10 / 1200), 440)).toBeCloseTo(-10);
  });
});
