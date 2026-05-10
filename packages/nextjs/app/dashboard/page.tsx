"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { BriefcaseIcon, ClockIcon, CurrencyDollarIcon, PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useDecentraWorkRegistry } from "~~/hooks/scaffold-eth";

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
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

// ── Shared hook: read all jobs from chain ─────────────────────────────────────

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

// ── Client Dashboard ──────────────────────────────────────────────────────────

const ClientDashboard = ({ address }: { address: string }) => {
  const { jobs, isLoading } = useAllJobs();

  const myJobs = useMemo(() => jobs.filter(j => j.client.toLowerCase() === address.toLowerCase()), [jobs, address]);

  const totalEscrowed = useMemo(
    () => myJobs.filter(j => j.status < 5).reduce((acc, j) => acc + j.budget, 0n),
    [myJobs],
  );

  const totalBids = useMemo(() => myJobs.reduce((acc, j) => acc + Number(j.bidCount), 0), [myJobs]);

  const activeJobs = myJobs.filter(j => j.status < 5 && j.status !== 8);
  const completedJobs = myJobs.filter(j => j.status === 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
        <span className="loading loading-spinner loading-md" />
        <span className="text-sm">Loading your jobs…</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Client Dashboard</h1>
          <p className="text-sm text-base-content/50 mt-0.5">Manage your posted jobs and escrow.</p>
        </div>
        <Link href="/post-task" className="btn btn-primary gap-2">
          <PlusIcon className="w-4 h-4" />
          Post a Job
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: BriefcaseIcon,
            label: "Jobs Posted",
            value: myJobs.length.toString(),
            color: "bg-primary/10 text-primary",
          },
          {
            icon: CurrencyDollarIcon,
            label: "NXR in Escrow",
            value: `${Number(formatEther(totalEscrowed)).toLocaleString(undefined, { maximumFractionDigits: 0 })} NXR`,
            color: "bg-success/10 text-success",
          },
          { icon: UserGroupIcon, label: "Bids Received", value: totalBids.toString(), color: "bg-info/10 text-info" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-base-100 rounded-2xl border border-base-200 px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-base-content/50">{label}</p>
              <p className="text-lg font-bold text-base-content">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Active ({activeJobs.length})
          </h2>
          <div className="flex flex-col gap-3">
            {activeJobs.map(job => (
              <ClientJobCard key={job.id.toString()} job={job} />
            ))}
          </div>
        </section>
      )}

      {completedJobs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            Completed ({completedJobs.length})
          </h2>
          <div className="flex flex-col gap-3">
            {completedJobs.map(job => (
              <ClientJobCard key={job.id.toString()} job={job} />
            ))}
          </div>
        </section>
      )}

      {myJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BriefcaseIcon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-base-content mb-1">No jobs posted yet</h3>
          <p className="text-sm text-base-content/50 mb-5">Post your first job to get started.</p>
          <Link href="/post-task" className="btn btn-primary btn-sm">
            Post a Job
          </Link>
        </div>
      )}
    </div>
  );
};

const ClientJobCard = ({ job }: { job: OnChainJob }) => {
  const status = JOB_STATUS[job.status] ?? { label: "Unknown", style: "badge-ghost" };
  return (
    <Link
      href={`/browse/${job.id.toString()}`}
      className="bg-base-100 border border-base-300 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-base-content truncate group-hover:text-primary transition-colors">
            {job.title}
          </p>
          <span className={`badge badge-sm ${status.style} shrink-0`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span>{job.skills.slice(0, 3).join(", ")}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <UserGroupIcon className="w-3 h-3" />
            {job.bidCount.toString()} bids
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {timeAgo(job.createdAt)}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-primary">
          {Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR
        </p>
        <p className="text-xs text-base-content/40 mt-0.5">escrowed</p>
      </div>
    </Link>
  );
};

// ── Freelancer Dashboard ──────────────────────────────────────────────────────

const FreelancerDashboard = ({ address }: { address: string }) => {
  const { jobs, isLoading } = useAllJobs();

  const openJobs = useMemo(() => jobs.filter(j => j.status === 0), [jobs]);
  const myJobs = useMemo(() => jobs.filter(j => j.freelancer.toLowerCase() === address.toLowerCase()), [jobs, address]);

  const earned = useMemo(() => myJobs.filter(j => j.status === 5).reduce((acc, j) => acc + j.budget, 0n), [myJobs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
        <span className="loading loading-spinner loading-md" />
        <span className="text-sm">Loading jobs…</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Freelancer Dashboard</h1>
          <p className="text-sm text-base-content/50 mt-0.5">Find work and track your engagements.</p>
        </div>
        <Link href="/find-work" className="btn btn-primary gap-2">
          <BriefcaseIcon className="w-4 h-4" />
          Browse Jobs
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: BriefcaseIcon,
            label: "Open Jobs",
            value: openJobs.length.toString(),
            color: "bg-primary/10 text-primary",
          },
          {
            icon: CurrencyDollarIcon,
            label: "Total Earned",
            value: `${Number(formatEther(earned)).toLocaleString(undefined, { maximumFractionDigits: 0 })} NXR`,
            color: "bg-success/10 text-success",
          },
          {
            icon: UserGroupIcon,
            label: "Active Contracts",
            value: myJobs.filter(j => j.status > 0 && j.status < 5).length.toString(),
            color: "bg-info/10 text-info",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-base-100 rounded-2xl border border-base-200 px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-base-content/50">{label}</p>
              <p className="text-lg font-bold text-base-content">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active contracts */}
      {myJobs.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
            My Contracts ({myJobs.length})
          </h2>
          <div className="flex flex-col gap-3">
            {myJobs.map(job => (
              <FreelancerJobCard key={job.id.toString()} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* Latest open jobs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
            Latest Open Jobs ({openJobs.length})
          </h2>
          <Link href="/find-work" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {openJobs.length === 0 ? (
          <p className="text-sm text-base-content/40 py-6 text-center">No open jobs yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {openJobs.slice(0, 5).map(job => (
              <FreelancerJobCard key={job.id.toString()} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const FreelancerJobCard = ({ job }: { job: OnChainJob }) => {
  const status = JOB_STATUS[job.status] ?? { label: "Unknown", style: "badge-ghost" };
  return (
    <Link
      href={`/browse/${job.id.toString()}`}
      className="bg-base-100 border border-base-300 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-base-content truncate group-hover:text-primary transition-colors">
            {job.title}
          </p>
          <span className={`badge badge-sm ${status.style} shrink-0`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span>{job.skills.slice(0, 3).join(", ")}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {timeAgo(job.createdAt)}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-primary">
          {Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR
        </p>
      </div>
    </Link>
  );
};

// ── Page entry point ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address } = useAccount();
  const { role, isLoadingName } = useDecentraWorkRegistry();

  return (
    <AppLayout>
      {!address ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-base-content/40">
          <p className="text-sm">Connect your wallet to continue.</p>
        </div>
      ) : isLoadingName ? (
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : role === "client" ? (
        <ClientDashboard address={address} />
      ) : (
        <FreelancerDashboard address={address} />
      )}
    </AppLayout>
  );
}
