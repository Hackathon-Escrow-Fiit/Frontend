"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DisputeData, OnChainJob } from "./shared";
import { blo } from "blo";
import { formatEther } from "viem";
import { PaperClipIcon, PhotoIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const formatTimeRemaining = (deadline: bigint, now: number) => {
  const diff = Number(deadline) - now;
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
};

export const DefenseView = ({
  id,
  job,
  dispute,
  address,
}: {
  id: string;
  job: OnChainJob | null;
  dispute: DisputeData;
  address: string | undefined;
}) => {
  const existingDefense = dispute?.defenseStatement ?? "";
  const [statement, setStatement] = useState(existingDefense);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill textarea when existing defense loads from chain
  useEffect(() => {
    if (existingDefense && !statement) setStatement(existingDefense);
  }, [existingDefense]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: initiatedEvents } = useScaffoldEventHistory({
    contractName: "DAODispute",
    eventName: "DisputeInitiated",
    fromBlock: 0n,
    watch: true,
  });

  const { data: defenseEvents } = useScaffoldEventHistory({
    contractName: "DAODispute",
    eventName: "DefenseSubmitted",
    fromBlock: 0n,
    watch: true,
  });

  const timeline = useMemo(() => {
    const jobIdBig = BigInt(id);
    const initiated = (initiatedEvents ?? [])
      .filter(e => e.args.jobId === jobIdBig)
      .map(e => ({
        type: "dispute" as const,
        actor: e.args.client as string,
        text: `Submitted dispute — proposed ${Number(e.args.proposedPaymentBps ?? 0) / 100}% payment to freelancer.`,
        blockNumber: e.blockNumber,
      }));
    const defenses = (defenseEvents ?? [])
      .filter(e => e.args.jobId === jobIdBig)
      .map(e => ({
        type: "defense" as const,
        actor: e.args.freelancer as string,
        text: e.args.statement as string,
        blockNumber: e.blockNumber,
      }));
    return [...initiated, ...defenses].sort((a, b) => Number(a.blockNumber ?? 0n) - Number(b.blockNumber ?? 0n));
  }, [initiatedEvents, defenseEvents, id]);

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "DAODispute" });

  const isFreelancer = !!(address && job && job.freelancer.toLowerCase() === address.toLowerCase());
  const isFinalized = !!dispute?.finalized;

  const handleSubmit = async () => {
    if (!statement.trim()) {
      notification.warning("Please write your defense statement before submitting.");
      return;
    }
    try {
      await writeContractAsync({ functionName: "submitDefense", args: [BigInt(id), statement.trim()] });
      notification.success("Defense statement submitted on-chain.");
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  const stakeDisplay = dispute
    ? `${Number(formatEther(dispute.stakedTokens)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR`
    : "—";
  const timeDisplay = dispute ? formatTimeRemaining(dispute.votingDeadline, now) : "—";
  const voterCount = dispute ? Number(dispute.voterCount) : 0;
  const clientAddress = job?.client as `0x${string}` | undefined;

  return (
    <div className="flex gap-6 items-start flex-col lg:flex-row">
      {/* ── Left column ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Dispute Summary */}
        <div className="bg-base-100 border border-base-300 rounded-xl p-6">
          <h2 className="text-lg font-bold text-base-content mb-3">Dispute Summary</h2>
          {job && dispute ? (
            <p className="text-sm text-base-content/70 leading-relaxed">
              The client,{" "}
              <span className="font-semibold text-base-content">
                {job.client.slice(0, 6)}…{job.client.slice(-4)}
              </span>
              , has initiated a dispute regarding the{" "}
              <span className="font-semibold text-base-content">&ldquo;{job.title}&rdquo;</span> job. They have proposed
              paying{" "}
              <span className="font-semibold text-base-content">
                {(Number(dispute.proposedPaymentBps) / 100).toFixed(0)}%
              </span>{" "}
              of the escrowed amount to the freelancer, with the remaining{" "}
              <span className="font-semibold text-base-content">
                {(100 - Number(dispute.proposedPaymentBps) / 100).toFixed(0)}%
              </span>{" "}
              returned to the client.
            </p>
          ) : (
            <p className="text-sm text-base-content/70 leading-relaxed">Loading dispute details…</p>
          )}
          {job?.description && (
            <p className="text-sm text-base-content/50 leading-relaxed mt-3 pt-3 border-t border-base-200">
              {job.description}
            </p>
          )}
          <div className="border-t border-base-200 mt-5 pt-5 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Stake Amount</p>
              <p className="text-base font-bold text-primary">{stakeDisplay}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
                Time Remaining
              </p>
              <p className={`text-base font-bold ${timeDisplay === "Ended" ? "text-error" : "text-warning"}`}>
                {timeDisplay}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
                Assigned Jurors
              </p>
              <p className="text-base font-bold text-base-content">{voterCount} Verified</p>
            </div>
          </div>
        </div>

        {/* Write Defense Statement */}
        <div id="defense-form" className="bg-base-100 border-2 border-dashed border-primary/40 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <ScaleIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-base-content">Write Your Defense Statement</h2>
              <p className="text-sm text-base-content/55 leading-relaxed mt-0.5">
                This is your final opportunity to present evidence to the Jurors. Clearly address the client&apos;s
                claims and attach any relevant code snippets or performance benchmarks.
              </p>
            </div>
          </div>

          {isFinalized ? (
            <div className="bg-base-200 rounded-xl p-4 text-sm text-base-content/50 text-center">
              This dispute has been finalized — submissions are closed.
            </div>
          ) : (
            <div className="border border-base-300 rounded-xl overflow-hidden bg-base-100">
              <textarea
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="Outline your response here..."
                rows={7}
                className="w-full px-4 py-3 text-sm bg-base-100 text-base-content placeholder:text-base-content/30 resize-none focus:outline-none"
              />
              {attachments.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs border border-base-300 rounded-lg px-2.5 py-1 text-base-content/60"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="text-base-content/30 hover:text-error transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-base-200 flex items-center justify-between">
                <div className="flex items-center gap-3 text-base-content/40">
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-base-content/60 transition-colors"
                    title="Attach file"
                  >
                    <PaperClipIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="hover:text-base-content/60 transition-colors"
                    title="Attach image"
                  >
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !isFreelancer}
                  className="btn btn-primary btn-sm px-6"
                >
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Submit Evidence"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Timeline */}
        {timeline.length > 0 && (
          <div className="bg-base-100 border border-base-300 rounded-xl p-6">
            <h2 className="text-base font-bold text-base-content mb-5">Evidence Timeline</h2>
            <div className="flex flex-col gap-5">
              {timeline.map((item, i) => {
                const isYou = address && item.actor.toLowerCase() === address.toLowerCase();
                const actorLabel = isYou
                  ? isFreelancer
                    ? "You (Freelancer)"
                    : "You (Client)"
                  : item.type === "dispute"
                    ? "Client"
                    : "Freelancer";

                return (
                  <div key={i} className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blo(item.actor as `0x${string}`)}
                      alt="avatar"
                      className="w-9 h-9 rounded-full shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                        <span className={`text-sm font-semibold ${isYou ? "text-primary" : "text-base-content"}`}>
                          {actorLabel}
                        </span>
                        <span className="text-xs text-base-content/40">Block #{item.blockNumber?.toString()}</span>
                      </div>
                      <p className="text-sm text-base-content/65 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        {/* Counterparty */}
        <div className="bg-base-100 border border-base-300 rounded-xl p-5">
          <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Counterparty</p>
          {clientAddress ? (
            <div className="flex items-center gap-3 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={blo(clientAddress)} alt="client" className="w-11 h-11 rounded-full shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-base-content truncate">
                    {clientAddress.slice(0, 6)}…{clientAddress.slice(-4)}
                  </span>
                  <CheckCircleSolid className="w-4 h-4 text-primary shrink-0" />
                </div>
                <p className="text-xs text-base-content/50">Enterprise Client • 98% Success</p>
              </div>
            </div>
          ) : (
            <div className="h-14 bg-base-200 rounded-lg animate-pulse mb-3" />
          )}
          <div className="flex items-center justify-between border border-base-200 rounded-lg px-3 py-2">
            <span className="text-xs text-base-content/50">Total Disputes</span>
            <span className="text-sm font-bold text-warning">2</span>
          </div>
        </div>

        {/* Project Scope Document */}
        <div className="bg-base-100 border border-base-300 rounded-xl overflow-hidden">
          <div className="h-36 bg-gradient-to-br from-base-200 via-base-300 to-base-200 flex items-center justify-center">
            <div className="w-20 h-28 bg-base-100 rounded shadow-md border border-base-300 p-2 flex flex-col gap-1.5 rotate-2">
              <div className="h-1.5 bg-base-300 rounded w-3/4" />
              <div className="h-1 bg-base-200 rounded w-full" />
              <div className="h-1 bg-base-200 rounded w-5/6" />
              <div className="h-1 bg-base-200 rounded w-4/5" />
              <div className="h-1.5 bg-base-300 rounded w-2/3 mt-1" />
              <div className="h-1 bg-base-200 rounded w-full" />
              <div className="h-1 bg-base-200 rounded w-3/4" />
              <div className="h-1 bg-base-200 rounded w-5/6" />
            </div>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
              Project Scope Document
            </p>
            <p className="text-sm font-semibold text-base-content truncate">
              {job ? `${job.title.toLowerCase().replace(/\s+/g, "_")}_v2.pdf` : "scope_document.pdf"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
