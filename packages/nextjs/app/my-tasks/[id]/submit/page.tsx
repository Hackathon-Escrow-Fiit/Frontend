"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type UploadedFile = {
  name: string;
  size: string;
  type: string;
};

export default function SubmitWorkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
      type: f.name.split(".").pop()?.toUpperCase() ?? "FILE",
    }));
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
      type: f.name.split(".").pop()?.toUpperCase() ?? "FILE",
    }));
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleSubmit = () => {
    router.push(`/my-tasks/${id}/waiting`);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
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
                  Active Task
                </span>
                <span className="text-xs text-base-content/40 font-mono">#DW-8829</span>
              </div>
              <h1 className="text-xl font-bold text-base-content mt-0.5">Submit Completed Work</h1>
            </div>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Upload area */}
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
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-primary/50 hover:bg-base-200/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ArrowUpTrayIcon className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-base-content mb-1">Drag & drop files here</p>
                <p className="text-xs text-base-content/50 mb-4">
                  Supports PDF, ZIP, PNG, MP4 and more — max 50 MB per file
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => {
                    e.stopPropagation();
                    document.getElementById("file-input")?.click();
                  }}
                >
                  Browse Files
                </button>
                <input id="file-input" type="file" multiple className="hidden" onChange={handleFileInput} />
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
                          {file.size} · {file.type}
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

            {/* Completion notes */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-6">
              <h2 className="font-bold text-base-content mb-4">Completion Notes</h2>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={5}
                placeholder="Describe what you've completed, any known limitations, instructions for the client, or notes for the AI reviewer..."
                className="w-full border border-base-300 rounded-xl px-4 py-3 text-sm bg-transparent outline-none text-base-content placeholder:text-base-content/30 resize-none focus:border-primary transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={files.length === 0 && notes.trim().length === 0}
                className="btn btn-primary flex-1 gap-2 disabled:opacity-50"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Submit Work for Review
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
                  { label: "All deliverables uploaded", done: files.length > 0 },
                  { label: "Completion notes added", done: notes.trim().length > 0 },
                  { label: "Work meets requirements", done: false },
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
                  { step: "1", text: "AI reviews your submission automatically" },
                  { step: "2", text: "Client is notified to approve or request changes" },
                  { step: "3", text: "Escrow is released upon approval" },
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

            {/* Escrow */}
            <div className="bg-base-100 rounded-2xl border border-base-200 p-5">
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Escrow Amount</p>
              <p className="text-2xl font-bold text-base-content">
                2,450 <span className="text-sm font-medium text-base-content/50">USDC</span>
              </p>
              <p className="text-xs text-base-content/40 mt-1">Released upon client approval</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
