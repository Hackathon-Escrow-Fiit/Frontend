"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { ScaleIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDecentraWorkRegistry, useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

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

const useMyDisputes = (address: string | undefined) => {
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });
  const { data: jobCount, isLoading: countLoading } = useScaffoldReadContract({
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

  const { data: results, isLoading: jobsLoading } = useReadContracts({
    contracts: calls,
    query: { enabled: calls.length > 0 },
  });

  const jobs = useMemo<OnChainJob[]>(() => {
    if (!results || !address) return [];
    return results
      .filter(r => r.status === "success" && r.result != null)
      .map(r => {
        const raw = r.result as unknown as OnChainJob;
        return { ...raw, status: Number(raw.status) };
      })
      .filter(
        j =>
          (j.status === 4 || j.status === 7) &&
          (j.client.toLowerCase() === address.toLowerCase() || j.freelancer.toLowerCase() === address.toLowerCase()),
      );
  }, [results, address]);

  return { jobs, isLoading: countLoading || jobsLoading };
};

const getDisputeStatus = (job: OnChainJob, isFreelancer: boolean, hasDefense: boolean) => {
  // Status 7 = Disputed (dispute opened, waiting for defense)
  // Status 4 = DAOVoting (voting in progress)
  if (isFreelancer) {
    if (job.status === 7 && !hasDefense)
      return { label: "Waiting for Response", style: "badge-warning", href: `/disputes/${job.id}/defense` };
    if (job.status === 4) return { label: "Active", style: "badge-error", href: `/disputes/${job.id}/vote` };
  }
  if (job.status === 4 || job.status === 7)
    return { label: "Active", style: "badge-error", href: `/disputes/${job.id}/vote` };
  return { label: "Resolved", style: "badge-ghost", href: `/disputes/${job.id}/result` };
};

const TabBar = ({ isFreelancer }: { isFreelancer: boolean }) => (
  <div className="flex items-center gap-1 border-b border-base-300 mb-6">
    {isFreelancer && (
      <Link
        href="/disputes/all"
        className="px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px border-transparent text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors"
      >
        All Disputes
      </Link>
    )}
    <Link
      href="/disputes/mine"
      className="px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px border-primary text-primary bg-base-100"
    >
      My Disputes
    </Link>
  </div>
);

const MyDisputesPage: NextPage = () => {
  const { address } = useAccount();
  const { role: onChainRole } = useDecentraWorkRegistry();
  const { jobs, isLoading } = useMyDisputes(address);
  const [role, setRole] = useState<"client" | "freelancer">("client");

  useEffect(() => {
    if (onChainRole) {
      setRole(onChainRole);
      return;
    }
    const stored = localStorage.getItem("dw_role");
    if (stored === "freelancer" || stored === "client") setRole(stored);
  }, [onChainRole]);

  const isFreelancer = role === "freelancer";

  return (
    <AppLayout>
      <div className="px-6 pt-6 pb-8 w-full max-w-3xl">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-base-content">Active Disputes</h1>
          <p className="text-sm text-base-content/50 mt-1">
            Disputes you are involved in as {isFreelancer ? "freelancer" : "client"}.
          </p>
        </div>

        <TabBar isFreelancer={isFreelancer} />

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

        {address && !isLoading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ScaleIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-base-content mb-1">No active disputes</h3>
            <p className="text-sm text-base-content/50">You have no ongoing dispute cases.</p>
          </div>
        )}

        {address && !isLoading && jobs.length > 0 && (
          <div className="flex flex-col gap-3">
            {jobs.map(job => {
              const isFreelancer = job.freelancer.toLowerCase() === address.toLowerCase();
              const hasDefense = false; // TODO: fetch from dispute data
              const disputeStatus = getDisputeStatus(job, isFreelancer, hasDefense);
              const budgetNXR = Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 });

              return (
                <Link
                  key={job.id.toString()}
                  href={disputeStatus.href}
                  className="bg-base-100 border border-base-300 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-base-content truncate group-hover:text-primary transition-colors">
                        {job.title}
                      </p>
                      <span className={`badge badge-sm ${disputeStatus.style} shrink-0`}>{disputeStatus.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.skills.slice(0, 3).map(s => (
                        <span key={s} className="badge badge-outline badge-xs">
                          {s}
                        </span>
                      ))}
                      <span className="text-xs text-base-content/40">·</span>
                      <span className="text-xs text-base-content/50">
                        {isFreelancer ? "You are the freelancer" : "You are the client"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">{budgetNXR} NXR</p>
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

export default MyDisputesPage;
