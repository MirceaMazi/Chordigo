import Link from "next/link";
import { Guitar } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="content-page not-found">
      <Guitar size={45} strokeWidth={1.2} />
      <p className="eyebrow">A little off the fretboard</p>
      <h1>This page isn’t here.</h1>
      <p>Your next practice is right where you left it.</p>
      <Link className="primary-button" href="/practice">
        Back to practice
      </Link>
    </main>
  );
}
