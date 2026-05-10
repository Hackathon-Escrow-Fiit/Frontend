"use client";

import { useParams } from "next/navigation";
import { DisputeHeader, useDisputeData } from "../_components/shared";
import { useAccount } from "wagmi";
import { useReadContracts } from "wagmi";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

type Solution = {
  proposer: `0x${string}`;
  paymentBps: bigint;
  description: string;
  totalWeight: bigint;
  voterCount: bigint;
};

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { job, dispute } = useDisputeData(id);
  const isFreelancer = !!(address && job && job.freelancer.toLowerCase() === address.toLowerCase());

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "DAODispute" });
  const solutionCount = dispute?.solutionCount ? Number(dispute.solutionCount) : 0;
  const jobIdBig = /^\d+$/.test(id) ? BigInt(id) : 0n;

  const { data: solutionsRaw } = useReadContracts({
    contracts: Array.from({ length: solutionCount }, (_, i) => ({
      address: contractInfo?.address,
      abi: contractInfo?.abi as any,
      functionName: "getSolution" as const,
      args: [jobIdBig, BigInt(i)] as const,
    })),
    query: { enabled: !!contractInfo && solutionCount > 0 },
  });

  const solutions: (Solution | null)[] = (solutionsRaw ?? []).map(r => {
    if (!r || r.status !== "success" || !r.result) return null;
    const [proposer, paymentBps, description, totalWeight, voterCount] = r.result as [
      `0x${string}`,
      bigint,
      string,
      bigint,
      bigint,
    ];
    return { proposer, paymentBps, description, totalWeight, voterCount };
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "DAODispute" });

  const votingOver = dispute && Number(dispute.votingDeadline) < Math.floor(Date.now() / 1000);
  const canFinalize = !!dispute && votingOver && !dispute.finalized;

  const totalWeight = solutions.reduce((sum, s) => sum + (s?.totalWeight ?? 0n), 0n);
  const winningSolutionIndex = dispute ? Number(dispute.winningSolutionIndex) : 0;
  const winningSolution = solutions[winningSolutionIndex] ?? null;

  const handleFinalize = async () => {
    try {
      await writeContractAsync({ functionName: "finalizeDispute", args: [jobIdBig] });
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
          {/* All solutions vote tally */}
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-4">Vote Tally by Proposal</h2>
            {solutionCount === 0 ? (
              <p className="text-sm text-base-content/50 text-center py-4">Loading proposals…</p>
            ) : (
              <div className="flex flex-col gap-4">
                {solutions.map((solution, i) => {
                  if (!solution) return null;
                  const pct = totalWeight > 0n ? Number((solution.totalWeight * 100n) / totalWeight) : 0;
                  const isWinner = dispute?.finalized && i === winningSolutionIndex;

                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-3 border ${isWinner ? "border-primary/40 bg-primary/5" : "border-base-200"}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-medium ${isWinner ? "text-primary" : "text-base-content"}`}>
                          {i === 0 ? "Client's Proposal" : `Proposal #${i + 1}`}{" "}
                          {isWinner && <span className="text-xs badge badge-primary badge-sm ml-1">Winner</span>}
                          <span className="text-base-content/60 ml-1">
                            — {(Number(solution.paymentBps) / 100).toFixed(0)}% to freelancer
                          </span>
                        </span>
                        <span className="text-base-content/50 font-mono text-xs">
                          {solution.totalWeight.toString()} wt
                        </span>
                      </div>
                      <div className="h-2.5 bg-base-200 rounded-full overflow-hidden mb-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-primary" : "bg-base-content/20"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-base-content/40">
                        <span>
                          {solution.voterCount.toString()} voter{solution.voterCount !== 1n ? "s" : ""}
                        </span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-base-content/40 text-center">
                  {dispute?.totalVoterCount.toString() ?? "0"} juror
                  {dispute?.totalVoterCount !== 1n ? "s" : ""} voted in total
                </p>
              </div>
            )}
          </div>

          {/* Outcome */}
          {dispute?.finalized ? (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6">
              <p className="text-[10px] font-bold tracking-widest uppercase text-base-content/40 mb-1">Outcome</p>
              {winningSolution ? (
                <p className="text-xl font-bold text-primary">
                  {winningSolution.totalWeight === 0n
                    ? "No votes cast — full payment released to freelancer"
                    : `Winning proposal: ${(Number(winningSolution.paymentBps) / 100).toFixed(0)}% of escrow to freelancer`}
                </p>
              ) : (
                <p className="text-xl font-bold text-primary">Full payment released to freelancer</p>
              )}
              {winningSolution && winningSolution.totalWeight > 0n && (
                <p className="text-sm text-base-content/60 mt-2">{winningSolution.description}</p>
              )}
            </div>
          ) : canFinalize ? (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
              <p className="text-sm text-base-content/60 mb-4">
                Voting period has ended. Anyone can finalize this dispute to distribute the funds according to the
                winning proposal.
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
