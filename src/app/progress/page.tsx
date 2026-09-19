import type { Metadata } from "next";
import { ProgressDashboard } from "@/features/progress/components/progress-dashboard";

export const metadata: Metadata = {
  title: "Your progress",
};

export default function ProgressPage() {
  return <ProgressDashboard />;
}
