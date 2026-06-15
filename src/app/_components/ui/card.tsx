import type { HTMLAttributes } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Subtle lift + accent border on hover. */
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface/70 backdrop-blur-sm",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
