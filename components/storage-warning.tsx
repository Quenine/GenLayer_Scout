import { AlertTriangle } from "lucide-react";

export function StorageWarning({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="leading-6">{message}</p>
    </div>
  );
}
