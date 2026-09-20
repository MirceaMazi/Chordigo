# Chordigo

A cosy place to learn guitar. A little practice. A little progress.

**Status: 1.0.0 complete for local use.** The implemented product passed its
release checks; public deployment is a separate step.

Chordigo starts with Em and G, gives you short musical exercises, and gradually
introduces new shapes as your playing becomes more confident. Warm paper, walnut
ink, clear chord diagrams, and a quiet practice room keep the guitar at the center.

- **Practice:** adaptive lessons, accurate metronome, count-in, finite sessions,
  hands-free playing with a review afterward, optional live feedback, repeats,
  and small tempo recommendations.
- **Chords:** 79 illustrated shapes, reference sounds, and a horizontal, eight-shape
  recall trainer. The beginner path gently introduces 13 foundation shapes.
- **Progress:** separate playing and recall confidence, difficult changes, streaks,
  a practice journal, and portable JSON backups.
- **Tuner:** on-device microphone tuning, input selection and level meter,
  quieter-note detection, clear setup help, and separate reference notes.
- **Your own pace:** editable and saved routines, daily goals, no account, and no uploads.
- **Offline:** the production app prepares all four rooms after its first online visit.

## Run locally

Use Node.js 20.19 or newer and npm 10 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Click **Start practicing** to enable
audio. Keep both hands on your guitar and review the chords when the session ends.
Finish early with **Escape**. You can also review later in the Progress journal.
Unreported chords stay unscored. **Session settings → Feedback** enables optional
live **Right arrow / Got it** and **Space / Missed** controls.

Use the in-app guides for Manual routines, the shape trainer, progress and tuning.
Tempo adjusts one BPM at a time, accepts a typed number, and resets to 60 BPM.

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

The September 20 client-feedback update is covered by 145 unit tests, 52
desktop/mobile browser cases, and two production offline cases. These include
hands-free reviews, repeated chords, horizontal fret entry, tempo edits and
microphone switching. Tuner checks use synthetic audio; physical-device testing
remains necessary for browser and microphone differences.

The tuner measures single notes. Playing confidence comes from your own reports;
the shape trainer checks frets you enter. Neither claims to recognize a strummed chord.
