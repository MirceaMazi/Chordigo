import { expect, test } from "@playwright/test";

test("handles microphone denial and keeps reference tones available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => Promise.reject(new DOMException("Denied for test", "NotAllowedError")),
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Microphone access wasn’t allowed",
  );
  await page.getByRole("button", { name: "Tune A string", exact: true }).click();
  await page.getByRole("button", { name: "Hear A reference tone", exact: true }).click();
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await expect(page.locator(".tuner-state")).toHaveText("Microphone off");
  await page.getByRole("button", { name: "Stop reference tone" }).click();
});

test("detects a synthetic guitar pitch and releases the microphone on navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const source = context.createOscillator();
        source.frequency.value = 110;
        const destination = context.createMediaStreamDestination();
        source.connect(destination);
        source.start();
        (window as unknown as { tunerTest: unknown }).tunerTest = {
          stream: destination.stream,
          source,
          context,
        };
        return destination.stream;
      },
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.locator(".tuner-guidance")).toContainText("in tune", { timeout: 15000 });
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await page.getByRole("button", { name: "Tune Low E string", exact: true }).click();
  await expect(page.locator(".tuner-note")).toHaveText("E2");
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await page.getByRole("button", { name: "Auto-detect string", exact: true }).click();
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await page.evaluate(() => {
    (
      window as unknown as { tunerTest: { source: OscillatorNode } }
    ).tunerTest.source.frequency.value = 112;
  });
  await expect(page.locator(".tuner-guidance")).toContainText("Loosen a little");
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { tunerTest: { stream: MediaStream } }).tunerTest.stream
          .getTracks()
          .every((track) => track.readyState === "ended"),
      ),
    )
    .toBe(true);
  const ended = await page.evaluate(async () => {
    const testState = (
      window as unknown as {
        tunerTest: { stream: MediaStream; context: AudioContext; source: OscillatorNode };
      }
    ).tunerTest;
    const stopped = testState.stream.getTracks().every((track) => track.readyState === "ended");
    testState.source.stop();
    await testState.context.close();
    return stopped;
  });
  expect(ended).toBe(true);
});

test("switches microphone inputs and stops capture when playing a reference", async ({ page }) => {
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    Object.defineProperty(window, "microphoneStreams", { value: streams });
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      value: async () => [
        { deviceId: "guitar", kind: "audioinput", label: "Guitar microphone" },
        { deviceId: "headset", kind: "audioinput", label: "Headset microphone" },
      ],
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async (constraints: MediaStreamConstraints) => {
        const context = new AudioContext();
        await context.resume();
        const device = (constraints.audio as MediaTrackConstraints).deviceId as
          | ConstrainDOMStringParameters
          | undefined;
        const id = device?.exact ?? "guitar";
        const destination = context.createMediaStreamDestination();
        const tone = context.createOscillator();
        tone.frequency.value = id === "headset" ? 146.8324 : 110;
        tone.connect(destination);
        tone.start();
        Object.defineProperty(destination.stream.getAudioTracks()[0], "getSettings", {
          value: () => ({ deviceId: id }),
        });
        streams.push(destination.stream);
        return destination.stream;
      },
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await page.getByRole("combobox", { name: "Microphone", exact: true }).selectOption("headset");
  await expect(page.locator(".tuner-note")).toHaveText("D3");
  expect(
    await page.evaluate(() =>
      (window as unknown as { microphoneStreams: MediaStream[] }).microphoneStreams[0]
        .getTracks()
        .every((t) => t.readyState === "ended"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Hear D reference tone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enable microphone" })).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as unknown as { microphoneStreams: MediaStream[] }).microphoneStreams.every((s) =>
        s.getTracks().every((t) => t.readyState === "ended"),
      ),
    ),
  ).toBe(true);
});

