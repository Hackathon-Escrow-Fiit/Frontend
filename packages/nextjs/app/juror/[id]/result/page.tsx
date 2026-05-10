"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { blo } from "blo";
import { formatEther } from "viem";
import { CheckCircleIcon, ClockIcon, ScaleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export default function DisputeResolutionPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = /^\d+$/.test(id ?? "") ? BigInt(id ?? "0") : 0n;

  const { data: rawJob } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [jobId],
    query: { enabled: jobId > 0n },
  });

  const { data: rawDispute } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "getDispute",
    args: [jobId],
    query: { enabled: jobId > 0n },
  });

  const dispute = useMemo(() => {
    if (!rawDispute) return null;
    const [, , , totalVoterCount, finalized, winningSolutionIndex, defenseStatement] = rawDispute as readonly [
      bigint,
      bigint,
      bigint,
      bigint,
      boolean,
      bigint,
      string,
    ];
    return { totalVoterCount, finalized, winningSolutionIndex, defenseStatement };
  }, [rawDispute]);

  const { data: rawWinningSolution } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "getSolution",
    args: [jobId, dispute?.winningSolutionIndex ?? 0n],
    query: { enabled: jobId > 0n && dispute !== null },
  });

  const winningSolution = useMemo(() => {
    if (!rawWinningSolution) return null;
    const [proposer, paymentBps, description, totalWeight, voterCount] = rawWinningSolution as readonly [
      `0x${string}`,
      bigint,
      string,
      bigint,
      bigint,
    ];
    return { proposer, paymentBps, description, totalWeight, voterCount };
  }, [rawWinningSolution]);

  const job = useMemo(() => {
    if (!rawJob) return null;
    const r = rawJob as any;
    return {
      id: r.id as bigint,
      client: r.client as `0x${string}`,
      freelancer: r.freelancer as `0x${string}`,
      title: r.title as string,
      budget: r.budget as bigint,
    };
  }, [rawJob]);

  const loading = !job || !dispute || !winningSolution;

  // Compute payouts from paymentBps
  const paymentBps = winningSolution?.paymentBps ?? 0n;
  const budget = job?.budget ?? 0n;
  const freelancerAmount = budget > 0n ? (budget * paymentBps) / 10000n : 0n;
  const clientRefund = budget - freelancerAmount;
  const freelancerPct = Number(paymentBps) / 100;
  const clientPct = 100 - freelancerPct;

  const totalVoters = dispute ? Number(dispute.totalVoterCount) : 0;

  const formatNXR = (val: bigint) =>
    `${Number(formatEther(val)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR`;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
          <span className="loading loading-spinner loading-md" />
          <span className="text-sm">Loading dispute result from blockchain…</span>
        </div>
      </AppLayout>
    );
  }

  if (!dispute.finalized) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-base-content/40">
          <ClockIcon className="w-10 h-10 opacity-30" />
          <p className="text-sm font-semibold">Dispute #{id} has not been finalized yet.</p>
          <p className="text-xs">Voting is still in progress.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto px-8 py-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge bg-violet-100 text-violet-700 border-violet-200 font-mono text-xs">
              Dispute #{id}
            </span>
            <span className="flex items-center gap-1 badge bg-green-100 text-green-700 border-green-200 text-xs">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Resolution Finalized
            </span>
            <span className="flex items-center gap-1 badge bg-primary/10 text-primary border-primary/20 text-xs">
              <ScaleIcon className="w-3 h-3" />
              Nexora DAO Arbitration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-1">{job.title}</h1>
          <p className="text-sm text-base-content/50">
            Arbitration between Client ({truncate(job.client)}) and Freelancer ({truncate(job.freelancer)})
          </p>
        </div>

        <div className="flex gap-5 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Final Resolution Outcome */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ScaleIcon className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-base-content text-lg">Final Resolution Outcome</h2>
                </div>
                <span className="badge bg-green-100 text-green-700 border-green-200">
                  Solution #{Number(dispute.winningSolutionIndex)}
                  {dispute.winningSolutionIndex === 0n ? " (Client's Proposal)" : ""}
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-base-content">{freelancerPct.toFixed(0)}%</span>
                  <span className="text-sm text-base-content/50">Released to Freelancer</span>
                </div>
                <span className="text-sm text-base-content/50">{totalVoters} Total Voters</span>
              </div>

              <div className="flex w-full h-3 rounded-full overflow-hidden mb-2">
                <div className="bg-primary transition-all" style={{ width: `${freelancerPct}%` }} />
                <div className="bg-error/40 transition-all" style={{ width: `${clientPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-base-content/50 mb-5">
                <span className="text-primary font-medium">Freelancer ({freelancerPct.toFixed(0)}%)</span>
                <span className="text-error/70 font-medium">Client Refund ({clientPct.toFixed(0)}%)</span>
              </div>

              <blockquote className="border-l-4 border-primary/30 bg-primary/5 rounded-r-xl px-4 py-3">
                <p className="text-sm text-base-content/70 italic leading-relaxed">{winningSolution.description}</p>
              </blockquote>
            </div>

            {/* Defense statement */}
            {dispute.defenseStatement && (
              <div className="bg-base-100 border border-base-300 rounded-xl p-6">
                <h2 className="font-bold text-base-content text-lg mb-3">Freelancer&apos;s Defense</h2>
                <p className="text-sm text-base-content/70 leading-relaxed">{dispute.defenseStatement}</p>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="w-72 shrink-0 flex flex-col gap-4">
            {/* Escrow Total */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Escrow Total</p>
              <p className="text-2xl font-bold text-base-content">{formatNXR(budget)}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-300">
                <span className="text-sm text-base-content/50">Status</span>
                <span className="text-sm font-semibold text-success">Released</span>
              </div>
            </div>

            {/* Final Payout */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <h2 className="font-bold text-base-content mb-4">Final Payout</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={blo(job.freelancer)} alt="freelancer" className="w-6 h-6 rounded-full" />
                    <span className="text-sm text-base-content/70">Freelancer</span>
                  </div>
                  <span className="text-sm font-bold text-primary">+{formatNXR(freelancerAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={blo(job.client)} alt="client" className="w-6 h-6 rounded-full" />
                    <span className="text-sm text-base-content/70">Client (Refund)</span>
                  </div>
                  <span className="text-sm font-semibold text-base-content/70">+{formatNXR(clientRefund)}</span>
                </div>
              </div>
            </div>

            {/* On-Chain Info */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheckIcon className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-base-content">On-Chain Details</h2>
              </div>
              <div className="flex flex-col gap-2 text-xs text-base-content/60">
                <div className="flex justify-between">
                  <span>Winning Solution</span>
                  <span className="font-mono font-semibold text-base-content">
                    #{Number(dispute.winningSolutionIndex)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Voters</span>
                  <span className="font-semibold text-base-content">{totalVoters}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freelancer Receives</span>
                  <span className="font-semibold text-primary">{freelancerPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
