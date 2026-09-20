import type { Metadata } from "next";
import Link from "next/link";
import { Guitar } from "lucide-react";
import { AppNavigation } from "@/components/app-navigation";
import { OfflineSupport } from "@/components/offline-support";
import "./globals.css";
import "./cozy.css";

export const metadata: Metadata = {
  title: { default: "Chordigo · A little practice. A little progress.", template: "%s · Chordigo" },
  description:
    "Find your rhythm. Adaptive guitar lessons, chord shapes, and a tuner. A little practice every day, at your own pace. Free, private, and no account needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="app-shell">
          <header className="app-header">
            <Link className="brand" href="/practice" aria-label="Chordigo practice">
              <span className="brand-mark" aria-hidden="true">
                <Guitar size={23} strokeWidth={1.5} />
              </span>
              <span>
                chordigo<span className="brand-period">.</span>
              </span>
            </Link>
            <AppNavigation />
            <div className="local-status">
              <span className="status-dot" />
              <span>Come in. Stay a while.</span>
            </div>
          </header>
          <OfflineSupport />
          {children}
          <footer className="app-footer">
            <span>A little practice. A little progress.</span>
            <span>
              Made for you & your six strings.<span className="footer-dot">·</span>Saved on this
              device
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
