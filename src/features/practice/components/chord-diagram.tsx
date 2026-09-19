import type { GuitarVoicing } from "@/lib/music/types";

export function ChordDiagram({ voicing }: { voicing: GuitarVoicing }) {
  return (
    <svg
      className="chord-diagram"
      viewBox="0 0 180 218"
      role="img"
      aria-label={`${voicing.displayName}, ${voicing.positionLabel.toLowerCase()} guitar voicing: ${voicing.frets.map((f) => (f === null ? "muted" : f)).join(", ")}`}
    >
      <g fill="none" stroke="currentColor" opacity="0.7">
        {[0, 1, 2, 3, 4].map((i) => (
          <path d={`M25 ${42 + i * 34}H155`} strokeWidth={i === 0 ? 5 : 1} key={`f${i}`} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path d={`M${25 + i * 26} 42V178`} strokeWidth={i < 2 ? 1.8 : 1.2} key={`s${i}`} />
        ))}
      </g>
      {voicing.frets.map((fret, i) =>
        fret === null ? (
          <text x={25 + i * 26} y="25" textAnchor="middle" className="diagram-muted" key={i}>
            ×
          </text>
        ) : fret === 0 ? (
          <circle
            cx={25 + i * 26}
            cy="20"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            key={i}
          />
        ) : (
          <g key={i}>
            <circle cx={25 + i * 26} cy={42 + (fret - 0.5) * 34} r="10.5" fill="currentColor" />
            <text
              x={25 + i * 26}
              y={46 + (fret - 0.5) * 34}
              textAnchor="middle"
              fill="var(--surface)"
              fontSize="10"
              fontWeight="600"
            >
              {voicing.fingers[i]}
            </text>
          </g>
        ),
      )}
      {["E", "A", "D", "G", "B", "e"].map((s, i) => (
        <text x={25 + i * 26} y="202" textAnchor="middle" className="diagram-string" key={i}>
          {s}
        </text>
      ))}
    </svg>
  );
}
