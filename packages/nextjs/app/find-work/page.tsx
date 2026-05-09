"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { MagnifyingGlassIcon, CheckBadgeIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ClockIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Complexity = "low" | "mid" | "high";
type Category = "all" | "web3" | "design" | "writing" | "backend" | "mobile";
type PostedWithin = "any" | "24h" | "week" | "month";
type SortBy = "newest" | "budget_desc" | "budget_asc" | "complexity_asc" | "complexity_desc";

type Job = {
  id: string;
  title: string;
  budget: number;
  complexity: Complexity;
  client: string;
  postedAgo: string;
  postedHours: number;
  skills: string[];
  category: Category;
  description: string;
  bids: number;
  verified: boolean;
};

const MOCK_JOBS: Job[] = [
  { id: "1", title: "Smart Contract Audit for DeFi Protocol", budget: 2500, complexity: "high", client: "vitalik.eth", postedAgo: "2 hours ago", postedHours: 2, skills: ["Solidity", "Security", "Ethereum"], category: "web3", description: "Looking for an experienced auditor to review our AMM contracts before mainnet launch.", bids: 3, verified: true },
  { id: "2", title: "Landing Page Design for NFT Marketplace", budget: 1200, complexity: "mid", client: "designgod.eth", postedAgo: "5 hours ago", postedHours: 5, skills: ["Figma", "UI/UX", "Web3"], category: "design", description: "Need a sleek, modern landing page design for our upcoming NFT marketplace.", bids: 7, verified: true },
  { id: "3", title: "Technical Article: ZK-Rollups Explained", budget: 450, complexity: "low", client: "scribe.eth", postedAgo: "1 day ago", postedHours: 24, skills: ["Content", "Technical Writing"], category: "writing", description: "Write a 2000-word accessible explainer on ZK-Rollups for a developer audience.", bids: 12, verified: false },
  { id: "4", title: "Backend Integration: IPFS & Graph Protocol", budget: 4000, complexity: "high", client: "builder.eth", postedAgo: "2 days ago", postedHours: 48, skills: ["The Graph", "IPFS", "Node.js"], category: "backend", description: "Integrate IPFS storage and The Graph indexing into our existing Node.js backend.", bids: 5, verified: true },
  { id: "5", title: "React Dashboard for On-Chain Analytics", budget: 3200, complexity: "high", client: "datadao.eth", postedAgo: "3 days ago", postedHours: 72, skills: ["React", "Viem", "TypeScript"], category: "web3", description: "Build a real-time analytics dashboard consuming on-chain data via Viem.", bids: 8, verified: true },
  { id: "6", title: "Mobile Wallet UI for iOS", budget: 5500, complexity: "high", client: "mobilex.eth", postedAgo: "4 days ago", postedHours: 96, skills: ["React Native", "WalletConnect", "Swift"], category: "mobile", description: "Design and implement a mobile wallet UI supporting WalletConnect v2.", bids: 4, verified: false },
  { id: "7", title: "DAO Governance Documentation", budget: 600, complexity: "low", client: "govern.eth", postedAgo: "5 days ago", postedHours: 120, skills: ["Technical Writing", "DAO", "Governance"], category: "writing", description: "Write comprehensive governance documentation for our on-chain DAO.", bids: 9, verified: true },
  { id: "8", title: "ERC-4337 Account Abstraction Integration", budget: 3800, complexity: "high", client: "aawallet.eth", postedAgo: "6 days ago", postedHours: 144, skills: ["ERC-4337", "Solidity", "Bundler"], category: "web3", description: "Integrate ERC-4337 account abstraction into our existing smart wallet.", bids: 2, verified: true },
  { id: "9", title: "Subgraph Development for DEX", budget: 1800, complexity: "mid", client: "graphdev.eth", postedAgo: "7 days ago", postedHours: 168, skills: ["The Graph", "GraphQL", "AssemblyScript"], category: "web3", description: "Build a subgraph for our DEX to index swap events and liquidity positions.", bids: 6, verified: true },
  { id: "10", title: "Brand Identity for Web3 Startup", budget: 2200, complexity: "mid", client: "brandme.eth", postedAgo: "8 days ago", postedHours: 192, skills: ["Branding", "Figma", "Illustration"], category: "design", description: "Create a full brand identity including logo, colour palette, and design system.", bids: 15, verified: false },
];

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string; bg: string; rank: number }> = {
  low:  { label: "AI COMPLEXITY: LOW",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", rank: 1 },
  mid:  { label: "AI COMPLEXITY: MID",  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   rank: 2 },
  high: { label: "AI COMPLEXITY: HIGH", color: "text-rose-700",    bg: "bg-rose-50 border-rose-200",     rank: 3 },
};

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all",     label: "All Tasks" },
  { key: "web3",    label: "Web3" },
  { key: "design",  label: "Design" },
  { key: "writing", label: "Writing" },
  { key: "backend", label: "Backend" },
  { key: "mobile",  label: "Mobile" },
];

