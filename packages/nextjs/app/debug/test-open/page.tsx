"use client";

import { useRef, useState } from "react";
import { formatEther } from "viem";
import { ChevronDownIcon, CloudArrowUpIcon, ExclamationCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

const MOCK_JOB = {
  id: 1n,
  title: "GraphQL API Integration",
  budget: 4500000000000000000n, // 4.5 NXR
};

const MOCK_STAKE = "10";

const FileDisputeModal = ({ onClose }: { onClose: () => void }) => {
  const [resolution, setResolution] = useState<"split" | "refund">("split");
  const [freelancerPct, setFreelancerPct] = useState(50);
  const [statement, setStatement] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const clientPct = 100 - freelancerPct;

  const handleSubmit = () => {
    if (statement.trim().length < 50) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
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
              Formal arbitration for Task #{MOCK_JOB.id.toString()}: {MOCK_JOB.title}
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
                {MOCK_JOB.title} (
                {Number(formatEther(MOCK_JOB.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR)
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
                To prevent spam, a <span className="text-primary font-semibold">{MOCK_STAKE} NXR stake</span> is
                required to open a dispute. This stake is returned if the case is won or settled amicably.
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
            disabled={submitted || statement.trim().length < 50}
            className="btn btn-primary flex-1"
          >
            {submitted && <span className="loading loading-spinner loading-xs" />}
            {submitted ? "Submitting…" : "Stake & Submit Dispute"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TestOpenDisputePage() {
  const [open, setOpen] = useState(true);

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2 text-xs text-warning font-medium">
          Test page — not connected to blockchain
        </div>
        <h1 className="text-xl font-bold text-base-content">File a Dispute — UI Preview</h1>
        <p className="text-sm text-base-content/50">Uses mock data. No transaction will be sent.</p>
        <button onClick={() => setOpen(true)} className="btn btn-primary">
          Open Dispute Modal
        </button>
      </div>
      {open && <FileDisputeModal onClose={() => setOpen(false)} />}
    </AppLayout>
  );
}
