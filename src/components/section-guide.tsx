import { CircleHelp, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function SectionGuide({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="section-guide" open={open || undefined}>
      <summary>
        <CircleHelp size={17} />
        <span>{title}</span>
        <ChevronDown size={15} />
      </summary>
      <div className="section-guide-content">{children}</div>
    </details>
  );
}
