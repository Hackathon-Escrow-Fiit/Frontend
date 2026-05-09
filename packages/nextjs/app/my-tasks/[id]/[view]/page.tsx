"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeBracketIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid, ExclamationCircleIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Role = "client" | "freelancer";

const bids = [
  {
    id: "1",
    name: "crypto_wizard.eth",
    tier: "Gold Tier",
    tierColor: "bg-yellow-100 text-yellow-700",
    amount: "12,000 USDC",
    days: 14,
    bio: "I've built three production-grade DeFi dashboards in the last 6 months. Expert at optimizing subgraph queries for sub-second latency. Can start immediately and...",
    verified: true,
  },
  {
    id: "2",
    name: "degen_stacker.eth",
    tier: "Silver Tier",
    tierColor: "bg-base-200 text-base-content/60",
    amount: "14,500 USDC",
    days: 21,
    bio: "Full-stack engineer with deep React knowledge. Previously lead frontend at a Tier 1 DEX. My focus is on pixel-perfect UI and extreme security.",
    verified: false,
  },
];

const activityItems = [
  {
    Icon: CodeBracketIcon,
    text: (
      <>
        Pushed updates to <span className="text-primary cursor-pointer hover:underline">audit-repo-v2</span>
      </>
    ),
    time: "2 hours ago",
  },
  { Icon: DocumentTextIcon, text: "Generated Milestone 1 PDF Report", time: "Yesterday" },
  { Icon: ChatBubbleLeftEllipsisIcon, text: "Replied to feedback thread", time: "Yesterday" },
];

const submissionChecks = [
  { label: "Code Quality", result: "PASS", pass: true },
  { label: "Security Protocols", result: "PASS", pass: true },
  { label: "Documentation", result: "PASS", pass: true },
  { label: "Gas Optimization", result: "MINOR ISSUE", pass: false },
];

const DonutChart = ({ score }: { score: number }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-base-200" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        className="text-primary transition-all duration-700"
      />
    </svg>
  );
};

