interface BrandProps {
  /** Render size of the mark in pixels. */
  size?: number;
  withWordmark?: boolean;
}

/** Angular "blade" mark — a sharp wedge, echoing the 尖り doctrine. */
export function Brand({ size = 28, withWordmark = true }: BrandProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
        <path d="M9 23L19 9l1.8 9.2L23 23H9z" fill="var(--color-accent-ink)" />
      </svg>
      {withWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          Sharp<span className="text-accent">.</span>
        </span>
      ) : null}
    </span>
  );
}
