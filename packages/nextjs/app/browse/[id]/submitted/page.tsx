"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, CheckCircleIcon, LockClosedIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

const activityLog = [
  { label: "Bid Posted", time: "Today, 2:45 PM", color: "bg-primary" },
  { label: "Task Viewed", time: "Today, 10:12 AM", color: "bg-base-300" },
  { label: "Escrow Funded", time: "Oct 24, 4:30 PM", color: "bg-base-300" },
];

export default function BidSubmittedPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppLayout>
      <div className="p-6">
        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Search
        </Link>

        {/* Title */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest text-base-content/40 uppercase mb-1">Task Detail</p>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-base-content">Smart Contract Security Audit: Liquidity Protocol</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error shrink-0">
              High Priority
            </span>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Task description */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <h2 className="font-bold text-base-content mb-3 flex items-center gap-2">
                <span className="w-2 h-4 rounded-full bg-primary inline-block" />
                Task Description
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed mb-4">
                Comprehensive security audit required for a newly developed automated market maker (AMM) protocol. The
                scope includes reviewing core vault logic, flash loan protection mechanisms, and governance timelock
                implementations. We are looking for an experienced security researcher with a track record in DeFi
                protocols.
              </p>
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                    Technical Specifications
                  </p>
                  <div className="space-y-1.5">
                    {["Solidity 0.8.20+", "Foundry Testing Suite", "OpenZeppelin Standards"].map(spec => (
                      <div key={spec} className="flex items-center gap-2">
                        <CheckCircleSolid className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-primary font-medium">{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-base-200 rounded-xl p-4 text-center min-w-40">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
                    Total Budget
                  </p>
                  <p className="text-xl font-bold text-base-content">4,500 USDC</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <LockClosedIcon className="w-3 h-3 text-base-content/40" />
                    <span className="text-[10px] text-base-content/40">Funds Secured in Escrow</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Your bid */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5 relative">
              <div className="absolute top-4 right-4">
                <span className="bg-primary text-primary-content text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircleIcon className="w-3 h-3" />
                  Bid Posted
                </span>
              </div>

              <h2 className="font-bold text-base-content mb-4">Your Bid</h2>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">A</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-base-content">auditmaster.eth</span>
                    <CheckCircleSolid className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-base-content/50">Expert Smart Contract Auditor • 98% Success Rate</p>
                </div>
              </div>

              <div className="bg-base-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-base-content/70 italic leading-relaxed">
                  &ldquo;I have reviewed the scope and can deliver a comprehensive report within 7 days. My experience
                  includes auditing protocols like Aave and Yearn. I will provide both a PDF summary and a detailed
                  GitHub issue tracking for all findings.&rdquo;
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-base-content/40 mb-0.5">Bid Amount</p>
                    <p className="font-bold text-base-content">4,200 USDC</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/40 mb-0.5">Delivery</p>
                    <p className="font-bold text-base-content">7 Days</p>
                  </div>
                </div>
                <Link href={`/browse/${id}`} className="btn btn-outline btn-sm gap-2">
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit My Bid
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-56 shrink-0 space-y-3">
            {/* Escrow status */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-4">
              <p className="text-[10px] font-bold tracking-widest text-base-content/50 uppercase mb-3">Escrow Status</p>
              <div className="bg-warning/10 rounded-xl p-3 flex items-start gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
                  <LockClosedIcon className="w-3.5 h-3.5 text-warning" />
                </div>
                <div>
                  <p className="text-xs font-bold text-warning">Funds Funded</p>
                  <p className="text-[11px] text-base-content/60 mt-0.5">4,500 USDC locked in contract</p>
                </div>
              </div>
              <p className="text-[11px] text-primary leading-relaxed">
                Payment is automatically handled by the DecentraWork Escrow. Funds are released only upon your
                satisfaction or completion of milestones.
              </p>
            </div>

            {/* Activity log */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-4">
              <p className="text-[10px] font-bold tracking-widest text-base-content/50 uppercase mb-3">Activity Log</p>
              <div className="space-y-0">
                {activityLog.map(({ label, time, color }, i) => (
                  <div key={label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${color}`} />
                      {i < activityLog.length - 1 && <div className="w-px flex-1 bg-base-200 my-1 min-h-3" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-medium text-base-content">{label}</p>
                      <p className="text-[10px] text-base-content/40 mt-0.5">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Need help */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-4">
              <p className="text-xs font-bold text-base-content mb-1">Need Help?</p>
              <p className="text-[11px] text-base-content/55 leading-relaxed mb-3">
                Our support team is available 24/7 for any disputes or technical issues.
              </p>
              <button className="btn btn-outline btn-xs w-full">Contact Support</button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