export default function TaskViewPage() {
  const { id, view } = useParams<{ id: string; view: string }>();
  const router = useRouter();
  const [role, setRole] = useState<Role>("client");

  // ── AI report polling (waiting view only) ────────────────────────
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
  const [report, setReport] = useState<Report | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);
  type SubmittedFile = { filename: string; size: number };
  const [submittedFiles, setSubmittedFiles] = useState<SubmittedFile[]>([]);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  useEffect(() => {
    const stored = localStorage.getItem("dw_role");
    if (stored === "freelancer" || stored === "client") setRole(stored as Role);
  }, []);

  useEffect(() => {
    if (view !== "waiting") return;

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
  }, [view, id]);

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
    sessionStorage.setItem(
      `dw_results_${id}`,
      JSON.stringify({ role: "freelancer", report, submittedFiles }),
    );
    router.push(`/my-tasks/${id}/results`);
  };

  const isClient = role === "client";
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

  /* ── WAITING VIEW ── */
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
                  <span className="loading loading-spinner loading-xs" /> AI Evaluating…
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
                                  <span className="text-success text-xs">✓</span>
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

                  {/* Submission files — fetched directly from backend */}
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

                  {/* Full report — collapsible */}
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
                      <span className="text-base-content/40 text-sm">{reportExpanded ? "▲ collapse" : "▼ expand"}</span>
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
                            <><span className="loading loading-spinner loading-xs" /> Processing…</>
                          ) : approved ? (
                            <><CheckCircleIcon className="w-5 h-5" /> Payment Released</>
                          ) : (
                            <><CurrencyDollarIcon className="w-5 h-5" /> Approve &amp; Release Payment</>
                          )}
                        </button>
                        <button className="btn btn-outline w-full gap-2">
                          <ArrowPathIcon className="w-4 h-4" />
                          Request Changes
                        </button>
                        <button className="btn w-full gap-2 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          Open Dispute
                        </button>
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
                      <button
                        onClick={goToFreelancerResults}
                        className="btn btn-outline btn-sm w-full gap-2"
                      >
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

        {/* removed modal — results are now at /my-tasks/[id]/results */}
        {false && (
          <div>
            <div className="bg-base-100 rounded-3xl border border-base-200 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

              {isClient ? (
                /* ── CLIENT VIEW ── */
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
                    <button onClick={() => setShowResultModal(false)} className="btn btn-ghost btn-sm btn-square text-base-content/40">✕</button>
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
                          <div key={f.filename} className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3">
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
                          <p className="text-2xl font-bold text-success">+{approveResult.reputation_delta}</p>
                          <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">Reputation</p>
                        </div>
                        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-center">
                          <p className="text-2xl font-bold text-primary">+{approveResult.elo.elo_delta}</p>
                          <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">ELO</p>
                        </div>
                      </div>
                      {approveResult.elo.tier_changed && (
                        <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-2 mb-3">
                          <span className="text-warning text-base">★</span>
                          <p className="text-xs font-semibold text-warning">
                            Tier up! {approveResult.elo.old_tier} → {approveResult.elo.new_tier}
                          </p>
                        </div>
                      )}
                      {Object.keys(approveResult.skill_changes).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">Skills Updated</p>
                          <div className="space-y-1.5">
                            {Object.entries(approveResult.skill_changes).map(([skill, level]) => (
                              <div key={skill} className="flex items-center justify-between text-xs">
                                <span className="text-base-content/70 capitalize">{skill}</span>
                                <span className="font-bold text-primary">{level.toFixed(1)}<span className="text-base-content/40 font-normal">/10</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* ── FREELANCER VIEW ── */
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
                          {approveResult ? "Approved — gains applied" : "Pending client decision"}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setShowResultModal(false)} className="btn btn-ghost btn-sm btn-square text-base-content/40">✕</button>
                  </div>

                  {/* Rank / ELO gained */}
                  <div className="p-6 border-b border-base-200">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      {approveResult ? "Gains Applied" : "Estimated Gains on Approval"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-success/8 border border-success/20 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-success">
                          +{approveResult?.reputation_delta ?? report?.suggested_reputation_delta ?? "—"}
                        </p>
                        <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">Reputation</p>
                      </div>
                      <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-primary">
                          +{approveResult?.elo.elo_delta ?? "~?"}
                        </p>
                        <p className="text-[10px] text-base-content/50 mt-1 uppercase tracking-wider">ELO</p>
                      </div>
                    </div>
                    {approveResult?.elo.tier_changed && (
                      <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-2 mt-3">
                        <span className="text-warning text-base">★</span>
                        <p className="text-xs font-semibold text-warning">
                          Tier up! {approveResult.elo.old_tier} → {approveResult.elo.new_tier}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Skills improved */}
                  {(() => {
                    const skills = approveResult
                      ? approveResult.skill_changes
                      : report?.suggested_skills
                        ? Object.fromEntries(Object.entries(report.suggested_skills).map(([k, v]) => [k, v.new_level]))
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
                                <span className="font-bold text-primary">{(level as number).toFixed(1)}<span className="text-base-content/40 font-normal">/10</span></span>
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
                          <p className="text-xs text-base-content/50 mt-0.5">Check your connected wallet for the NXR transfer.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
                        <ClockIcon className="w-5 h-5 text-base-content/40 shrink-0" />
                        <p className="text-xs text-base-content/60">Payment will be released to your wallet once the client approves.</p>
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
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                        Active Project
                      </span>
                      <span className="text-xs text-base-content/40 font-mono">ID: #DW-8829-X</span>
                    </div>
                    <h1 className="text-2xl font-bold text-base-content">Next-Gen DeFi Dashboard</h1>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">Total Budget</p>
                    <p className="text-2xl font-bold text-primary">15,000 USDC</p>
                  </div>
                </div>
                <hr className="border-base-200 mb-4" />
                <div className="flex items-center gap-10 mb-5">
                  {[
                    { label: "Duration", Icon: ClockIcon, value: "3 Weeks" },
                    { label: "Complexity", Icon: BoltIcon, value: "High (Expert)" },
                    { label: "Category", Icon: BuildingStorefrontIcon, value: "Fintech / Web3" },
                  ].map(({ label, Icon, value }) => (
                    <div key={label}>
                      <p className="text-xs text-base-content/40 mb-1">{label}</p>
                      <p className="text-sm font-medium text-base-content flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-base-content/40" />
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold tracking-widest text-base-content/40 uppercase mb-2">
                  Technical Specifications
                </p>
                <p className="text-sm text-base-content/70 leading-relaxed mb-4">
                  Architecture for a multi-chain yield aggregator dashboard. Required integration with Ethers.js, wagmi,
                  and custom subgraph indexing. High-performance charting using TradingView Lightweight Charts is a
                  must.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-base-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CodeBracketIcon className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-base-content">Tech Stack</p>
                    </div>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      Next.js 14, Tailwind CSS, TypeScript, GraphQL
                    </p>
                  </div>
                  <div className="rounded-xl border border-base-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheckIcon className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold text-base-content">Security</p>
                    </div>
                    <p className="text-xs text-base-content/60 leading-relaxed">
                      WalletConnect V2, SIWE, Multi-sig ready
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-base-content">
                    Bids Received <span className="text-base-content/40 font-normal">(12)</span>
                  </h2>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm gap-1.5">
                      <FunnelIcon className="w-3.5 h-3.5" />
                      Filter
                    </button>
                    <button className="btn btn-outline btn-sm gap-1.5">
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                      Newest
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {bids.map(bid => (
                    <div key={bid.id} className="bg-base-100 rounded-2xl border border-base-200 p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                            <UserGroupIcon className="w-6 h-6 text-primary/50" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-base-content">{bid.name}</span>
                            {bid.verified && <CheckBadgeIcon className="w-4 h-4 text-primary" />}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bid.tierColor}`}>
                              {bid.tier}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary">{bid.amount}</p>
                          <p className="text-xs text-base-content/40">in {bid.days} days</p>
                        </div>
                      </div>
                      <p className="text-sm text-base-content/65 leading-relaxed mb-4">{bid.bio}</p>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-primary btn-sm">Accept Bid</button>
                        <button className="btn btn-outline btn-sm">Message</button>
                        <button className="btn btn-ghost btn-sm text-error ml-auto">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
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
                      The smart contract is holding 15,000 USDC secure for this project.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-xs mb-4">
                  {[
                    ["Amount Locked", "15,000.00 USDC"],
                    ["Protocol Fee (2%)", "300.00 USDC"],
                    ["Release Condition", "Multi-sig / Milestone"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-base-content/50">{k}</span>
                      <span className="font-semibold text-base-content">{v}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline btn-sm w-full gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  View Contract
                </button>
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">Activity Log</h2>
                <div className="space-y-3">
                  {[
                    { Icon: DocumentTextIcon, label: "Task Posted", time: "2 hours ago", color: "text-primary" },
                    { Icon: LockClosedIcon, label: "Escrow Funded", time: "1 hour ago", color: "text-success" },
                    { Icon: UserGroupIcon, label: "5 New Bids Received", time: "Just now", color: "text-info" },
                  ].map(({ Icon, label, time, color }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-base-content">{label}</p>
                        <p className="text-[10px] text-base-content/40 mt-0.5">{time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE VIEW */}
        {view === "active" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                        Active Task
                      </span>
                      <span className="text-xs text-base-content/40 font-mono">#DW-8829</span>
                    </div>
                    <h1 className="text-2xl font-bold text-base-content mb-2">Smart Contract Security Audit</h1>
                    <p className="text-sm text-base-content/60 leading-relaxed">
                      Vulnerability assessment and optimization of the core staking protocols for the DecentraWork
                      ecosystem.
                    </p>
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
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-base-content">Activity</h2>
                  <span className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <span className="w-2 h-2 rounded-full bg-success inline-block" />
                    Last active 2 hours ago
                  </span>
                </div>
                {activityItems.map(({ Icon, text, time }, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-base-content/50" />
                      </div>
                      {i < activityItems.length - 1 && <div className="w-px flex-1 bg-base-200 my-1 min-h-4" />}
                    </div>
                    <div className="pb-5">
                      <p className="text-sm text-base-content/80">{text}</p>
                      <p className="text-xs text-base-content/40 mt-0.5">{time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <h2 className="text-xs font-bold tracking-widest text-base-content/40 uppercase mb-5">
                  Financial Summary
                </h2>
                <div className="space-y-3">
                  {[
                    [isClient ? "Total Budget" : "Total Earnings", "4.50 ETH", "text-base-content"],
                    [isClient ? "In Escrow" : "Pending Release", "3.00 ETH", "text-primary"],
                    [isClient ? "Released" : "Received", "1.50 ETH", "text-warning"],
                  ].map(([label, val, color]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-base-content/70">{label}</span>
                      <span className={`font-bold ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-base-200 text-center">
                  <p className="text-xs text-base-content/40">Managed by DecentraWork Smart Escrow v1.2</p>
                </div>
              </div>
            </div>
            <div className="w-64 shrink-0">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6 text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-full h-full rounded-full bg-primary/15 flex items-center justify-center border-2 border-primary/20">
                    <UserCircleIcon className="w-12 h-12 text-primary/40" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-base-100">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="font-bold text-base-content">{isClient ? "alice.eth" : "client.eth"}</span>
                  <CheckBadgeIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="mb-5">
                  <span className="text-[10px] font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                    <span>◆</span>
                    {isClient ? "DIAMOND ELO" : "VERIFIED CLIENT"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-5 mb-5 border-b border-base-200">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-base-content/40 uppercase mb-1">Rating</p>
                    <p className="font-bold text-base-content">{isClient ? "4.9/5" : "4.7/5"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-base-content/40 uppercase mb-1">
                      {isClient ? "Jobs Done" : "Tasks Posted"}
                    </p>
                    <p className="font-bold text-base-content">{isClient ? "142" : "38"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button className="btn btn-primary w-full gap-2">
                    <UserCircleIcon className="w-4 h-4" />
                    View Profile
                  </button>
                  {isClient ? (
                    <button className="btn btn-outline w-full gap-2">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      Release Escrow
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary w-full gap-2"
                      onClick={() => router.push(`/my-tasks/${id}/upload`)}
                    >
                      <ArrowUpTrayIcon className="w-4 h-4" />
                      Submit Task
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW VIEW */}
        {view === "review" && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-base-content/50 mb-1">
                  <Link href="/my-tasks" className="hover:text-primary">
                    My Tasks
                  </Link>
                  <span>›</span>
                  <span>Task #8842</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-base-content">
                      Smart Contract Security Audit &amp; Refactoring
                    </h1>
                    <p className="text-sm text-base-content/50 mt-1">
                      Task submitted by <span className="text-primary cursor-pointer hover:underline">eth-dev.eth</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1.5 bg-warning/15 text-warning text-xs font-bold px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                      AI Reviewing
                    </span>
                    <p className="text-xs text-base-content/50 mt-1">Bounty: 2.45 ETH</p>
                  </div>
                </div>
              </div>

              <div className="bg-base-100 rounded-2xl border border-base-200 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-200">
                  <div className="flex items-center gap-2">
                    <CheckCircleSolid className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-base-content">Full AI Completion Report</h2>
                  </div>
                  <span className="text-xs text-base-content/40 italic">Generated 4m ago</span>
                </div>

                <div className="p-6 grid grid-cols-2 gap-6 border-b border-base-200">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      Submission Analysis
                    </p>
                    <div className="space-y-2">
                      {submissionChecks.map(({ label, result, pass }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {pass ? (
                              <CheckCircleSolid className="w-4 h-4 text-success shrink-0" />
                            ) : (
                              <ExclamationCircleIcon className="w-4 h-4 text-warning shrink-0" />
                            )}
                            <span className="text-sm text-base-content/80">{label}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${pass ? "text-success" : "text-warning"}`}>
                            {result}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                      AI Confidence Score
                    </p>
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <DonutChart score={94} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-base-content">94%</span>
                          <span className="text-[10px] text-base-content/50">High Confidence</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-base-content/40 text-center leading-relaxed mt-2 max-w-[180px]">
                        Based on deep analysis of 1,244 lines of code and comparisons against known security patterns.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-b border-base-200">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Flagged Concerns
                  </p>
                  <div className="bg-base-200 rounded-xl p-4 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-base-content mb-1">Minor gas optimization possible</p>
                      <p className="text-xs text-base-content/60 leading-relaxed">
                        Lines 42-58 in{" "}
                        <code className="bg-base-300 px-1 py-0.5 rounded text-[11px] font-mono">Vault.sol</code> could
                        use unchecked arithmetic to save approximately 1,200 gas per transaction.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Submission Attachments
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: DocumentTextIcon, name: "audit_report_final.pdf", meta: "4.2 MB • PDF Document" },
                      { icon: CodeBracketIcon, name: "source_code_v2.zip", meta: "1.8 MB • Archive" },
                    ].map(({ icon: Icon, name, meta }) => (
                      <div key={name} className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3">
                        <Icon className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-base-content truncate">{name}</p>
                          <p className="text-[10px] text-base-content/40 mt-0.5">{meta}</p>
                        </div>
                        <button className="btn btn-ghost btn-xs btn-square shrink-0">
                          <ArrowDownTrayIcon className="w-4 h-4 text-base-content/40" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">
                  Review Actions
                </h2>
                <div className="space-y-2">
                  <button className="btn btn-primary w-full gap-2 h-16 text-base">
                    <CurrencyDollarIcon className="w-5 h-5" />
                    Approve &amp; Release Payment
                  </button>
                  <button className="btn btn-outline w-full gap-2">
                    <ArrowPathIcon className="w-4 h-4" />
                    Request Changes
                  </button>
                  <button className="btn w-full gap-2 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Open Dispute
                  </button>
                </div>
                <p className="text-[10px] text-base-content/40 leading-relaxed mt-3 text-center">
                  Only use this if the work does not meet the agreed requirements and direct communication fails.
                </p>
              </div>
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <h2 className="text-xs font-bold tracking-widest text-base-content/60 uppercase mb-4">
                  Escrow Details
                </h2>
                <div className="space-y-2 text-sm">
                  {[
                    ["Task Funds", "2.45 ETH", "font-bold text-base-content"],
                    ["Network Fee", "0.002 ETH", "text-base-content/70"],
                    ["Total in Escrow", "2.452 ETH", "font-bold text-primary"],
                  ].map(([label, val, cls]) => (
                    <div
                      key={label}
                      className={`flex justify-between ${label === "Total in Escrow" ? "pt-2 border-t border-base-200" : ""}`}
                    >
                      <span
                        className={
                          label === "Total in Escrow" ? "font-semibold text-base-content" : "text-base-content/50"
                        }
                      >
                        {label}
                      </span>
                      <span className={cls}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
