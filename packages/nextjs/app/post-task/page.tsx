"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther, parseEventLogs } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CpuChipIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const CATEGORIES = [
  "Smart Contract Security",
  "DeFi Development",
  "NFT / Digital Art",
  "Frontend Development",
  "Backend Development",
  "UI / UX Design",
  "Technical Writing",
];

const ALL_SKILLS = [
  "Solidity",
  "Ethereum",
  "Smart Contracts",
  "Web3.js",
  "Ethers.js",
  "Hardhat",
  "Foundry",
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Rust",
  "Go",
  "DeFi",
  "NFT",
  "ERC-20",
  "ERC-721",
  "ERC-1155",
  "OpenZeppelin",
  "Security Audit",
  "Penetration Testing",
  "Gas Optimization",
  "Layer 2",
  "IPFS",
  "GraphQL",
  "REST API",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "AWS",
  "CI/CD",
  "UI/UX Design",
  "Figma",
  "Tailwind CSS",
  "Frontend",
  "Backend",
  "Full Stack",
  "Wagmi",
  "Viem",
  "RainbowKit",
  "Zero Knowledge Proofs",
  "Chainlink",
  "The Graph",
  "Subgraph",
  "Multisig",
  "DAO Governance",
  "Technical Writing",
  "Documentation",
];

const CATEGORY_SKILLS: Record<string, string[]> = {
  "Smart Contract Security": ["Solidity", "Security Audit", "Ethereum"],
  "DeFi Development": ["Solidity", "DeFi", "Ethers.js"],
  "NFT / Digital Art": ["Solidity", "NFT", "ERC-721"],
  "Frontend Development": ["React", "TypeScript", "Web3.js"],
  "Backend Development": ["Node.js", "REST API", "PostgreSQL"],
  "UI / UX Design": ["Figma", "UI/UX Design", "Tailwind CSS"],
  "Technical Writing": ["Technical Writing", "Documentation"],
};

type AiRating = {
  task_rating: number;
  complexity_score: number;
  estimated_files: number;
  estimated_hours: number;
  reasoning: string;
  clarity_score: number;
  clarity_issues: string[];
};

const COMPLEXITY_LABEL = (score: number) => {
  if (score < 200) return "Trivial";
  if (score < 400) return "Simple";
  if (score < 550) return "Moderate";
  if (score < 700) return "Complex";
  if (score < 850) return "Advanced";
  return "Expert";
};

const CLARITY_COLOR = (score: number) => {
  if (score >= 75) return "badge-success";
  if (score >= 50) return "badge-warning";
  return "badge-error";
};

