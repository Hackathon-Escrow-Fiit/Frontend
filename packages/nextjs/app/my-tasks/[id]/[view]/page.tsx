"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BoltIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeBracketIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Role = "client" | "freelancer";

const bids = [
  {
    id: "1",
    name: "crypto_wizard.eth",
    tier: "Gold Tier",
    tierColor: "bg-yellow-100 text-yellow-700",
    amount: "12,000 USDC",
    days: 14,
    bio: "I've built three production-grade DeFi dashboards in the last 6 months. Expert at optimizing subgraph queries for sub-second latency. Can start immediately and...",
    verified: true,
  },
  {
    id: "2",
    name: "degen_stacker.eth",
    tier: "Silver Tier",
    tierColor: "bg-base-200 text-base-content/60",
    amount: "14,500 USDC",
    days: 21,
    bio: "Full-stack engineer with deep React knowledge. Previously lead frontend at a Tier 1 DEX. My focus is on pixel-perfect UI and extreme security.",
    verified: false,
  },
];

const activityItems = [
  {
    Icon: CodeBracketIcon,
    text: (
      <>
        Pushed updates to <span className="text-primary cursor-pointer hover:underline">audit-repo-v2</span>
      </>
    ),
    time: "2 hours ago",
  },
  { Icon: DocumentTextIcon, text: "Generated Milestone 1 PDF Report", time: "Yesterday" },
  { Icon: ChatBubbleLeftEllipsisIcon, text: "Replied to feedback thread", time: "Yesterday" },
];

const submissionChecks = [
  { label: "Code Quality", result: "PASS", pass: true },
  { label: "Security Protocols", result: "PASS", pass: true },
  { label: "Documentation", result: "PASS", pass: true },
  { label: "Gas Optimization", result: "MINOR ISSUE", pass: false },
];

const DonutChart = ({ score }: { score: number }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-base-200" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        className="text-primary transition-all duration-700"
      />
    </svg>
  );
};

