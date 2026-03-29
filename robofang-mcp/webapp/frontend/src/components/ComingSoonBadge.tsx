/** Small label for planned features — avoids implying shipped integrations. */

interface ComingSoonBadgeProps {
  label?: string;
  className?: string;
}

export function ComingSoonBadge({ label = "Coming soon", className = "" }: ComingSoonBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] uppercase tracking-wider font-semibold text-amber-300/95 bg-amber-500/10 border border-amber-400/25 px-2 py-0.5 rounded-full ${className}`}
    >
      {label}
    </span>
  );
}
