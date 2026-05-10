"use client";

import { useState } from "react";
import type { DisputeData, OnChainJob } from "./shared";
import { Address } from "@scaffold-ui/components";
import { useReadContracts } from "wagmi";
import { CheckCircleIcon, ScaleIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

type Solution = {
  proposer: `0x${string}`;
  paymentBps: bigint;
  description: string;
  totalWeight: bigint;
  voterCount: bigint;
};

export const VoteView = ({
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
  const jobIdBig = /^\d+$/.test(id) ? BigInt(id) : 0n;
  const [selectedSolution, setSelectedSolution] = useState<number | null>(null);
  const [suggestPayment, setSuggestPayment] = useState("50");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [showSuggestForm, setShowSuggestForm] = useState(false);

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "DAODispute" });
  const solutionCount = dispute?.solutionCount ? Number(dispute.solutionCount) : 0;

  const { data: solutionsRaw, refetch: refetchSolutions } = useReadContracts({
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

  const { data: hasVoted, refetch: refetchHasVoted } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "hasVoted",
    args: [jobIdBig, address as `0x${string}`],
    query: { enabled: !!address },
  });

  const { data: votedForSolution } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "votedForSolution",
    args: [jobIdBig, address as `0x${string}`],
    query: { enabled: !!address && !!hasVoted },
  });

  const { data: voteWeight } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "calculateVoteWeight",
    args: [address as `0x${string}`, jobIdBig],
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "DAODispute" });

  const isParticipant =
    address &&
    job &&
    (job.client.toLowerCase() === address.toLowerCase() || job.freelancer.toLowerCase() === address.toLowerCase());

  const votingOpen = dispute && !dispute.finalized && Number(dispute.votingDeadline) > Math.floor(Date.now() / 1000);

  const totalWeight = solutions.reduce((sum, s) => sum + (s?.totalWeight ?? 0n), 0n);

  const handleVote = async () => {
    if (selectedSolution === null) {
      notification.warning("Please select a proposal to vote for.");
      return;
    }
    try {
      await writeContractAsync({ functionName: "vote", args: [jobIdBig, BigInt(selectedSolution)] });
      notification.success("Vote cast successfully.");
      refetchHasVoted();
      refetchSolutions();
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  const handleSuggest = async () => {
    const pct = parseFloat(suggestPayment);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      notification.warning("Payment percentage must be between 0 and 100.");
      return;
    }
    if (!suggestDesc.trim()) {
      notification.warning("Please describe your proposed solution.");
      return;
    }
    try {
      await writeContractAsync({
        functionName: "suggestSolution",
        args: [jobIdBig, BigInt(Math.round(pct * 100)), suggestDesc.trim()],
      });
      notification.success("Resolution proposed on-chain.");
      setSuggestDesc("");
      setSuggestPayment("50");
      setShowSuggestForm(false);
      refetchSolutions();
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  return (
    <div className="flex gap-6 items-start flex-col lg:flex-row">
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {dispute?.defenseStatement && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-3">Freelancer&apos;s Defense</h2>
            <p className="text-sm text-base-content/70 leading-relaxed">{dispute.defenseStatement}</p>
          </div>
        )}

        {/* Proposals list */}
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-base-content">Proposed Resolutions</h2>
            <span className="badge badge-neutral">
              {solutionCount} proposal{solutionCount !== 1 ? "s" : ""}
            </span>
          </div>

          {solutionCount === 0 ? (
            <p className="text-sm text-base-content/50 text-center py-4">No proposals yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {solutions.map((solution, i) => {
                if (!solution) return null;
                const weight = solution.totalWeight;
                const pct = totalWeight > 0n ? Number((weight * 100n) / totalWeight) : 0;
                const isSelected = selectedSolution === i;
                const isVotedFor = hasVoted && votedForSolution !== undefined && Number(votedForSolution) === i;
                const canSelect = !!votingOpen && !hasVoted && !isParticipant;

                return (
                  <div
                    key={i}
                    onClick={() => canSelect && setSelectedSolution(i)}
                    className={`border rounded-xl p-4 transition-all ${
                      isVotedFor
                        ? "border-primary bg-primary/5"
                        : isSelected
                          ? "border-primary/60 bg-primary/5 cursor-pointer"
                          : canSelect
                            ? "border-base-300 hover:border-primary/40 cursor-pointer"
                            : "border-base-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {canSelect && (
                        <div
                          className={`w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? "border-primary" : "border-base-300"}`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                      )}
                      {isVotedFor && <CheckCircleSolid className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-base-content">
                            {i === 0 ? "Client's Proposal" : `Proposal #${i + 1}`}{" "}
                            <span className="text-primary font-bold">
                              {(Number(solution.paymentBps) / 100).toFixed(0)}%
                            </span>
                            <span className="text-base-content/50 font-normal"> to freelancer</span>
                          </span>
                          <span className="text-xs text-base-content/40 font-mono shrink-0">
                            {weight.toString()} wt
                          </span>
                        </div>
                        <p className="text-xs text-base-content/60 mb-2">{solution.description}</p>
                        <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <Address address={solution.proposer} format="short" />
                          <span className="text-xs text-base-content/40">{pct}% of weight</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vote action for eligible jurors */}
        {address && !isParticipant && votingOpen && (
          <div className="bg-base-100 border border-primary/20 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-4">Cast Your Vote</h2>
            {hasVoted ? (
              <div className="rounded-xl p-4 flex items-center gap-3 bg-primary/10 border border-primary/20">
                <CheckCircleSolid className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-base-content">
                    You voted for{" "}
                    {Number(votedForSolution ?? 0n) === 0
                      ? "Client's Proposal"
                      : `Proposal #${Number(votedForSolution ?? 0n) + 1}`}
                  </p>
                  <p className="text-xs text-base-content/50">Your vote is recorded on-chain.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-base-content/60">Select a proposal above, then cast your vote below.</p>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-xl px-4 py-2 flex items-center gap-2 shrink-0">
                    <span className="text-xs text-base-content/50">Your weight</span>
                    <span className="text-lg font-bold text-primary">{voteWeight?.toString() ?? "—"}</span>
                  </div>
                  <button
                    onClick={handleVote}
                    disabled={isPending || selectedSolution === null}
                    className="btn btn-primary flex-1"
                  >
                    {isPending ? <span className="loading loading-spinner loading-xs" /> : "Cast Vote"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggest solution */}
        {address && votingOpen && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-base-content">Propose a Resolution</h2>
              {!showSuggestForm && (
                <button className="btn btn-sm btn-outline" onClick={() => setShowSuggestForm(true)}>
                  + Suggest
                </button>
              )}
            </div>
            {showSuggestForm ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">
                    Payment to Freelancer (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={suggestPayment}
                    onChange={e => setSuggestPayment(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="e.g. 75"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-1 block">
                    Your Reasoning
                  </label>
                  <textarea
                    value={suggestDesc}
                    onChange={e => setSuggestDesc(e.target.value)}
                    rows={3}
                    className="textarea textarea-bordered w-full text-sm"
                    placeholder="Explain why this split is fair given the evidence…"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSuggest} disabled={isPending} className="btn btn-primary btn-sm flex-1">
                    {isPending ? <span className="loading loading-spinner loading-xs" /> : "Submit Proposal"}
                  </button>
                  <button onClick={() => setShowSuggestForm(false)} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-base-content/50">
                {isParticipant
                  ? "As a party to this dispute, you can submit your own resolution for jurors to consider."
                  : "Eligible jurors can propose alternative resolutions for the community to vote on."}
              </p>
            )}
          </div>
        )}

        {isParticipant && votingOpen && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-2">Voting in Progress</h2>
            <p className="text-sm text-base-content/60">
              As a party to this dispute you cannot vote, but you can propose a resolution and track the
              community&apos;s decision.
            </p>
          </div>
        )}

        {!address && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6 text-sm text-base-content/50 text-center">
            Connect your wallet to vote or suggest a resolution.
          </div>
        )}
      </div>

      <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-3">
            Dispute Parties
          </p>
          {job ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                  <ShieldExclamationIcon className="w-4 h-4 text-error" />
                </div>
                <div className="min-w-0">
                  <Address address={job.client} format="short" />
                  <p className="text-xs text-base-content/40">Client (Initiator)</p>
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
            Voting Eligibility
          </p>
          <ul className="flex flex-col gap-2 text-sm text-base-content/70">
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-success shrink-0" />
              Completed at least one job
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-success shrink-0" />
              Hold minimum NXR token balance
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-success shrink-0" />
              Not a party to this dispute
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
