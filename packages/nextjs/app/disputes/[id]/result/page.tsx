"use client";

import { useParams } from "next/navigation";
import { DisputeHeader, useDisputeData } from "../_components/shared";
import { Address } from "@scaffold-ui/components";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { CheckCircleIcon, ScaleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { job, dispute } = useDisputeData(id);

  const isFreelancer = !!(address && job && job.freelancer.toLowerCase() === address.toLowerCase());
  const isClient = !!(address && job && job.client.toLowerCase() === address.toLowerCase());

  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "DAODispute",
  });

  const handleFinalize = async () => {
    try {
      await writeContractAsync({ functionName: "finalizeDispute", args: [BigInt(id)] });
      notification.success("Dispute finalized. Funds have been released.");
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  const totalWeight = dispute ? dispute.forWeight + dispute.againstWeight : 0n;
  const forPct = totalWeight > 0n ? Number((dispute!.forWeight * 100n) / totalWeight) : 0;
  const againstPct = totalWeight > 0n ? Number((dispute!.againstWeight * 100n) / totalWeight) : 0;

  // forWeight = votes supporting client's proposal (partial/no pay)
  // againstWeight = votes for full freelancer payment
  const clientWon = forPct >= againstPct;

  const budgetEth = job ? Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—";

  const freelancerReceivesPct = dispute ? Number(dispute.proposedPaymentBps) / 100 : 0;
  const clientReceivesPct = 100 - freelancerReceivesPct;

  const votingEnded = dispute ? Number(dispute.votingDeadline) < Math.floor(Date.now() / 1000) : false;

  const canFinalize = votingEnded && !dispute?.finalized;
  const isParty = isClient || isFreelancer;

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full">
        <DisputeHeader id={id} view="result" job={job} dispute={dispute} isFreelancer={isFreelancer} />

        <div className="flex gap-6 items-start flex-col lg:flex-row">
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Status banner */}
            {!votingEnded ? (
              <div className="bg-warning/8 border border-warning/25 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                  <ScaleIcon className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="font-bold text-warning text-base">Voting Still in Progress</p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    The final result will appear here once the voting deadline passes.
                  </p>
                </div>
              </div>
            ) : dispute?.finalized ? (
              <div
                className={`rounded-2xl border p-5 flex items-center gap-4 ${
                  clientWon ? "bg-warning/8 border-warning/25" : "bg-success/8 border-success/25"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    clientWon ? "bg-warning/15" : "bg-success/15"
                  }`}
                >
                  {clientWon ? (
                    <XCircleIcon className="w-6 h-6 text-warning" />
                  ) : (
                    <CheckCircleIcon className="w-6 h-6 text-success" />
                  )}
                </div>
                <div>
                  <p className={`font-bold text-base ${clientWon ? "text-warning" : "text-success"}`}>
                    {clientWon ? "DAO Sided with Client" : "DAO Sided with Freelancer"}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    Funds have been released according to the DAO decision.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ScaleIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base-content text-base">Voting Ended — Awaiting Finalization</p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    Anyone can trigger finalization to release the funds.
                  </p>
                </div>
                <button onClick={handleFinalize} disabled={isPending} className="btn btn-primary btn-sm shrink-0">
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Finalize & Release"}
                </button>
              </div>
            )}

            {/* Vote breakdown */}
            {(votingEnded || dispute?.finalized) && totalWeight > 0n && (
              <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-base-content mb-4">DAO Vote Breakdown</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-warning">For Client&apos;s Proposal</span>
                      <span className="font-bold text-warning">{forPct}%</span>
                    </div>
                    <div className="h-4 bg-base-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning rounded-full transition-all duration-700"
                        style={{ width: `${forPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-base-content/40 mt-1">{dispute?.forWeight.toString()} weight</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-success">Full Pay to Freelancer</span>
                      <span className="font-bold text-success">{againstPct}%</span>
                    </div>
                    <div className="h-4 bg-base-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all duration-700"
                        style={{ width: `${againstPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-base-content/40 mt-1">{dispute?.againstWeight.toString()} weight</p>
                  </div>
                  <p className="text-xs text-base-content/40 text-center">
                    {dispute?.voterCount.toString()} juror{dispute?.voterCount !== 1n ? "s" : ""} participated
                  </p>
                </div>
              </div>
            )}

            {/* Payout breakdown */}
            {(votingEnded || dispute?.finalized) && (
              <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-base-content mb-4">Final Payout</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-base-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                      Freelancer Receives
                    </p>
                    <p className="text-2xl font-bold text-success">{freelancerReceivesPct}%</p>
                    {job && <p className="text-xs text-base-content/40 mt-1">of {budgetEth} ETH</p>}
                  </div>
                  <div className="bg-base-200 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                      Client Refunded
                    </p>
                    <p className="text-2xl font-bold text-warning">{clientReceivesPct}%</p>
                    {job && <p className="text-xs text-base-content/40 mt-1">of {budgetEth} ETH</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Receive funds CTA — shown to both parties after finalization */}
            {dispute?.finalized && isParty && (
              <div
                className={`rounded-2xl border p-5 ${
                  (isFreelancer && !clientWon) || (isClient && clientWon)
                    ? "bg-primary/8 border-primary/25"
                    : "bg-base-200 border-base-300"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-base-content">
                      {(isFreelancer && !clientWon) || (isClient && clientWon)
                        ? "Your funds are ready"
                        : "Funds have been sent"}
                    </p>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {(isFreelancer && !clientWon) || (isClient && clientWon)
                        ? "The DAO decision has been executed on-chain."
                        : "The counterparty received funds per the DAO verdict."}
                    </p>
                  </div>
                  {((isFreelancer && !clientWon) || (isClient && clientWon)) && (
                    <button className="btn btn-primary shrink-0">Receive Funds</button>
                  )}
                </div>
              </div>
            )}

            {/* Non-finalized party view with finalize button */}
            {canFinalize && isParty && (
              <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-base-content">Ready to release funds</p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    Finalize the dispute to execute the DAO verdict and release escrow.
                  </p>
                </div>
                <button onClick={handleFinalize} disabled={isPending} className="btn btn-primary shrink-0">
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Receive Funds"}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-3">
                Dispute Parties
              </p>
              {job ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                      <XCircleIcon className="w-4 h-4 text-error" />
                    </div>
                    <div className="min-w-0">
                      <Address address={job.client} format="short" />
                      <p className="text-xs text-base-content/40">Client</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ScaleIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Address address={job.freelancer} format="short" />
                      <p className="text-xs text-base-content/40">Freelancer</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-16 bg-base-200 rounded-lg animate-pulse" />
              )}
            </div>

            <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-3">
                Dispute Status
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`badge badge-sm font-semibold ${dispute?.finalized ? "badge-success" : "badge-warning"}`}
                >
                  {dispute?.finalized ? "Finalized" : votingEnded ? "Pending Finalization" : "Active"}
                </span>
              </div>
              <p className="text-xs text-base-content/50 mt-2">
                {dispute?.voterCount.toString() ?? "0"} jurors participated in this case.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
