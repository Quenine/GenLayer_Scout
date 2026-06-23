"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { shorten } from "@/lib/utils";

export function CopyableValue({
  label,
  value,
  compact = true
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const displayValue = compact ? shorten(value) : value || "Not recorded";

  async function copyValue() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="group flex min-w-0 items-center gap-2">
      <span
        className="min-w-0 break-all font-mono text-xs text-slate-600"
        title={value || undefined}
      >
        {displayValue}
      </span>
      {value && (
        <button
          type="button"
          onClick={copyValue}
          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      )}
    </div>
  );
}
