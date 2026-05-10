"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { ArrowDownTrayIcon, ArrowLeftIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export type OnChainJob = {
  id: bigint;
  client: `0x${string}`;
  freelancer: `0x${string}`;
  title: string;
  description: string;
  skills: readonly string[];
  budget: bigint;
  deadline: bigint;
  status: number;
  bidCount: bigint;
  createdAt: bigint;
  aiDecisionAt: bigint;
};

export const timeRemaining = (deadline: bigint) => {
  const secs = Number(deadline) - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "Voting ended";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
};

export const formatTs = (ts: bigint) =>
  new Date(Number(ts) * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const useDisputeData = (id: string) => {
  const { data: rawJob } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [BigInt(id)],
  });

  const job = useMemo<OnChainJob | null>(() => {
    if (!rawJob) return null;
    const r = rawJob as unknown as OnChainJob;
    return { ...r, status: Number(r.status) };
  }, [rawJob]);

  const { data: rawDispute } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "getDispute",
    args: [BigInt(id)],
  });

  const dispute = useMemo(() => {
    if (!rawDispute) return null;
    const [
      stakedTokens,
      votingDeadline,
      solutionCount,
      totalVoterCount,
      finalized,
      winningSolutionIndex,
      defenseStatement,
    ] = rawDispute as readonly [bigint, bigint, bigint, bigint, boolean, bigint, string];
    return {
      stakedTokens,
      votingDeadline,
      solutionCount,
      totalVoterCount,
      finalized,
      winningSolutionIndex,
      defenseStatement,
    };
  }, [rawDispute]);

  return { job, dispute };
};

export type DisputeData = ReturnType<typeof useDisputeData>["dispute"];

export const DisputeHeader = ({
  id,
  view,
  job,
  dispute,
  isFreelancer,
  onScrollToDefense,
}: {
  id: string;
  view: "defense" | "vote" | "result";
  job: OnChainJob | null;
  dispute: DisputeData;
  isFreelancer: boolean;
  onScrollToDefense?: () => void;
}) => {
  const caseId = `#DW-${id.padStart(4, "0")}-FK`;
  const stakeNxr = dispute
    ? Number(formatEther(dispute.stakedTokens)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/disputes"
          className="flex items-center gap-1.5 text-sm text-base-content/50 hover:text-base-content transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to My Disputes
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-error badge-sm font-semibold">
              {dispute?.finalized ? "Finalized" : "Active Dispute"}
            </span>
            <span className="text-xs text-base-content/40 font-mono">{caseId}</span>
          </div>
          <h1 className="text-2xl font-bold text-base-content">{job?.title ?? `Job #${id}`}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="btn btn-sm btn-outline gap-2"
            onClick={() => notification.info("Contract download not available in demo.")}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download Contract
          </button>
          {isFreelancer && view === "defense" && (
            <button className="btn btn-sm btn-primary gap-2" onClick={onScrollToDefense}>
              <ScaleIcon className="w-4 h-4" />
              Write Defense Statement
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-base-300">
        {(["defense", "vote", "result"] as const).map(tab => (
          <Link
            key={tab}
            href={`/disputes/${id}/${tab}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              view === tab
                ? "border-primary text-primary bg-base-100"
                : "border-transparent text-base-content/50 hover:text-base-content hover:bg-base-200"
            }`}
          >
            {tab === "defense" ? "Defense" : tab === "vote" ? "Juror Vote" : "Outcome"}
          </Link>
        ))}
      </div>

      <div className="bg-base-100 border border-base-300 rounded-2xl p-5 mb-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-1">Stake Amount</p>
          <p className="text-base font-bold text-primary">{stakeNxr} NXR</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-1">Time Remaining</p>
          <p className="text-base font-bold text-warning">{dispute ? timeRemaining(dispute.votingDeadline) : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-1">Jurors Voted</p>
          <p className="text-base font-bold text-base-content">{dispute?.totalVoterCount.toString() ?? "—"}</p>
        </div>
      </div>
    </>
  );
};
