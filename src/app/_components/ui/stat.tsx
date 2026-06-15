interface StatProps {
  value: string;
  label: string;
  caption?: string;
}

/** A single headline metric — used in the landing ROI strip. */
export function Stat({ value, label, caption }: StatProps) {
  return (
    <div className="space-y-1">
      <div className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {value}
      </div>
      <div className="text-sm font-medium text-ink">{label}</div>
      {caption ? <div className="text-xs text-faint">{caption}</div> : null}
    </div>
  );
}
