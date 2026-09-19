# Chordigo

A cosy place to learn guitar. A little practice. A little progress.

**Status: 1.0.0 complete for local use.** The implemented product passed its
release checks; public deployment is a separate step.

Chordigo starts with Em and Am, gives you short musical exercises, and gradually
introduces new shapes as your playing becomes more confident. Warm paper, walnut
ink, clear chord diagrams, and a quiet practice room keep the guitar at the center.

- **Practice:** adaptive lessons, accurate metronome, count-in, finite sessions,
  explicit clean/missed reports, and small tempo recommendations.
- **Chords:** 13 illustrated shapes, reference sounds, and an eight-shape recall trainer.
- **Progress:** separate playing and recall confidence, difficult changes, streaks,
  a practice journal, and portable JSON backups.
- **Tuner:** on-device microphone tuning for individual strings, plus reference notes.
- **Your own pace:** editable and saved routines, daily goals, no account, and no uploads.
- **Offline:** the production app prepares all four rooms after its first online visit.

## Run locally

Use Node.js 20.19 or newer and npm 10 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Click **Start practicing** to enable
audio. Report a clean chord with **Right arrow** or **Got it**, a miss with
**Space** or **Missed**, and finish with **Escape**. Unreported chords stay unscored.

## Production and offline use

```sh
npm run build
npm start
```

The build generates a service worker containing that build's static asset list.
After an online visit finishes preparing it, the app can reload and navigate
offline. Microphone access needs HTTPS or localhost. Browsers that support web
app installation can add Chordigo to the home screen through their own menu.

Progress belongs to this browser and origin. Use **Progress → Your progress
belongs to you → Download backup** to keep a copy or move to another device.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run test:offline
npm run format:check
```

Install the test browser once with `npx playwright install chromium`.
Browser tests use isolated profiles and leave your own progress alone.

The tuner measures single notes. Playing confidence comes from your own reports;
the shape trainer checks frets you enter. Neither claims to recognize a strummed chord.
