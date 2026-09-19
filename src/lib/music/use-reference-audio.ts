"use client";

import { useEffect, useRef, useState } from "react";
import type { GuitarVoicing } from "./types";

export function useReferenceAudio() {
  const context = useRef<AudioContext | null>(null);
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const generation = useRef(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const stop = () => {
    generation.current++;
    for (const source of sources.current) {
      try {
        source.stop();
      } catch {}
    }
    sources.current.clear();
  };
  useEffect(
    () => () => {
      generation.current++;
      for (const source of sources.current) {
        try {
          source.stop();
        } catch {}
      }
      void context.current?.close();
    },
    [],
  );
  async function play(frequencies: number[]) {
    stop();
    const token = generation.current;
    try {
      context.current ??= new AudioContext();
      const ctx = context.current;
      await ctx.resume();
      if (ctx.state === "closed" || token !== generation.current) return;
      frequencies.forEach((frequency, index) => {
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        const period = Math.round(ctx.sampleRate / frequency);
        for (let i = 0; i < period; i++) samples[i] = (Math.random() * 2 - 1) * 0.32;
        for (let i = period; i < samples.length; i++)
          samples[i] = 0.497 * (samples[i - period] + samples[i - period + 1]);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(ctx.currentTime + index * 0.045);
        sources.current.add(source);
        source.onended = () => {
          source.disconnect();
          sources.current.delete(source);
        };
      });
      setAudioError(null);
    } catch {
      setAudioError("Sound could not play. Check your browser's audio permission and try again.");
    }
  }
  const playChord = (voicing: GuitarVoicing) =>
    play(
      voicing.frets.flatMap((fret, i) =>
        fret === null ? [] : [440 * 2 ** (([40, 45, 50, 55, 59, 64][i] + fret - 69) / 12)],
      ),
    );
  return { playChord, playTone: (frequency: number) => play([frequency]), stop, audioError };
}
