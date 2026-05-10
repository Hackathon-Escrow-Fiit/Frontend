"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function UploadWorkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address } = useAccount();

  const jobId = useMemo(() => (/^\d+$/.test(id) ? BigInt(id) : 0n), [id]);

  const { data: rawJob } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "getJob",
    args: [jobId],
  });

  const job = useMemo(() => {
    if (!rawJob) return null;
    const r = rawJob as unknown as {
      description: string;
      skills: readonly string[];
      title: string;
    };
    return { description: r.description, skills: Array.from(r.skills), title: r.title };
  }, [rawJob]);

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming).filter(f => !files.some(ex => ex.name === f.name));
    setFiles(prev => [...prev, ...next]);
  };

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleSubmit = async () => {
    if (!address) {
      notification.error("Connect your wallet first");
      return;
    }
    if (files.length === 0) {
      notification.warning("Add at least one file before submitting");
      return;
    }

    setSubmitting(true);
    try {
      setSubmitStep("Sending files to AI evaluator…");
      const form = new FormData();
      form.append("escrow_id", id);
      form.append("freelancer_address", address);
      const customerTask =
        job?.description || notes.trim() || "Complete the assigned task as described in the job posting.";
      const requiredSkills = job?.skills?.length ? job.skills : ["solidity", "smart-contracts"];
      form.append("customer_task", customerTask);
      form.append("required_skills", JSON.stringify(requiredSkills));
      files.forEach(f => form.append("files", f, f.name));

      const res = await fetch(`${BACKEND_URL}/evaluate`, { method: "POST", body: form });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      notification.success("Submitted! AI is now reviewing your work.");
      router.push(`/my-tasks/${id}/waiting`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notification.error(`Submission failed: ${msg}`);
    } finally {
      setSubmitting(false);
      setSubmitStep("");
    }
  };

  const ready = files.length > 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/my-tasks/${id}/active`}
            className="w-8 h-8 rounded-lg border border-base-300 flex items-center justify-center hover:bg-base-200 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 text-base-content/60" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                Final Upload
              </span>
              <span className="text-xs text-base-content/40 font-mono">Task #{id}</span>
            </div>
            <h1 className="text-xl font-bold text-base-content mt-0.5">
              {job?.title ? job.title : "Submit Completed Work for AI Review"}
            </h1>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Drop zone */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <h2 className="font-bold text-base-content mb-4 flex items-center gap-2">
                <ArrowUpTrayIcon className="w-5 h-5 text-primary" />
                Upload Deliverables
              </h2>

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-primary/50 hover:bg-base-200/30"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ArrowUpTrayIcon className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-base-content mb-1">Drag &amp; drop files here</p>
                <p className="text-xs text-base-content/50 mb-4">
                  .sol, .ts, .zip, .pdf — any format, multiple files allowed
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Browse Files
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => addFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map(file => (
                    <div key={file.name} className="flex items-center gap-3 bg-base-200 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <DocumentTextIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-base-content truncate">{file.name}</p>
                        <p className="text-[11px] text-base-content/40">
                          {formatSize(file.size)} · {file.name.split(".").pop()?.toUpperCase() ?? "FILE"}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <h2 className="font-bold text-base-content mb-1">Completion Notes</h2>
              <p className="text-xs text-base-content/40 mb-3">
                Describe what you built, any known limitations, and instructions for the client. This text is sent to
                the AI reviewer as the task description.
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={5}
                placeholder="e.g. Implemented the escrow contract with reentrancy guard, full test suite (95% coverage), and Hardhat deploy script. Known limitation: does not support ERC20 yet — ETH only as agreed."
                className="w-full border border-base-300 rounded-xl px-4 py-3 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30 resize-none focus:border-primary transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={!ready || submitting} className="btn btn-primary flex-1 gap-2">
                {submitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    {submitStep || "Submitting…"}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Submit Work for AI Review
                  </>
                )}
              </button>
              <Link href={`/my-tasks/${id}/active`} className="btn btn-outline gap-2">
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </Link>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-64 shrink-0 space-y-4">
            {/* Checklist */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-4">
                Submission Checklist
              </p>
              <div className="space-y-3">
                {[
                  { label: "Wallet connected", done: !!address },
                  { label: "At least one file uploaded", done: files.length > 0 },
                  { label: "Completion notes added", done: notes.trim().length > 0 },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-success/15" : "bg-base-200"}`}
                    >
                      <CheckCircleIcon className={`w-3.5 h-3.5 ${done ? "text-success" : "text-base-content/30"}`} />
                    </div>
                    <span className={`text-xs ${done ? "text-base-content" : "text-base-content/50"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                What Happens Next
              </p>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Your files are sent to the AI evaluator" },
                  { step: "2", text: "AI reviews code quality, security, and task completion (~1 min)" },
                  { step: "3", text: "Client is notified to approve or dispute" },
                  { step: "4", text: "Escrow released on approval" },
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

            {/* Files summary */}
            {files.length > 0 && (
              <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">
                  Ready to Send
                </p>
                <p className="text-2xl font-bold text-base-content">
                  {files.length}{" "}
                  <span className="text-sm font-medium text-base-content/50">file{files.length !== 1 ? "s" : ""}</span>
                </p>
                <p className="text-xs text-base-content/40 mt-1">
                  {formatSize(files.reduce((s, f) => s + f.size, 0))} total
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
