"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useReadContracts } from "wagmi";
import { LockClosedIcon, MagnifyingGlassIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type OnChainJob = {
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

type DisputeData = {
  proposedPaymentBps: bigint;
  stakedTokens: bigint;
  votingDeadline: bigint;
  forWeight: bigint;
  againstWeight: bigint;
  voterCount: bigint;
  finalized: boolean;
};

const formatTimeLeft = (deadline: bigint): { text: string; urgent: boolean } => {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= now) return { text: "Ended", urgent: true };
  const diff = Number(deadline - now);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours === 0) return { text: `${minutes}m`, urgent: true };
  if (hours < 6) return { text: `${hours}h : ${String(minutes).padStart(2, "0")}m`, urgent: true };
  const days = Math.floor(hours / 24);
  if (days > 0) return { text: `${days}d : ${hours % 24}h`, urgent: false };
  return { text: `${hours}h : ${String(minutes).padStart(2, "0")}m`, urgent: false };
};

// ── Data hook ─────────────────────────────────────────────────────────────────

const useActiveDisputes = () => {
  const { data: marketplaceInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });
  const { data: daoInfo } = useDeployedContractInfo({ contractName: "DAODispute" });

  const { data: jobCount, isLoading: countLoading } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "jobCount",
  });

  const jobCalls = useMemo(() => {
    if (!marketplaceInfo || !jobCount || jobCount === 0n) return [];
    return Array.from({ length: Number(jobCount) }, (_, i) => ({
      address: marketplaceInfo.address as `0x${string}`,
      abi: marketplaceInfo.abi,
      functionName: "getJob" as const,
      args: [BigInt(i + 1)] as const,
    }));
  }, [marketplaceInfo, jobCount]);

  const { data: jobResults, isLoading: jobsLoading } = useReadContracts({
    contracts: jobCalls,
    query: { enabled: jobCalls.length > 0 },
  });

  const daoJobs = useMemo<OnChainJob[]>(() => {
    if (!jobResults) return [];
    return jobResults
      .filter(r => r.status === "success" && r.result != null)
      .map(r => {
        const raw = r.result as unknown as OnChainJob;
        return { ...raw, status: Number(raw.status), bidCount: BigInt(String(raw.bidCount)) };
      })
      .filter(j => j.status === 4); // DAOVoting
  }, [jobResults]);

  const disputeCalls = useMemo(() => {
    if (!daoInfo || daoJobs.length === 0) return [];
    return daoJobs.map(j => ({
      address: daoInfo.address as `0x${string}`,
      abi: daoInfo.abi,
      functionName: "getDispute" as const,
      args: [j.id] as const,
    }));
  }, [daoInfo, daoJobs]);

  const { data: disputeResults, isLoading: disputesLoading } = useReadContracts({
    contracts: disputeCalls,
    query: { enabled: disputeCalls.length > 0 },
  });

  const disputes = useMemo(() => {
    return daoJobs.map((job, i) => {
      const dr = disputeResults?.[i];
      const dispute: DisputeData | null =
        dr?.status === "success" && dr.result ? (dr.result as unknown as DisputeData) : null;
      return { job, dispute };
    });
  }, [daoJobs, disputeResults]);

  return { disputes, isLoading: countLoading || jobsLoading || disputesLoading };
};

// ── Dispute card ──────────────────────────────────────────────────────────────

const DisputeCard = ({ job, dispute }: { job: OnChainJob; dispute: DisputeData | null }) => {
  const timeLeft = dispute ? formatTimeLeft(dispute.votingDeadline) : null;
  const budgetNXR = Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {job.skills.slice(0, 3).map(s => (
          <span
            key={s}
            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20"
          >
            {s}
          </span>
        ))}
      </div>

      <h3 className="font-bold text-base-content text-[15px] leading-snug mb-2">{job.title}</h3>
      <p className="text-xs text-base-content/55 leading-relaxed line-clamp-2 mb-5">{job.description}</p>

      <div className="flex items-end justify-between">
        <div className="flex gap-8">
          <div>
            <p className="text-[9px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Dispute Amount</p>
            <p className="text-sm font-bold text-base-content">{budgetNXR} NXR</p>
          </div>
          {timeLeft && (
            <div>
              <p className="text-[9px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Time Left</p>
              <p className={`text-sm font-bold ${timeLeft.urgent ? "text-error" : "text-base-content"}`}>
                {timeLeft.text}
              </p>
            </div>
          )}
        </div>
        <Link href={`/juror/${job.id.toString()}`} className="btn btn-primary btn-sm px-6">
          View Details
        </Link>
      </div>
    </div>
  );
};

