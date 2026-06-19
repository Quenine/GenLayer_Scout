import type { LucideIcon } from "lucide-react";

export function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="card p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`rounded-lg p-2 ${iconClassName}`}>
          <Icon size={17} aria-hidden="true" />
        </div>
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1.5 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
