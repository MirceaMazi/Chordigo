"use client";

import { ArrowRight, Check, Mic, MicOff, ShieldCheck, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReferenceAudio } from "@/lib/music/use-reference-audio";
import { centsFrom, detectPitch, nearestString, TUNING_STRINGS } from "./pitch";

export function TunerWorkspace() {
  const [listening, setListening] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resources = useRef<{
    context: AudioContext;
    stream: MediaStream;
    source: MediaStreamAudioSourceNode;
    timer: number;
  } | null>(null);
  const generation = useRef(0);
  const audio = useReferenceAudio();
  const index = auto && frequency ? nearestString(frequency) : selected;
  const target = TUNING_STRINGS[index];
  const cents = frequency ? centsFrom(frequency, target.frequency) : 0;
  const inTune = frequency !== null && Math.abs(cents) <= 5;

  const cleanup = useCallback(() => {
    generation.current++;
    const current = resources.current;
    if (current) {
      clearInterval(current.timer);
      current.stream.getTracks().forEach((t) => t.stop());
      current.source.disconnect();
      void current.context.close();
      resources.current = null;
    }
  }, []);
  const stop = useCallback(() => {
    cleanup();
    setListening(false);
    setRequesting(false);
    setFrequency(null);
  }, [cleanup]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [cleanup, stop]);

  const start = async () => {
    audio.stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Microphone tuning needs HTTPS or localhost and a browser with microphone support. You can still tune by ear with the reference tones below.",
      );
      return;
    }
    const token = ++generation.current;
    setRequesting(true);
    setError(null);
    let pendingStream: MediaStream | null = null;
    let pendingContext: AudioContext | null = null;
    try {
      // Create/resume in the user gesture, before waiting for microphone permission.
      pendingContext = new AudioContext();
      await pendingContext.resume();
      pendingStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (token !== generation.current) {
        pendingStream.getTracks().forEach((t) => t.stop());
        await pendingContext.close();
        return;
      }
      const context = pendingContext;
      const source = context.createMediaStreamSource(pendingStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let lastGood = 0;
      let recent: number[] = [];
      const timer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const pitch = detectPitch(samples, context.sampleRate);
        if (pitch && pitch.confidence > 0.88) {
          if (recent.length && Math.abs(centsFrom(pitch.frequency, recent[recent.length - 1])) > 80)
            recent = [];
          recent = [...recent.slice(-4), pitch.frequency];
          const sorted = [...recent].sort((a, b) => a - b);
          setFrequency(sorted[Math.floor(sorted.length / 2)]);
          lastGood = performance.now();
        } else if (performance.now() - lastGood > 700) {
          setFrequency(null);
          recent = [];
        }
      }, 100);
      resources.current = { context, stream: pendingStream, source, timer };
      pendingStream.getAudioTracks().forEach((track) =>
        track.addEventListener("ended", () => {
          if (token === generation.current) {
            stop();
            setError(
              "The microphone disconnected. Reconnect it and try again, or use a reference tone.",
            );
          }
        }),
      );
      setListening(true);
      setRequesting(false);
    } catch (cause) {
      pendingStream?.getTracks().forEach((t) => t.stop());
      if (pendingContext?.state !== "closed") await pendingContext?.close();
      if (token !== generation.current) return;
      setRequesting(false);
      const name = cause instanceof Error ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access wasn’t allowed. Enable it in your browser’s site settings and try again, or tune by ear with the reference tones."
          : name === "NotFoundError"
            ? "No microphone was found. Connect one, or use the reference tones to tune by ear."
            : "The microphone could not start. Check that another app isn’t using it, then try again.",
      );
    }
  };
  const playReference = (i: number) => {
    stop();
    setAuto(false);
    setSelected(i);
    void audio.playTone(TUNING_STRINGS[i].frequency);
  };

  return (
    <main id="main-content" className="content-page tuner-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Before the first chord</p>
          <h1>
            Start in tune<span className="accent-period">.</span>
          </h1>
          <p className="page-description">
            Six strings. A fresh start. Let’s get them sounding right.
          </p>
        </div>
        <span className="streak-badge">Standard tuning · A4 = 440 Hz</span>
      </div>
      <div className="tuner-layout">
        <section className="tuner-panel panel" aria-label="Guitar tuner">
          <div className="tuner-topline">
            <span className="tuner-state">
              <span className={`status-dot ${listening ? "pulse" : ""}`} />
              {listening
                ? "Listening on this device"
                : requesting
                  ? "Waiting for microphone…"
                  : "Microphone off"}
            </span>
            <button className="text-button" aria-pressed={auto} onClick={() => setAuto(!auto)}>
              {auto ? "Auto-detect string" : "Selected string"}
            </button>
          </div>
          <div className="tuner-readout">
            <div className="tuner-note">
              {target.note}
              <small>{target.octave}</small>
            </div>
            <div className="tuner-frequency">
              {frequency
                ? `${frequency.toFixed(1)} Hz detected`
                : `${target.frequency.toFixed(1)} Hz reference`}
            </div>
          </div>
          <div
            className="tuner-meter"
            role="meter"
            aria-label="Pitch difference in cents"
            aria-valuemin={-50}
            aria-valuemax={50}
            aria-valuenow={Math.round(Math.max(-50, Math.min(50, cents)))}
            aria-valuetext={
              frequency
                ? `${Math.round(cents)} cents, ${inTune ? "in tune" : cents < 0 ? "flat" : "sharp"}`
                : "No pitch detected"
            }
          >
            {Array.from({ length: 31 }, (_, i) => (
              <span
                className={`tuner-tick ${i % 5 === 0 ? "major" : ""} ${i === 15 ? "middle" : ""}`}
                key={i}
              />
            ))}
            {frequency && (
              <span
                className="tuner-needle"
                style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }}
              />
            )}
          </div>
          <div className="tuner-labels">
            <span>♭ Too low</span>
            <span>{inTune ? "In tune" : "In tune at center"}</span>
            <span>Too high ♯</span>
          </div>
          <p className="tuner-guidance" role="status">
            {frequency
              ? inTune
                ? "✓ Right there. That string is in tune."
                : `${cents < 0 ? "Tighten a little" : "Loosen a little"} · ${Math.abs(Math.round(cents))} cents ${cents < 0 ? "flat" : "sharp"}`
              : listening
                ? "Pluck one open string and let it ring."
                : "A quiet room makes a good tuning room."}
          </p>
          <button
            className="primary-button"
            onClick={() => (listening || requesting ? stop() : void start())}
          >
            {listening || requesting ? <MicOff size={17} /> : <Mic size={17} />}
            {listening
              ? "Stop listening"
              : requesting
                ? "Cancel microphone request"
                : "Enable microphone"}
          </button>
          <div
            className="tuner-strings"
            role="group"
            aria-label="Standard tuning reference strings"
          >
            {TUNING_STRINGS.map((string, i) => (
              <button
                className={`tuner-string ${i === index ? "is-selected" : ""}`}
                aria-label={`Play ${string.label} reference tone`}
                aria-pressed={i === index}
                onClick={() => playReference(i)}
                key={string.midi}
              >
                <small>{6 - i}</small>
                <strong>{string.note}</strong>
                <small>{string.frequency.toFixed(1)} Hz</small>
              </button>
            ))}
          </div>
          <p className="small-muted">
            Tap a string to hear its reference tone. Microphone listening stops while a reference
            plays.
          </p>
          <div className="tuner-reference-mode">
            <button className="text-button" onClick={() => playReference(index)}>
              <Volume2 size={15} />
              Hear {target.label} again
            </button>
            <button className="text-button" onClick={audio.stop}>
              Stop reference tone
            </button>
          </div>
        </section>
        <aside className="tuner-tips panel">
          <h2>A good sound starts here.</h2>
          <ol>
            <li>Hold your guitar comfortably and mute the strings you aren’t tuning.</li>
            <li>Pluck one open string gently. Let the note settle for a moment.</li>
            <li>Turn the matching tuning peg a little at a time. Aim for the center.</li>
            <li>Work from the thickest string to the thinnest, then check all six again.</li>
          </ol>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <p>
              Your microphone audio stays on your device. It is never recorded, saved, or uploaded.
            </p>
          </div>
          <div className="tuner-help">
            <h3>No microphone? Use your ears.</h3>
            <p>
              Tap a string button to hear a reference note. Match it with your open string. The
              numbers run from 6, the thickest, to 1, the thinnest.
            </p>
            <p>This tuner listens for a single note. Play one string at a time.</p>
          </div>
          <Link className="secondary-button" href="/practice">
            <Check size={16} />
            All tuned up <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
      {error || audio.audioError ? (
        <p className="error-notice" role="alert">
          {error || audio.audioError}
        </p>
      ) : null}
    </main>
  );
}
