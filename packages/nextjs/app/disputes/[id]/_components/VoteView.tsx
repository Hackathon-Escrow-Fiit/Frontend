"use client";

import type { DisputeData, OnChainJob } from "./shared";
import { Address } from "@scaffold-ui/components";
import { CheckCircleIcon, ScaleIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

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
  const jobIdBig = BigInt(id);

  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "hasVoted",
    args: [jobIdBig, address as `0x${string}`],
    query: { enabled: !!address },
  });

  const { data: votedFor } = useScaffoldReadContract({
    contractName: "DAODispute",
    functionName: "votedFor",
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

  const totalWeight = dispute ? dispute.forWeight + dispute.againstWeight : 0n;
  const forPct = totalWeight > 0n ? Number((dispute!.forWeight * 100n) / totalWeight) : 0;
  const againstPct = totalWeight > 0n ? Number((dispute!.againstWeight * 100n) / totalWeight) : 0;

  const isParticipant =
    address &&
    job &&
    (job.client.toLowerCase() === address.toLowerCase() || job.freelancer.toLowerCase() === address.toLowerCase());

  const votingOpen = dispute && !dispute.finalized && Number(dispute.votingDeadline) > Math.floor(Date.now() / 1000);

  const handleVote = async (support: boolean) => {
    try {
      await writeContractAsync({ functionName: "vote", args: [jobIdBig, support] });
      notification.success(support ? "Voted to support client's proposal." : "Voted for full freelancer payment.");
    } catch (e) {
      notification.error(getParsedError(e));
    }
  };

  return (
    <div className="flex gap-6 items-start flex-col lg:flex-row">
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-base-content mb-3">What Jurors Are Deciding</h2>
          <p className="text-sm text-base-content/70 leading-relaxed mb-4">
            The client has proposed paying the freelancer{" "}
            <span className="font-semibold text-base-content">
              {dispute ? (Number(dispute.proposedPaymentBps) / 100).toFixed(0) : "—"}%
            </span>{" "}
            of the escrowed amount. Vote <span className="font-semibold text-warning">For</span> to support this
            proposal, or <span className="font-semibold text-success">Against</span> to release the full payment to the
            freelancer.
          </p>
          {dispute?.defenseStatement && (
            <div className="bg-base-200 rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-2">
                Freelancer&apos;s Defense
              </p>
              <p className="text-sm text-base-content/70 line-clamp-4">{dispute.defenseStatement}</p>
            </div>
          )}
        </div>

        {address && !isParticipant && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-4">Your Vote Weight</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{voteWeight?.toString() ?? "—"}</span>
              </div>
              <div>
                <p className="text-sm text-base-content/70">
                  Calculated from your reputation score and skill match for this job.
                </p>
                <p className="text-xs text-base-content/40 mt-1">Skills: {job?.skills.join(", ") ?? "—"}</p>
              </div>
            </div>
          </div>
        )}

        {address && !isParticipant && (
          <div className="bg-base-100 border border-primary/20 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-4">Cast Your Vote</h2>
            {!votingOpen ? (
              <div className="bg-base-200 rounded-xl p-4 text-sm text-base-content/50 text-center">
                {dispute?.finalized ? "Dispute finalized — voting closed." : "Voting period has ended."}
              </div>
            ) : hasVoted ? (
              <div
                className={`rounded-xl p-4 flex items-center gap-3 ${votedFor ? "bg-warning/10 border border-warning/20" : "bg-success/10 border border-success/20"}`}
              >
                <CheckCircleSolid className={`w-5 h-5 ${votedFor ? "text-warning" : "text-success"}`} />
                <div>
                  <p className="text-sm font-semibold text-base-content">
                    You voted {votedFor ? "For client's proposal" : "Against (full payment to freelancer)"}
                  </p>
                  <p className="text-xs text-base-content/50">Your vote is recorded on-chain.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => handleVote(true)} disabled={isPending} className="btn btn-warning flex-1">
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "For Client's Proposal"}
                </button>
                <button onClick={() => handleVote(false)} disabled={isPending} className="btn btn-success flex-1">
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Full Pay to Freelancer"}
                </button>
              </div>
            )}
          </div>
        )}

        {isParticipant && (
          <>
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-base-content mb-2">Voting in Progress</h2>
              <p className="text-sm text-base-content/60">
                As a party to this dispute you cannot vote, but you can track the community&apos;s decision here.
              </p>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-base-content mb-4">Live Vote Tally</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-warning">For Client ({forPct}%)</span>
                    <span className="text-base-content/50 font-mono">
                      {dispute?.forWeight.toString() ?? "0"} weight
                    </span>
                  </div>
                  <div className="h-3 bg-base-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full transition-all duration-500"
                      style={{ width: `${forPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-success">Against / Full Pay ({againstPct}%)</span>
                    <span className="text-base-content/50 font-mono">
                      {dispute?.againstWeight.toString() ?? "0"} weight
                    </span>
                  </div>
                  <div className="h-3 bg-base-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${againstPct}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-base-content/40 text-center">
                  {dispute?.voterCount.toString() ?? "0"} juror{dispute?.voterCount !== 1n ? "s" : ""} voted
                </p>
              </div>
            </div>
          </>
        )}

        {/* Juror who has already voted sees tally too */}
        {address && !isParticipant && hasVoted && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-base-content mb-4">Current Tally</h2>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-warning">For Client ({forPct}%)</span>
                  <span className="text-base-content/50 font-mono">{dispute?.forWeight.toString() ?? "0"} weight</span>
                </div>
                <div className="h-3 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full transition-all duration-500"
                    style={{ width: `${forPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-success">Against / Full Pay ({againstPct}%)</span>
                  <span className="text-base-content/50 font-mono">
                    {dispute?.againstWeight.toString() ?? "0"} weight
                  </span>
                </div>
                <div className="h-3 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all duration-500"
                    style={{ width: `${againstPct}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-base-content/40 text-center">
                {dispute?.voterCount.toString() ?? "0"} juror{dispute?.voterCount !== 1n ? "s" : ""} voted · tally
                visible after your vote
              </p>
            </div>
          </div>
        )}

        {!address && (
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6 text-sm text-base-content/50 text-center">
            Connect your wallet to vote.
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
