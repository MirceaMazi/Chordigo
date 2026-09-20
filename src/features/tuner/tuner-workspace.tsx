"use client";

import { ArrowRight, Check, Mic, MicOff, ShieldCheck, Volume2 } from "lucide-react";
import Link from "next/link";
import { SectionGuide } from "@/components/section-guide";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReferenceAudio } from "@/lib/music/use-reference-audio";
import { centsFrom, detectPitch, nearestString, TUNING_STRINGS } from "./pitch";

export function TunerWorkspace() {
  const [listening, setListening] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [lastFrequency, setLastFrequency] = useState<number | null>(null);
  const [input, setInput] = useState({ level: 0, active: false, silentFor: 0 });
  const [microphoneName, setMicrophoneName] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [audioPaused, setAudioPaused] = useState(false);
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
  const detected = frequency ?? lastFrequency;
  const index = auto && detected ? nearestString(detected) : selected;
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
      current.context.onstatechange = null;
      void current.context.close().catch(() => {});
      resources.current = null;
    }
  }, []);
  const stop = useCallback(() => {
    cleanup();
    setListening(false);
    setRequesting(false);
    setFrequency(null);
    setLastFrequency(null);
    setInput({ level: 0, active: false, silentFor: 0 });
    setAudioPaused(false);
    setMicrophoneName("");
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

  const start = async (requestedDevice = deviceId) => {
    audio.stop();
    stop();
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
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(requestedDevice ? { deviceId: { exact: requestedDevice } } : {}),
        },
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
      // Keep the input graph processing across browsers without playing the mic back.
      const silentOutput = context.createGain();
      silentOutput.gain.value = 0;
      analyser.connect(silentOutput);
      silentOutput.connect(context.destination);
      const samples = new Float32Array(analyser.fftSize);
      let lastGood = 0;
      let lastSound = -Infinity;
      const startedAt = performance.now();
      let level = 0;
      let nextPitchAt = 0;
      let recent: number[] = [];
      const timer = window.setInterval(() => {
        if (context.state !== "running") return;
        analyser.getFloatTimeDomainData(samples);
        const now = performance.now();
        const rms = Math.sqrt(
          samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
        );
        // Show all input, including claps and quiet sounds that have no usable pitch.
        // Overlapping 50 ms samples and a gentle decay keep short sounds visible.
        const measuredLevel = Math.max(
          0,
          Math.min(100, ((20 * Math.log10(Math.max(rms, 1e-8)) + 72) / 60) * 100),
        );
        level = Math.max(measuredLevel, level * 0.8);
        if (rms >= 0.0005) lastSound = now;
        setInput({
          level: Math.round(level),
          active: now - lastSound < 1200,
          silentFor: (now - Math.max(lastSound, startedAt)) / 1000,
        });
        if (now < nextPitchAt) return;
        nextPitchAt = now + 100;
        const pitch = detectPitch(samples, context.sampleRate);
        if (pitch && pitch.confidence > 0.88) {
          if (recent.length && Math.abs(centsFrom(pitch.frequency, recent[recent.length - 1])) > 80)
            recent = [];
          recent = [...recent.slice(-4), pitch.frequency];
          const sorted = [...recent].sort((a, b) => a - b);
          const smoothed = sorted[Math.floor(sorted.length / 2)];
          setFrequency(smoothed);
          setLastFrequency(smoothed);
          lastGood = now;
        } else if (now - lastGood > 700) {
          setFrequency(null);
          recent = [];
        }
      }, 50);
      resources.current = { context, stream: pendingStream, source, timer };
      const updateAudioState = () => {
        if (token !== generation.current) return;
        setAudioPaused(context.state !== "running");
        if (context.state !== "running") {
          setFrequency(null);
          setInput({ level: 0, active: false, silentFor: 0 });
          recent = [];
        }
      };
      context.onstatechange = updateAudioState;
      updateAudioState();
      setMicrophoneName(pendingStream.getAudioTracks()[0]?.label || "Default microphone");
      setDeviceId(pendingStream.getAudioTracks()[0]?.getSettings().deviceId || requestedDevice);
      void navigator.mediaDevices
        .enumerateDevices?.()
        .then((items) => {
          if (token === generation.current)
            setDevices(items.filter((item) => item.kind === "audioinput"));
        })
        .catch(() => {});
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
      setListening(false);
      const name = cause instanceof Error ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access wasn’t allowed. Enable it in your browser’s site settings and try again, or tune by ear with the reference tones."
          : name === "OverconstrainedError"
            ? "That microphone is no longer available. Choose another microphone and try again."
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
            <button
              className="text-button"
              aria-label="Auto-detect string"
              aria-pressed={auto}
              onClick={() => {
                setSelected(index);
                setAuto(!auto);
              }}
            >
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
            {audioPaused
              ? "Your browser paused audio. Tap Resume tuner audio to continue."
              : frequency
                ? inTune
                  ? "✓ Right there. That string is in tune."
                  : `${cents < 0 ? "Tighten a little" : "Loosen a little"} · ${Math.abs(Math.round(cents))} cents ${cents < 0 ? "flat" : "sharp"}`
                : requesting
                  ? "Allow microphone access, then pluck one open string."
                  : listening
                    ? input.active
                      ? "Sound is reaching the tuner. Let one open string ring."
                      : input.silentFor >= 6
                        ? "No sound is reaching the mic. Move closer or choose another microphone below."
                        : lastFrequency !== null
                          ? "That note faded. Pluck the string again."
                          : "Pluck one open string and let it ring."
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
          {listening && audioPaused && (
            <button
              className="secondary-button"
              onClick={() =>
                void resources.current?.context
                  .resume()
                  .catch(() =>
                    setError(
                      "Audio could not resume. Stop listening and enable the microphone again.",
                    ),
                  )
              }
            >
              Resume tuner audio
            </button>
          )}
          <div className="tuner-input">
            <div className="tuner-input-heading">
              <span>Microphone input</span>
              <span>
                {listening
                  ? input.active
                    ? "Sound detected"
                    : "Listening · quiet"
                  : requesting
                    ? "Waiting for permission"
                    : "Microphone off"}
              </span>
            </div>
            <div
              className="tuner-input-meter"
              role="meter"
              aria-label="Microphone input level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={input.level}
              aria-valuetext={
                listening ? (input.active ? "Sound detected" : "Quiet") : "Microphone off"
              }
            >
              <span style={{ width: `${input.level}%` }} />
            </div>
            {microphoneName && <p className="tuner-input-device">Using {microphoneName}</p>}
            {devices.length > 0 && (
              <label className="field tuner-device-select">
                <span>Microphone</span>
                <select
                  value={deviceId}
                  disabled={requesting}
                  onChange={(e) => {
                    setDeviceId(e.target.value);
                    if (listening) void start(e.target.value);
                  }}
                >
                  <option value="">System default</option>
                  {devices.map((device, i) => (
                    <option value={device.deviceId} key={device.deviceId}>
                      {device.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="tuner-input-help">
              A clap can move this input meter. The tuning needle needs a steady note: pluck one
              open string and let it ring.
            </p>
          </div>
          <div className="tuner-strings" role="group" aria-label="Choose a string to tune">
            {TUNING_STRINGS.map((string, i) => (
              <button
                className={`tuner-string ${i === index ? "is-selected" : ""}`}
                aria-label={`Tune ${string.label} string`}
                aria-pressed={i === index}
                onClick={() => {
                  setSelected(i);
                  setAuto(false);
                }}
                key={string.midi}
              >
                <small>{6 - i}</small>
                <strong>{string.note}</strong>
                <small>{string.frequency.toFixed(1)} Hz</small>
              </button>
            ))}
          </div>
          <p className="small-muted">
            Tap a string to keep the tuner focused on it while you play. Auto-detect chooses the
            nearest standard string for you.
          </p>
          <div className="tuner-reference-mode">
            <button className="text-button" onClick={() => playReference(index)}>
              <Volume2 size={15} />
              Hear {target.label} reference tone
            </button>
            <button className="text-button" onClick={audio.stop}>
              Stop reference tone
            </button>
          </div>
          <p className="small-muted">
            Hearing a reference stops the microphone to avoid measuring the speaker. Enable
            microphone again when you are ready to play.
          </p>
        </section>
        <aside className="tuner-tips panel">
          <h2>A good sound starts here.</h2>
          <ol>
            <li>
              Press Enable microphone and allow access in your browser. Wait for “Listening on this
              device”.
            </li>
            <li>
              Choose the string you are tuning, starting with thick low E. Mute the other strings.
            </li>
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
              Choose a string and press Hear reference tone. Match it with your open string. The
              numbers run from 6, the thickest, to 1, the thinnest.
            </p>
            <p>This tuner listens for a single note. Play one string at a time.</p>
          </div>
          <SectionGuide title="Sound detected, but no tuning needle?">
            <p>
              The input bar shows any sound, including a clap. A clap has no steady musical pitch.
              Pluck one open string, without pressing a fret, and let it ring for a second.
            </p>
            <p>
              If the input bar stays still, try another microphone in the selector. Place the guitar
              near the microphone, and check the browser’s site microphone permission. A headset may
              be using its own microphone far from the guitar.
            </p>
            <p>
              The needle disappears when the note fades; the microphone keeps listening. Pluck again
              to take another reading. If the wrong string is detected, select the one you are
              playing.
            </p>
          </SectionGuide>
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
