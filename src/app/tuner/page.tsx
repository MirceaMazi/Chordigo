import type { Metadata } from "next";
import { TunerWorkspace } from "@/features/tuner/tuner-workspace";

export const metadata: Metadata = { title: "Guitar tuner" };
export default function TunerPage() {
  return <TunerWorkspace />;
}
