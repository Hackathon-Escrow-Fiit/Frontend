"use client";

import { useParams } from "next/navigation";
import { DisputeHeader, useDisputeData } from "../_components/shared";
import { blo } from "blo";
import { useAccount } from "wagmi";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

// ── Mock data (replace with contract reads when DAO indexing is available) ──

const DISPUTE = {
  caseId: "DR-90210",
  title: "Technical Dispute: smart-contract-v4-deployment",
  client: "0x71C4a8b3D6E9f2c1A4e9" as `0x${string}`,
  freelancer: "0x2aB7c3D9e1F4b8A6c921" as `0x${string}`,
  escrowTotal: "4,200",
  token: "NXR",
  status: "Released" as const,

  clientVotes: 6,
  freelancerVotes: 3,
  totalJurors: 9,
  clientPct: 67,

  consensus:
    "The consensus reached by the decentralized panel concludes that the smart contract deployment failed to meet the gas efficiency specifications outlined in the original technical scope. A refund of 67% of the total escrowed amount is issued to the Client, with the remaining 33% released to the Freelancer for the research phase completion.",

  clientPayout: "2,814.00",
  freelancerPayout: "1,386.00",
  platformFee: "84.00",

  txHash: "0x9d2e8a1f3b7c4d6e2a5f8b3c9b2d1e0f7a4c8e2b",
  etherscanUrl: "https://etherscan.io/tx/0x9d2e8a1f3b7c4d6e2a5f8b3c9b2d1e0f7a4c8e2b",

  jurors: [
    {
      id: "842",
      vote: "refund" as const,
      role: "Verified Technical Juror",
      reasoning:
        "Analysis of the provided GitHub repository shows that the `gas_limit` constraints were ignored in the final deployment script. While the core logic is sound, the operational costs for the client would be 40% higher than agreed. Refund is justified.",
    },
    {
      id: "119",
      vote: "release" as const,
      role: "Senior Engineer",
      reasoning:
        "The gas spikes are largely due to current Ethereum mainnet congestion levels rather than inherently flawed code logic. The freelancer delivered functional code that passed all unit tests. I believe the full payment should be released as the external environment is outside their control.",
    },
    {
      id: "374",
      vote: "refund" as const,
      role: "Smart Contract Auditor",
      reasoning:
        "The specification clearly required gas optimization as a deliverable, not just functional correctness. The 40% cost overrun is material and the client is entitled to a partial refund for the unmet specification.",
    },
  ],

  evidence: [
    { name: "Technical_Spec_v2.pdf", meta: "2.4 MB · Oct 14", icon: "doc" as const },
    { name: "GitHub Commit History", meta: "github.com/repo/...", icon: "code" as const },
  ],
};

const voteBadge = (vote: "refund" | "release") =>
  vote === "refund" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200";

const voteLabel = (vote: "refund" | "release") => (vote === "refund" ? "REFUND CLIENT" : "RELEASE PAYMENT");

const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export default function DisputeResultPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { job, dispute } = useDisputeData(id);

  const isFreelancer = !!(address && job && job.freelancer.toLowerCase() === address.toLowerCase());

  const d = DISPUTE;
  const clientPct = d.clientPct;
  const freelancerPct = 100 - clientPct;

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full">
        <DisputeHeader id={id} view="result" job={job} dispute={dispute} isFreelancer={isFreelancer} />

        <div className="flex gap-5 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Final Resolution Outcome */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ScaleIcon className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-base-content text-lg">Final Resolution Outcome</h2>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-base-content">{clientPct}%</span>
                  <span className="text-sm text-base-content/50">In Favor of Client</span>
                </div>
                <span className="text-sm text-base-content/50">{d.totalJurors} Total Jurors</span>
              </div>

              <div className="flex w-full h-3 rounded-full overflow-hidden mb-2">
                <div className="bg-success transition-all" style={{ width: `${clientPct}%` }} />
                <div className="bg-error transition-all" style={{ width: `${freelancerPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-base-content/50 mb-5">
                <span className="text-success font-medium">Full Refund ({d.clientVotes} Votes)</span>
                <span className="text-error font-medium">Release Payment ({d.freelancerVotes} Votes)</span>
              </div>

              <blockquote className="border-l-4 border-primary/30 bg-primary/5 rounded-r-xl px-4 py-3">
                <p className="text-sm text-base-content/70 italic leading-relaxed">&ldquo;{d.consensus}&rdquo;</p>
              </blockquote>
            </div>

            {/* Juror Reasoning */}
            <div>
              <h2 className="font-bold text-base-content text-lg mb-3">Juror Reasoning Analysis</h2>
              <div className="flex flex-col gap-3">
                {d.jurors.map((juror, i) => (
                  <div key={juror.id} className="bg-base-100 border border-base-300 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                          J{i + 1}
                        </div>
                        <span className="font-semibold text-sm text-base-content">Juror #{juror.id}</span>
                        <span className={`badge border text-[10px] font-bold ${voteBadge(juror.vote)}`}>
                          {voteLabel(juror.vote)}
                        </span>
                      </div>
                      <span className="text-xs text-base-content/40">{juror.role}</span>
                    </div>
                    <p className="text-sm text-base-content/60 leading-relaxed">{juror.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="w-72 shrink-0 flex flex-col gap-4">
            {/* Escrow Total */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Escrow Total</p>
              <p className="text-2xl font-bold text-base-content">
                {d.escrowTotal} <span className="text-primary">{d.token}</span>
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-300">
                <span className="text-sm text-base-content/50">Status</span>
                <span className="text-sm font-semibold text-success">{d.status}</span>
              </div>
            </div>

            {/* Final Payout */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <h2 className="font-bold text-base-content mb-4">Final Payout</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={blo(d.client)} alt="client" className="w-6 h-6 rounded-full" />
                    <span className="text-sm text-base-content/70">Client {truncate(d.client)}</span>
                  </div>
                  <span className="text-sm font-bold text-success">
                    +{d.clientPayout} {d.token}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={blo(d.freelancer)} alt="freelancer" className="w-6 h-6 rounded-full" />
                    <span className="text-sm text-base-content/70">Freelancer {truncate(d.freelancer)}</span>
                  </div>
                  <span className="text-sm font-semibold text-base-content/70">
                    +{d.freelancerPayout} {d.token}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-base-300">
                  <span className="text-xs text-base-content/40">Platform Arbitration Fee</span>
                  <span className="text-xs text-base-content/50">
                    -{d.platformFee} {d.token}
                  </span>
                </div>
              </div>
            </div>

            {/* On-Chain Proof */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheckIcon className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-base-content">On-Chain Proof</h2>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] text-base-content/40 uppercase tracking-widest mb-1">Transaction Hash</p>
                  <p className="text-xs font-mono text-primary break-all">
                    {d.txHash.slice(0, 10)}...{d.txHash.slice(-10)}
                  </p>
                </div>
                <a
                  href={d.etherscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  View on Etherscan
                </a>
              </div>
            </div>

            {/* Evidence Snapshot */}
            <div className="bg-base-100 border border-base-300 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircleIcon className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-base-content">Evidence Snapshot</h2>
              </div>
              <div className="flex flex-col gap-3">
                {d.evidence.map(ev => (
                  <div key={ev.name} className="flex items-center gap-3">
                    {ev.icon === "doc" ? (
                      <DocumentTextIcon className="w-5 h-5 text-base-content/40 shrink-0" />
                    ) : (
                      <CodeBracketIcon className="w-5 h-5 text-base-content/40 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-base-content/80 truncate">{ev.name}</p>
                      <p className="text-xs text-base-content/40">{ev.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
