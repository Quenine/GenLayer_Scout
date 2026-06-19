import type { ExperimentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<ExperimentStatus, string> = {
  drafted: "border-slate-200 bg-slate-50 text-slate-600",
  deployed: "border-blue-200 bg-blue-50 text-blue-700",
  accepted: "border-violet-200 bg-violet-50 text-violet-700",
  consensus: "border-amber-200 bg-amber-50 text-amber-700",
  finalized: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700"
};

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
        styles[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
