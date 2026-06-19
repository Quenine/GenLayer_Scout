"use client";

import { Check, Clipboard, Download, FileText } from "lucide-react";
import { useState } from "react";

export function EvidencePackPreview({
  markdown,
  fileName
}: {
  markdown: string;
  fileName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  }

  function downloadReport() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName || "genlayer-evidence-pack"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card flex min-h-[700px] flex-col overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText size={17} className="text-moss-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">Markdown output</h2>
            <p className="mt-0.5 text-xs text-slate-500">Review before copying or downloading</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary !px-3 !py-2" onClick={copyReport}>
            {copied ? <Check size={15} /> : <Clipboard size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn-primary !px-3 !py-2" onClick={downloadReport}>
            <Download size={15} /> Download .md
          </button>
        </div>
      </div>
      {copyError && (
        <p className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">
          Clipboard access was blocked. Use the download button or copy from the preview.
        </p>
      )}
      <pre className="flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-6 text-slate-700">
        {markdown}
      </pre>
    </section>
  );
}
