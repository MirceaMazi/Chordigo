export const TUNING_STRINGS = [
  { note: "E", octave: 2, midi: 40, label: "Low E", frequency: 82.4069 },
  { note: "A", octave: 2, midi: 45, label: "A", frequency: 110 },
  { note: "D", octave: 3, midi: 50, label: "D", frequency: 146.8324 },
  { note: "G", octave: 3, midi: 55, label: "G", frequency: 195.9977 },
  { note: "B", octave: 3, midi: 59, label: "B", frequency: 246.9417 },
  { note: "E", octave: 4, midi: 64, label: "High E", frequency: 329.6276 },
] as const;

// Cumulative mean normalized difference (YIN), with parabolic period refinement.
// This is a monophonic tuner, not a chord recognizer.
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
): { frequency: number; confidence: number } | null {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || samples.length < 2048) return null;
  let sum = 0;
  for (const value of samples) {
    if (!Number.isFinite(value)) return null;
    sum += value * value;
  }
  // A quiet plucked string can fall below a speech-oriented input gate.
  // Periodicity confidence still rejects unpitched noise above this floor.
  if (Math.sqrt(sum / samples.length) < 0.0015) return null;
  const size = Math.floor(samples.length / 2);
  const minLag = Math.max(2, Math.floor(sampleRate / 1100));
  const maxLag = Math.min(size - 1, Math.ceil(sampleRate / 65));
  const differences = new Float32Array(maxLag + 1);
  let cumulative = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let difference = 0;
    for (let i = 0; i < size; i++) {
      const delta = samples[i] - samples[i + lag];
      difference += delta * delta;
    }
    cumulative += difference;
    differences[lag] = cumulative === 0 ? 1 : (difference * lag) / cumulative;
  }
  for (let lag = minLag; lag < maxLag - 1; lag++) {
    if (differences[lag] > 0.12) continue;
    while (lag < maxLag - 1 && differences[lag + 1] < differences[lag]) lag++;
    const before = differences[lag - 1];
    const middle = differences[lag];
    const after = differences[lag + 1];
    const denominator = 2 * (2 * middle - before - after);
    const refined = lag + (denominator === 0 ? 0 : (after - before) / denominator);
    const frequency = sampleRate / refined;
    if (frequency < 65 || frequency > 1100) return null;
    return { frequency, confidence: 1 - middle };
  }
  return null;
}

export function centsFrom(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target);
}
export function nearestString(frequency: number): number {
  return TUNING_STRINGS.reduce(
    (best, target, i) =>
      Math.abs(centsFrom(frequency, target.frequency)) <
      Math.abs(centsFrom(frequency, TUNING_STRINGS[best].frequency))
        ? i
        : best,
    0,
  );
}
