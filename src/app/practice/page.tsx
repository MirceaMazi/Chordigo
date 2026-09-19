import type { Metadata } from "next";
import { PracticeWorkspace } from "@/features/practice/components/practice-workspace";

export const metadata: Metadata = {
  title: "Your daily practice",
};

export default function PracticePage() {
  return <PracticeWorkspace />;
}
