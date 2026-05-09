"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  BoltIcon,
  BookmarkIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const shortenAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const formatDeadline = (ts: bigint) => {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const COMPLEXITY_LABEL = (budgetWei: bigint) => {
  const n = Number(formatEther(budgetWei));
  if (n < 500) return "Entry Level";
  if (n < 2000) return "Intermediate";
  return "Expert";
};

export default function BrowseTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useAccount();

  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState<"client" | "freelancer" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("dw_role");
    setRole(stored === "freelancer" ? "freelancer" : "client");
  }, []);

  const isClient = role === "client";

  // ── Read job from chain ───────────────────────────────────────────────────

  const jobId = BigInt(id ?? "0");

  const { data: job, isLoading } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [jobId],
    query: { enabled: jobId > 0n },
  });

  // ── Place bid ─────────────────────────────────────────────────────────────

  const { writeContractAsync: placeBid, isPending: isBidding } = useScaffoldWriteContract({
    contractName: "JobMarketplace",
  });

  const handleBid = async () => {
    if (!proposal.trim()) return notification.error("Write a short pitch first");
    const amountWei = (() => {
      try {
        return bidAmount && Number(bidAmount) > 0 ? parseEther(bidAmount) : 0n;
      } catch {
        return 0n;
      }
    })();
    if (amountWei === 0n) return notification.error("Enter your proposed amount");
    if (job && amountWei > job.budget) return notification.error("Bid cannot exceed the job budget");

    try {
      await placeBid({
        functionName: "placeBid",
        args: [jobId, amountWei, proposal],
      });
      notification.success("Bid submitted on-chain!");
      router.push(`/browse/${id}/submitted`);
    } catch (e) {
      notification.error("Failed to submit bid");
      console.error(e);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading || role === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
          <span className="loading loading-spinner loading-md" />
          <span className="text-sm">Loading job from blockchain…</span>
        </div>
      </AppLayout>
    );
  }

  if (!job || job.id === 0n) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-base-content/40">
          <p className="text-sm">Job #{id} not found.</p>
          <Link href="/find-work" className="btn btn-outline btn-sm">
            Browse Jobs
          </Link>
        </div>
      </AppLayout>
    );
  }

  const budgetDwt = Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const isOwner = isClient && address?.toLowerCase() === job.client.toLowerCase();
  const isOpen = Number(job.status) === 0;
  const bidCount = Number(job.bidCount);
  const pitchLeft = 500 - proposal.length;

  return (
    <AppLayout>
      <div className="p-6">
        <Link href="/find-work" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-5">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Jobs
        </Link>

        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-3xl font-bold text-base-content mb-2">{job.title}</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-base-content">{shortenAddr(job.client)}</span>
              <span className="text-base-content/30">·</span>
              <span className="text-base-content/50">Job #{job.id.toString()}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Status</p>
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${isOpen ? "bg-success/10 text-success border-success/30" : "bg-base-200 text-base-content/50 border-base-300"}`}
            >
              {isOpen ? "Open for Bidding" : "Closed"}
            </span>
          </div>
        </div>

        <div className="flex gap-5 items-start mt-6">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Description */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DocumentTextIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-base-content">Job Description</h2>
              </div>
              <p className="text-sm text-base-content/70 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Bid form — freelancers only, job must be open, not the owner */}
            {!isClient && !isOwner && isOpen && (
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-base-content">Submit Your Bid</h2>
                  </div>
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                    {bidCount} bid{bidCount !== 1 ? "s" : ""} so far
                  </span>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-base-content mb-1.5 block">
                    Your Proposed Amount (NXR)
                  </label>
                  <div className="flex items-center border border-base-300 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-base-content"
                      placeholder={`Max: ${budgetDwt} NXR`}
                    />
                    <span className="px-3 text-base-content/50 text-sm border-l border-base-300 py-2.5">NXR</span>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-base-content">Your Pitch</label>
                    <span className={`text-xs ${pitchLeft < 50 ? "text-error" : "text-base-content/40"}`}>
                      {pitchLeft} left
                    </span>
                  </div>
                  <textarea
                    value={proposal}
                    onChange={e => e.target.value.length <= 500 && setProposal(e.target.value)}
                    rows={5}
                    className="w-full border border-base-300 rounded-xl px-4 py-3 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30 resize-none focus:border-primary transition-colors"
                    placeholder="Why are you the best fit for this job?"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleBid} disabled={isBidding || !address} className="btn btn-primary flex-1">
                    {isBidding ? <span className="loading loading-spinner loading-xs" /> : null}
                    {isBidding ? "Submitting…" : "Submit Bid On-Chain"}
                  </button>
                  <button
                    onClick={() => setSaved(s => !s)}
                    className={`btn btn-outline btn-square w-12 ${saved ? "btn-primary" : ""}`}
                  >
                    <BookmarkIcon className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
                  </button>
                </div>

                {!address && (
                  <p className="text-xs text-center text-base-content/40 mt-2">Connect your wallet to submit a bid</p>
                )}
              </div>
            )}

            {isOwner && (
              <div className="alert alert-info text-sm">
                <CheckCircleSolid className="w-4 h-4 shrink-0" />
                This is your job posting.
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-64 shrink-0 space-y-4">
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">Job Summary</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <BoltIcon className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Complexity</p>
                    <p className="text-sm font-bold text-base-content">{COMPLEXITY_LABEL(job.budget)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CurrencyDollarIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Budget (Escrowed)</p>
                    <p className="text-sm font-bold text-base-content">{budgetDwt} NXR</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <UserGroupIcon className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Bids</p>
                    <p className="text-sm font-bold text-base-content">{bidCount} submitted</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center shrink-0">
                    <CalendarDaysIcon className="w-4 h-4 text-base-content/50" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Deadline</p>
                    <p className="text-sm font-bold text-base-content">{formatDeadline(job.deadline)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">Client</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                  <span className="text-sm font-bold text-primary">{job.client.slice(2, 4).toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-base-content">{shortenAddr(job.client)}</span>
                    <CheckCircleSolid className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] text-base-content/40">Escrow funded</p>
                </div>
              </div>
            </div>

            {job.skills.length > 0 && (
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                  Required Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map(tag => (
                    <span
                      key={tag}
                      className="text-xs border border-base-300 text-base-content/70 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
