"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CpuChipIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

const CATEGORIES = [
  "Smart Contract Security",
  "DeFi Development",
  "NFT / Digital Art",
  "Frontend Development",
  "Backend Development",
  "UI / UX Design",
  "Technical Writing",
];

const CRITERIA = [
  {
    title: "Full Vulnerability Assessment",
    desc: "Comprehensive scan for reentrancy, overflow, and logic flaws.",
  },
  {
    title: "Gas Optimization Report",
    desc: "Detailed recommendations to reduce deployment and execution costs.",
  },
];

const PostTaskPage = () => {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-base-content mb-1">Post a New Task</h1>
            <p className="text-sm text-base-content/50">Define your requirements and find the perfect freelancer.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-base-content/40 mt-1 shrink-0">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Auto-saved 1 min ago</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-base-content">Task Title</label>
              <input
                type="text"
                className="input input-bordered w-full"
                defaultValue="Solidity Smart Contract Audit: Liquidity Protocol"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-base-content">Category</label>
              <select className="select select-bordered w-full" defaultValue="Smart Contract Security">
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">Budget</label>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" className="input input-bordered w-full" defaultValue="USDC 2500" />
              <input type="text" className="input input-bordered w-full" placeholder="ETH 0.00" />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">Detailed Description</label>
            <textarea
              className="textarea textarea-bordered w-full resize-none"
              rows={6}
              defaultValue={`We are looking for a comprehensive security audit of our new Liquidity Protocol smart contracts. The audit should focus on potential reentrancy vulnerabilities, access control, and gas efficiency optimizations.\n\nThe codebase consists of ~800 SLOC across 4 main contracts.`}
            />
          </div>

          {/* Critical Acceptance Criteria */}
          <div className="border border-base-300 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardDocumentListIcon className="w-5 h-5 text-base-content/60" />
              <h2 className="font-semibold text-base-content">Critical Acceptance Criteria</h2>
            </div>
            <div className="space-y-3">
              {CRITERIA.map(item => (
                <div key={item.title} className="flex items-start gap-3 bg-base-200 rounded-lg px-4 py-3">
                  <CheckCircleIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-base-content">{item.title}</p>
                    <p className="text-xs text-base-content/50 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 pb-8">
            <button className="btn btn-primary">Fund Escrow</button>
            <button className="btn btn-outline">Save Draft</button>
            <span className="ml-auto text-sm text-base-content/50">Estimated Escrow Fee: 12.50 USDC</span>
          </div>
        </div>
      </div>

      {/* AI Co-Pilot */}
      {copilotOpen ? (
        <div className="fixed bottom-6 right-6 w-80 bg-base-100 rounded-2xl shadow-2xl border border-base-300 z-50 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 bg-primary text-primary-content px-4 py-3">
            <CpuChipIcon className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm flex-1">AI Co-Pilot</span>
            <button onClick={() => setCopilotOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <div className="bg-base-200 rounded-xl px-4 py-3 text-sm text-base-content/80 leading-relaxed">
              I&apos;ve suggested 2 critical criteria based on your description. Would you like me to add an &quot;On-chain
              Report Verification&quot; requirement?
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <input
              type="text"
              placeholder="Ask anything..."
              className="input input-bordered input-sm flex-1 text-sm"
            />
            <button className="btn btn-primary btn-sm btn-square">
              <PaperAirplaneIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-primary-content rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 transition-opacity z-50"
        >
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error rounded-full border-2 border-base-100" />
          <CpuChipIcon className="w-6 h-6" />
        </button>
      )}
    </AppLayout>
  );
};

export default PostTaskPage;
