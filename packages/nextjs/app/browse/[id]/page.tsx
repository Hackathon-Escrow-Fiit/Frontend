"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import {
  ArrowLeftIcon,
  BoltIcon,
  BookmarkIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import {
  useDecentraWorkRegistry,
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
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

type OnChainBid = {
  freelancer: `0x${string}`;
  amount: bigint;
  proposal: string;
  accepted: boolean;
};

// ── File Dispute Modal ────────────────────────────────────────────────────────

type DisputeJob = { id: bigint; title: string; budget: bigint };

const FileDisputeModal = ({ job, onClose }: { job: DisputeJob; onClose: () => void }) => {
  const [resolution, setResolution] = useState<"split" | "refund">("split");
  const [freelancerPct, setFreelancerPct] = useState(50);
  const [statement, setStatement] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const clientPct = 100 - freelancerPct;
  const proposedPaymentBps = resolution === "refund" ? 0n : BigInt(freelancerPct * 100);

  const { data: disputeStake } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "disputeStake",
  });

  const stakeNXR = disputeStake
    ? Number(formatEther(disputeStake)).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "…";

  const { writeContractAsync: initiateDispute, isPending } = useScaffoldWriteContract({
    contractName: "JobMarketplace",
  });

  const handleSubmit = async () => {
    if (statement.trim().length < 50) {
      notification.error("Statement must be at least 50 characters");
      return;
    }
    try {
      await initiateDispute({
        functionName: "initiateDAODispute",
        args: [job.id, proposedPaymentBps],
      });
      notification.success("Dispute submitted! DAO voting has started.");
      onClose();
    } catch (e) {
      notification.error("Failed to submit dispute");
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-base-200">
          <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center shrink-0">
            <ExclamationCircleIcon className="w-6 h-6 text-error" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base-content text-lg">File a Dispute</h2>
            <p className="text-sm text-base-content/50 mt-0.5 truncate">
              Formal arbitration for Task #{job.id.toString()}: {job.title}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Affected task */}
          <div>
            <label className="text-sm font-semibold text-base-content mb-2 block">Affected Task</label>
            <div className="flex items-center border border-base-300 rounded-xl px-4 py-3 bg-base-200/40 gap-2">
              <span className="text-sm text-base-content flex-1 truncate">
                {job.title} ({Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                NXR)
              </span>
              <ChevronDownIcon className="w-4 h-4 text-base-content/40 shrink-0" />
            </div>
          </div>

          {/* Resolution type */}
          <div>
            <label className="text-sm font-semibold text-base-content mb-2 block">Requested Resolution</label>
            <div className="grid grid-cols-2 gap-3">
              {(["split", "refund"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setResolution(type)}
                  className={`flex flex-col items-center py-3 rounded-xl border-2 transition-colors ${
                    resolution === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-base-300 text-base-content/60 hover:border-base-400"
                  }`}
                >
                  <span className="text-xs font-medium mb-0.5">{type === "split" ? "Split" : "Full Refund"}</span>
                  <span className="text-sm font-bold">
                    {type === "split" ? `${freelancerPct}% / ${clientPct}%` : "0% / 100%"}
                  </span>
                </button>
              ))}
            </div>

            {resolution === "split" && (
              <div className="mt-3 bg-base-200/50 rounded-xl p-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-base-content/50">
                    Freelancer gets: <span className="text-base-content font-semibold">{freelancerPct}%</span>
                  </span>
                  <span className="text-base-content/50">
                    You receive: <span className="text-base-content font-semibold">{clientPct}%</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={5}
                  value={freelancerPct}
                  onChange={e => setFreelancerPct(Number(e.target.value))}
                  className="range range-primary range-sm w-full"
                />
                <div className="flex justify-between text-[10px] text-base-content/40 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>

          {/* Statement */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-base-content">Detailed Statement</label>
              <span className="text-xs text-base-content/40">{statement.length} / 500</span>
            </div>
            <textarea
              value={statement}
              onChange={e => e.target.value.length <= 500 && setStatement(e.target.value)}
              rows={4}
              className="w-full border border-base-300 rounded-xl px-4 py-3 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30 resize-none focus:border-primary transition-colors"
              placeholder="Describe the issue with deliverables or communication. Be specific about the breach of contract..."
            />
            <p className="text-xs text-base-content/40 mt-1 flex items-center gap-1">
              <InformationCircleIcon className="w-3.5 h-3.5" />
              Minimum 50 characters required.
            </p>
          </div>

          {/* Evidence upload */}
          <div>
            <label className="text-sm font-semibold text-base-content mb-2 block">Supporting Evidence</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-base-300 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <CloudArrowUpIcon className="w-8 h-8 text-base-content/30" />
              <p className="text-sm text-base-content/60 font-medium">
                {fileName ?? "Click to upload or drag and drop"}
              </p>
              {!fileName && <p className="text-xs text-base-content/40">PDF, ZIP, or PNG (Max 10MB)</p>}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.zip,.png"
                className="hidden"
                onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </div>
          </div>

          {/* Stake info */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary mb-0.5">Arbitration Stake Required</p>
              <p className="text-xs text-base-content/60 leading-relaxed">
                To prevent spam, a <span className="text-primary font-semibold">{stakeNXR} NXR stake</span> is required
                to open a dispute. This stake is returned if the case is won or settled amicably.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="btn btn-outline flex-1 text-error border-error/30 hover:bg-error/5 hover:border-error"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || statement.trim().length < 50}
            className="btn btn-primary flex-1"
          >
            {isPending && <span className="loading loading-spinner loading-xs" />}
            {isPending ? "Submitting…" : "Stake & Submit Dispute"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrowseTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useAccount();

  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [saved, setSaved] = useState(false);
  const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const { role, isLoadingName } = useDecentraWorkRegistry();
  const isClient = role === "client";

  // ── Read job from chain ───────────────────────────────────────────────────

  const jobId = BigInt(id ?? "0");

  const { data: job, isLoading } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [jobId],
    query: { enabled: jobId > 0n },
  });

  const bidCount = job ? Number(job.bidCount) : 0;
  const isOwner = isClient && !!address && !!job && address.toLowerCase() === job.client.toLowerCase();
  const isOpen = job ? Number(job.status) === 0 : false;

  // ── Batch-read all bids (owner only) ─────────────────────────────────────

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });

  const bidCalls = useMemo(() => {
    if (!contractInfo || bidCount === 0 || !isOwner) return [];
    return Array.from({ length: bidCount }, (_, i) => ({
      address: contractInfo.address as `0x${string}`,
      abi: contractInfo.abi,
      functionName: "getBid" as const,
      args: [jobId, BigInt(i)] as const,
    }));
  }, [contractInfo, bidCount, isOwner, jobId]);

  const { data: bidResults, refetch: refetchBids } = useReadContracts({
    contracts: bidCalls,
    query: { enabled: bidCalls.length > 0 },
  });

  const bids = useMemo<(OnChainBid & { index: number })[]>(() => {
    if (!bidResults) return [];
    return bidResults
      .filter(r => r.status === "success" && r.result != null)
      .map((r, i) => ({ ...(r.result as unknown as OnChainBid), index: i }));
  }, [bidResults]);

  // ── Place bid ─────────────────────────────────────────────────────────────

  const { writeContractAsync: placeBid, isPending: isBidding } = useScaffoldWriteContract({
    contractName: "JobMarketplace",
  });

  const { writeContractAsync: acceptBidWrite, isPending: isAccepting } = useScaffoldWriteContract({
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

  const handleAccept = async (bidIndex: number) => {
    setAcceptingIndex(bidIndex);
    try {
      await acceptBidWrite({
        functionName: "acceptBid",
        args: [jobId, BigInt(bidIndex)],
      });
      notification.success("Bid accepted — freelancer has been assigned!");
      refetchBids();
    } catch (e) {
      notification.error("Failed to accept bid");
      console.error(e);
    } finally {
      setAcceptingIndex(null);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading || isLoadingName) {
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
  const isAIApproved = Number(job.status) === 3;
  const disputeWindowOpen =
    isAIApproved && Number(job.aiDecisionAt) > 0 && Date.now() / 1000 < Number(job.aiDecisionAt) + 48 * 3600;
  const pitchLeft = 500 - proposal.length;

  return (
    <>
      <AppLayout>
        <div className="p-6">
          <Link
            href="/find-work"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-5"
          >
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

              {/* Applications — client/owner only */}
              {isOwner && (
                <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <UserGroupIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-base-content">Applications</h2>
                    <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full ml-auto">
                      {bidCount} received
                    </span>
                  </div>

                  {bidCount === 0 ? (
                    <p className="text-sm text-base-content/40 py-4 text-center">No applications yet.</p>
                  ) : !bidResults ? (
                    <div className="flex items-center gap-2 text-base-content/40 text-sm py-4">
                      <span className="loading loading-spinner loading-xs" />
                      Loading applications…
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {bids.map(bid => (
                        <div
                          key={bid.index}
                          className={`border rounded-xl p-4 transition-colors ${
                            bid.accepted ? "border-success/40 bg-success/5" : "border-base-300 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <span className="text-xs font-bold text-primary">
                                  {bid.freelancer.slice(2, 4).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-base-content">{shortenAddr(bid.freelancer)}</p>
                                <p className="text-[11px] text-base-content/40">Applicant #{bid.index + 1}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-primary">
                                {Number(formatEther(bid.amount)).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}{" "}
                                NXR
                              </p>
                              {bid.accepted && (
                                <span className="text-[11px] text-success font-semibold flex items-center gap-0.5 justify-end mt-0.5">
                                  <CheckCircleSolid className="w-3 h-3" />
                                  Accepted
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-base-content/70 leading-relaxed mb-3 whitespace-pre-wrap">
                            {bid.proposal}
                          </p>

                          {!bid.accepted && isOpen && (
                            <button
                              onClick={() => handleAccept(bid.index)}
                              disabled={isAccepting || acceptingIndex !== null}
                              className="btn btn-primary btn-sm w-full"
                            >
                              {acceptingIndex === bid.index ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : null}
                              {acceptingIndex === bid.index ? "Accepting…" : "Accept This Bid"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                <div className="bg-base-100 rounded-2xl border border-base-200 p-5 space-y-3">
                  <div className="alert alert-info text-sm">
                    <CheckCircleSolid className="w-4 h-4 shrink-0" />
                    This is your job posting.
                  </div>
                  {disputeWindowOpen && (
                    <button
                      onClick={() => setShowDisputeModal(true)}
                      className="btn btn-error btn-outline w-full gap-2"
                    >
                      <ExclamationCircleIcon className="w-4 h-4" />
                      File a Dispute
                    </button>
                  )}
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
                    {job.skills.map((tag: string) => (
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
      {showDisputeModal && job && (
        <FileDisputeModal
          job={{ id: job.id, title: job.title, budget: job.budget }}
          onClose={() => setShowDisputeModal(false)}
        />
      )}
    </>
  );
}
