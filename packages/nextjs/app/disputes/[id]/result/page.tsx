"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";
import { DisputeHeader, useDisputeData } from "../_components/shared";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { job, dispute } = useDisputeData(id);
  const isFreelancer = !!(address && job && job.freelancer.toLowerCase() === address.toLowerCase());

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "DAODispute" });

  const votingOver = dispute && Number(dispute.votingDeadline) < Math.floor(Date.now() / 1000);
  const canFinalize = !!dispute && votingOver && !dispute.finalized;

  const totalWeight = dispute ? dispute.forWeight + dispute.againstWeight : 0n;
  const forPct = totalWeight > 0n ? Number((dispute!.forWeight * 100n) / totalWeight) : 0;
  const againstPct = totalWeight > 0n ? Number((dispute!.againstWeight * 100n) / totalWeight) : 0;
  const clientWon = dispute && dispute.forWeight >= dispute.againstWeight;

  const handleFinalize = async () => {
    try {
      await writeContractAsync({ functionName: "finalizeDispute", args: [BigInt(id)] });
      notification.success("Dispute finalized — funds distributed.");
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full">
        <DisputeHeader id={id} view="result" job={job} dispute={dispute} isFreelancer={isFreelancer} />

        <div className="max-w-2xl flex flex-col gap-5">
          {/* Vote tally */}
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-4">Final Vote Tally</h2>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-warning">For Client ({forPct}%)</span>
                  <span className="text-base-content/50 font-mono">{dispute?.forWeight.toString() ?? "0"} weight</span>
                </div>
                <div className="h-3 bg-base-200 rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: `${forPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-success">Full Pay to Freelancer ({againstPct}%)</span>
                  <span className="text-base-content/50 font-mono">{dispute?.againstWeight.toString() ?? "0"} weight</span>
                </div>
                <div className="h-3 bg-base-200 rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${againstPct}%` }} />
                </div>
              </div>
              <p className="text-xs text-base-content/40 text-center">
                {dispute?.voterCount.toString() ?? "0"} juror{dispute?.voterCount !== 1n ? "s" : ""} voted
              </p>
            </div>
          </div>

          {/* Outcome */}
          {dispute?.finalized ? (
            <div className={`rounded-2xl border p-6 ${clientWon ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30"}`}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-base-content/40 mb-1">Outcome</p>
              <p className={`text-xl font-bold ${clientWon ? "text-warning" : "text-success"}`}>
                {clientWon
                  ? `Client's proposal accepted — freelancer receives ${(Number(dispute.proposedPaymentBps) / 100).toFixed(0)}% of escrow`
                  : "Freelancer wins — full escrow released"}
              </p>
            </div>
          ) : canFinalize ? (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
              <p className="text-sm text-base-content/60 mb-4">
                Voting period has ended. Anyone can finalize this dispute to distribute the funds.
              </p>
              <button className="btn btn-primary w-full" onClick={handleFinalize} disabled={isPending}>
                {isPending ? <span className="loading loading-spinner loading-sm" /> : "Finalize Dispute"}
              </button>
            </div>
          ) : (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 text-sm text-base-content/50 text-center">
              {!dispute ? "Loading…" : "Voting is still in progress."}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
