"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BoltIcon,
  BookmarkIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

const deliverables = [
  "Interactive Portfolio Visualization",
  "Smart Contract Execution Layer",
  "Custom Notification Engine",
  "Admin Analytics Suite",
];

const requirements = [
  "Integration with The Graph for historical on-chain data retrieval.",
  "Real-time price feeds via Chainlink or Pyth Network.",
  "Responsive UI built with Next.js 14 and Tailwind CSS.",
  "Wallet integration supporting MetaMask, Coinbase Wallet, and WalletConnect.",
  "Optimized for performance with < 100ms interface latency.",
];

const expertise = [
  "Solidity",
  "React / Next.js",
  "Web3.js",
  "Data Visualization",
  "UI/UX Design",
  "DeFi Protocol Architecture",
];

export default function BrowseTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [price, setPrice] = useState("12500");
  const [delivery, setDelivery] = useState("");
  const [pitch, setPitch] = useState("");
  const [saved, setSaved] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(localStorage.getItem("dw_role") === "client");
  }, []);

  const pitchLeft = 300 - pitch.length;

  return (
    <AppLayout>
      <div className="p-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-5">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Browse
        </Link>

        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-3xl font-bold text-base-content mb-2">Next-Gen DeFi Dashboard</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-base-content">vitalik.eth</span>
              <CheckCircleSolid className="w-4 h-4 text-primary" />
              <span className="text-base-content/30">•</span>
              <span className="text-warning">★</span>
              <span className="font-medium text-base-content">4.9</span>
              <span className="text-base-content/50">(124 reviews)</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Status</p>
            <span className="bg-base-200 text-base-content/70 text-xs font-semibold px-3 py-1.5 rounded-full border border-base-300">
              Open for Bidding
            </span>
          </div>
        </div>

        <div className="flex gap-5 items-start mt-6">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* TSD card */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DocumentTextIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-base-content">Task Specification Document (TSD)</h2>
              </div>

              <p className="text-sm text-base-content/70 leading-relaxed mb-5">
                We are looking for an elite full-stack developer or small agency to build a high-performance, real-time
                DeFi dashboard. The system must aggregate data from multiple chains (Ethereum, Arbitrum, Optimism) and
                provide a seamless interface for portfolio tracking, liquidity provision, and cross-chain swaps.
              </p>

              <h3 className="font-semibold text-base-content mb-3">Technical Requirements</h3>
              <ul className="space-y-2 mb-6">
                {requirements.map(req => (
                  <li key={req} className="flex items-start gap-2 text-sm text-base-content/70">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-base-content/40 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>

              <div className="border border-base-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleIcon className="w-4 h-4 text-base-content/50" />
                  <p className="text-sm font-semibold text-base-content">Core Deliverables</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {deliverables.map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <CheckCircleSolid className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm text-base-content/70">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bid form — freelancer only */}
            {!isClient && (
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-base-content">Submit Your Bid</h2>
                  </div>
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                    6 bids submitted so far
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-base-content mb-1.5 block">Proposed Price (USD)</label>
                    <div className="flex items-center border border-base-300 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                      <span className="px-3 text-base-content/50 text-sm border-r border-base-300 py-2.5">$</span>
                      <input
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-base-content"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-base-content mb-1.5 block">Delivery Estimate</label>
                    <div className="flex items-center border border-base-300 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                      <input
                        type="text"
                        value={delivery}
                        onChange={e => setDelivery(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30"
                        placeholder="e.g. 4 weeks"
                      />
                      <span className="px-3 text-base-content/40">
                        <CalendarDaysIcon className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-base-content">Short Pitch</label>
                    <span className={`text-xs ${pitchLeft < 50 ? "text-error" : "text-base-content/40"}`}>
                      Max {pitchLeft} characters
                    </span>
                  </div>
                  <textarea
                    value={pitch}
                    onChange={e => e.target.value.length <= 300 && setPitch(e.target.value)}
                    rows={5}
                    className="w-full border border-base-300 rounded-xl px-4 py-3 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30 resize-none focus:border-primary transition-colors"
                    placeholder="Briefly describe why you are the best fit for this DeFi project..."
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => router.push(`/browse/${id}/submitted`)} className="btn btn-primary flex-1">
                    Submit Application
                  </button>
                  <button
                    onClick={() => setSaved(s => !s)}
                    className={`btn btn-outline btn-square w-12 ${saved ? "btn-primary" : ""}`}
                  >
                    <BookmarkIcon className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-64 shrink-0 space-y-4">
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                Project Summary
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <BoltIcon className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Complexity</p>
                    <p className="text-sm font-bold text-base-content">High</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CurrencyDollarIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Budget Range</p>
                    <p className="text-sm font-bold text-base-content">$10k – $15k</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <UserGroupIcon className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-base-content/40">Applicants</p>
                    <p className="text-sm font-bold text-base-content">6 Professional Bids</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                Client Identity
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                  <span className="text-sm font-bold text-primary">V</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-base-content">vitalik.eth</span>
                    <CheckCircleSolid className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] text-base-content/40">Joined October 2021</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-base-content/50">Identity Verification</span>
                  <span className="font-semibold text-warning">Verified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/50">Payment Status</span>
                  <span className="font-semibold text-warning">Escrow Funded</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/50">Avg. Response Time</span>
                  <span className="font-semibold text-base-content">2 hours</span>
                </div>
              </div>
            </div>

            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widests text-base-content/40 uppercase mb-3">
                Required Expertise
              </p>
              <div className="flex flex-wrap gap-2">
                {expertise.map(tag => (
                  <span
                    key={tag}
                    className="text-xs border border-base-300 text-base-content/70 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
