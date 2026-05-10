"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeBracketIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type SubmittedFile = { filename: string; size: number };

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

type ReportSnapshot = {
  confidence_score: number | null;
  recommendation: string | null;
  suggested_reputation_delta: number | null;
  suggested_skills: Record<string, { new_level: number; reasoning?: string }> | null;
};

type ResultsData =
  | { role: "client"; approveResult: ApproveResult; submittedFiles: SubmittedFile[]; report: ReportSnapshot }
  | { role: "freelancer"; report: ReportSnapshot; submittedFiles: SubmittedFile[] };

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResultsData | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  useEffect(() => {
    const raw = sessionStorage.getItem(`dw_results_${id}`);
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {
        // corrupted — ignore
      }
    }
  }, [id]);

  if (!data) {
    return (
      <AppLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-base-content/40 text-sm">No results found for this task.</p>
          <Link href="/my-tasks" className="btn btn-outline btn-sm mt-4">
            Back to My Tasks
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isClient = data.role === "client";
  const approveResult = isClient ? (data as { role: "client"; approveResult: ApproveResult }).approveResult : null;
  const report = data.report;
  const submittedFiles = data.submittedFiles ?? [];

  const skillEntries: [string, number][] = approveResult
    ? Object.entries(approveResult.skill_changes)
    : report?.suggested_skills
      ? Object.entries(report.suggested_skills).map(([k, v]) => [k, v.new_level])
      : [];

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* Back */}
        <div className="flex items-center gap-3">
          <Link
            href="/my-tasks"
            className="w-8 h-8 rounded-lg border border-base-300 flex items-center justify-center hover:bg-base-200 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 text-base-content/60" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-base-content leading-tight">
              {isClient ? "Work Approved" : "Evaluation Results"}
            </h1>
            <p className="text-xs text-base-content/40 font-mono mt-0.5">Task #{id}</p>
          </div>
        </div>

        {/* ── CLIENT VIEW ─────────────────────────────────────────── */}
        {isClient && approveResult && (
          <>
            {/* Success banner */}
            <div className="bg-success/8 border border-success/25 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                <CheckCircleIcon className="w-7 h-7 text-success" />
              </div>
              <div>
                <p className="font-bold text-success text-lg">Work Approved!</p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  The freelancer can claim their escrow payment after the 48-hour dispute window closes.
                </p>
              </div>
            </div>

            {/* Submitted files */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                Submitted Files
              </p>
              {submittedFiles.length === 0 ? (
                <p className="text-sm text-base-content/40 italic">
                  Files were removed from storage after payment release.
                </p>
              ) : (
                <div className="space-y-2">
                  {submittedFiles.map(f => (
                    <div
                      key={f.filename}
                      className="flex items-center gap-3 border border-base-200 rounded-xl px-4 py-3"
                    >
                      <CodeBracketIcon className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-base-content/80 truncate">{f.filename}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <a
                        href={`${backendUrl}/files/${id}/${encodeURIComponent(f.filename)}`}
                        download={f.filename}
                        className="btn btn-ghost btn-sm btn-square shrink-0"
                        title={`Download ${f.filename}`}
                      >
                        <ArrowDownTrayIcon className="w-5 h-5 text-base-content/50" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Freelancer gains summary */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                Freelancer Gains Applied
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-success/8 border border-success/20 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-success">+{approveResult.reputation_delta}</p>
                  <p className="text-xs text-base-content/50 mt-1 uppercase tracking-wider">Reputation</p>
                </div>
                <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-primary">+{approveResult.elo.elo_delta}</p>
                  <p className="text-xs text-base-content/50 mt-1 uppercase tracking-wider">ELO Points</p>
                </div>
              </div>

              {approveResult.elo.tier_changed && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
                  <span className="text-warning text-xl">★</span>
                  <div>
                    <p className="text-sm font-bold text-warning">Tier Promotion!</p>
                    <p className="text-xs text-base-content/50">
                      {approveResult.elo.old_tier} → {approveResult.elo.new_tier}
                    </p>
                  </div>
                </div>
              )}

              {skillEntries.length > 0 && (
                <>
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Skills Updated
                  </p>
                  <div className="space-y-3">
                    {skillEntries.map(([skill, level]) => (
                      <div key={skill}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-base-content/70 capitalize font-medium">{skill}</span>
                          <span className="font-bold text-primary">
                            {level.toFixed(1)}
                            <span className="text-base-content/40 font-normal">/10</span>
                          </span>
                        </div>
                        <div className="w-full bg-base-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${(level / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── FREELANCER VIEW ──────────────────────────────────────── */}
        {!isClient && (
          <>
            {/* Status banner */}
            <div
              className={`rounded-2xl border p-5 flex items-center gap-4 ${
                report?.recommendation === "approve"
                  ? "bg-success/8 border-success/25"
                  : report?.recommendation === "reject"
                    ? "bg-error/8 border-error/25"
                    : "bg-warning/8 border-warning/25"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl font-bold ${
                  report?.recommendation === "approve"
                    ? "bg-success/15 text-success"
                    : report?.recommendation === "reject"
                      ? "bg-error/15 text-error"
                      : "bg-warning/15 text-warning"
                }`}
              >
                {report?.recommendation === "approve" ? "✓" : report?.recommendation === "reject" ? "✗" : "⚠"}
              </div>
              <div>
                <p
                  className={`font-bold text-lg ${
                    report?.recommendation === "approve"
                      ? "text-success"
                      : report?.recommendation === "reject"
                        ? "text-error"
                        : "text-warning"
                  }`}
                >
                  {report?.recommendation === "approve"
                    ? "AI Recommends Approval"
                    : report?.recommendation === "reject"
                      ? "AI Recommends Rejection"
                      : "AI Suggests DAO Review"}
                </p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  Confidence: <span className="font-semibold">{report?.confidence_score ?? "—"}%</span>
                  &nbsp;· Awaiting client decision
                </p>
              </div>
            </div>

            {/* Gains */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                Estimated Gains on Approval
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-success/8 border border-success/20 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-success">
                    {report?.suggested_reputation_delta != null ? `+${report.suggested_reputation_delta}` : "—"}
                  </p>
                  <p className="text-xs text-base-content/50 mt-1 uppercase tracking-wider">Reputation</p>
                </div>
                <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-primary">+?</p>
                  <p className="text-xs text-base-content/50 mt-1 uppercase tracking-wider">ELO Points</p>
                  <p className="text-[10px] text-base-content/30 mt-0.5">set at decision</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            {skillEntries.length > 0 && (
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                  Skill Improvements Suggested
                </p>
                <div className="space-y-4">
                  {skillEntries.map(([skill, level]) => {
                    const reasoning = report?.suggested_skills?.[skill]?.reasoning;
                    return (
                      <div key={skill}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-base-content/70 capitalize font-medium">{skill}</span>
                          <span className="font-bold text-primary">
                            {level.toFixed(1)}
                            <span className="text-base-content/40 font-normal">/10</span>
                          </span>
                        </div>
                        <div className="w-full bg-base-200 rounded-full h-2 mb-1.5">
                          <div
                            className="h-2 rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${(level / 10) * 100}%` }}
                          />
                        </div>
                        {reasoning && <p className="text-xs text-base-content/40 leading-relaxed">{reasoning}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">Payment</p>
              <div className="bg-base-200 rounded-2xl p-4 flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-base-content/40 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-base-content">Awaiting client decision</p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    Escrow funds will be released to your wallet once the client approves.
                  </p>
                </div>
              </div>
            </div>

            {/* Submitted files (read-only for freelancer) */}
            {submittedFiles.length > 0 && (
              <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                  Files You Submitted
                </p>
                <div className="space-y-2">
                  {submittedFiles.map(f => (
                    <div key={f.filename} className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-3">
                      <DocumentTextIcon className="w-4 h-4 text-base-content/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-base-content/70 truncate">{f.filename}</p>
                        <p className="text-xs text-base-content/40 mt-0.5">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
