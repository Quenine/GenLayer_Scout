"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useScout } from "@/components/scout-provider";
import { createBackupFile, parseBackupFile } from "@/lib/storage";

export function DataBackupPanel() {
  const workspace = useScout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function exportWorkspace() {
    const backup = createBackupFile({
      schemaVersion: workspace.schemaVersion,
      experiments: workspace.experiments,
      contributionLanes: workspace.contributionLanes,
      buildLogEntries: workspace.buildLogEntries,
      evidencePack: workspace.evidencePack
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `genlayer-scout-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setError(null);
    setMessage("Backup JSON exported from this browser workspace.");
  }

  async function importWorkspace(file: File) {
    setMessage(null);
    setError(null);
    const contents = await file.text();
    const parsed = parseBackupFile(contents);
    if (!parsed.workspace) {
      setError(parsed.error ?? "Scout rejected this backup file.");
      return;
    }

    const shouldImport = window.confirm(
      "Importing this backup will replace all current local GenLayer Scout data in this browser. Export your current workspace first if you need to keep it. Continue?"
    );
    if (!shouldImport) return;

    workspace.replaceWorkspace(parsed.workspace);
    setMessage("Backup imported. The local workspace has been replaced.");
  }

  return (
    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">Local backup</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Export or replace this browser workspace. Scout stores data locally; this is the v0.1.1 backup path.
        </p>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          <p>Includes experiments, contribution lane states, the evidence draft, build log entries, and schema version.</p>
          {message && <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p>}
          {error && <p className="mt-2 text-xs font-medium text-rose-700">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-secondary" onClick={exportWorkspace}>
            <Download size={15} /> Export JSON
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} /> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void importWorkspace(file);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
