"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="content-page not-found">
      <p className="eyebrow">Let’s take that again</p>
      <h1>Something interrupted this page.</h1>
      <p>Your saved practice is still on this device. Try opening the page again.</p>
      <button className="primary-button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
