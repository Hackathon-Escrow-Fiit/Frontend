"use client";

import { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon, PaperClipIcon, PhotoIcon, ScaleIcon, ShieldExclamationIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { Address } from "@scaffold-ui/components";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";
import type { DisputeData, OnChainJob } from "./shared";

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
  const [statement, setStatement] = useState("");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000);
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
        text: `Dispute initiated — proposed ${Number(e.args.proposedPaymentBps ?? 0) / 100}% payment to freelancer`,
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
  const hasSubmittedDefense = !!dispute?.defenseStatement;
  const votingActive = dispute && !dispute.finalized && Number(dispute.votingDeadline) > now;

  const handleSubmit = async () => {
    if (!statement.trim()) {
      notification.warning("Please write your defense statement before submitting.");
      return;
    }
    try {
      await writeContractAsync({ functionName: "submitDefense", args: [BigInt(id), statement.trim()] });
      notification.success("Defense statement submitted on-chain.");
      setStatement("");
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  return (
    <div className="flex gap-6 items-start flex-col lg:flex-row">
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-base-content mb-3">Dispute Description</h2>
          <p className="text-sm text-base-content/70 leading-relaxed">{job?.description ?? "Loading…"}</p>
        </div>

        <div id="defense-form" className="bg-base-100 border border-primary/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <ScaleIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-base-content">
                {isFreelancer ? "Write Your Defense Statement" : "Freelancer's Defense Statement"}
              </h2>
              <p className="text-xs text-base-content/50">
                {isFreelancer
                  ? "Present your evidence to the Jurors. Clearly address the client's claims."
                  : "The freelancer's response to the dispute."}
              </p>
            </div>
          </div>

          {hasSubmittedDefense ? (
            <div className="bg-success/5 border border-success/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleSolid className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-success">Defense submitted on-chain</span>
              </div>
              <p className="text-sm text-base-content/80 whitespace-pre-wrap">{dispute?.defenseStatement}</p>
            </div>
          ) : !isFreelancer ? (
            <div className="bg-base-200 rounded-xl p-4 text-sm text-base-content/50 text-center">
              No defense statement submitted yet.
            </div>
          ) : !votingActive ? (
            <div className="bg-base-200 rounded-xl p-4 text-sm text-base-content/50 text-center">
              {dispute?.finalized ? "This dispute has been finalized." : "Voting period has ended."}
            </div>
          ) : (
            <div className="border border-base-300 rounded-xl overflow-hidden">
              <textarea
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="Outline your response here…"
                rows={6}
                className="w-full px-4 py-3 text-sm bg-base-100 text-base-content placeholder:text-base-content/30 resize-none focus:outline-none"
              />
              <div className="px-4 py-3 bg-base-100 border-t border-base-200 flex items-center justify-between">
                <div className="flex items-center gap-3 text-base-content/30">
                  <button className="hover:text-base-content/60 transition-colors">
                    <PaperClipIcon className="w-5 h-5" />
                  </button>
                  <button className="hover:text-base-content/60 transition-colors">
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                </div>
                <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary btn-sm">
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Submit Evidence"}
                </button>
              </div>
            </div>
          )}
        </div>

        {timeline.length > 0 && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-5">Evidence Timeline</h2>
            <div className="flex flex-col gap-5">
              {timeline.map((item, i) => {
                const isYou = address && item.actor.toLowerCase() === address.toLowerCase();
                return (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {item.type === "dispute" ? (
                        <ShieldExclamationIcon className="w-4 h-4 text-error" />
                      ) : (
                        <ScaleIcon className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${isYou ? "text-primary" : "text-base-content"}`}>
                          {isYou
                            ? isFreelancer
                              ? "You (Freelancer)"
                              : "You (Client)"
                            : item.type === "dispute"
                              ? "Client"
                              : "Freelancer"}
                        </span>
                        <span className="text-xs text-base-content/40">Block #{item.blockNumber?.toString()}</span>
                      </div>
                      <p className="text-sm text-base-content/70">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-3">Counterparty</p>
          {job ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserGroupIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <Address address={job.client} format="short" />
                <p className="text-xs text-base-content/40 mt-0.5">Client</p>
              </div>
            </div>
          ) : (
            <div className="h-10 bg-base-200 rounded-lg animate-pulse" />
          )}
        </div>

        <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden">
          <div className="h-28 bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center">
            <DocumentTextIcon className="w-10 h-10 text-base-content/20" />
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-1">
              Project Scope Document
            </p>
            <p className="text-sm font-medium text-base-content truncate">
              {job ? `${job.title.toLowerCase().replace(/\s+/g, "_")}_scope.pdf` : "scope_document.pdf"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
