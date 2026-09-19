"use client";

import { BarChart3, Guitar, AudioLines, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/practice", label: "Practice", icon: AudioLines },
  { href: "/chords", label: "Chords", icon: Guitar },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/tuner", label: "Tuner", icon: SlidersHorizontal },
];

export function AppNavigation() {
  const pathname = usePathname();
  return (
    <nav className="app-navigation" aria-label="Primary navigation">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          href={href}
          className={pathname === href ? "is-current" : ""}
          aria-current={pathname === href ? "page" : undefined}
          key={href}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
