"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { BriefcaseIcon, ClockIcon, PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
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

const JOB_STATUS: Record<number, { label: string; style: string }> = {
  0: { label: "Open", style: "badge-success" },
  1: { label: "Assigned", style: "badge-info" },
  2: { label: "Submitted", style: "badge-warning" },
  3: { label: "AI Approved", style: "badge-warning" },
  4: { label: "DAO Voting", style: "badge-warning" },
  5: { label: "Completed", style: "badge-success" },
  6: { label: "Partial Pay", style: "badge-info" },
  7: { label: "Disputed", style: "badge-error" },
  8: { label: "Cancelled", style: "badge-ghost" },
};

const timeAgo = (ts: bigint) => {
  const h = Math.floor((Date.now() / 1000 - Number(ts)) / 3600);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const formatDeadline = (ts: bigint) =>
  new Date(Number(ts) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const useAllJobs = () => {
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });
  const { data: jobCount, isLoading: isCountLoading } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "jobCount",
  });

  const calls = useMemo(() => {
    if (!contractInfo || !jobCount || jobCount === 0n) return [];
    return Array.from({ length: Number(jobCount) }, (_, i) => ({
      address: contractInfo.address as `0x${string}`,
      abi: contractInfo.abi,
      functionName: "getJob" as const,
      args: [BigInt(i + 1)] as const,
    }));
  }, [contractInfo, jobCount]);

  const { data: results, isLoading: isJobsLoading } = useReadContracts({
    contracts: calls,
    query: { enabled: calls.length > 0 },
  });

  const jobs = useMemo<OnChainJob[]>(() => {
    if (!results) return [];
    return results
      .filter(r => r.status === "success" && r.result != null)
      .map(r => {
        const raw = r.result as unknown as OnChainJob;
        return { ...raw, status: Number(raw.status), bidCount: BigInt(String(raw.bidCount)) };
      });
  }, [results]);

  return { jobs, isLoading: isCountLoading || isJobsLoading };
};

// ── Job card ──────────────────────────────────────────────────────────────────

const JobCard = ({ job, role }: { job: OnChainJob; role: "client" | "freelancer" }) => {
  const status = JOB_STATUS[job.status] ?? { label: "Unknown", style: "badge-ghost" };
  const budgetDwt = Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Link
      href={role === "client" ? `/my-tasks/${job.id.toString()}/bids` : `/my-tasks/${job.id.toString()}/active`}
      className="bg-base-100 border border-base-300 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-base-content truncate group-hover:text-primary transition-colors">
            {job.title}
          </p>
          <span className={`badge badge-sm ${status.style} shrink-0`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-base-content/50 flex-wrap">
          {job.skills.slice(0, 3).map(s => (
            <span key={s} className="badge badge-outline badge-xs">
              {s}
            </span>
          ))}
          <span>·</span>
          {role === "client" && (
            <span className="flex items-center gap-1">
              <UserGroupIcon className="w-3 h-3" />
              {job.bidCount.toString()} bid{job.bidCount !== 1n ? "s" : ""}
            </span>
          )}
          {role === "freelancer" && (
            <span className="flex items-center gap-1">Deadline: {formatDeadline(job.deadline)}</span>
          )}
          <span>·</span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {timeAgo(job.createdAt)}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-primary">{budgetDwt} NXR</p>
        <p className="text-xs text-base-content/40 mt-0.5">{role === "client" ? "escrowed" : "budget"}</p>
      </div>
    </Link>
  );
};

// ── Client view ───────────────────────────────────────────────────────────────

const ClientTasks = ({ address }: { address: string }) => {
  const { jobs, isLoading } = useAllJobs();

  const myJobs = useMemo(() => jobs.filter(j => j.client.toLowerCase() === address.toLowerCase()), [jobs, address]);

  const active = myJobs.filter(j => j.status !== 5 && j.status !== 8);
  const completed = myJobs.filter(j => j.status === 5);

  if (isLoading) return <Loader />;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-base-content mb-1">My Jobs</h1>
          <p className="text-sm text-base-content/50">Jobs you&apos;ve posted and their current status.</p>
        </div>
        <Link href="/post-task" className="btn btn-primary gap-2">
          <PlusIcon className="w-4 h-4" />
          Post a Job
        </Link>
      </div>

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Active ({active.length})
          </h2>
          <div className="flex flex-col gap-3">
            {active.map(j => (
              <JobCard key={j.id.toString()} job={j} role="client" />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Completed ({completed.length})
          </h2>
          <div className="flex flex-col gap-3">
            {completed.map(j => (
              <JobCard key={j.id.toString()} job={j} role="client" />
            ))}
          </div>
        </section>
      )}

      {myJobs.length === 0 && <Empty role="client" />}
    </>
  );
};

// ── Freelancer view ───────────────────────────────────────────────────────────

const FreelancerTasks = ({ address }: { address: string }) => {
  const { jobs, isLoading } = useAllJobs();

  const myJobs = useMemo(() => jobs.filter(j => j.freelancer.toLowerCase() === address.toLowerCase()), [jobs, address]);

  const active = myJobs.filter(j => j.status !== 5 && j.status !== 8);
  const completed = myJobs.filter(j => j.status === 5);

  if (isLoading) return <Loader />;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-base-content mb-1">My Contracts</h1>
          <p className="text-sm text-base-content/50">Jobs you&apos;ve been assigned to.</p>
        </div>
        <Link href="/find-work" className="btn btn-primary gap-2">
          <BriefcaseIcon className="w-4 h-4" />
          Find Work
        </Link>
      </div>

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Active ({active.length})
          </h2>
          <div className="flex flex-col gap-3">
            {active.map(j => (
              <JobCard key={j.id.toString()} job={j} role="freelancer" />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Completed ({completed.length})
          </h2>
          <div className="flex flex-col gap-3">
            {completed.map(j => (
              <JobCard key={j.id.toString()} job={j} role="freelancer" />
            ))}
          </div>
        </section>
      )}

      {myJobs.length === 0 && <Empty role="freelancer" />}
    </>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const Loader = () => (
  <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
    <span className="loading loading-spinner loading-md" />
    <span className="text-sm">Loading from blockchain…</span>
  </div>
);

const Empty = ({ role }: { role: "client" | "freelancer" }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <BriefcaseIcon className="w-8 h-8 text-primary" />
    </div>
    <h3 className="font-semibold text-base-content mb-1">
      {role === "client" ? "No jobs posted yet" : "No active contracts"}
    </h3>
    <p className="text-sm text-base-content/50 mb-5">
      {role === "client" ? "Post your first job to get started." : "Find and bid on open jobs."}
    </p>
    <Link href={role === "client" ? "/post-task" : "/find-work"} className="btn btn-primary btn-sm">
      {role === "client" ? "Post a Job" : "Browse Jobs"}
    </Link>
  </div>
);

// ── Page entry point ──────────────────────────────────────────────────────────

const MyTasksPage = () => {
  const { address } = useAccount();
  const [role, setRole] = useState<"client" | "freelancer">("client");

  useEffect(() => {
    const stored = localStorage.getItem("dw_role");
    if (stored === "freelancer" || stored === "client") setRole(stored);
  }, []);

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full">
        {!address ? (
          <div className="flex items-center justify-center h-64 text-base-content/40 text-sm">
            Connect your wallet to continue.
          </div>
        ) : role === "client" ? (
          <ClientTasks address={address} />
        ) : (
          <FreelancerTasks address={address} />
        )}
      </div>
    </AppLayout>
  );
};

export default MyTasksPage;