const POSTED_WITHIN_OPTIONS: { key: PostedWithin; label: string; maxHours: number }[] = [
  { key: "any",   label: "Any time",    maxHours: Infinity },
  { key: "24h",   label: "Last 24h",    maxHours: 24 },
  { key: "week",  label: "Last 7 days", maxHours: 168 },
  { key: "month", label: "Last 30 days",maxHours: 720 },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "newest",           label: "Newest first" },
  { key: "budget_desc",      label: "Budget: High → Low" },
  { key: "budget_asc",       label: "Budget: Low → High" },
  { key: "complexity_desc",  label: "Complexity: High → Low" },
  { key: "complexity_asc",   label: "Complexity: Low → High" },
];

const SKILL_OPTIONS = ["Solidity", "React", "TypeScript", "Figma", "Node.js", "The Graph", "IPFS", "Security", "UI/UX", "Technical Writing"];

const ITEMS_PER_PAGE = 6;

const FindWorkPage: NextPage = () => {
  const [search, setSearch]               = useState("");
  const [category, setCategory]           = useState<Category>("all");
  const [budgetMin, setBudgetMin]         = useState(0);
  const [budgetMax, setBudgetMax]         = useState(10000);
  const [complexities, setComplexities]   = useState<Set<Complexity>>(new Set(["low", "mid", "high"]));
  const [postedWithin, setPostedWithin]   = useState<PostedWithin>("any");
  const [verifiedOnly, setVerifiedOnly]   = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy]               = useState<SortBy>("newest");
  const [page, setPage]                   = useState(1);

  const toggleComplexity = (c: Complexity) => {
    setComplexities(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
    setPage(1);
  };

  const toggleSkill = (s: string) => {
    setSelectedSkills(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setPage(1);
  };

  const resetFilters = () => {
    setBudgetMin(0); setBudgetMax(10000);
    setComplexities(new Set(["low", "mid", "high"]));
    setPostedWithin("any"); setVerifiedOnly(false);
    setSelectedSkills(new Set()); setPage(1);
  };

  const activeFilterCount = [
    budgetMin > 0 || budgetMax < 10000,
    complexities.size < 3,
    postedWithin !== "any",
    verifiedOnly,
    selectedSkills.size > 0,
  ].filter(Boolean).length;

  const maxHoursFilter = POSTED_WITHIN_OPTIONS.find(o => o.key === postedWithin)?.maxHours ?? Infinity;

  const filtered = useMemo(() => {
    let jobs = MOCK_JOBS.filter(j => {
      if (category !== "all" && j.category !== category) return false;
      if (j.budget < budgetMin || j.budget > budgetMax) return false;
      if (!complexities.has(j.complexity)) return false;
      if (j.postedHours > maxHoursFilter) return false;
      if (verifiedOnly && !j.verified) return false;
      if (selectedSkills.size > 0 && !j.skills.some(s => selectedSkills.has(s))) return false;
      if (search) {
        const q = search.toLowerCase();
        return j.title.toLowerCase().includes(q) || j.skills.some(s => s.toLowerCase().includes(q)) || j.client.toLowerCase().includes(q);
      }
      return true;
    });

    if (sortBy === "budget_asc")     jobs = [...jobs].sort((a, b) => a.budget - b.budget);
    if (sortBy === "budget_desc")    jobs = [...jobs].sort((a, b) => b.budget - a.budget);
    if (sortBy === "complexity_asc") jobs = [...jobs].sort((a, b) => COMPLEXITY_CONFIG[a.complexity].rank - COMPLEXITY_CONFIG[b.complexity].rank);
    if (sortBy === "complexity_desc")jobs = [...jobs].sort((a, b) => COMPLEXITY_CONFIG[b.complexity].rank - COMPLEXITY_CONFIG[a.complexity].rank);

    return jobs;
  }, [search, category, budgetMin, budgetMax, complexities, verifiedOnly, selectedSkills, sortBy, maxHoursFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + category bar */}
          <div className="px-6 pt-5 pb-4 border-b border-base-300 bg-base-100 flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Search tasks, skills, or ENS names..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="input input-bordered w-full pl-9 text-sm"
                />
              </div>
              <select
                className="select select-bordered select-sm text-sm w-44 shrink-0"
                value={sortBy}
                onChange={e => { setSortBy(e.target.value as SortBy); setPage(1); }}
              >
                {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-xs text-base-content/40 shrink-0 whitespace-nowrap">{filtered.length} tasks</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setCategory(key); setPage(1); }}
                  className={`btn btn-xs rounded-full ${category === key ? "btn-primary" : "btn-ghost border border-base-300 hover:border-primary hover:text-primary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Job grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-base-content/30 text-sm gap-2">
                <FunnelIcon className="w-8 h-8 opacity-30" />
                No tasks match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {paginated.map(job => {
                  const cx = COMPLEXITY_CONFIG[job.complexity];
                  return (
                    <div key={job.id} className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] font-bold tracking-wide px-2 py-1 rounded-md border ${cx.bg} ${cx.color}`}>
                          {cx.label}
                        </span>
                        <span className="text-base font-bold text-primary shrink-0">${job.budget.toLocaleString()} USDC</span>
                      </div>

                      <div>
                        <h3 className="font-bold text-base-content text-[15px] leading-snug mb-1 group-hover:text-primary transition-colors">{job.title}</h3>
                        <p className="text-xs text-base-content/50 leading-relaxed line-clamp-2">{job.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-base-content/50">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-base-content/70">{job.client}</span>
                          {job.verified && <CheckBadgeIcon className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <span>·</span>
                          <ClockIcon className="w-3 h-3 shrink-0" />
                          <span>{job.postedAgo}</span>
                        </div>
                        <span className="text-base-content/40">{job.bids} bid{job.bids !== 1 ? "s" : ""}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map(s => (
                          <span key={s} className="badge badge-ghost border border-base-300 text-[11px]">{s}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8">
                <button className="btn btn-ghost btn-sm btn-square" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{"‹"}</button>
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`e-${i}`} className="px-1 text-base-content/30 text-sm">{"…"}</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)} className={`btn btn-sm btn-square ${page === p ? "btn-primary" : "btn-ghost"}`}>{p}</button>
                  )
                )}
                <button className="btn btn-ghost btn-sm btn-square" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>{"›"}</button>
              </div>
            )}
          </div>
        </div>

        {/* Filter sidebar — right */}
        <aside className="w-56 shrink-0 border-l border-base-300 bg-base-100 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-4 border-b border-base-200">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-base-content/50" />
              <span className="text-sm font-semibold text-base-content">Filters</span>
              {activeFilterCount > 0 && (
                <span className="badge badge-primary badge-xs">{activeFilterCount}</span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="text-[11px] text-base-content/40 hover:text-error flex items-center gap-0.5">
                <XMarkIcon className="w-3 h-3" />Reset
              </button>
            )}
          </div>

          <div className="flex-1 px-4 py-5 flex flex-col gap-6">
            {/* Budget range */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Budget Range</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min={0} max={budgetMax}
                  value={budgetMin}
                  onChange={e => { setBudgetMin(Number(e.target.value)); setPage(1); }}
                  className="input input-bordered input-xs w-full text-xs"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min={budgetMin} max={10000}
                  value={budgetMax}
                  onChange={e => { setBudgetMax(Number(e.target.value)); setPage(1); }}
                  className="input input-bordered input-xs w-full text-xs"
                  placeholder="Max"
                />
              </div>
              <input
                type="range" min={0} max={10000} step={100} value={budgetMax}
                onChange={e => { setBudgetMax(Number(e.target.value)); setPage(1); }}
                className="range range-primary range-xs w-full"
              />
              <div className="flex justify-between text-[10px] text-base-content/40 mt-0.5">
                <span>$0</span><span>{budgetMax >= 10000 ? "$10k+" : `$${budgetMax.toLocaleString()}`}</span>
              </div>
            </div>

            {/* Complexity */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Complexity</p>
              {(["low", "mid", "high"] as Complexity[]).map(c => (
                <label key={c} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={complexities.has(c)} onChange={() => toggleComplexity(c)} />
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
                      type="radio" name="postedWithin"
                      className="radio radio-primary radio-sm"
                      checked={postedWithin === o.key}
                      onChange={() => { setPostedWithin(o.key); setPage(1); }}
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

            {/* Verified only */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Client</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); setPage(1); }} />
                <span className="text-sm text-base-content/70 flex items-center gap-1">
                  <CheckBadgeIcon className="w-3.5 h-3.5 text-primary" />
                  Verified only
                </span>
              </label>
            </div>
          </div>

          <div className="p-4 border-t border-base-200">
            <Link href="/post-task" className="btn btn-primary w-full btn-sm gap-1.5">
              <PlusIcon className="w-4 h-4" />
              Post a Task
            </Link>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
};

export default FindWorkPage;