// ── Access denied ─────────────────────────────────────────────────────────────

const AccessDenied = ({ onSwitch }: { onSwitch: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
    <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center">
      <LockClosedIcon className="w-10 h-10 text-error/50" />
    </div>
    <div>
      <h2 className="text-xl font-bold text-base-content mb-2">Freelancers Only</h2>
      <p className="text-sm text-base-content/50 max-w-sm leading-relaxed">
        The Juror Portal is exclusively available to verified freelancers. Only freelancers with at least one completed
        job can cast votes on disputes.
      </p>
    </div>
    <button onClick={onSwitch} className="btn btn-primary btn-sm">
      Switch to Freelancer Role
    </button>
  </div>
);

// ── Juror portal ──────────────────────────────────────────────────────────────

const JurorPortal = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const { disputes: chainDisputes, isLoading } = useActiveDisputes();

  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    chainDisputes.forEach(({ job }) => job.skills.forEach(s => skills.add(s)));
    return ["All", ...Array.from(skills).slice(0, 5)];
  }, [chainDisputes]);

  const filteredChain = useMemo(
    () =>
      chainDisputes.filter(({ job }) => {
        if (search) {
          const q = search.toLowerCase();
          if (!job.title.toLowerCase().includes(q) && !job.description.toLowerCase().includes(q)) return false;
        }
        if (activeFilter !== "All" && !job.skills.some(s => s.toLowerCase().includes(activeFilter.toLowerCase())))
          return false;
        return true;
      }),
    [chainDisputes, search, activeFilter],
  );

  const totalCount = chainDisputes.length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-2 shrink-0">
          <h1 className="text-2xl font-bold text-base-content">Juror Portal</h1>
          <p className="text-sm text-base-content/50 mt-1">
            Review cases, commit stake, and deliver fair resolutions.{" "}
            <span className="text-primary font-semibold">{totalCount} cases available.</span>
          </p>
        </div>

        {/* Search + filter tabs */}
        <div className="px-6 py-4 shrink-0 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search disputes by keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input input-bordered w-full pl-9 text-sm h-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allSkills.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`btn btn-sm rounded-full px-4 ${activeFilter === tab ? "btn-primary" : "btn-ghost border border-base-300"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dispute list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredChain.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
              <ScaleIcon className="w-10 h-10 text-base-content/20" />
              <p className="text-sm text-base-content/40">No disputes match your filter.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!isLoading &&
                filteredChain.map(({ job, dispute }) => (
                  <DisputeCard key={job.id.toString()} job={job} dispute={dispute} />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* How Resolution Works */}
      <aside className="w-72 shrink-0 border-l border-base-300 bg-base-100 overflow-y-auto p-5">
        <div className="flex items-center gap-2 mb-5">
          <InformationCircleIcon className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base-content text-sm">How Resolution Works</h3>
        </div>
        <div className="flex flex-col gap-6">
          {[
            {
              n: 1,
              title: "Commit Stake",
              desc: "Choose a dispute and lock the required WORK tokens to participate.",
            },
            {
              n: 2,
              title: "Review Evidence",
              desc: "Analyze contract code, design files, and communication logs provided.",
            },
            {
              n: 3,
              title: "Cast Secret Vote",
              desc: "Your vote is hashed and encrypted until the voting period ends.",
            },
            {
              n: 4,
              title: "Reveal & Reward",
              desc: "Reveal your vote. Correct jurors earn NXR fees and reputation.",
            },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-primary/40 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {n}
              </div>
              <div>
                <p className="text-sm font-semibold text-base-content mb-0.5">{title}</p>
                <p className="text-xs text-base-content/50 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

// ── Page entry point ──────────────────────────────────────────────────────────

const JurorPage: NextPage = () => {
  const [role, setRole] = useState<"client" | "freelancer" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("dw_role");
    setRole(stored === "freelancer" || stored === "client" ? stored : "client");
  }, []);

  const handleSwitch = () => {
    localStorage.setItem("dw_role", "freelancer");
    setRole("freelancer");
  };

  return (
    <AppLayout>
      {role === null ? (
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : role === "client" ? (
        <AccessDenied onSwitch={handleSwitch} />
      ) : (
        <JurorPortal />
      )}
    </AppLayout>
  );
};

export default JurorPage;
