"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getMockDispute, getVotingDeadline } from "../mockDisputes";
import { blo } from "blo";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  LockClosedIcon,
  PaperClipIcon,
  PencilSquareIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleSolid,
  HandThumbDownIcon,
  HandThumbUpIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// ── Helpers ───────────────────────────────────────────────────────────────────

const shortenAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const useCountdown = (deadline: bigint | undefined) => {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  if (!deadline) return { h: 0, m: 0, s: 0, expired: true };
  const diff = Number(deadline) - now;
  if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
  return {
    h: Math.floor(diff / 3600),
    m: Math.floor((diff % 3600) / 60),
    s: diff % 60,
    expired: false,
  };
};

// ── Confidence gauge (SVG ring) ───────────────────────────────────────────────

const ConfidenceGauge = ({ pct }: { pct: number }) => {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="52" textAnchor="middle" fontSize="17" fontWeight="bold" fill="currentColor">
        {pct}%
      </text>
    </svg>
  );
};

// ── Metric row ────────────────────────────────────────────────────────────────

const MetricRow = ({ label, pass }: { label: string; pass: boolean }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-base-content/60">{label}</span>
      <span className={`font-bold text-[11px] ${pass ? "text-success" : "text-error"}`}>{pass ? "PASS" : "FAIL"}</span>
    </div>
    <div className="w-full h-1.5 rounded-full bg-base-300 overflow-hidden">
      <div className={`h-full rounded-full ${pass ? "bg-success w-4/5" : "bg-error w-1/4"}`} />
    </div>
  </div>
);

// ── Statement card ────────────────────────────────────────────────────────────

const StatementCard = ({
  label,
  role,
  address,
  text,
  attachment,
  color,
}: {
  label: string;
  role: string;
  address: string;
  text: string;
  attachment?: string;
  color: string;
}) => (
  <div className={`bg-base-100 rounded-2xl border ${color} p-5 flex flex-col gap-3`}>
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blo(address as `0x${string}`)} alt="avatar" className="w-9 h-9 rounded-full shrink-0" />
      <div>
        <p className="text-xs font-semibold text-base-content">{label}</p>
        <p className="text-[11px] text-primary font-mono">
          {shortenAddr(address)} ({role})
        </p>
      </div>
    </div>
    <p className="text-sm text-base-content/70 leading-relaxed italic">&ldquo;{text}&rdquo;</p>
    {attachment && (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-base-content/50 border border-base-300 rounded-lg px-2.5 py-1 w-fit">
        📎 {attachment}
      </span>
    )}
  </div>
);

// ── Mock juror deliberations ──────────────────────────────────────────────────

const MOCK_JURORS = [
  {
    name: "Juror A",
    tier: "GOLD TIER",
    accuracy: "91.2%",
    reasoning:
      "I evaluated the deliverables against the contract terms. While the visual quality is superior, the technical omission creates significant rework for the client's team. The AI suggestion seems too high; a lower split is more fair given the compliance risk.",
  },
  {
    name: "Juror B",
    tier: "SILVER TIER",
    accuracy: "85.5%",
    reasoning:
      "The contractor's argument about redundancy is subjective. Contractually, the scope was fixed. However, the client accepted part of the work without immediate complaint. Supporting the AI recommendation as a balanced outcome.",
  },
];

// ── Commit phase view (shown after voting) ────────────────────────────────────

type CommitPhaseProps = {
  displayJobId: bigint;
  displayTitle: string;
  displayDescription: string;
  displayClient: string;
  displayFreelancer: string;
  clientStatement: string;
  freelancerDefence: string;
  budgetNXR: string;
  aiConfidence: number;
  reasoning: string;
  h: number;
  m: number;
  s: number;
  onEditReasoning: () => void;
};