test("releases a microphone permission result that arrives after cancellation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        new Promise<MediaStream>((resolve) => {
          Object.defineProperty(window, "allowLateMicrophone", {
            value: async () => {
              const context = new AudioContext();
              const stream = context.createMediaStreamDestination().stream;
              Object.defineProperty(window, "lateMicrophoneStream", { value: stream });
              resolve(stream);
            },
          });
        }),
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect.poll(() => page.evaluate(() => "allowLateMicrophone" in window)).toBe(true);
  await page.getByRole("button", { name: "Cancel microphone request" }).click();
  await page.evaluate(() =>
    (window as unknown as { allowLateMicrophone: () => Promise<void> }).allowLateMicrophone(),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { lateMicrophoneStream: MediaStream }).lateMicrophoneStream
          .getTracks()
          .every((t) => t.readyState === "ended"),
      ),
    )
    .toBe(true);
  await expect(page.getByRole("button", { name: "Enable microphone" })).toBeVisible();
});

test("shows microphone activity for a clap and keeps listening after a note fades", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination();
        const tone = context.createOscillator();
        tone.frequency.value = 110;
        const volume = context.createGain();
        volume.gain.value = 0;
        tone.connect(volume).connect(destination);
        tone.start();
        (window as unknown as { tunerInputTest: unknown }).tunerInputTest = {
          volume,
          clap: () => {
            const samples = context.createBuffer(1, context.sampleRate * 0.15, context.sampleRate);
            const data = samples.getChannelData(0);
            let seed = 123;
            for (let i = 0; i < data.length; i++) {
              seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
              data[i] = (seed / 2 ** 32 - 0.5) * Math.exp((-3 * i) / data.length);
            }
            const clap = context.createBufferSource();
            clap.buffer = samples;
            clap.connect(destination);
            clap.start();
          },
        };
        return destination.stream;
      },
    });
  });
  await page.goto("/tuner");
  const input = page.getByRole("meter", { name: "Microphone input level" });
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("aria-valuetext", "Microphone off");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await expect(input).toHaveAttribute("aria-valuenow", "0");

  await page.evaluate(() => {
    (window as unknown as { tunerInputTest: { clap: () => void } }).tunerInputTest.clap();
  });
  await expect(input).toHaveAttribute("aria-valuetext", "Sound detected");
  await expect
    .poll(async () => Number(await input.getAttribute("aria-valuenow")))
    .toBeGreaterThan(0);
  await expect(page.locator(".tuner-guidance")).toContainText("Let one open string ring");
  await expect(page.locator(".tuner-needle")).toHaveCount(0);

  await page.evaluate(() => {
    (
      window as unknown as { tunerInputTest: { volume: GainNode } }
    ).tunerInputTest.volume.gain.value = 0.3;
  });
  await expect(page.locator(".tuner-guidance")).toContainText("in tune");
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await expect(page.locator(".tuner-needle")).toBeVisible();
  await page.evaluate(() => {
    (
      window as unknown as { tunerInputTest: { volume: GainNode } }
    ).tunerInputTest.volume.gain.value = 0;
  });
  await expect(page.locator(".tuner-needle")).toHaveCount(0);
  await expect(page.locator(".tuner-guidance")).toContainText("That note faded");
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await expect(page.getByRole("meter", { name: "Pitch difference in cents" })).toHaveAttribute(
    "aria-valuetext",
    "No pitch detected",
  );
  await expect(input).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await page.getByRole("button", { name: "Stop listening" }).click();
  await expect(input).toHaveAttribute("aria-valuenow", "0");
  await expect(input).toHaveAttribute("aria-valuetext", "Microphone off");
});

test("resumes browser-paused tuner audio without a stale pitch reading", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    Object.defineProperty(window, "AudioContext", {
      value: class extends NativeContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          (window as unknown as { capturedTunerContext: AudioContext }).capturedTunerContext = this;
        }
      },
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new NativeContext();
        await context.resume();
        const tone = context.createOscillator();
        tone.frequency.value = 110;
        const destination = context.createMediaStreamDestination();
        tone.connect(destination);
        tone.start();
        return destination.stream;
      },
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.locator(".tuner-guidance")).toContainText("in tune");
  await page.evaluate(() =>
    (window as unknown as { capturedTunerContext: AudioContext }).capturedTunerContext.suspend(),
  );
  await expect(page.locator(".tuner-needle")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume tuner audio", exact: true }).click();
  await expect(page.locator(".tuner-guidance")).toContainText("in tune");
  await page.getByRole("button", { name: "Stop listening" }).click();
});
