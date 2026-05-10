"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { blo } from "blo";
import { formatEther } from "viem";
import { useReadContracts } from "wagmi";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeBracketIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import {
  useDecentraWorkRegistry,
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type Role = "client" | "freelancer";

type OnChainBid = {
  freelancer: `0x${string}`;
  amount: bigint;
  proposal: string;
  accepted: boolean;
};

export default function TaskViewPage() {
  const { id, view } = useParams<{ id: string; view: string }>();
  const router = useRouter();
  const { role: chainRole } = useDecentraWorkRegistry();
  const role: Role = chainRole === "freelancer" ? "freelancer" : "client";

  // â”€â”€ AI report polling (waiting view only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  type CodeIssue = {
    file: string;
    line: string;
    severity: string;
    issue: string;
    detail: string;
    snippet?: string;
  };
  type RequirementCheck = {
    requirement: string;
    met: boolean;
    detail: string;
  };
  type Report = {
    status: string;
    recommendation: string | null;
    confidence_score: number | null;
    task_complexity: number | null;
    detailed_report: string | null;
    code_issues: CodeIssue[];
    requirements_check: RequirementCheck[];
    files_submitted: string[];
    files_missing: string[];
    suggested_reputation_delta: number | null;
    suggested_skills: Record<string, { new_level: number; reasoning?: string }> | null;
  };
  type ApproveResult = {
    freelancer: string;
    skill_changes: Record<string, number>;
    reputation_delta: number;
    elo: {
      old_elo: number;
      new_elo: number;
      elo_delta: number;
      old_tier: string;
      new_tier: string;
      tier_changed: boolean;
    };
  };
  type TaskRating = {
    task_rating: number;
    complexity_score: number;
    reasoning: string;
  };
  const [taskRating, setTaskRating] = useState<TaskRating | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);
  type SubmittedFile = { filename: string; size: number };
  const [submittedFiles, setSubmittedFiles] = useState<SubmittedFile[]>([]);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approveResult] = useState<ApproveResult | null>(null);
  const [, setShowResultModal] = useState(false);
  const [acceptingIndex, setAcceptingIndex] = useState<number | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  useEffect(() => {
    fetch(`${backendUrl}/rate-task/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setTaskRating(data);
      })
      .catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view !== "waiting" && view !== "review") return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`${backendUrl}/report/${id}`);
        if (!res.ok) return;
        const data: Report = await res.json();
        setReport(data);
        return data.status;
      } catch {
        return null;
      }
    };

    const fetchFiles = async () => {
      try {
        const res = await fetch(`${backendUrl}/files/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        const files: SubmittedFile[] = Array.isArray(data) ? data : (data.files ?? []);
        setSubmittedFiles(files);
      } catch {
        // files not yet available
      }
    };

    fetchReport();
    fetchFiles();
    const interval = setInterval(async () => {
      const status = await fetchReport();
      if (status && status !== "evaluating") {
        clearInterval(interval);
        fetchFiles();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [view, id, backendUrl]);

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const res = await fetch(`${backendUrl}/client-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrow_id: id, decision: "approve" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ApproveResult = await res.json();
      setApproved(true);
      sessionStorage.setItem(
        `dw_results_${id}`,
        JSON.stringify({ role: "client", approveResult: data, submittedFiles, report }),
      );
      router.push(`/my-tasks/${id}/results`);
    } catch (e) {
      console.error("Approve failed:", e);
    } finally {
      setApproveLoading(false);
    }
  };

  const goToFreelancerResults = () => {
    sessionStorage.setItem(`dw_results_${id}`, JSON.stringify({ role: "freelancer", report, submittedFiles }));
    router.push(`/my-tasks/${id}/results`);
  };

  const isClient = role === "client";

  // ── Read job from chain (all views) ─────────────────────────────────────
  const jobId = /^\d+$/.test(id) ? BigInt(id) : 0n;
  const { data: rawJob } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [jobId],
    query: { enabled: jobId > 0n },
  });
  const job = useMemo(() => {
    if (!rawJob) return null;
    const r = rawJob as any;
    return {
      id: r.id as bigint,
      client: r.client as `0x${string}`,
      freelancer: r.freelancer as `0x${string}`,
      title: r.title as string,
      description: r.description as string,
      skills: r.skills as readonly string[],
      budget: r.budget as bigint,
      deadline: r.deadline as bigint,
      status: Number(r.status),
      bidCount: Number(r.bidCount),
    };
  }, [rawJob]);

  // Active/review: counterparty reputation
  const counterpartyAddr = job ? (isClient ? job.freelancer : job.client) : undefined;
  const hasCounterparty = !!counterpartyAddr && counterpartyAddr !== "0x0000000000000000000000000000000000000000";

  const { data: cpRepRaw } = useScaffoldReadContract({
    contractName: "ReputationSystem",
    functionName: "getReputation",
    args: [counterpartyAddr ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: hasCounterparty },
  });
  const cpElo = cpRepRaw != null ? Number(cpRepRaw) : null;
  const cpTier =
    cpElo == null
      ? null
      : cpElo >= 900
        ? "Diamond"
        : cpElo >= 750
          ? "Expert"
          : cpElo >= 600
            ? "Skilled"
            : cpElo >= 450
              ? "Rising"
              : "Entry";

  // Bids view: batch-read bids + accept
  const bidCount = job?.bidCount ?? 0;
  const isJobOpen = job ? job.status === 0 : false;

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });

  const bidCalls = useMemo(() => {
    if (!contractInfo || bidCount === 0 || view !== "bids") return [];
    return Array.from({ length: bidCount }, (_, i) => ({
      address: contractInfo.address as `0x${string}`,
      abi: contractInfo.abi,
      functionName: "getBid" as const,
      args: [jobId, BigInt(i)] as const,
    }));
  }, [contractInfo, bidCount, view, jobId]);

  const { data: bidResults, refetch: refetchBids } = useReadContracts({
    contracts: bidCalls,
    query: { enabled: bidCalls.length > 0 },
  });

  const chainBids = useMemo<(OnChainBid & { index: number })[]>(() => {
    if (!bidResults) return [];
    return bidResults
      .filter(r => r.status === "success" && r.result != null)
      .map((r, i) => ({ ...(r.result as unknown as OnChainBid), index: i }));
  }, [bidResults]);

  const { writeContractAsync: acceptBidWrite, isPending: isAccepting } = useScaffoldWriteContract({
    contractName: "JobMarketplace",
  });

  const handleAccept = async (bidIndex: number) => {
    setAcceptingIndex(bidIndex);
    try {
      await acceptBidWrite({
        functionName: "acceptBid",
        args: [jobId, BigInt(bidIndex)],
      });
      notification.success("Bid accepted — freelancer has been assigned!");
      refetchBids();
    } catch (e) {
      notification.error("Failed to accept bid");
      console.error(e);
    } finally {
      setAcceptingIndex(null);
    }
  };

  const clientViews = ["bids", "active", "review"];
  const freelancerViews = ["active", "waiting"];
  const views = isClient ? clientViews : freelancerViews;

  const navTab = (v: string) => (
    <Link
      key={v}
      href={`/my-tasks/${id}/${v}`}
      className={`px-4 py-2 text-sm font-medium capitalize rounded-lg transition-colors ${
        view === v
          ? "bg-primary text-primary-content"
          : "text-base-content/50 hover:text-base-content hover:bg-base-200"
      }`}
    >
      {v}
    </Link>
  );

  /* â”€â”€ WAITING VIEW â”€â”€ */
  if (view === "waiting") {
    const isEvaluating = !report || report.status === "evaluating";
    const isDone = report && report.status === "pending";
    const isError = report && report.status === "error";

    const rec = report?.recommendation;
    const recConfig: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
      approve: {
        bg: "bg-success/10",
        border: "border-success/30",
        text: "text-success",
        label: "AI Recommends Approval",
        icon: "âœ“",
      },
      reject: {
        bg: "bg-error/10",
        border: "border-error/30",
        text: "text-error",
        label: "AI Recommends Rejection",
        icon: "âœ—",
      },
      escalate_to_dao: {
        bg: "bg-warning/10",
        border: "border-warning/30",
        text: "text-warning",
        label: "AI: Escalate to DAO",
        icon: "âš ",
      },
    };
    const recStyle = rec
      ? (recConfig[rec] ?? {
          bg: "bg-base-200",
          border: "border-base-300",
          text: "text-base-content",
          label: rec,
          icon: "?",
        })
      : null;

    const sevStyle = (s: string) => {
      if (s === "critical") return { badge: "bg-error text-error-content", bar: "bg-error", text: "text-error" };
      if (s === "high") return { badge: "bg-warning text-warning-content", bar: "bg-warning", text: "text-warning" };
      if (s === "medium") return { badge: "bg-info text-info-content", bar: "bg-info", text: "text-info" };
      return { badge: "bg-base-300 text-base-content", bar: "bg-base-300", text: "text-base-content/60" };
    };

    const conf = report?.confidence_score ?? 0;
    const confColor = conf >= 70 ? "text-success" : conf >= 40 ? "text-warning" : "text-error";
    const confBarColor = conf >= 70 ? "bg-success" : conf >= 40 ? "bg-warning" : "bg-error";

    const metCount = (report?.requirements_check ?? []).filter(r => r.met).length;
    const totalCount = (report?.requirements_check ?? []).length;

    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link
              href="/my-tasks"
              className="w-8 h-8 rounded-lg border border-base-300 flex items-center justify-center hover:bg-base-200 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 text-base-content/60" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-base-content leading-tight">AI Submission Review</h1>
              <p className="text-xs text-base-content/40 font-mono mt-0.5">Task #{id}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isEvaluating && (
                <span className="flex items-center gap-2 bg-warning/10 text-warning text-xs font-semibold px-3 py-1.5 rounded-full">
                  <span className="loading loading-spinner loading-xs" /> AI Evaluatingâ€¦
                </span>
              )}
              {isError && <span className="badge badge-error badge-lg">Evaluation Error</span>}
            </div>
          </div>

          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              {/* Evaluating */}
              {isEvaluating && (
                <div className="bg-base-100 rounded-2xl border border-base-200 p-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-base-content mb-2">AI is reviewing your submission</h2>
                  <p className="text-sm text-base-content/50 max-w-sm">
                    Reading files, checking code quality, security, and task completion. Updates automatically.
                  </p>
                </div>
              )}

              {/* Error */}
              {isError && (
                <div className="bg-base-100 rounded-2xl border border-error/30 p-10 flex flex-col items-center text-center">
                  <ExclamationTriangleIcon className="w-12 h-12 text-error mb-4" />
                  <h2 className="text-xl font-bold text-base-content mb-2">Evaluation failed</h2>
                  <p className="text-sm text-base-content/50">Check the backend logs for details.</p>
                </div>
              )}

              {/* Report ready */}
              {isDone && report && (
                <>
                  {/* Verdict banner */}
                  {recStyle && (
                    <div className={`rounded-2xl border ${recStyle.bg} ${recStyle.border} p-5 flex items-center gap-4`}>
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${recStyle.bg} border ${recStyle.border} ${recStyle.text}`}
                      >
                        {recStyle.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-lg ${recStyle.text}`}>{recStyle.label}</p>
                        <p className="text-xs text-base-content/50 mt-0.5">
                          Confidence: <span className={`font-semibold ${confColor}`}>{report.confidence_score}%</span>
                          {totalCount > 0 && (
                            <span className="ml-3">
                              Requirements:{" "}
                              <span className="font-semibold text-base-content">
                                {metCount}/{totalCount} met
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">
                          Complexity
                        </p>
                        <p className="text-2xl font-bold text-base-content">
                          {report.task_complexity}
                          <span className="text-sm font-normal text-base-content/40">/1000</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Files submitted / missing */}
                  {((report.files_submitted ?? []).length > 0 || (report.files_missing ?? []).length > 0) && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Files</p>
                      <div className="flex gap-4 flex-wrap">
                        {(report.files_submitted ?? []).length > 0 && (
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-success mb-2">
                              Submitted ({report.files_submitted.length})
                            </p>
                            <div className="space-y-1">
                              {report.files_submitted.map(f => (
                                <div
                                  key={f}
                                  className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-1.5"
                                >
                                  <span className="text-success text-xs">âœ“</span>
                                  <span className="font-mono text-xs text-base-content/80 truncate flex-1">{f}</span>
                                  <a
                                    href={`${backendUrl}/files/${id}/${encodeURIComponent(f)}`}
                                    download={f}
                                    className="btn btn-ghost btn-xs btn-square shrink-0"
                                    title={`Download ${f}`}
                                  >
                                    <ArrowDownTrayIcon className="w-3.5 h-3.5 text-base-content/50" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(report.files_missing ?? []).length > 0 && (
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-error mb-2">
                              Missing ({report.files_missing.length})
                            </p>
                            <div className="space-y-1">
                              {report.files_missing.map(f => (
                                <div
                                  key={f}
                                  className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg px-3 py-1.5"
                                >
                                  <span className="text-error text-xs">âœ—</span>
                                  <span className="font-mono text-xs text-base-content/80 truncate">{f}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confidence bar */}
                  <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold tracking-widest text-base-content/40 uppercase">Quality Score</p>
                      <p className={`text-2xl font-bold ${confColor}`}>{report.confidence_score}%</p>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${confBarColor}`}
                        style={{ width: `${report.confidence_score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-base-content/30 mt-1.5">
                      <span>Empty / Dangerous</span>
                      <span>Acceptable</span>
                      <span>Production Ready</span>
                    </div>
                  </div>

                  {/* Requirements checklist */}
                  {(report.requirements_check ?? []).length > 0 && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-base-content">Task Requirements</h2>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${metCount === totalCount ? "bg-success/15 text-success" : metCount === 0 ? "bg-error/15 text-error" : "bg-warning/15 text-warning"}`}
                        >
                          {metCount}/{totalCount} met
                        </span>
                      </div>
                      <div className="space-y-2">
                        {report.requirements_check.map((req, i) => (
                          <div
                            key={i}
                            className={`rounded-xl p-4 border ${req.met ? "bg-success/5 border-success/20" : "bg-error/5 border-error/20"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${req.met ? "bg-success text-success-content" : "bg-error text-error-content"}`}
                              >
                                {req.met ? "âœ“" : "âœ—"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-base-content">{req.requirement}</p>
                                <p
                                  className={`text-xs mt-1 leading-relaxed ${req.met ? "text-base-content/60" : "text-error/80"}`}
                                >
                                  {req.detail}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code issues */}
                  {(report.code_issues ?? []).length > 0 && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-base-content">Code Issues</h2>
                        <div className="flex gap-1.5">
                          {["critical", "high", "medium", "low"].map(sev => {
                            const count = report.code_issues.filter(i => i.severity === sev).length;
                            if (!count) return null;
                            const s = sevStyle(sev);
                            return (
                              <span key={sev} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                                {count} {sev}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {report.code_issues.map((issue, i) => {
                          const s = sevStyle(issue.severity);
                          return (
                            <div key={i} className="rounded-xl border border-base-200 overflow-hidden">
                              {/* Issue header */}
                              <div className="flex items-center gap-0 bg-base-200">
                                <div className={`w-1 self-stretch ${s.bar}`} />
                                <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${s.badge}`}
                                  >
                                    {issue.severity}
                                  </span>
                                  <p className="text-sm font-semibold text-base-content truncate">{issue.issue}</p>
                                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-mono bg-base-300 text-base-content/70 px-2 py-0.5 rounded">
                                      {issue.file}
                                    </span>
                                    <span className="text-[10px] font-mono bg-base-300 text-base-content/50 px-1.5 py-0.5 rounded">
                                      :{issue.line}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Detail */}
                              <div className="px-5 py-3 bg-base-100">
                                <p className="text-xs text-base-content/70 leading-relaxed">{issue.detail}</p>
                                {/* Code snippet */}
                                {issue.snippet && (
                                  <div className="mt-2 bg-base-content/5 border border-base-200 rounded-lg px-3 py-2 font-mono text-xs text-base-content/80 overflow-x-auto">
                                    <span className="text-base-content/30 select-none mr-2">{issue.line}</span>
                                    {issue.snippet}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Submission files â€” fetched directly from backend */}
                  {submittedFiles.length > 0 && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                        Submission Files
                      </p>
                      <div className="space-y-2">
                        {submittedFiles.map(f => (
                          <div
                            key={f.filename}
                            className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3"
                          >
                            <CodeBracketIcon className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs text-base-content/80 truncate">{f.filename}</p>
                              <p className="text-[10px] text-base-content/40 mt-0.5">{(f.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <a
                              href={`${backendUrl}/files/${id}/${encodeURIComponent(f.filename)}`}
                              download={f.filename}
                              className="btn btn-ghost btn-xs btn-square shrink-0"
                              title={`Download ${f.filename}`}
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 text-base-content/50" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full report â€” collapsible */}
                  <div className="bg-base-100 rounded-2xl border border-base-200 overflow-hidden">
                    <button
                      onClick={() => setReportExpanded(p => !p)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-base-200/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary-content">AI</span>
                        </div>
                        <span className="font-bold text-base-content">Full AI Evaluation Report</span>
                      </div>
                      <span className="text-base-content/40 text-sm">
                        {reportExpanded ? "â–² collapse" : "â–¼ expand"}
                      </span>
                    </button>
                    {reportExpanded && (
                      <div className="px-6 pb-6">
                        <div className="bg-base-200 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                          <pre className="text-sm text-base-content/80 leading-relaxed whitespace-pre-wrap font-sans">
                            {report.detailed_report}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-60 shrink-0 space-y-3">
              {isEvaluating && (
                <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Status</p>
                  <p className="text-xs text-base-content/60 leading-relaxed">
                    AI is analyzing your files. This page refreshes every 5 seconds.
                  </p>
                </div>
              )}

              {isDone && (
                <>
                  {isClient ? (
                    /* Client: Review Actions */
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">
                        Review Actions
                      </h2>
                      <div className="space-y-2">
                        <button
                          className="btn btn-primary w-full gap-2 h-14 text-sm"
                          onClick={handleApprove}
                          disabled={approveLoading || approved}
                        >
                          {approveLoading ? (
                            <>
                              <span className="loading loading-spinner loading-xs" /> Processingâ€¦
                            </>
                          ) : approved ? (
                            <>
                              <CheckCircleIcon className="w-5 h-5" /> Payment Released
                            </>
                          ) : (
                            <>
                              <CurrencyDollarIcon className="w-5 h-5" /> Approve &amp; Release Payment
                            </>
                          )}
                        </button>
                        <button className="btn btn-outline w-full gap-2">
                          <ArrowPathIcon className="w-4 h-4" />
                          Request Changes
                        </button>
                        <Link
                          href={`/disputes/${id}/defense`}
                          className="btn w-full gap-2 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          Open Dispute
                        </Link>
                      </div>
                      <p className="text-[10px] text-base-content/40 leading-relaxed mt-3 text-center">
                        Only use Dispute if direct communication fails.
                      </p>
                    </div>
                  ) : (
                    /* Freelancer: What Happens Next + View Results */
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-5 space-y-4">
                      <div>
                        <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                          What Happens Next
                        </p>
                        <div className="space-y-3">
                          {[
                            { step: "1", text: "Client reviews this AI report" },
                            { step: "2", text: "Client approves, rejects, or escalates to DAO" },
                            { step: "3", text: "Escrow released on approval" },
                          ].map(({ step, text }) => (
                            <div key={step} className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-bold text-primary">{step}</span>
                              </div>
                              <p className="text-xs text-base-content/60 leading-relaxed">{text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={goToFreelancerResults} className="btn btn-outline btn-sm w-full gap-2">
                        <CheckCircleIcon className="w-4 h-4" />
                        View My Evaluation Results
                      </button>
                    </div>
                  )}

                  {/* Issue count summary */}
                  {(report?.code_issues ?? []).length > 0 && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                        Issues by Severity
                      </p>
                      <div className="space-y-2">
                        {["critical", "high", "medium", "low"].map(sev => {
                          const count = (report?.code_issues ?? []).filter(i => i.severity === sev).length;
                          if (!count) return null;
                          const s = sevStyle(sev);
                          return (
                            <div key={sev} className="flex items-center justify-between">
                              <span className={`text-xs font-semibold capitalize ${s.text}`}>{sev}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-base-200/50 rounded-2xl border border-base-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-base-content/40" />
                  <p className="text-sm font-bold text-base-content">Incorrect evaluation?</p>
                </div>
                <p className="text-xs text-base-content/55 leading-relaxed">
                  If the AI result seems wrong, the client can escalate to DAO for a human review.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* removed modal â€” results are now at /my-tasks/[id]/results */}
        {false && (
          <div>
            <div className="bg-base-100 rounded-3xl border border-base-200 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              {isClient ? (
                /* â”€â”€ CLIENT VIEW â”€â”€ */
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-base-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base-content text-lg">Payment Released!</h2>
                        <p className="text-xs text-base-content/50">Escrow funds sent to freelancer wallet</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowResultModal(false)}
                      className="btn btn-ghost btn-sm btn-square text-base-content/40"
                    >
                      âœ•
                    </button>
                  </div>

                  {/* Submitted files */}
                  <div className="p-6 border-b border-base-200">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      Submitted Files
                    </p>
                    {submittedFiles.length === 0 ? (
                      <p className="text-xs text-base-content/40 italic">Files were removed after payment release.</p>
                    ) : (
                      <div className="space-y-2">
                        {submittedFiles.map(f => (
                          <div
                            key={f.filename}
                            className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3"
                          >
                            <CodeBracketIcon className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs text-base-content/80 truncate">{f.filename}</p>
                              <p className="text-[10px] text-base-content/40 mt-0.5">{(f.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <a
                              href={`${backendUrl}/files/${id}/${encodeURIComponent(f.filename)}`}
                              download={f.filename}
                              className="btn btn-ghost btn-xs btn-square shrink-0"
                              title={`Download ${f.filename}`}
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 text-base-content/50" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Freelancer gains applied */}
                  {approveResult && (
                    <div className="p-6">
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                        Freelancer Gains Applied
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-success/8 border border-success/20 rounded-2xl p-4 text-center">
                          <p className="text-2xl font-bold text-success">+{approveResult!.reputation_delta}</p>
                          <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">Reputation</p>
                        </div>
                        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-center">
                          <p className="text-2xl font-bold text-primary">+{approveResult!.elo.elo_delta}</p>
                          <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">ELO</p>
                        </div>
                      </div>
                      {approveResult!.elo.tier_changed && (
                        <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-2 mb-3">
                          <span className="text-warning text-base">â˜…</span>
                          <p className="text-xs font-semibold text-warning">
                            Tier up! {approveResult!.elo.old_tier} â†’ {approveResult!.elo.new_tier}
                          </p>
                        </div>
                      )}
                      {Object.keys(approveResult!.skill_changes).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                            Skills Updated
                          </p>
                          <div className="space-y-1.5">
                            {Object.entries(approveResult!.skill_changes).map(([skill, level]) => (
                              <div key={skill} className="flex items-center justify-between text-xs">
                                <span className="text-base-content/70 capitalize">{skill}</span>
                                <span className="font-bold text-primary">
                                  {level.toFixed(1)}
                                  <span className="text-base-content/40 font-normal">/10</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* â”€â”€ FREELANCER VIEW â”€â”€ */
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-base-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                        <ShieldCheckIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base-content text-lg">Your Evaluation Results</h2>
                        <p className="text-xs text-base-content/50">
                          {approveResult ? "Approved â€” gains applied" : "Pending client decision"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowResultModal(false)}
                      className="btn btn-ghost btn-sm btn-square text-base-content/40"
                    >
                      âœ•
                    </button>
                  </div>

                  {/* Rank / ELO gained */}
                  <div className="p-6 border-b border-base-200">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      {approveResult ? "Gains Applied" : "Estimated Gains on Approval"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-success/8 border border-success/20 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-success">
                          +{approveResult?.reputation_delta ?? report?.suggested_reputation_delta ?? "â€”"}
                        </p>
                        <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">Reputation</p>
                      </div>
                      <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-primary">+{approveResult?.elo.elo_delta ?? "~?"}</p>
                        <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">ELO</p>
                      </div>
                    </div>
                    {approveResult?.elo.tier_changed && (
                      <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-2 mt-3">
                        <span className="text-warning text-base">â˜…</span>
                        <p className="text-xs font-semibold text-warning">
                          Tier up! {approveResult!.elo.old_tier} â†’ {approveResult!.elo.new_tier}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Skills improved */}
                  {(() => {
                    const skills: Record<string, number> = approveResult
                      ? approveResult!.skill_changes
                      : report?.suggested_skills
                        ? Object.fromEntries(
                            Object.entries(report!.suggested_skills!).map(([k, v]) => [k, v.new_level]),
                          )
                        : {};
                    const entries = Object.entries(skills);
                    if (!entries.length) return null;
                    return (
                      <div className="p-6 border-b border-base-200">
                        <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                          Skills {approveResult ? "Updated" : "Suggested"}
                        </p>
                        <div className="space-y-3">
                          {entries.map(([skill, level]) => (
                            <div key={skill}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-base-content/70 capitalize font-medium">{skill}</span>
                                <span className="font-bold text-primary">
                                  {(level as number).toFixed(1)}
                                  <span className="text-base-content/40 font-normal">/10</span>
                                </span>
                              </div>
                              <div className="w-full bg-base-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-primary transition-all duration-700"
                                  style={{ width: `${((level as number) / 10) * 100}%` }}
                                />
                              </div>
                              {!approveResult && report?.suggested_skills?.[skill]?.reasoning && (
                                <p className="text-[10px] text-base-content/40 mt-1 leading-relaxed">
                                  {report.suggested_skills[skill].reasoning}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment */}
                  <div className="p-6">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Payment</p>
                    {approveResult ? (
                      <div className="bg-success/8 border border-success/20 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-success shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-success">Escrow released to your wallet</p>
                          <p className="text-xs text-base-content/50 mt-0.5">
                            Check your connected wallet for the NXR transfer.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
                        <ClockIcon className="w-5 h-5 text-base-content/40 shrink-0" />
                        <p className="text-xs text-base-content/60">
                          Payment will be released to your wallet once the client approves.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-base-200 rounded-xl p-1 w-fit">{views.map(navTab)}</div>

        {/* BIDS VIEW */}
        {view === "bids" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              {/* Job details from chain */}
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                {!job ? (
                  <div className="flex items-center gap-2 text-base-content/40 text-sm">
                    <span className="loading loading-spinner loading-xs" />
                    Loading job from blockchain…
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                            {isJobOpen ? "Open for Bids" : "Closed"}
                          </span>
                          <span className="text-xs text-base-content/40 font-mono">Job #{job.id.toString()}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-base-content">{job.title}</h1>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">
                          Total Budget
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR
                        </p>
                      </div>
                    </div>
                    <hr className="border-base-200 mb-4" />
                    <div className="flex items-center gap-10 mb-5">
                      <div>
                        <p className="text-xs text-base-content/40 mb-1">Deadline</p>
                        <p className="text-sm font-medium text-base-content flex items-center gap-1.5">
                          <ClockIcon className="w-4 h-4 text-base-content/40" />
                          {new Date(Number(job.deadline) * 1000).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-base-content/40 mb-1">Complexity</p>
                        <p className="text-sm font-medium text-base-content flex items-center gap-1.5">
                          <BoltIcon className="w-4 h-4 text-base-content/40" />
                          {Number(formatEther(job.budget)) < 500
                            ? "Entry Level"
                            : Number(formatEther(job.budget)) < 2000
                              ? "Intermediate"
                              : "Expert"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-bold tracking-widest text-base-content/40 uppercase mb-2">Description</p>
                    <p className="text-sm text-base-content/70 leading-relaxed mb-4 whitespace-pre-wrap">
                      {job.description}
                    </p>
                    {job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((s: string) => (
                          <span
                            key={s}
                            className="text-xs border border-base-300 text-base-content/70 px-2.5 py-1 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bids from chain */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-base-content">
                    Bids Received <span className="text-base-content/40 font-normal">({bidCount})</span>
                  </h2>
                </div>

                {bidCount === 0 ? (
                  <div className="bg-base-100 rounded-2xl border border-base-200 p-10 text-center text-sm text-base-content/40">
                    No bids yet. Share your job to attract freelancers.
                  </div>
                ) : !bidResults ? (
                  <div className="flex items-center gap-2 text-base-content/40 text-sm py-4">
                    <span className="loading loading-spinner loading-xs" />
                    Loading bids…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chainBids.map(bid => (
                      <div
                        key={bid.index}
                        className={`bg-base-100 rounded-2xl border p-5 transition-colors ${bid.accepted ? "border-success/40 bg-success/5" : "border-base-200"}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                              <span className="text-sm font-bold text-primary">
                                {bid.freelancer.slice(2, 4).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-base-content text-sm font-mono">
                                {bid.freelancer.slice(0, 6)}…{bid.freelancer.slice(-4)}
                              </p>
                              <p className="text-[11px] text-base-content/40">Applicant #{bid.index + 1}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-primary">
                              {Number(formatEther(bid.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                              NXR
                            </p>
                            {bid.accepted && <span className="text-[11px] text-success font-semibold">✓ Accepted</span>}
                          </div>
                        </div>
                        <p className="text-sm text-base-content/65 leading-relaxed mb-4 whitespace-pre-wrap">
                          {bid.proposal}
                        </p>
                        {!bid.accepted && isJobOpen && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAccept(bid.index)}
                              disabled={isAccepting || acceptingIndex !== null}
                              className="btn btn-primary btn-sm"
                            >
                              {acceptingIndex === bid.index && <span className="loading loading-spinner loading-xs" />}
                              {acceptingIndex === bid.index ? "Accepting…" : "Accept Bid"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase">Escrow Status</h2>
                  <ShieldCheckIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2.5 mb-4">
                  <LockClosedIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-primary">Funds Locked</p>
                    <p className="text-xs text-base-content/60 leading-relaxed mt-0.5">
                      {job
                        ? `${Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR secured in escrow.`
                        : "Loading…"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs mb-4">
                  {job && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-base-content/50">Amount Locked</span>
                        <span className="font-semibold text-base-content">
                          {Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/50">Release Condition</span>
                        <span className="font-semibold text-base-content">On completion</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">Bid Summary</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                      <UserGroupIcon className="w-4 h-4 text-info" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-base-content">
                        {bidCount} Bid{bidCount !== 1 ? "s" : ""} Received
                      </p>
                      <p className="text-[10px] text-base-content/40 mt-0.5">Live from blockchain</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE VIEW */}
        {view === "active" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              {/* Task header */}
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                        Active Task
                      </span>
                      <span className="text-xs text-base-content/40 font-mono">#{id.padStart(4, "0")}</span>
                    </div>
                    {job ? (
                      <>
                        <h1 className="text-2xl font-bold text-base-content mb-2">{job.title}</h1>
                        <p className="text-sm text-base-content/60 leading-relaxed">{job.description}</p>
                      </>
                    ) : (
                      <>
                        <div className="h-7 bg-base-200 rounded-lg animate-pulse w-64 mb-2" />
                        <div className="h-4 bg-base-200 rounded animate-pulse w-full" />
                      </>
                    )}
                  </div>
                  <button
                    className="btn btn-outline btn-sm gap-2 shrink-0"
                    onClick={() => !isClient && router.push(`/my-tasks/${id}/upload`)}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    {isClient ? "Request Update" : "Submit Work"}
                  </button>
                </div>
              </div>

              {/* AI Task Rating */}
              {taskRating && (
                <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary-content">AI</span>
                    </div>
                    <h2 className="font-bold text-base-content">AI Task Analysis</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
                        Task Rating
                      </p>
                      <div className="flex items-end gap-1">
                        <p className="text-2xl font-bold text-primary">{taskRating.task_rating}</p>
                        <p className="text-sm text-base-content/40 mb-0.5">/100</p>
                      </div>
                      <div className="w-full bg-base-200 rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${taskRating.task_rating}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
                        Complexity
                      </p>
                      <div className="flex items-end gap-1">
                        <p className="text-2xl font-bold text-warning">{taskRating.complexity_score}</p>
                        <p className="text-sm text-base-content/40 mb-0.5">/1000</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-base-content/60 leading-relaxed">{taskRating.reasoning}</p>
                </div>
              )}

              {/* Task details */}
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <h2 className="font-bold text-base-content mb-4">Task Details</h2>
                <div className="grid grid-cols-2 gap-5 mb-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">Budget</p>
                    <p className="text-xl font-bold text-primary">
                      {job
                        ? `${Number(formatEther(job.budget)).toLocaleString(undefined, { maximumFractionDigits: 2 })} NXR`
                        : "â€”"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">
                      Deadline
                    </p>
                    <p className="text-sm font-semibold text-base-content">
                      {job ? new Date(Number(job.deadline) * 1000).toLocaleDateString() : "â€”"}
                    </p>
                  </div>
                </div>
                {job && job.skills.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map(skill => (
                        <span
                          key={skill}
                          className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!job && (
                  <div className="space-y-2">
                    <div className="h-3 bg-base-200 rounded animate-pulse w-1/3" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-base-200 rounded-full animate-pulse w-16" />
                      <div className="h-6 bg-base-200 rounded-full animate-pulse w-20" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar â€” assigned counterparty */}
            <div className="w-64 shrink-0">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6 text-center">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                  {isClient ? "Assigned Freelancer" : "Client"}
                </p>
                {hasCounterparty && counterpartyAddr ? (
                  <>
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={blo(counterpartyAddr)} alt="avatar" className="w-full h-full rounded-full" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-base-100">
                        <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <span className="font-bold text-base-content text-sm">
                        {counterpartyAddr.slice(0, 6)}â€¦{counterpartyAddr.slice(-4)}
                      </span>
                      <CheckBadgeIcon className="w-4 h-4 text-primary" />
                    </div>
                    {cpTier && (
                      <div className="mb-4">
                        <span className="text-[10px] font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <span>â—†</span>
                          {cpTier.toUpperCase()} ELO
                          {cpElo != null && <span className="opacity-60 ml-1">({cpElo})</span>}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-4">
                    {!job ? (
                      <>
                        <div className="w-20 h-20 rounded-full bg-base-200 animate-pulse mx-auto mb-4" />
                        <div className="h-4 bg-base-200 rounded animate-pulse w-3/4 mx-auto" />
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                          <UserCircleIcon className="w-10 h-10 text-base-content/20" />
                        </div>
                        <p className="text-sm text-base-content/40">No freelancer assigned yet</p>
                      </>
                    )}
                  </div>
                )}
                {!isClient && (
                  <button
                    className="btn btn-primary w-full gap-2 mt-2"
                    onClick={() => router.push(`/my-tasks/${id}/upload`)}
                  >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Submit Task
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REVIEW VIEW */}
        {view === "review" &&
          (() => {
            const noSubmission = !report;
            const isEvaluating = report?.status === "evaluating";
            const isReady = report && report.status !== "evaluating" && report.status !== "error";
            const isError = report?.status === "error";

            const rec = report?.recommendation;
            const recConfig: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> =
              {
                approve: {
                  bg: "bg-success/10",
                  border: "border-success/30",
                  text: "text-success",
                  label: "AI Recommends Approval",
                  icon: "✓",
                },
                reject: {
                  bg: "bg-error/10",
                  border: "border-error/30",
                  text: "text-error",
                  label: "AI Recommends Rejection",
                  icon: "✗",
                },
                escalate_to_dao: {
                  bg: "bg-warning/10",
                  border: "border-warning/30",
                  text: "text-warning",
                  label: "AI: Escalate to DAO",
                  icon: "⚠",
                },
              };
            const recStyle = rec
              ? (recConfig[rec] ?? {
                  bg: "bg-base-200",
                  border: "border-base-300",
                  text: "text-base-content",
                  label: rec,
                  icon: "?",
                })
              : null;
            const sevStyle = (s: string) => {
              if (s === "critical")
                return { badge: "bg-error text-error-content", bar: "bg-error", text: "text-error" };
              if (s === "high")
                return { badge: "bg-warning text-warning-content", bar: "bg-warning", text: "text-warning" };
              if (s === "medium") return { badge: "bg-info text-info-content", bar: "bg-info", text: "text-info" };
              return { badge: "bg-base-300 text-base-content", bar: "bg-base-300", text: "text-base-content/60" };
            };
            const conf = report?.confidence_score ?? 0;
            const confColor = conf >= 70 ? "text-success" : conf >= 40 ? "text-warning" : "text-error";
            const confBarColor = conf >= 70 ? "bg-success" : conf >= 40 ? "bg-warning" : "bg-error";
            const metCount = (report?.requirements_check ?? []).filter(r => r.met).length;
            const totalCount = (report?.requirements_check ?? []).length;

            return (
              <div className="flex gap-5 items-start">
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <Link
                      href="/my-tasks"
                      className="w-8 h-8 rounded-lg border border-base-300 flex items-center justify-center hover:bg-base-200 transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4 text-base-content/60" />
                    </Link>
                    <div>
                      <h1 className="text-lg font-bold text-base-content leading-tight">Submission Review</h1>
                      <p className="text-xs text-base-content/40 font-mono mt-0.5">Task #{id}</p>
                    </div>
                    <div className="ml-auto">
                      {noSubmission && (
                        <span className="bg-base-200 text-base-content/50 text-xs font-semibold px-3 py-1.5 rounded-full">
                          No submission yet
                        </span>
                      )}
                      {isEvaluating && (
                        <span className="flex items-center gap-2 bg-warning/10 text-warning text-xs font-semibold px-3 py-1.5 rounded-full">
                          <span className="loading loading-spinner loading-xs" /> AI Evaluating…
                        </span>
                      )}
                      {isError && <span className="badge badge-error badge-lg">Evaluation Error</span>}
                    </div>
                  </div>

                  {noSubmission && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-12 flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center mb-5">
                        <ArrowUpTrayIcon className="w-8 h-8 text-base-content/20" />
                      </div>
                      <h2 className="text-xl font-bold text-base-content mb-2">No solution submitted yet</h2>
                      <p className="text-sm text-base-content/50 max-w-sm">
                        The freelancer has not submitted their work. Review actions will unlock once a submission is
                        received.
                      </p>
                    </div>
                  )}

                  {isEvaluating && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-12 flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                        <span className="loading loading-spinner loading-lg text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-base-content mb-2">AI is reviewing the submission</h2>
                      <p className="text-sm text-base-content/50 max-w-sm">
                        Analyzing code quality, security, and task completion. Updates automatically.
                      </p>
                    </div>
                  )}

                  {isError && (
                    <div className="bg-base-100 rounded-2xl border border-error/30 p-10 flex flex-col items-center text-center">
                      <ExclamationTriangleIcon className="w-12 h-12 text-error mb-4" />
                      <h2 className="text-xl font-bold text-base-content mb-2">Evaluation failed</h2>
                      <p className="text-sm text-base-content/50">Check the backend logs for details.</p>
                    </div>
                  )}

                  {isReady && report && (
                    <>
                      {recStyle && (
                        <div
                          className={`rounded-2xl border ${recStyle.bg} ${recStyle.border} p-5 flex items-center gap-4`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${recStyle.bg} border ${recStyle.border} ${recStyle.text}`}
                          >
                            {recStyle.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-lg ${recStyle.text}`}>{recStyle.label}</p>
                            <p className="text-xs text-base-content/50 mt-0.5">
                              Confidence:{" "}
                              <span className={`font-semibold ${confColor}`}>{report.confidence_score}%</span>
                              {totalCount > 0 && (
                                <span className="ml-3">
                                  Requirements:{" "}
                                  <span className="font-semibold text-base-content">
                                    {metCount}/{totalCount} met
                                  </span>
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">
                              Complexity
                            </p>
                            <p className="text-2xl font-bold text-base-content">
                              {report.task_complexity}
                              <span className="text-sm font-normal text-base-content/40">/1000</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {((report.files_submitted ?? []).length > 0 || (report.files_missing ?? []).length > 0) && (
                        <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                          <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                            Files
                          </p>
                          <div className="flex gap-4 flex-wrap">
                            {(report.files_submitted ?? []).length > 0 && (
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-success mb-2">
                                  Submitted ({report.files_submitted.length})
                                </p>
                                <div className="space-y-1">
                                  {report.files_submitted.map(f => (
                                    <div
                                      key={f}
                                      className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-1.5"
                                    >
                                      <span className="text-success text-xs">✓</span>
                                      <span className="font-mono text-xs text-base-content/80 truncate flex-1">
                                        {f}
                                      </span>
                                      <a
                                        href={`${backendUrl}/files/${id}/${encodeURIComponent(f)}`}
                                        download={f}
                                        className="btn btn-ghost btn-xs btn-square shrink-0"
                                      >
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5 text-base-content/50" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(report.files_missing ?? []).length > 0 && (
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-error mb-2">
                                  Missing ({report.files_missing.length})
                                </p>
                                <div className="space-y-1">
                                  {report.files_missing.map(f => (
                                    <div
                                      key={f}
                                      className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg px-3 py-1.5"
                                    >
                                      <span className="text-error text-xs">✗</span>
                                      <span className="font-mono text-xs text-base-content/80 truncate">{f}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold tracking-widest text-base-content/40 uppercase">
                            Quality Score
                          </p>
                          <p className={`text-2xl font-bold ${confColor}`}>{report.confidence_score}%</p>
                        </div>
                        <div className="w-full bg-base-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-700 ${confBarColor}`}
                            style={{ width: `${report.confidence_score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-base-content/30 mt-1.5">
                          <span>Empty / Dangerous</span>
                          <span>Acceptable</span>
                          <span>Production Ready</span>
                        </div>
                      </div>

                      {(report.requirements_check ?? []).length > 0 && (
                        <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base-content">Task Requirements</h2>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${metCount === totalCount ? "bg-success/15 text-success" : metCount === 0 ? "bg-error/15 text-error" : "bg-warning/15 text-warning"}`}
                            >
                              {metCount}/{totalCount} met
                            </span>
                          </div>
                          <div className="space-y-2">
                            {report.requirements_check.map((req, i) => (
                              <div
                                key={i}
                                className={`rounded-xl p-4 border ${req.met ? "bg-success/5 border-success/20" : "bg-error/5 border-error/20"}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${req.met ? "bg-success text-success-content" : "bg-error text-error-content"}`}
                                  >
                                    {req.met ? "✓" : "✗"}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-base-content">{req.requirement}</p>
                                    <p
                                      className={`text-xs mt-1 leading-relaxed ${req.met ? "text-base-content/60" : "text-error/80"}`}
                                    >
                                      {req.detail}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(report.code_issues ?? []).length > 0 && (
                        <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-base-content">Code Issues</h2>
                            <div className="flex gap-1.5">
                              {["critical", "high", "medium", "low"].map(sev => {
                                const count = report.code_issues.filter(i => i.severity === sev).length;
                                if (!count) return null;
                                const s = sevStyle(sev);
                                return (
                                  <span
                                    key={sev}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}
                                  >
                                    {count} {sev}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-3">
                            {report.code_issues.map((issue, i) => {
                              const s = sevStyle(issue.severity);
                              return (
                                <div key={i} className="rounded-xl border border-base-200 overflow-hidden">
                                  <div className="flex items-center gap-0 bg-base-200">
                                    <div className={`w-1 self-stretch ${s.bar}`} />
                                    <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${s.badge}`}
                                      >
                                        {issue.severity}
                                      </span>
                                      <p className="text-sm font-semibold text-base-content truncate">{issue.issue}</p>
                                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] font-mono bg-base-300 text-base-content/70 px-2 py-0.5 rounded">
                                          {issue.file}
                                        </span>
                                        <span className="text-[10px] font-mono bg-base-300 text-base-content/50 px-1.5 py-0.5 rounded">
                                          :{issue.line}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="px-5 py-3 bg-base-100">
                                    <p className="text-xs text-base-content/70 leading-relaxed">{issue.detail}</p>
                                    {issue.snippet && (
                                      <div className="mt-2 bg-base-content/5 border border-base-200 rounded-lg px-3 py-2 font-mono text-xs text-base-content/80 overflow-x-auto">
                                        <span className="text-base-content/30 select-none mr-2">{issue.line}</span>
                                        {issue.snippet}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {submittedFiles.length > 0 && (
                        <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                          <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                            Submission Files
                          </p>
                          <div className="space-y-2">
                            {submittedFiles.map(f => (
                              <div
                                key={f.filename}
                                className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3"
                              >
                                <CodeBracketIcon className="w-4 h-4 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-xs text-base-content/80 truncate">{f.filename}</p>
                                  <p className="text-[10px] text-base-content/40 mt-0.5">
                                    {(f.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <a
                                  href={`${backendUrl}/files/${id}/${encodeURIComponent(f.filename)}`}
                                  download={f.filename}
                                  className="btn btn-ghost btn-xs btn-square shrink-0"
                                >
                                  <ArrowDownTrayIcon className="w-4 h-4 text-base-content/50" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-base-100 rounded-2xl border border-base-200 overflow-hidden">
                        <button
                          onClick={() => setReportExpanded(p => !p)}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-base-200/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-primary-content">AI</span>
                            </div>
                            <span className="font-bold text-base-content">Full AI Evaluation Report</span>
                          </div>
                          <span className="text-base-content/40 text-sm">
                            {reportExpanded ? "▲ collapse" : "▼ expand"}
                          </span>
                        </button>
                        {reportExpanded && (
                          <div className="px-6 pb-6">
                            <div className="bg-base-200 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                              <pre className="text-sm text-base-content/80 leading-relaxed whitespace-pre-wrap font-sans">
                                {report.detailed_report}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sidebar */}
                <div className="w-60 shrink-0 space-y-3">
                  <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                    <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">
                      Review Actions
                    </h2>
                    {noSubmission || isEvaluating ? (
                      <div className="space-y-2">
                        <div className="rounded-xl border-2 border-dashed border-base-300 p-4 text-center mb-1">
                          <p className="text-xs text-base-content/40 leading-relaxed">
                            {noSubmission
                              ? "Buttons unlock once the freelancer submits their solution."
                              : "Waiting for AI evaluation to complete."}
                          </p>
                        </div>
                        <button
                          disabled
                          className="btn btn-primary w-full gap-2 h-14 text-sm opacity-40 cursor-not-allowed"
                        >
                          <CurrencyDollarIcon className="w-5 h-5" /> Approve &amp; Release Payment
                        </button>
                        <button disabled className="btn btn-outline w-full gap-2 opacity-40 cursor-not-allowed">
                          <ArrowPathIcon className="w-4 h-4" /> Request Changes
                        </button>
                        <button
                          disabled
                          className="btn w-full gap-2 opacity-40 cursor-not-allowed bg-orange-50 border-orange-200 text-orange-600"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" /> Open Dispute
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          className="btn btn-primary w-full gap-2 h-14 text-sm"
                          onClick={handleApprove}
                          disabled={approveLoading || approved}
                        >
                          {approveLoading ? (
                            <>
                              <span className="loading loading-spinner loading-xs" /> Processing…
                            </>
                          ) : approved ? (
                            <>
                              <CheckCircleIcon className="w-5 h-5" /> Payment Released
                            </>
                          ) : (
                            <>
                              <CurrencyDollarIcon className="w-5 h-5" /> Approve &amp; Release Payment
                            </>
                          )}
                        </button>
                        <button className="btn btn-outline w-full gap-2">
                          <ArrowPathIcon className="w-4 h-4" /> Request Changes
                        </button>
                        <Link
                          href={`/disputes/${id}/defense`}
                          className="btn w-full gap-2 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" /> Open Dispute
                        </Link>
                      </div>
                    )}
                    <p className="text-[10px] text-base-content/40 leading-relaxed mt-3 text-center">
                      Only use Dispute if direct communication fails.
                    </p>
                  </div>

                  {isReady && (report?.code_issues ?? []).length > 0 && (
                    <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                        Issues by Severity
                      </p>
                      <div className="space-y-2">
                        {["critical", "high", "medium", "low"].map(sev => {
                          const count = (report?.code_issues ?? []).filter(i => i.severity === sev).length;
                          if (!count) return null;
                          const sevColors: Record<string, string> = {
                            critical: "text-error",
                            high: "text-warning",
                            medium: "text-info",
                            low: "text-base-content/60",
                          };
                          const sevBadges: Record<string, string> = {
                            critical: "bg-error text-error-content",
                            high: "bg-warning text-warning-content",
                            medium: "bg-info text-info-content",
                            low: "bg-base-300 text-base-content",
                          };
                          return (
                            <div key={sev} className="flex items-center justify-between">
                              <span className={`text-xs font-semibold capitalize ${sevColors[sev]}`}>{sev}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sevBadges[sev]}`}>
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-base-200/50 rounded-2xl border border-base-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-base-content/40" />
                      <p className="text-sm font-bold text-base-content">Incorrect evaluation?</p>
                    </div>
                    <p className="text-xs text-base-content/55 leading-relaxed">
                      If the AI result seems wrong, escalate to DAO for a human review.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </AppLayout>
  );
}