const PostTaskPage = () => {
  const router = useRouter();
  const { address } = useAccount();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Smart Contract Security");
  const [description, setDescription] = useState("");
  const [budgetDwt, setBudgetDwt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(
    new Set(CATEGORY_SKILLS["Smart Contract Security"]),
  );

  const [aiRating, setAiRating] = useState<AiRating | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setSelectedSkills(prev => {
      const next = new Set(prev);
      // Remove old category skills
      CATEGORY_SKILLS[category]?.forEach(s => next.delete(s));
      // Add new category skills
      CATEGORY_SKILLS[newCategory]?.forEach(s => next.add(s));
      return next;
    });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  };

  const skills = Array.from(selectedSkills);

  const budgetWei = (() => {
    try {
      return budgetDwt && Number(budgetDwt) > 0 ? parseEther(budgetDwt) : 0n;
    } catch {
      return 0n;
    }
  })();

  const { data: marketplaceInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });
  const marketplaceAddress = marketplaceInfo?.address;
  const publicClient = usePublicClient();

  const { data: allowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "DecentraToken",
    functionName: "allowance",
    args: [address, marketplaceAddress],
    query: { enabled: !!address && !!marketplaceAddress },
  });

  const { writeContractAsync: approveToken, isPending: isApproving } = useScaffoldWriteContract({
    contractName: "DecentraToken",
  });
  const { writeContractAsync: postJobWrite, isPending: isPosting } = useScaffoldWriteContract({
    contractName: "JobMarketplace",
  });

  const needsApproval = !allowance || allowance < budgetWei;

  const analyzeTask = async () => {
    if (!title.trim() || !description.trim()) {
      notification.warning("Fill in title and description first");
      return;
    }
    setIsRating(true);
    try {
      const tempId = `task_preview_${Date.now()}`;
      const res = await fetch(`${BACKEND_URL}/rate-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrow_id: tempId,
          task_description: `${title}\n\n${description}`,
          required_skills: skills,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: AiRating = await res.json();
      setAiRating(data);
    } catch {
      notification.error("Failed to analyze task — is the backend running?");
    } finally {
      setIsRating(false);
    }
  };

  const handleApprove = async () => {
    if (!marketplaceAddress) return notification.error("Marketplace contract not found");
    try {
      await approveToken({
        functionName: "approve",
        args: [marketplaceAddress, budgetWei],
      });
      notification.success("DWT spending approved!");
      refetchAllowance();
    } catch (e) {
      notification.error("Approval failed");
      console.error(e);
    }
  };

  const handlePost = async () => {
    if (!title.trim()) return notification.error("Task title is required");
    if (!description.trim()) return notification.error("Description is required");
    if (budgetWei === 0n) return notification.error("Budget must be greater than 0");
    if (skills.length === 0) return notification.error("Select at least one skill");

    const deadlineTs = deadline
      ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600);

    try {
      const txHash = await postJobWrite({
        functionName: "postJob",
        args: [title, description, budgetWei, deadlineTs, skills],
      });
      notification.success("Job posted on-chain and budget escrowed!");

      // Save the AI task rating with the real job ID (parsed from the JobPosted event)
      if (txHash && aiRating && publicClient && marketplaceInfo?.abi) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          const logs = parseEventLogs({
            abi: marketplaceInfo.abi,
            eventName: "JobPosted",
            logs: receipt.logs,
          });
          const jobId = logs[0]?.args?.jobId;
          if (jobId !== undefined) {
            await fetch(`${BACKEND_URL}/rate-task`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                escrow_id: String(jobId),
                task_description: `${title}\n\n${description}`,
                required_skills: skills,
              }),
            });
          }
        } catch (e) {
          console.error("Failed to save task rating:", e);
        }
      }

      router.push("/my-tasks");
    } catch (e) {
      notification.error("Failed to post job");
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-base-content mb-1">Post a Job</h1>
            <p className="text-sm text-base-content/50">
              Define your requirements — the budget is held in escrow until the work is complete.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-base-content/40 mt-1 shrink-0">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Budget escrowed in DWT</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">Job Title</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Solidity Smart Contract Audit for DeFi Protocol"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">Category</label>
            <select
              className="select select-bordered w-full"
              value={category}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Budget + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-base-content">Budget (DWT)</label>
              <input
                type="number"
                min="1"
                className="input input-bordered w-full"
                value={budgetDwt}
                onChange={e => setBudgetDwt(e.target.value)}
                placeholder="e.g. 2500"
              />
              {budgetDwt && Number(budgetDwt) > 0 && (
                <p className="text-xs text-base-content/40">
                  Platform fee: {(Number(budgetDwt) * 0.025).toFixed(2)} DWT (2.5%)
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-base-content">Deadline</label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              />
              {!deadline && <p className="text-xs text-base-content/40">Defaults to 7 days from now</p>}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">Job Description</label>
            <textarea
              className="textarea textarea-bordered w-full resize-none"
              rows={6}
              placeholder="Describe the work in detail — scope, deliverables, requirements, context…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Skills picker */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-4 h-4 text-base-content/60" />
              <label className="text-sm font-medium text-base-content">Required Skills</label>
              <span className="text-xs text-base-content/40">({selectedSkills.size} selected)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map(skill => {
                const active = selectedSkills.has(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`badge badge-lg cursor-pointer select-none transition-all ${
                      active ? "badge-primary" : "badge-outline opacity-60 hover:opacity-100"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="border border-base-300 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-base-content">AI Task Analysis</h2>
              </div>
              <button className="btn btn-sm btn-outline btn-primary" onClick={analyzeTask} disabled={isRating}>
                {isRating ? <span className="loading loading-spinner loading-xs" /> : null}
                {isRating ? "Analyzing…" : "Analyze Task"}
              </button>
            </div>

            {aiRating ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">Complexity</p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="badge badge-lg badge-primary">Difficulty {aiRating.task_rating}/100</span>
                    <span className="badge badge-lg badge-secondary">
                      {COMPLEXITY_LABEL(aiRating.complexity_score)} ({aiRating.complexity_score}/1000)
                    </span>
                    <span className="badge badge-lg badge-outline">~{aiRating.estimated_files} files</span>
                    <span className="badge badge-lg badge-outline">~{aiRating.estimated_hours}h</span>
                  </div>
                  <p className="text-sm text-base-content/70 leading-relaxed">{aiRating.reasoning}</p>
                </div>

                <div className="divider my-1" />

                <div>
                  <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2">
                    Task Clarity
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge badge-lg ${CLARITY_COLOR(aiRating.clarity_score)}`}>
                      Clarity {aiRating.clarity_score}/100
                    </span>
                    {aiRating.clarity_score >= 75 && (
                      <span className="text-sm text-success">Description is clear — ready to post</span>
                    )}
                  </div>
                  {aiRating.clarity_issues.length > 0 && (
                    <ul className="space-y-1">
                      {aiRating.clarity_issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-base-content/70">
                          <span className="text-warning shrink-0 mt-0.5">⚠</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-base-content/40">
                Click &quot;Analyze Task&quot; to check complexity and whether your description is clear enough for
                freelancers.
              </p>
            )}
          </div>

          {/* Escrow notice */}
          <div className="alert alert-info text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              When you post this job, <strong>{budgetDwt || "0"} DWT</strong> will be transferred from your wallet into
              the smart contract escrow. Funds are only released to the freelancer after work is approved.
            </span>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 pb-8">
            {needsApproval ? (
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={isApproving || !address || budgetWei === 0n}
              >
                {isApproving ? <span className="loading loading-spinner loading-xs" /> : null}
                {isApproving ? "Approving…" : "1. Approve DWT Spending"}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handlePost}
                disabled={isPosting || !address || budgetWei === 0n}
              >
                {isPosting ? <span className="loading loading-spinner loading-xs" /> : null}
                {isPosting ? "Posting…" : "Post a Job"}
              </button>
            )}
            {!needsApproval && budgetWei > 0n && (
              <span className="text-xs text-base-content/50">Step 1 done — click Post a Job to escrow funds</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Co-Pilot */}
      {copilotOpen ? (
        <div className="fixed bottom-6 right-6 w-80 bg-base-100 rounded-2xl shadow-2xl border border-base-300 z-50 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 bg-primary text-primary-content px-4 py-3">
            <CpuChipIcon className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm flex-1">AI Co-Pilot</span>
            <button onClick={() => setCopilotOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <div className="bg-base-200 rounded-xl px-4 py-3 text-sm text-base-content/80 leading-relaxed">
              I&apos;ve analyzed your task description. Click &quot;Analyze Task&quot; above to get a complexity rating
              and estimated difficulty score.
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <input type="text" placeholder="Ask anything…" className="input input-bordered input-sm flex-1 text-sm" />
            <button className="btn btn-primary btn-sm btn-square">
              <PaperAirplaneIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-primary-content rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 transition-opacity z-50"
        >
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error rounded-full border-2 border-base-100" />
          <CpuChipIcon className="w-6 h-6" />
        </button>
      )}
    </AppLayout>
  );
};

export default PostTaskPage;
