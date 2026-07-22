"use client";

import { useMemo, useState } from "react";
import { Filter, Search, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useScout } from "@/components/scout-provider";
import {
  ACTIVE_CONTRIBUTION_LANE_STATUSES,
  CONTRIBUTION_LANE_STATUSES,
  type ContributionLaneStatus
} from "@/lib/types";
import { cn, formatPoints } from "@/lib/utils";

type LaneView = "all" | "pioneer" | "active";

function isActiveLane(status: ContributionLaneStatus) {
  return (ACTIVE_CONTRIBUTION_LANE_STATUSES as readonly string[]).includes(status);
}

export default function ContributionLanesPage() {
  const { contributionLanes, updateContributionLane } = useScout();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<LaneView>("all");

  const filteredLanes = useMemo(() => {
    return contributionLanes.filter((lane) => {
      const matchesSearch = lane.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesView =
        view === "all" ||
        (view === "pioneer" && lane.pioneerOpportunity) ||
        (view === "active" && isActiveLane(lane.status));
      return matchesSearch && matchesView;
    });
  }, [contributionLanes, search, view]);

  return (
    <>
      <PageHeader
        eyebrow="Portal contribution planning"
        title="Contribution lanes"
        description="Use the supplied Portal category ranges as a planning reference and record which lanes you are building, submitting, accepting, or deferring. Scout does not predict points or confirm eligibility."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Listed categories</p>
          <p className="mt-2 text-2xl font-semibold">{contributionLanes.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Pioneer labels</p>
          <p className="mt-2 text-2xl font-semibold">
            {contributionLanes.filter((lane) => lane.pioneerOpportunity).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Active lanes</p>
          <p className="mt-2 text-2xl font-semibold">
            {contributionLanes.filter((lane) => isActiveLane(lane.status)).length}
          </p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="field pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search contribution lanes"
              placeholder="Search contribution categories"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1">
            <Filter size={14} className="mx-2 text-slate-400" aria-hidden="true" />
            {(["all", "pioneer", "active"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
                  view === option
                    ? "bg-ink text-white"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {filteredLanes.length ? (
          <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
            {filteredLanes.map((lane) => (
              <article key={lane.id} className="bg-white p-5">
                <div className="min-h-12">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{lane.name}</h2>
                    {lane.pioneerOpportunity && (
                      <Sparkles
                        size={14}
                        className="text-amber-600"
                        aria-label="Pioneer opportunity"
                      />
                    )}
                  </div>
                  {lane.pioneerOpportunity && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                      Pioneer opportunity in supplied brief
                    </p>
                  )}
                </div>

                <div className="my-5 rounded-lg bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Reference point range
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-ink">
                    {formatPoints(lane.minimumPoints)}
                    <span className="mx-1 text-slate-300">-</span>
                    {formatPoints(lane.maximumPoints)}
                    <span className="ml-1.5 text-xs font-normal text-slate-500">pts</span>
                  </p>
                </div>

                <label>
                  <span className="label">Planning status</span>
                  <select
                    className="field capitalize"
                    value={lane.status}
                    onChange={(event) =>
                      updateContributionLane(
                        lane.id,
                        event.target.value as ContributionLaneStatus
                      )
                    }
                  >
                    {CONTRIBUTION_LANE_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No contribution lanes match"
            description="Clear the search or switch the lane filter. Active means building, submitted, or accepted."
          />
        )}
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Categories, point ranges, and pioneer labels are copied from the supplied
        product brief. Confirm current Portal guidance before preparing a submission.
      </p>
    </>
  );
}