const CommitPhaseView = ({
  displayJobId,
  displayTitle,
  displayDescription,
  displayClient,
  displayFreelancer,
  clientStatement,
  freelancerDefence,
  budgetNXR,
  aiConfidence,
  reasoning,
  h,
  m,
  s,
  onEditReasoning,
}: CommitPhaseProps) => {
  const [thumbs, setThumbs] = useState<Record<number, "up" | "down" | null>>({ 0: null, 1: null });

  return (
    <>
      <div className="p-6 pb-28 overflow-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link href="/juror" className="text-base-content/50 hover:text-primary transition-colors">
            Juror Portal
          </Link>
          <span className="text-base-content/30">›</span>
          <span className="text-primary font-medium">Case #{displayJobId.toString().padStart(4, "0")}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-base-content mb-1">Case Commit Phase</h1>
            <p className="text-sm text-base-content/50">Dispute: {displayTitle}</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold bg-success/10 text-success border border-success/30 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Commit Phase Active
          </span>
        </div>

        <div className="flex gap-6 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Original Agreement */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DocumentTextIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-base-content">Original Agreement</h2>
              </div>
              <p className="text-sm text-base-content/70 leading-relaxed mb-4">{displayDescription}</p>
              <div className="flex gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-base-content/50 border border-base-300 rounded-lg px-3 py-1.5">
                  <PaperClipIcon className="w-3.5 h-3.5" /> agreement_v2.pdf
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-base-content/50 border border-base-300 rounded-lg px-3 py-1.5">
                  <PaperClipIcon className="w-3.5 h-3.5" /> Deliverable Link
                </span>
              </div>
            </div>

            {/* AI Verdict Assistant */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-primary">AI Verdict Assistant</h2>
                </div>
                <span className="text-xs font-bold bg-primary text-primary-content px-3 py-1 rounded-full">
                  CONFIDENCE {aiConfidence}%
                </span>
              </div>
              <p className="text-sm text-base-content/70 leading-relaxed mb-3">
                <span className="font-semibold text-base-content">Analysis:</span> The AI evaluated the deliverables
                against the contract terms. The work is partially complete — core deliverables were provided but{" "}
                {aiConfidence < 80 ? "significant" : "minor"} gaps remain relative to the original specification.
              </p>
              <p className="text-sm text-base-content/70">
                <span className="font-semibold text-base-content">Recommendation:</span>{" "}
                {Math.round(aiConfidence * 0.9)}% Partial Payment release recommended.
              </p>
            </div>

            {/* Party Statements */}
            <div>
              <h2 className="font-bold text-base-content mb-3">Party Statements</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { addr: displayFreelancer, role: "Freelancer", label: "johndoe.eth", text: clientStatement },
                  { addr: displayClient, role: "Client", label: "client.eth", text: freelancerDefence },
                ].map(({ addr, role, label, text }) => (
                  <div key={role} className="bg-base-100 rounded-2xl border border-base-200 p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={blo(addr as `0x${string}`)} alt="" className="w-9 h-9 rounded-full shrink-0" />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-semibold text-base-content">{label}</p>
                          {role === "Freelancer" && <CheckCircleSolid className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] text-base-content/40">{role}</p>
                      </div>
                    </div>
                    <p className="text-xs text-base-content/60 leading-relaxed italic">&ldquo;{text}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Juror Deliberations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base-content">Juror Deliberations</h2>
                <span className="flex items-center gap-1 text-xs text-base-content/40">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  Votes remain hidden until the Reveal Phase
                </span>
              </div>

              {/* Own reasoning */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">You</span>
                  <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    ✓ Vote Committed
                  </span>
                </div>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  {reasoning || "Your reasoning was submitted."}
                </p>
              </div>

              {/* Other jurors */}
              {MOCK_JURORS.map((j, i) => (
                <div key={i} className="bg-base-100 border border-base-200 rounded-2xl p-5 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={blo(`0x${i.toString().padStart(40, "a")}` as `0x${string}`)}
                        alt=""
                        className="w-9 h-9 rounded-full shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-base-content">{j.name}</p>
                          <span className="text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full">
                            {j.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-base-content/40">{j.accuracy} Accuracy Rating</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-base-content/40 border border-base-300 px-2.5 py-1 rounded-full">
                      <LockClosedIcon className="w-3 h-3" /> Vote Encrypted
                    </span>
                  </div>
                  <p className="text-sm text-base-content/65 leading-relaxed mb-4">{j.reasoning}</p>
                  <div className="flex items-center justify-between border-t border-base-200 pt-3">
                    <span className="text-xs text-base-content/40">Helpful reasoning?</span>
                    <div className="flex gap-2">
                      {(["up", "down"] as const).map(dir => (
                        <button
                          key={dir}
                          onClick={() => setThumbs(t => ({ ...t, [i]: t[i] === dir ? null : dir }))}
                          className={`p-1.5 rounded-lg transition-colors ${thumbs[i] === dir ? "bg-primary/10 text-primary" : "text-base-content/30 hover:text-base-content/60"}`}
                        >
                          {dir === "up" ? (
                            <HandThumbUpIcon className="w-4 h-4" />
                          ) : (
                            <HandThumbDownIcon className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-72 shrink-0 space-y-5">
            {/* Court Status */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <h3 className="font-bold text-base-content mb-4">Court Status</h3>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                Total Staked in Dispute
              </p>
              <div className="bg-base-200/60 rounded-xl p-4">
                <p className="text-2xl font-bold text-base-content">{budgetNXR} NXR</p>
                <p className="text-xs text-base-content/40 mt-0.5">
                  ≈ ${Math.round(Number(budgetNXR.replace(/,/g, "")) * 0.34).toLocaleString()} USD
                </p>
              </div>
            </div>

            {/* Case Timeline */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">Case Timeline</p>
              <div className="space-y-4">
                {[
                  { label: "Evidence Submission ended", done: true, active: false },
                  { label: `Commit Phase ends in ${h}h ${m}m`, done: false, active: true },
                  { label: "Reveal Phase (Pending)", done: false, active: false },
                ].map(({ label, done, active }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        done
                          ? "bg-base-content/40"
                          : active
                            ? "bg-primary animate-pulse"
                            : "border-2 border-base-300 bg-base-100"
                      }`}
                    />
                    <p className={`text-sm ${active ? "font-semibold text-base-content" : "text-base-content/50"}`}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-52 right-0 bg-base-100 border-t border-base-300 px-6 py-3 flex items-center gap-4 z-40">
        <div className="flex items-center gap-2 text-sm text-base-content/60 shrink-0">
          <ClockIcon className="w-4 h-4" />
          <span className="font-medium">Waiting for Reveal</span>
          <span className="font-mono font-bold text-base-content tabular-nums">
            00 : {String(h).padStart(2, "0")} : {String(m).padStart(2, "0")} : {String(s).padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 flex items-center gap-2 justify-center text-sm text-success font-medium">
          <CheckCircleSolid className="w-4 h-4" />
          Your vote has been committed successfully.
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onEditReasoning} className="btn btn-outline btn-sm gap-1.5">
            <PencilSquareIcon className="w-4 h-4" />
            Edit Reasoning
          </button>
          <button disabled className="btn btn-primary btn-sm gap-1.5 opacity-50 cursor-not-allowed">
            <LockClosedIcon className="w-4 h-4" />
            Reveal My Vote
          </button>
        </div>
      </div>
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JurorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const jobId = BigInt(id ?? "0");

  const [reasoning, setReasoning] = useState("");
  const [voted, setVoted] = useState(false);

  const mockData = getMockDispute(Number(id));
  const isMock = mockData !== null;

  // ── Chain reads (skipped for mock disputes) ─────────────────────────────────

  const { data: job, isLoading: jobLoading } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [jobId],
    query: { enabled: jobId > 0n && !isMock },
  });

  const { data: rawDispute, isLoading: disputeLoading } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "getDispute",
    args: [jobId],
    query: { enabled: jobId > 0n && !isMock },
  });

  const dispute = useMemo(() => {
    if (!rawDispute) return null;
    const [proposedPaymentBps, , votingDeadline, , , voterCount] = rawDispute as readonly [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      boolean,
      string,
    ];
    return { proposedPaymentBps, votingDeadline, voterCount };
  }, [rawDispute]);

  const mockDeadline = mockData ? getVotingDeadline(mockData) : undefined;
  const { h, m, s, expired } = useCountdown(isMock ? mockDeadline : dispute?.votingDeadline);

  // ── Derived metrics ─────────────────────────────────────────────────────────

  const aiMetrics = useMemo(() => {
    if (isMock && mockData) return mockData.aiMetrics;
    if (!job) return [];
    const skills = [...job.skills];
    const pairs: { label: string; pass: boolean }[] = [];
    if (skills[0]) pairs.push({ label: skills[0], pass: true });
    if (skills[1]) pairs.push({ label: skills[1], pass: true });
    if (skills[2]) pairs.push({ label: skills[2], pass: false });
    if (pairs.length === 0) {
      pairs.push({ label: "Code Quality", pass: true });
      pairs.push({ label: "Test Coverage", pass: true });
      pairs.push({ label: "Protocol Compliance", pass: false });
    }
    return pairs;
  }, [job, isMock, mockData]);

  // ── Vote ────────────────────────────────────────────────────────────────────

  const { writeContractAsync: castVote, isPending } = useScaffoldWriteContract({
    contractName: "DAODispute",
  });

  const handleVote = async (support: boolean) => {
    if (reasoning.trim().length < 50) {
      notification.error("Reasoning must be at least 50 characters");
      return;
    }
    if (isMock) {
      setVoted(true);
      notification.success(support ? "Voted: Reject work (dispute upheld)" : "Voted: Approve work (full pay)");
      return;
    }
    if (!address) {
      notification.error("Connect your wallet first");
      return;
    }
    try {
      await castVote({ functionName: "vote", args: [jobId, support] });
      setVoted(true);
      notification.success(support ? "Voted: Reject work (dispute upheld)" : "Voted: Approve work (full pay)");
    } catch (e) {
      notification.error("Vote failed — you may have already voted or lack eligibility");
      console.error(e);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (!isMock && (jobLoading || disputeLoading)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-base-content/40">
          <span className="loading loading-spinner loading-md" />
          <span className="text-sm">Loading dispute from blockchain…</span>
        </div>
      </AppLayout>
    );
  }

  if (!isMock && (!job || job.id === 0n || Number(job.status) !== 4)) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-base-content/40">
          <ScaleIcon className="w-10 h-10 opacity-30" />
          <p className="text-sm">Dispute #{id} not found or not in voting phase.</p>
        </div>
      </AppLayout>
    );
  }

  // Unified display values (mock or real)
  const displayTitle = isMock ? mockData!.title : job!.title;
  const displayDescription = isMock ? mockData!.description : job!.description;
  const displaySkills = isMock ? mockData!.skills : [...job!.skills];
  const displayClient = isMock ? mockData!.client : job!.client;
  const displayFreelancer = isMock ? mockData!.freelancer : job!.freelancer;
  const displayCreatedAt = isMock ? BigInt(Math.floor(Date.now() / 1000) - 30 * 24 * 3600) : job!.createdAt;
  const displayAiDecisionAt = isMock ? BigInt(Math.floor(Date.now() / 1000) - 2 * 3600) : job!.aiDecisionAt;
  const displayJobId = isMock ? BigInt(mockData!.id) : job!.id;
  const budgetNXR = isMock
    ? mockData!.budgetNXR.toLocaleString()
    : Number(formatEther(job!.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const clientProposedPct = isMock
    ? Math.round((mockData!.proposedPaymentBps / 10000) * 100)
    : dispute
      ? Math.round((Number(dispute.proposedPaymentBps) / 10000) * 100)
      : 0;
  const clientRefundPct = 100 - clientProposedPct;
  const voterCount = isMock ? mockData!.voterCount : Number(dispute?.voterCount ?? 0);
  const aiConfidence = isMock ? mockData!.aiConfidence : 82;
  const clientStatement = isMock
    ? mockData!.clientStatement
    : `The freelancer's deliverable did not fully meet the agreed requirements. I am requesting a ${clientRefundPct}% refund.`;
  const freelancerDefence = isMock
    ? mockData!.freelancerDefence
    : `I have delivered all technically feasible aspects of the agreed work within the scope of ${budgetNXR} NXR.`;

  if (voted) {
    return (
      <AppLayout>
        <CommitPhaseView
          displayJobId={displayJobId}
          displayTitle={displayTitle}
          displayDescription={displayDescription}
          displayClient={displayClient}
          displayFreelancer={displayFreelancer}
          clientStatement={clientStatement}
          freelancerDefence={freelancerDefence}
          budgetNXR={budgetNXR}
          aiConfidence={aiConfidence}
          reasoning={reasoning}
          h={h}
          m={m}
          s={s}
          onEditReasoning={() => setVoted(false)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Link href="/juror" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-5">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Juror Portal
        </Link>

        {/* Case header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                CASE #{displayJobId.toString().padStart(4, "0")}
              </span>
              <span className="text-base-content/40 text-xs">•</span>
              <span className="text-xs text-base-content/50">Fact Finding Phase</span>
            </div>
            <h1 className="text-2xl font-bold text-base-content">{displayTitle}</h1>
          </div>

          {/* Countdown */}
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1 flex items-center gap-1 justify-end">
              <ClockIcon className="w-3 h-3" />
              Time Remaining to Vote
            </p>
            {expired ? (
              <p className="text-lg font-bold text-error">Voting Ended</p>
            ) : (
              <p className="text-2xl font-bold text-primary tabular-nums">
                {String(h).padStart(2, "0")}h : {String(m).padStart(2, "0")}m : {String(s).padStart(2, "0")}s
              </p>
            )}
          </div>
        </div>

        {/* Agreement + AI Verdict */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* The Agreement */}
          <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base-content">The Agreement</h2>
            </div>

            <div className="bg-base-200/60 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-base-content/50 font-mono">
                  IPFS CID: Qm{displayJobId.toString().padStart(4, "0")}…{displayClient.slice(2, 6)}
                </p>
                <button className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                  View TSD ↗
                </button>
              </div>
              <p className="text-xs text-base-content/70 leading-relaxed line-clamp-3">{displayDescription}</p>
            </div>

            {/* Skills as phases */}
            <div className="flex flex-col gap-2 mb-4">
              {displaySkills.map((skill, i) => (
                <div key={skill} className="flex items-center gap-2 text-sm">
                  {i < displaySkills.length - 1 ? (
                    <CheckCircleSolid className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <CheckCircleIcon className="w-4 h-4 text-base-content/30 shrink-0" />
                  )}
                  <span className={i < displaySkills.length - 1 ? "text-base-content/70" : "text-base-content/40"}>
                    {skill}
                    {i === displaySkills.length - 1 && (
                      <span className="text-[10px] text-warning ml-1">(In Dispute)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Milestones */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Milestones</p>
              <div className="relative pl-4 border-l-2 border-base-300 space-y-4">
                <div>
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-primary" />
                  <p className="text-xs font-semibold text-base-content">Milestone 1: Project Start</p>
                  <p className="text-[11px] text-base-content/40">
                    Posted {new Date(Number(displayCreatedAt) * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <div className="absolute -left-[5px] w-2 h-2 rounded-full bg-base-400" />
                  <p className="text-xs font-semibold text-base-content">Milestone 2: Final Delivery</p>
                  <p className="text-[11px] text-base-content/40">
                    Claimed {new Date(Number(displayAiDecisionAt) * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Verdict */}
          <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-base-content">AI Verdict</h2>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] bg-primary/8 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                evaluator.decentrawork.eth
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Left: status + metrics */}
              <div>
                <div className="bg-error/6 border border-error/20 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-error">Status: DISPUTED</span>
                    <span className="text-[10px] text-base-content/40">
                      Report #{displayJobId.toString().padStart(3, "0")}-A
                    </span>
                  </div>
                  <p className="text-[11px] text-base-content/60 leading-relaxed">
                    Client disputes the AI-approved deliverable. DAO vote required to resolve.
                  </p>
                </div>
                {aiMetrics.map(({ label, pass }) => (
                  <MetricRow key={label} label={label} pass={pass} />
                ))}
              </div>

              {/* Right: confidence gauge */}
              <div className="flex flex-col items-center justify-center gap-2">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">Confidence Gauge</p>
                <ConfidenceGauge pct={aiConfidence} />
                <p className="text-[11px] text-base-content/50 text-center leading-relaxed">
                  AI is highly confident the delivery is <span className="font-semibold">partially complete</span>{" "}
                  relative to the TSD.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Statement + Freelancer Defence */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <StatementCard
            label="Client Statement"
            role="Claimant"
            address={displayClient}
            text={clientStatement}
            attachment="Dispute_Statement.pdf"
            color="border-warning/30 bg-warning/2"
          />
          <StatementCard
            label="Freelancer Defence"
            role="Respondent"
            address={displayFreelancer}
            text={freelancerDefence}
            attachment="Deliverables.zip"
            color="border-primary/20 bg-primary/2"
          />
        </div>

        {/* Dispute stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Escrowed", value: `${budgetNXR} NXR` },
            { label: "Client Proposes", value: `${clientProposedPct}% freelancer / ${clientRefundPct}% client` },
            { label: "Votes Cast", value: `${voterCount} jurors` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-base-100 border border-base-200 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">{label}</p>
              <p className="text-sm font-bold text-base-content">{value}</p>
            </div>
          ))}
        </div>

        {/* Final Judgment */}
        <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
          <h2 className="text-xl font-bold text-base-content mb-1">Final Judgment</h2>
          <p className="text-sm text-base-content/50 mb-5 leading-relaxed">
            Please provide your reasoning based on the agreement terms and the evidence provided by both parties. Your
            reasoning will be visible to other jurors during the reveal phase.
          </p>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-base-content">Reasoning for Verdict</label>
              <span className="text-xs text-base-content/40">{reasoning.length} / 500</span>
            </div>
            <textarea
              value={reasoning}
              onChange={e => e.target.value.length <= 500 && setReasoning(e.target.value)}
              rows={5}
              className="w-full border border-base-300 rounded-xl px-4 py-3 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30 resize-none focus:border-primary transition-colors"
              placeholder="Explain why you believe the work should be approved or rejected (min 50 characters)..."
              disabled={expired}
            />
            {expired && <p className="text-xs text-error mt-1">Voting period has ended.</p>}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleVote(false)}
              disabled={isPending || expired || reasoning.trim().length < 50}
              className="btn btn-primary flex-1 gap-2"
            >
              {isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <CheckCircleSolid className="w-4 h-4" />
              )}
              Freelancer Did the Work
            </button>
            <button
              onClick={() => handleVote(true)}
              disabled={isPending || expired || reasoning.trim().length < 50}
              className="btn btn-outline border-error text-error hover:bg-error hover:text-white flex-1 gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {"Client's Complaint is Valid"}
            </button>
          </div>

          <p className="text-[11px] text-base-content/40 text-center mt-3">
            {`"Freelancer Did the Work" → full payment released. "Client's Complaint is Valid" → client gets a refund.`}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
