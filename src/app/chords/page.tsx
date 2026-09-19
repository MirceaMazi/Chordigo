import type { Metadata } from "next";
import { ChordTrainerWorkspace } from "@/features/chord-trainer/components/chord-trainer-workspace";

export const metadata: Metadata = {
  title: "Chord library & shape trainer",
};

export default function ChordsPage() {
  return <ChordTrainerWorkspace />;
}
