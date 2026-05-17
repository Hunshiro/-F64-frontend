import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 ${className || ""}`.trim()}>
      {title && <div className="font-display text-lg mb-3">{title}</div>}
      {children}
    </div>
  );
}

