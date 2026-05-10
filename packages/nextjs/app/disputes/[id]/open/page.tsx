"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import type { OnChainJob } from "../_components/shared";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, ExclamationTriangleIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

export default function OpenDisputePage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const router = useRouter();

  const [proposedPct, setProposedPct] = useState(0);
  const [reason, setReason] = useState("");

  const { data: rawJob } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [BigInt(id)],
  });

  const job = rawJob ? (rawJob as unknown as OnChainJob) : null;
  const isClient = !!(address && job && job.client.toLowerCase() === address.toLowerCase());

  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "JobMarketplace",
  });

  const handleSubmit = async () => {
    if (!isClient) {
      notification.error("Only the client can open a dispute.");
      return;
    }
    if (reason.trim().length < 20) {
      notification.warning("Please describe the issue before submitting.");
      return;
    }
    try {
      const proposedPaymentBps = BigInt(proposedPct * 100);
      await writeContractAsync({
        functionName: "initiateDAODispute",
        args: [BigInt(id), proposedPaymentBps],
      });
      notification.success("Dispute opened. The freelancer may now submit a defense.");
      router.push(`/disputes/${id}/defense`);
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/my-tasks"
            className="flex items-center gap-1.5 text-sm text-base-content/50 hover:text-base-content transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to My Tasks
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 text-error" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-base-content">Open DAO Dispute</h1>
            <p className="text-xs text-base-content/40 font-mono mt-0.5">{job?.title ?? `Job #${id}`}</p>
          </div>
        </div>

        <div className="bg-warning/8 border border-warning/25 rounded-2xl p-4 mb-5 text-sm text-warning">
          <p className="font-semibold mb-1">Before opening a dispute</p>
          <p className="text-warning/80 text-xs leading-relaxed">
            Opening a dispute escalates the case to DAO jurors. Use this only if direct communication with the
            freelancer has failed. The freelancer will have a chance to submit a defense before voting begins.
          </p>
        </div>

        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 mb-4">
          <h2 className="text-base font-semibold text-base-content mb-1">
            What percentage should the freelancer receive?
          </h2>
          <p className="text-xs text-base-content/50 mb-5">
            0% means full refund to you. 100% means full payment to the freelancer.
          </p>

          <div className="flex items-center gap-4 mb-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={proposedPct}
              onChange={e => setProposedPct(Number(e.target.value))}
              className="range range-error flex-1"
            />
            <div className="w-16 text-center">
              <span className="text-2xl font-bold text-base-content">{proposedPct}</span>
              <span className="text-sm text-base-content/40">%</span>
            </div>
          </div>

          <div className="flex justify-between text-xs text-base-content/40 px-1">
            <span>Full refund to you</span>
            <span>Full pay to freelancer</span>
          </div>
        </div>

        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 mb-5">
          <h2 className="text-base font-semibold text-base-content mb-1">Describe the issue</h2>
          <p className="text-xs text-base-content/50 mb-3">
            Explain why the delivered work does not meet the agreed requirements. This will be visible to jurors.
          </p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe the problem clearly. Reference specific deliverables or milestones that were not met…"
            rows={5}
            className="w-full px-4 py-3 text-sm bg-base-200 rounded-xl text-base-content placeholder:text-base-content/30 resize-none focus:outline-none focus:ring-1 focus:ring-error/40"
          />
          <p className="text-[10px] text-base-content/30 text-right mt-1">{reason.length} chars</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/my-tasks" className="btn btn-outline flex-1">
            Cancel
          </Link>
          <button onClick={handleSubmit} disabled={isPending || !isClient} className="btn btn-error flex-1 gap-2">
            {isPending ? <span className="loading loading-spinner loading-xs" /> : <ScaleIcon className="w-4 h-4" />}
            Open Dispute
          </button>
        </div>

        {address && !isClient && (
          <p className="text-xs text-error/70 text-center mt-3">Only the client of this job can open a dispute.</p>
        )}
      </div>
    </AppLayout>
  );
}
