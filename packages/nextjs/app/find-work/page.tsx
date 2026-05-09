"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useReadContracts } from "wagmi";
import { ClockIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { CheckBadgeIcon, MagnifyingGlassIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type Complexity = "low" | "mid" | "high";
type PostedWithin = "any" | "24h" | "week" | "month";
type SortBy = "newest" | "budget_desc" | "budget_asc" | "complexity_asc" | "complexity_desc";

type OnChainJob = {
  id: bigint;
  client: `0x${string}`;
  freelancer: `0x${string}`;
  title: string;
  description: string;
  skills: readonly string[];
  budget: bigint;
  deadline: bigint;
  status: number;
  bidCount: bigint;
  createdAt: bigint;
  aiDecisionAt: bigint;
};

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string; bg: string; rank: number }> = {
  low: { label: "COMPLEXITY: LOW", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", rank: 1 },
  mid: { label: "COMPLEXITY: MID", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", rank: 2 },
  high: { label: "COMPLEXITY: HIGH", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", rank: 3 },
};

const budgetToComplexity = (budgetWei: bigint): Complexity => {
  const n = Number(formatEther(budgetWei));
  if (n < 500) return "low";
  if (n < 2000) return "mid";
  return "high";
};

const timeAgo = (createdAt: bigint): { label: string; hours: number } => {
  const diffSec = Math.floor(Date.now() / 1000) - Number(createdAt);
  const h = Math.floor(diffSec / 3600);
  if (h < 1) return { label: "Just now", hours: 0 };
  if (h < 24) return { label: `${h}h ago`, hours: h };
  const d = Math.floor(h / 24);
  return { label: `${d}d ago`, hours: h };
};

const shortenAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const POSTED_WITHIN_OPTIONS: { key: PostedWithin; label: string; maxHours: number }[] = [
  { key: "any", label: "Any time", maxHours: Infinity },
  { key: "24h", label: "Last 24h", maxHours: 24 },
  { key: "week", label: "Last 7 days", maxHours: 168 },
  { key: "month", label: "Last 30 days", maxHours: 720 },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "budget_desc", label: "Budget: High → Low" },
  { key: "budget_asc", label: "Budget: Low → High" },
  { key: "complexity_desc", label: "Complexity: High → Low" },
  { key: "complexity_asc", label: "Complexity: Low → High" },
];

const SKILL_OPTIONS = [
  "Solidity",
  "React",
  "TypeScript",
  "Figma",
  "Node.js",
  "The Graph",
  "IPFS",
  "Security Audit",
  "UI/UX Design",
  "Technical Writing",
];

const ITEMS_PER_PAGE = 6;

const FindWorkPage: NextPage = () => {
  const [search, setSearch] = useState("");
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(10000);
  const [complexities, setComplexities] = useState<Set<Complexity>>(new Set(["low", "mid", "high"]));
  const [postedWithin, setPostedWithin] = useState<PostedWithin>("any");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [page, setPage] = useState(1);

  const toggleComplexity = (c: Complexity) => {
    setComplexities(prev => {
      const n = new Set(prev);
      if (n.has(c)) {
        n.delete(c);
      } else {
        n.add(c);
      }
      return n;
    });
    setPage(1);
  };

  const toggleSkill = (s: string) => {
    setSelectedSkills(prev => {
      const n = new Set(prev);
      if (n.has(s)) {
        n.delete(s);
      } else {
        n.add(s);
      }
      return n;
    });
    setPage(1);
  };

  const resetFilters = () => {
    setBudgetMin(0);
    setBudgetMax(10000);
    setComplexities(new Set(["low", "mid", "high"]));
    setPostedWithin("any");
    setSelectedSkills(new Set());
    setPage(1);
  };

  // ── Blockchain reads ──────────────────────────────────────────────────────

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "JobMarketplace" });

  const { data: jobCount, isLoading: isCountLoading } = useScaffoldReadContract({
    contractName: "JobMarketplace",
    functionName: "jobCount",
  });

  const jobCalls = useMemo(() => {
    if (!contractInfo || !jobCount || jobCount === 0n) return [];
    return Array.from({ length: Number(jobCount) }, (_, i) => ({
      address: contractInfo.address as `0x${string}`,
      abi: contractInfo.abi,
      functionName: "getJob" as const,
      args: [BigInt(i + 1)] as const,
    }));
  }, [contractInfo, jobCount]);

  const { data: jobResults, isLoading: isJobsLoading } = useReadContracts({
    contracts: jobCalls,
    query: { enabled: jobCalls.length > 0 },
  });

  const isLoading = isCountLoading || isJobsLoading;

  const openJobs = useMemo<OnChainJob[]>(() => {
    if (!jobResults) return [];
    return jobResults
      .filter(r => r.status === "success" && r.result != null)
      .map(r => r.result as unknown as OnChainJob)
      .filter(j => j.status === 0); // Open only
  }, [jobResults]);

  // ── Filtering & sorting ───────────────────────────────────────────────────

  const maxHoursFilter = POSTED_WITHIN_OPTIONS.find(o => o.key === postedWithin)?.maxHours ?? Infinity;

  const filtered = useMemo(() => {
    let jobs = openJobs.filter(j => {
      const budgetDwt = Number(formatEther(j.budget));
      if (budgetDwt < budgetMin || budgetDwt > budgetMax) return false;

      const cx = budgetToComplexity(j.budget);
      if (!complexities.has(cx)) return false;

      const { hours } = timeAgo(j.createdAt);
      if (hours > maxHoursFilter) return false;

      if (selectedSkills.size > 0 && !j.skills.some(s => selectedSkills.has(s))) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.skills.some(s => s.toLowerCase().includes(q)) ||
          j.client.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === "budget_asc") jobs = [...jobs].sort((a, b) => (a.budget < b.budget ? -1 : 1));
    if (sortBy === "budget_desc") jobs = [...jobs].sort((a, b) => (b.budget < a.budget ? -1 : 1));
    if (sortBy === "newest") jobs = [...jobs].sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1));
    if (sortBy === "complexity_asc")
      jobs = [...jobs].sort(
        (a, b) =>
          COMPLEXITY_CONFIG[budgetToComplexity(a.budget)].rank - COMPLEXITY_CONFIG[budgetToComplexity(b.budget)].rank,
      );
    if (sortBy === "complexity_desc")
      jobs = [...jobs].sort(
        (a, b) =>
          COMPLEXITY_CONFIG[budgetToComplexity(b.budget)].rank - COMPLEXITY_CONFIG[budgetToComplexity(a.budget)].rank,
      );

    return jobs;
  }, [openJobs, search, budgetMin, budgetMax, complexities, selectedSkills, sortBy, maxHoursFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  const activeFilterCount = [
    budgetMin > 0 || budgetMax < 10000,
    complexities.size < 3,
    postedWithin !== "any",
    selectedSkills.size > 0,
  ].filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + sort bar */}
          <div className="px-6 pt-5 pb-4 border-b border-base-300 bg-base-100 flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search jobs, skills, or address..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input input-bordered w-full pl-9 text-sm"
              />
            </div>
            <select
              className="select select-bordered select-sm text-sm w-44 shrink-0"
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as SortBy);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-base-content/40 shrink-0 whitespace-nowrap">
              {isLoading ? "Loading…" : `${filtered.length} job${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Job grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-base-content/40">
                <span className="loading loading-spinner loading-md" />
                <span className="text-sm">Reading jobs from blockchain…</span>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-base-content/30 text-sm gap-2">
                <FunnelIcon className="w-8 h-8 opacity-30" />
                {openJobs.length === 0 ? "No jobs posted yet." : "No jobs match your filters."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {paginated.map(job => {
                  const cx = COMPLEXITY_CONFIG[budgetToComplexity(job.budget)];
                  const { label: postedLabel } = timeAgo(job.createdAt);
                  const budgetDwt = Number(formatEther(job.budget)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  });
                  return (
                    <div
                      key={job.id.toString()}
                      className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold tracking-wide px-2 py-1 rounded-md border ${cx.bg} ${cx.color}`}
                        >
                          {cx.label}
                        </span>
                        <span className="text-base font-bold text-primary shrink-0">{budgetDwt} NXR</span>
                      </div>

                      <div>
                        <h3 className="font-bold text-base-content text-[15px] leading-snug mb-1 group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-xs text-base-content/50 leading-relaxed line-clamp-2">{job.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-base-content/50">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-base-content/70">{shortenAddr(job.client)}</span>
                          <span>·</span>
                          <ClockIcon className="w-3 h-3 shrink-0" />
                          <span>{postedLabel}</span>
                        </div>
                        <span className="text-base-content/40">
                          {job.bidCount.toString()} bid{job.bidCount !== 1n ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map(s => (
                          <span key={s} className="badge badge-ghost border border-base-300 text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>

                      <Link
                        href={`/browse/${job.id.toString()}`}
                        className="btn btn-outline btn-sm w-full mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        View & Bid
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8">
                <button
                  className="btn btn-ghost btn-sm btn-square"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  {"‹"}
                </button>
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`e-${i}`} className="px-1 text-base-content/30 text-sm">
                      {"…"}
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`btn btn-sm btn-square ${page === p ? "btn-primary" : "btn-ghost"}`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  className="btn btn-ghost btn-sm btn-square"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  {"›"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter sidebar */}
        <aside className="w-56 shrink-0 border-l border-base-300 bg-base-100 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-4 border-b border-base-200">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-base-content/50" />
              <span className="text-sm font-semibold text-base-content">Filters</span>
              {activeFilterCount > 0 && <span className="badge badge-primary badge-xs">{activeFilterCount}</span>}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-base-content/40 hover:text-error flex items-center gap-0.5"
              >
                <XMarkIcon className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="flex-1 px-4 py-5 flex flex-col gap-6">
            {/* Budget */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Budget (NXR)</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min={0}
                  max={budgetMax}
                  value={budgetMin}
                  onChange={e => {
                    setBudgetMin(Number(e.target.value));
                    setPage(1);
                  }}
                  className="input input-bordered input-xs w-full text-xs"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min={budgetMin}
                  max={10000}
                  value={budgetMax}
                  onChange={e => {
                    setBudgetMax(Number(e.target.value));
                    setPage(1);
                  }}
                  className="input input-bordered input-xs w-full text-xs"
                  placeholder="Max"
                />
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={budgetMax}
                onChange={e => {
                  setBudgetMax(Number(e.target.value));
                  setPage(1);
                }}
                className="range range-primary range-xs w-full"
              />
              <div className="flex justify-between text-[10px] text-base-content/40 mt-0.5">
                <span>0</span>
                <span>{budgetMax >= 10000 ? "10k+" : budgetMax.toLocaleString()}</span>
              </div>
            </div>

            {/* Complexity */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Complexity</p>
              {(["low", "mid", "high"] as Complexity[]).map(c => (
                <label key={c} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={complexities.has(c)}
                    onChange={() => toggleComplexity(c)}
                  />
                  <span className="text-sm text-base-content/70">
                    {c === "low" ? "Entry Level" : c === "mid" ? "Intermediate" : "Expert"}
                  </span>
                </label>
              ))}
            </div>

            {/* Posted within */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Posted Within</p>
              <div className="flex flex-col gap-1.5">
                {POSTED_WITHIN_OPTIONS.map(o => (
                  <label key={o.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="postedWithin"
                      className="radio radio-primary radio-sm"
                      checked={postedWithin === o.key}
                      onChange={() => {
                        setPostedWithin(o.key);
                        setPage(1);
                      }}
                    />
                    <span className="text-sm text-base-content/70">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSkill(s)}
                    className={`btn btn-xs rounded-full text-[11px] ${selectedSkills.has(s) ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* On-chain info */}
            <div className="text-[10px] text-base-content/30 flex items-center gap-1">
              <CheckBadgeIcon className="w-3 h-3" />
              Live from blockchain · {openJobs.length} open job{openJobs.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="p-4 border-t border-base-200">
            <Link href="/post-task" className="btn btn-primary w-full btn-sm gap-1.5">
              <PlusIcon className="w-4 h-4" />
              Post a Job
            </Link>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
};

export default FindWorkPage;
