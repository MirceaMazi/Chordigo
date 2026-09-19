export type MetronomeSettings = {
  bpm: number;
  beatsPerBar: number;
  volume: number;
};

const SCHEDULE_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;
const START_DELAY_SECONDS = 0.08;

export class LookaheadMetronome {
  private context: AudioContext | null = null;
  private timerId: number | null = null;
  private settings: MetronomeSettings = {
    bpm: 84,
    beatsPerBar: 4,
    volume: 0.7,
  };
  private activeSources = new Set<OscillatorNode>();
  private startedAt = 0;
  private nextBeatOrdinal = 0;
  private nextBeatAt = 0;
  private generation = 0;

  get isRunning(): boolean {
    return this.timerId !== null;
  }

  async start(settings: MetronomeSettings): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.settings = settings;
    this.context ??= new AudioContext({ latencyHint: "interactive" });
    await this.context.resume();
    if (generation !== this.generation) return;

    this.nextBeatOrdinal = 0;
    this.startedAt = this.context.currentTime + START_DELAY_SECONDS;
    this.nextBeatAt = this.startedAt;
    this.scheduleWindow();
    this.timerId = window.setInterval(() => this.scheduleWindow(), SCHEDULE_INTERVAL_MS);
  }

  setVolume(volume: number): void {
    this.settings.volume = volume;
  }

  stop(): void {
    this.generation += 1;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // A source may already have ended between iteration and stop().
      }
    }

    this.activeSources.clear();
  }

  async dispose(): Promise<void> {
    this.stop();
    await this.context?.close();
    this.context = null;
  }

  getCurrentBeatOrdinal(): number {
    if (!this.context || !this.isRunning) {
      return -1;
    }

    // Derive visible time directly from the audio clock, including after a
    // stalled render or scheduler. Skipped clicks cannot rewind the lesson.
    return Math.floor((this.context.currentTime - this.startedAt) / (60 / this.settings.bpm));
  }

  private scheduleWindow(): void {
    if (!this.context) {
      return;
    }

    const horizon = this.context.currentTime + SCHEDULE_AHEAD_SECONDS;
    // A delayed timer must skip elapsed clicks, never burst them all at once.
    if (this.nextBeatAt < this.context.currentTime - 0.1) {
      const skipped = Math.ceil(
        (this.context.currentTime - this.nextBeatAt) / (60 / this.settings.bpm),
      );
      this.nextBeatOrdinal += skipped;
      this.nextBeatAt += skipped * (60 / this.settings.bpm);
    }
    while (this.nextBeatAt < horizon) {
      const accent = this.nextBeatOrdinal % this.settings.beatsPerBar === 0;
      this.scheduleClick(this.nextBeatAt, accent);

      this.nextBeatOrdinal += 1;
      this.nextBeatAt += 60 / this.settings.bpm;
    }
  }

  private scheduleClick(startsAt: number, accent: boolean): void {
    if (!this.context) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const level = Math.max(0, Math.min(1, this.settings.volume));

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(accent ? 1320 : 920, startsAt);
    gain.gain.setValueAtTime(Math.max(0.0001, level * (accent ? 0.34 : 0.23)), startsAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.045);

    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + 0.05);

    this.activeSources.add(oscillator);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
      this.activeSources.delete(oscillator);
    });
  }
}
