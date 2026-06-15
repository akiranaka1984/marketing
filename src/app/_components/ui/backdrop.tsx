/**
 * Decorative hero backdrop: drifting acid-lime + teal blooms over a faint
 * blueprint grid. Purely visual — sits behind content, ignores pointer events.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-60" />
      <div
        className="absolute -left-32 -top-32 size-[42rem] rounded-full opacity-40 blur-3xl animate-drift"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent 65%)" }}
      />
      <div
        className="absolute -right-40 top-10 size-[36rem] rounded-full opacity-25 blur-3xl animate-float"
        style={{ background: "radial-gradient(circle, var(--color-glow), transparent 65%)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-canvas to-transparent" />
    </div>
  );
}
