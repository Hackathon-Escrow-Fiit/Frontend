"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { ScaleIcon } from "@heroicons/react/24/outline";
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
  4: { label: "DAO Voting", style: "badge-warning" },
  7: { label: "Disputed", style: "badge-error" },
};

const useAllJobs = () => {
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });
  const { data: jobCount } = useScaffoldReadContract({
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

  const { data: results, isLoading } = useReadContracts({
    contracts: calls,
    query: { enabled: calls.length > 0 },
  });

  const jobs = useMemo<OnChainJob[]>(() => {
    if (!results) return [];
    return results
      .filter(r => r.status === "success" && r.result != null)
      .map(r => {
        const raw = r.result as unknown as OnChainJob;
        return { ...raw, status: Number(raw.status) };
      });
  }, [results]);

  return { jobs, isLoading };
};

const DisputesPage = () => {
  const { address } = useAccount();
  const { jobs, isLoading } = useAllJobs();

  const disputedJobs = useMemo(() => {
    if (!address) return [];
    return jobs.filter(
      j =>
        (j.status === 7 || j.status === 4) &&
        (j.client.toLowerCase() === address.toLowerCase() || j.freelancer.toLowerCase() === address.toLowerCase()),
    );
  }, [jobs, address]);

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-base-content mb-1">Active Disputes</h1>
          <p className="text-sm text-base-content/50">Disputes you are involved in as client or freelancer.</p>
        </div>

        {!address && (
          <div className="flex items-center justify-center h-64 text-base-content/40 text-sm">
            Connect your wallet to continue.
          </div>
        )}

        {address && isLoading && (
          <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
            <span className="loading loading-spinner loading-md" />
            <span className="text-sm">Loading from blockchain…</span>
          </div>
        )}

        {address && !isLoading && disputedJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ScaleIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-base-content mb-1">No active disputes</h3>
            <p className="text-sm text-base-content/50">You have no ongoing dispute cases.</p>
          </div>
        )}

        {address && !isLoading && disputedJobs.length > 0 && (
          <div className="flex flex-col gap-3">
            {disputedJobs.map(job => {
              const status = JOB_STATUS[job.status] ?? { label: "Unknown", style: "badge-ghost" };
              const budgetDwt = Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 });
              const isFreelancer = job.freelancer.toLowerCase() === address.toLowerCase();
              return (
                <Link
                  key={job.id.toString()}
                  href={`/disputes/${job.id.toString()}/defense`}
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
                      <span>{isFreelancer ? "You are the freelancer" : "You are the client"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">{budgetDwt} NXR</p>
                    <p className="text-xs text-base-content/40 mt-0.5">budget</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DisputesPage;
