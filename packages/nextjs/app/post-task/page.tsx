"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
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

const CATEGORY_SKILLS: Record<string, string[]> = {
  "Smart Contract Security": ["solidity", "security-audit", "evm"],
  "DeFi Development": ["solidity", "defi", "evm"],
  "NFT / Digital Art": ["solidity", "nft", "erc-721"],
  "Frontend Development": ["react", "typescript", "web3"],
  "Backend Development": ["node", "api", "databases"],
  "UI / UX Design": ["figma", "design", "ux"],
  "Technical Writing": ["documentation", "technical-writing"],
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

  const [title, setTitle] = useState("Solidity Smart Contract Audit: Liquidity Protocol");
  const [category, setCategory] = useState("Smart Contract Security");
  const [description, setDescription] = useState(
    "We are looking for a comprehensive security audit of our new Liquidity Protocol smart contracts. " +
      "The audit should focus on potential reentrancy vulnerabilities, access control, and gas efficiency optimizations.\n\n" +
      "The codebase consists of ~800 SLOC across 4 main contracts.",
  );
  const [budgetDwt, setBudgetDwt] = useState("2500");
  const [deadline, setDeadline] = useState("");
  const [extraSkills, setExtraSkills] = useState("");

  const [aiRating, setAiRating] = useState<AiRating | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const skills = [
    ...CATEGORY_SKILLS[category],
    ...extraSkills
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  ];

  const budgetWei = (() => {
    try {
      return budgetDwt && Number(budgetDwt) > 0 ? parseEther(budgetDwt) : 0n;
    } catch {
      return 0n;
    }
  })();

  // Deployed contract info to get marketplace address for the allowance check
  const { data: marketplaceInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });
  const marketplaceAddress = marketplaceInfo?.address;

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

    const deadlineTs = deadline
      ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600);

    try {
      await postJobWrite({
        functionName: "postJob",
        args: [title, description, budgetWei, deadlineTs, skills],
      });
      notification.success("Task posted on-chain!");
      router.push("/dashboard");
    } catch (e) {
      notification.error("Failed to post task");
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-base-content mb-1">Post a New Task</h1>
            <p className="text-sm text-base-content/50">Define your requirements and find the perfect freelancer.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-base-content/40 mt-1 shrink-0">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Budget paid in DWT tokens</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-base-content">Task Title</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-base-content">Category</label>
              <select
                className="select select-bordered w-full"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">Detailed Description</label>
            <textarea
              className="textarea textarea-bordered w-full resize-none"
              rows={6}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Extra skills */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-base-content">
              Additional Skills <span className="text-base-content/40 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. foundry, hardhat, openzeppelin"
              value={extraSkills}
              onChange={e => setExtraSkills(e.target.value)}
            />
            <p className="text-xs text-base-content/40">
              Auto-included from category:{" "}
              <span className="text-base-content/60">{CATEGORY_SKILLS[category].join(", ")}</span>
            </p>
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
                {/* Complexity */}
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

                {/* Clarity */}
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

          {/* Acceptance Criteria */}
          <div className="border border-base-300 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardDocumentListIcon className="w-5 h-5 text-base-content/60" />
              <h2 className="font-semibold text-base-content">Skills Required</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="badge badge-outline">
                  {s}
                </span>
              ))}
            </div>
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
                Approve DWT
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handlePost} disabled={isPosting || !address}>
                {isPosting ? <span className="loading loading-spinner loading-xs" /> : null}
                Fund Escrow &amp; Post
              </button>
            )}
            <button className="btn btn-outline">Save Draft</button>
            <span className="ml-auto text-sm text-base-content/50">
              Fee: {budgetDwt ? (Number(budgetDwt) * 0.025).toFixed(2) : "0.00"} DWT (2.5%)
            </span>
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