export default function TaskViewPage() {
  const { id, view } = useParams<{ id: string; view: string }>();
  const [role, setRole] = useState<Role>("client");

  useEffect(() => {
    const stored = localStorage.getItem("dw_role");
    if (stored === "freelancer" || stored === "client") setRole(stored as Role);
  }, []);

  const isClient = role === "client";
  const clientViews = ["bids", "active", "review"];
  const freelancerViews = ["active", "waiting"];
  const views = isClient ? clientViews : freelancerViews;

  const navTab = (v: string) => (
    <Link
      key={v}
      href={`/my-tasks/${id}/${v}`}
      className={`px-4 py-2 text-sm font-medium capitalize rounded-lg transition-colors ${
        view === v
          ? "bg-primary text-primary-content"
          : "text-base-content/50 hover:text-base-content hover:bg-base-200"
      }`}
    >
      {v}
    </Link>
  );

  /* ── WAITING VIEW ── */
  if (view === "waiting") {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/my-tasks"
                className="w-8 h-8 rounded-lg border border-base-300 flex items-center justify-center hover:bg-base-200 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 text-base-content/60" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-base-content leading-tight">
                  Smart Contract Audit — DeFi Protocol
                </h1>
                <p className="text-xs text-base-content/40 font-mono mt-0.5">Task ID: #DW-8829-X</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-base-content text-base-100 text-xs font-semibold px-3 py-1.5 rounded-full">
                Reviewing Submission
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">V</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-base-content">vitalik.eth</span>
                  <CheckCircleSolid className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <ClockIcon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-base-content mb-3">Waiting for Client Decision</h2>
                <p className="text-sm text-base-content/60 leading-relaxed max-w-sm">
                  The AI assessment is complete. We are currently waiting for the client to review the submission and
                  provide final approval.
                </p>
              </div>

              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-sm font-semibold text-base-content/70 mb-4">Communication History</h2>
                <div className="bg-base-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary-content">AI</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-base-content/80 italic leading-relaxed">
                        &ldquo;Analysis complete. Submission meets 4 out of 5 primary scope targets. Awaiting client
                        confirmation or automated 48h timeout.&rdquo;
                      </p>
                      <p className="text-[10px] text-base-content/40 mt-2">Just now</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-64 shrink-0 space-y-3">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                  Awaiting Action
                </p>
                <p className="text-xs text-base-content/60 leading-relaxed mb-4">
                  The AI has verified your submission. You can wait for the client&apos;s manual approval or use the
                  48-hour auto-release. If the client requests changes you feel are unfair, use the &apos;Deny&apos;
                  option.
                </p>
                <div className="space-y-2">
                  <button className="btn btn-primary w-full gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    Accept AI Decision
                  </button>
                  <button className="btn btn-outline w-full gap-2">
                    <XCircleIcon className="w-4 h-4" />
                    Deny Changes
                  </button>
                </div>
              </div>

              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                  Financial Status
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Escrow Amount</span>
                    <span className="text-base-content font-medium">2,450 USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/50">Service Fee (2%)</span>
                    <span className="text-base-content font-medium">-49 USDC</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-base-200">
                    <span className="font-bold text-base-content">Net Payout</span>
                    <span className="font-bold text-primary">2,401 USDC</span>
                  </div>
                </div>
              </div>

              <div className="bg-base-200/50 rounded-2xl border border-base-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-base-content/40" />
                  <p className="text-sm font-bold text-base-content">Need help with this review?</p>
                </div>
                <p className="text-xs text-base-content/55 leading-relaxed mb-3">
                  If the AI evaluation seems incorrect, you can request a manual mediator review.
                </p>
                <button className="text-xs text-primary hover:underline font-medium">Contact Support</button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-base-200 rounded-xl p-1 w-fit">{views.map(navTab)}</div>

        {/* BIDS VIEW */}
        {view === "bids" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                        Active Project
                      </span>
                      <span className="text-xs text-base-content/40 font-mono">ID: #DW-8829-X</span>
                    </div>
                    <h1 className="text-2xl font-bold text-base-content">Next-Gen DeFi Dashboard</h1>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">Total Budget</p>
                    <p className="text-2xl font-bold text-primary">15,000 USDC</p>
                  </div>
                </div>
                <hr className="border-base-200 mb-4" />
                <div className="flex items-center gap-10 mb-5">
                  {[
                    { label: "Duration", Icon: ClockIcon, value: "3 Weeks" },
                    { label: "Complexity", Icon: BoltIcon, value: "High (Expert)" },
                    { label: "Category", Icon: BuildingStorefrontIcon, value: "Fintech / Web3" },
                  ].map(({ label, Icon, value }) => (
                    <div key={label}>
                      <p className="text-xs text-base-content/40 mb-1">{label}</p>
                      <p className="text-sm font-medium text-base-content flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-base-content/40" />
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold tracking-widest text-base-content/40 uppercase mb-2">
                  Technical Specifications
                </p>
                <p className="text-sm text-base-content/70 leading-relaxed mb-4">
                  Architecture for a multi-chain yield aggregator dashboard. Required integration with Ethers.js, wagmi,
                  and custom subgraph indexing. High-performance charting using TradingView Lightweight Charts is a
                  must.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-base-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CodeBracketIcon className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-base-content">Tech Stack</p>
                    </div>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      Next.js 14, Tailwind CSS, TypeScript, GraphQL
                    </p>
                  </div>
                  <div className="rounded-xl border border-base-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheckIcon className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-base-content">Security</p>
                    </div>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      WalletConnect V2, SIWE, Multi-sig ready
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-base-content">
                    Bids Received <span className="text-base-content/40 font-normal">(12)</span>
                  </h2>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm gap-1.5">
                      <FunnelIcon className="w-3.5 h-3.5" />
                      Filter
                    </button>
                    <button className="btn btn-outline btn-sm gap-1.5">
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                      Newest
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {bids.map(bid => (
                    <div key={bid.id} className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                            <UserGroupIcon className="w-6 h-6 text-primary/50" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-base-content">{bid.name}</span>
                            {bid.verified && <CheckBadgeIcon className="w-4 h-4 text-primary" />}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bid.tierColor}`}>
                              {bid.tier}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary">{bid.amount}</p>
                          <p className="text-xs text-base-content/40">in {bid.days} days</p>
                        </div>
                      </div>
                      <p className="text-sm text-base-content/65 leading-relaxed mb-4">{bid.bio}</p>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-primary btn-sm">Accept Bid</button>
                        <button className="btn btn-outline btn-sm">Message</button>
                        <button className="btn btn-ghost btn-sm text-error ml-auto">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase">Escrow Status</h2>
                  <ShieldCheckIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2.5 mb-4">
                  <LockClosedIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-primary">Funds Locked</p>
                    <p className="text-xs text-base-content/60 leading-relaxed mt-0.5">
                      The smart contract is holding 15,000 USDC secure for this project.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs mb-4">
                  {[
                    ["Amount Locked", "15,000.00 USDC"],
                    ["Protocol Fee (2%)", "300.00 USDC"],
                    ["Release Condition", "Multi-sig / Milestone"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-base-content/50">{k}</span>
                      <span className="font-semibold text-base-content">{v}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline btn-sm w-full gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  View Contract
                </button>
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">Activity Log</h2>
                <div className="space-y-3">
                  {[
                    { Icon: DocumentTextIcon, label: "Task Posted", time: "2 hours ago", color: "text-primary" },
                    { Icon: LockClosedIcon, label: "Escrow Funded", time: "1 hour ago", color: "text-success" },
                    { Icon: UserGroupIcon, label: "5 New Bids Received", time: "Just now", color: "text-info" },
                  ].map(({ Icon, label, time, color }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-base-content">{label}</p>
                        <p className="text-[10px] text-base-content/40 mt-0.5">{time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE VIEW */}
        {view === "active" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                        Active Task
                      </span>
                      <span className="text-xs text-base-content/40 font-mono">#DW-8829</span>
                    </div>
                    <h1 className="text-2xl font-bold text-base-content mb-2">Smart Contract Security Audit</h1>
                    <p className="text-sm text-base-content/60 leading-relaxed">
                      Vulnerability assessment and optimization of the core staking protocols for the DecentraWork
                      ecosystem.
                    </p>
                  </div>
                  <button className="btn btn-outline btn-sm gap-2 shrink-0">
                    <ArrowPathIcon className="w-4 h-4" />
                    {isClient ? "Request Update" : "Submit Work"}
                  </button>
                </div>
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-base-content">Activity</h2>
                  <span className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <span className="w-2 h-2 rounded-full bg-success inline-block" />
                    Last active 2 hours ago
                  </span>
                </div>
                {activityItems.map(({ Icon, text, time }, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-base-content/50" />
                      </div>
                      {i < activityItems.length - 1 && <div className="w-px flex-1 bg-base-200 my-1 min-h-4" />}
                    </div>
                    <div className="pb-5">
                      <p className="text-sm text-base-content/80">{text}</p>
                      <p className="text-xs text-base-content/40 mt-0.5">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <h2 className="text-xs font-bold tracking-widest text-base-content/40 uppercase mb-5">
                  Financial Summary
                </h2>
                <div className="space-y-3">
                  {[
                    [isClient ? "Total Budget" : "Total Earnings", "4.50 ETH", "text-base-content"],
                    [isClient ? "In Escrow" : "Pending Release", "3.00 ETH", "text-primary"],
                    [isClient ? "Released" : "Received", "1.50 ETH", "text-warning"],
                  ].map(([label, val, color]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">{label}</span>
                      <span className={`font-bold ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-base-200 text-center">
                  <p className="text-xs text-base-content/40">Managed by DecentraWork Smart Escrow v1.2</p>
                </div>
              </div>
            </div>
            <div className="w-64 shrink-0">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6 text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-full h-full rounded-full bg-primary/15 flex items-center justify-center border-2 border-primary/20">
                    <UserCircleIcon className="w-12 h-12 text-primary/40" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-base-100">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="font-bold text-base-content">{isClient ? "alice.eth" : "client.eth"}</span>
                  <CheckBadgeIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="mb-5">
                  <span className="text-[10px] font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                    <span>◆</span>
                    {isClient ? "DIAMOND ELO" : "VERIFIED CLIENT"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-5 mb-5 border-b border-base-200">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-base-content/40 uppercase mb-1">Rating</p>
                    <p className="font-bold text-base-content">{isClient ? "4.9/5" : "4.7/5"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-base-content/40 uppercase mb-1">
                      {isClient ? "Jobs Done" : "Tasks Posted"}
                    </p>
                    <p className="font-bold text-base-content">{isClient ? "142" : "38"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button className="btn btn-primary w-full gap-2">
                    <UserCircleIcon className="w-4 h-4" />
                    View Profile
                  </button>
                  <button className="btn btn-outline w-full gap-2">
                    {isClient ? (
                      <>
                        <CurrencyDollarIcon className="w-4 h-4" />
                        Release Escrow
                      </>
                    ) : (
                      <>
                        <BriefcaseIcon className="w-4 h-4" />
                        Request Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW VIEW */}
        {view === "review" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-base-content/50 mb-1">
                  <Link href="/my-tasks" className="hover:text-primary">
                    My Tasks
                  </Link>
                  <span>›</span>
                  <span>Task #8842</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-base-content">
                      Smart Contract Security Audit &amp; Refactoring
                    </h1>
                    <p className="text-sm text-base-content/50 mt-1">
                      Task submitted by <span className="text-primary cursor-pointer hover:underline">eth-dev.eth</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1.5 bg-warning/15 text-warning text-xs font-bold px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                      AI Reviewing
                    </span>
                    <p className="text-xs text-base-content/50 mt-1">Bounty: 2.45 ETH</p>
                  </div>
                </div>
              </div>

              <div className="bg-base-100 rounded-2xl border border-base-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-200">
                  <div className="flex items-center gap-2">
                    <CheckCircleSolid className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-base-content">Full AI Completion Report</h2>
                  </div>
                  <span className="text-xs text-base-content/40 italic">Generated 4m ago</span>
                </div>

                <div className="p-6 grid grid-cols-2 gap-6 border-b border-base-200">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      Submission Analysis
                    </p>
                    <div className="space-y-2">
                      {submissionChecks.map(({ label, result, pass }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {pass ? (
                              <CheckCircleSolid className="w-4 h-4 text-success shrink-0" />
                            ) : (
                              <ExclamationCircleIcon className="w-4 h-4 text-warning shrink-0" />
                            )}
                            <span className="text-sm text-base-content/80">{label}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${pass ? "text-success" : "text-warning"}`}>
                            {result}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      AI Confidence Score
                    </p>
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <DonutChart score={94} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-base-content">94%</span>
                          <span className="text-[10px] text-base-content/50">High Confidence</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-base-content/40 text-center leading-relaxed mt-2 max-w-[180px]">
                        Based on deep analysis of 1,244 lines of code and comparisons against known security patterns.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-b border-base-200">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Flagged Concerns
                  </p>
                  <div className="bg-base-200 rounded-xl p-4 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-base-content mb-1">Minor gas optimization possible</p>
                      <p className="text-xs text-base-content/60 leading-relaxed">
                        Lines 42-58 in{" "}
                        <code className="bg-base-300 px-1 py-0.5 rounded text-[11px] font-mono">Vault.sol</code> could
                        use unchecked arithmetic to save approximately 1,200 gas per transaction.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Submission Attachments
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: DocumentTextIcon, name: "audit_report_final.pdf", meta: "4.2 MB • PDF Document" },
                      { icon: CodeBracketIcon, name: "source_code_v2.zip", meta: "1.8 MB • Archive" },
                    ].map(({ icon: Icon, name, meta }) => (
                      <div key={name} className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3">
                        <Icon className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-base-content truncate">{name}</p>
                          <p className="text-[10px] text-base-content/40 mt-0.5">{meta}</p>
                        </div>
                        <button className="btn btn-ghost btn-xs btn-square shrink-0">
                          <ArrowDownTrayIcon className="w-4 h-4 text-base-content/40" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">
                  Review Actions
                </h2>
                <div className="space-y-2">
                  <button className="btn btn-primary w-full gap-2 h-16 text-base">
                    <CurrencyDollarIcon className="w-5 h-5" />
                    Approve &amp; Release Payment
                  </button>
                  <button className="btn btn-outline w-full gap-2">
                    <ArrowPathIcon className="w-4 h-4" />
                    Request Changes
                  </button>
                  <button className="btn w-full gap-2 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Open Dispute
                  </button>
                </div>
                <p className="text-[10px] text-base-content/40 leading-relaxed mt-3 text-center">
                  Only use this if the work does not meet the agreed requirements and direct communication fails.
                </p>
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">
                  Escrow Details
                </h2>
                <div className="space-y-2 text-sm">
                  {[
                    ["Task Funds", "2.45 ETH", "font-bold text-base-content"],
                    ["Network Fee", "0.002 ETH", "text-base-content/70"],
                    ["Total in Escrow", "2.452 ETH", "font-bold text-primary"],
                  ].map(([label, val, cls]) => (
                    <div
                      key={label}
                      className={`flex justify-between ${label === "Total in Escrow" ? "pt-2 border-t border-base-200" : ""}`}
                    >
                      <span
                        className={
                          label === "Total in Escrow" ? "font-semibold text-base-content" : "text-base-content/50"
                        }
                      >
                        {label}
                      </span>
                      <span className={cls}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
