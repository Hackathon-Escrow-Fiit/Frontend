"use client";

import { useState, useMemo } from "react";
import { blo } from "blo";
import type { NextPage } from "next";
import { CheckBadgeIcon, FunnelIcon, MagnifyingGlassIcon, StarIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { BoltIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Tier = "entry" | "rising" | "skilled" | "expert" | "elite";
type Category = "all" | "web3" | "design" | "writing" | "backend" | "mobile";
type Availability = "any" | "available" | "busy";
type SortBy = "rating" | "elo_desc" | "rate_asc" | "rate_desc" | "jobs_desc";

type Freelancer = {
  id: string;
  address: `0x${string}`;
  name: string;
  title: string;
  tier: Tier;
  elo: number;
  rating: number;
  totalRatings: number;
  hourlyRate: number;
  jobsDone: number;
  skills: string[];
  category: Category;
  available: boolean;
  verified: boolean;
  topSkillScore: { skill: string; score: number };
};

const MOCK_FREELANCERS: Freelancer[] = [
  { id: "1", address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", name: "vitalik.eth",    title: "Smart Contract Architect",      tier: "elite",   elo: 2340, rating: 4.9, totalRatings: 87,  hourlyRate: 220, jobsDone: 142, skills: ["Solidity", "EVM", "Security", "Ethereum"],        category: "web3",    available: true,  verified: true,  topSkillScore: { skill: "Solidity", score: 10 } },
  { id: "2", address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", name: "alice.eth",      title: "UI/UX Designer & Web3 Front",   tier: "expert",  elo: 1820, rating: 4.7, totalRatings: 54,  hourlyRate: 130, jobsDone: 89,  skills: ["Figma", "React", "UI/UX", "Tailwind"],            category: "design",  available: true,  verified: true,  topSkillScore: { skill: "Figma", score: 9 } },
  { id: "3", address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", name: "rustacean.eth",  title: "Backend & Protocol Engineer",   tier: "skilled", elo: 1450, rating: 4.5, totalRatings: 31,  hourlyRate: 95,  jobsDone: 47,  skills: ["Rust", "Node.js", "IPFS", "The Graph"],           category: "backend", available: false, verified: true,  topSkillScore: { skill: "Rust", score: 9 } },
  { id: "4", address: "0x90f79bf6eb2c4f870365e785982e1f101e93b906", name: "scribe.eth",     title: "Web3 Technical Writer",         tier: "rising",  elo: 950,  rating: 4.3, totalRatings: 22,  hourlyRate: 55,  jobsDone: 28,  skills: ["Technical Writing", "DAO", "Documentation"],     category: "writing", available: true,  verified: false, topSkillScore: { skill: "Technical Writing", score: 8 } },
  { id: "5", address: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", name: "mobilex.eth",    title: "React Native & WalletConnect",  tier: "expert",  elo: 1710, rating: 4.8, totalRatings: 43,  hourlyRate: 160, jobsDone: 65,  skills: ["React Native", "WalletConnect", "iOS", "Swift"], category: "mobile",  available: true,  verified: true,  topSkillScore: { skill: "React Native", score: 9 } },
  { id: "6", address: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", name: "graphdev.eth",   title: "Subgraph & Indexing Specialist", tier: "skilled", elo: 1280, rating: 4.4, totalRatings: 18,  hourlyRate: 85,  jobsDone: 34,  skills: ["The Graph", "GraphQL", "AssemblyScript"],        category: "web3",    available: false, verified: true,  topSkillScore: { skill: "GraphQL", score: 8 } },
  { id: "7", address: "0x976ea74026e726554db657fa54763abd0c3a0aa9", name: "aacoder.eth",    title: "ERC-4337 & Account Abstraction", tier: "expert",  elo: 1640, rating: 4.6, totalRatings: 29,  hourlyRate: 145, jobsDone: 51,  skills: ["ERC-4337", "Solidity", "Bundler", "Paymaster"],  category: "web3",    available: true,  verified: true,  topSkillScore: { skill: "ERC-4337", score: 9 } },
  { id: "8", address: "0x14dc79964da2c08b23698b3d3cc7ca32193d9955", name: "brandme.eth",    title: "Brand & Visual Identity",       tier: "rising",  elo: 880,  rating: 4.1, totalRatings: 15,  hourlyRate: 60,  jobsDone: 19,  skills: ["Branding", "Figma", "Illustration", "Web3"],     category: "design",  available: true,  verified: false, topSkillScore: { skill: "Illustration", score: 7 } },
  { id: "9", address: "0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f", name: "datadao.eth",   title: "On-Chain Analytics & React",    tier: "skilled", elo: 1380, rating: 4.5, totalRatings: 26,  hourlyRate: 100, jobsDone: 38,  skills: ["React", "Viem", "TypeScript", "Analytics"],      category: "web3",    available: true,  verified: true,  topSkillScore: { skill: "TypeScript", score: 8 } },
  { id: "10",address: "0xa0ee7a142d267c1f36714e4a8f75612f20a79720", name: "newcoder.eth",  title: "Junior Solidity Developer",     tier: "entry",   elo: 520,  rating: 3.8, totalRatings: 8,   hourlyRate: 35,  jobsDone: 9,   skills: ["Solidity", "Hardhat", "JavaScript"],             category: "web3",    available: true,  verified: false, topSkillScore: { skill: "Solidity", score: 5 } },
];

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  entry:   { label: "Entry",   color: "text-slate-600",  bg: "bg-slate-100" },
  rising:  { label: "Rising",  color: "text-blue-600",   bg: "bg-blue-100" },
  skilled: { label: "Skilled", color: "text-violet-600", bg: "bg-violet-100" },
  expert:  { label: "Expert",  color: "text-amber-600",  bg: "bg-amber-100" },
  elite:   { label: "Elite",   color: "text-rose-600",   bg: "bg-rose-100" },
};

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "web3",    label: "Web3" },
  { key: "design",  label: "Design" },
  { key: "writing", label: "Writing" },
  { key: "backend", label: "Backend" },
  { key: "mobile",  label: "Mobile" },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "rating",    label: "Top Rated" },
  { key: "elo_desc",  label: "Highest Elo" },
  { key: "rate_desc", label: "Rate: High → Low" },
  { key: "rate_asc",  label: "Rate: Low → High" },
  { key: "jobs_desc", label: "Most Jobs Done" },
];

const SKILL_OPTIONS = ["Solidity", "React", "TypeScript", "Figma", "Node.js", "The Graph", "Rust", "Security", "UI/UX", "Technical Writing"];

const TIERS: Tier[] = ["entry", "rising", "skilled", "expert", "elite"];
const ITEMS_PER_PAGE = 6;

const ExplorePage: NextPage = () => {
  const [search, setSearch]             = useState("");
  const [category, setCategory]         = useState<Category>("all");
  const [tiers, setTiers]               = useState<Set<Tier>>(new Set(TIERS));
  const [minRating, setMinRating]       = useState(0);
  const [maxRate, setMaxRate]           = useState(250);
  const [availability, setAvailability] = useState<Availability>("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy]             = useState<SortBy>("rating");
  const [page, setPage]                 = useState(1);

  const toggleTier = (t: Tier) => {
    setTiers(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
    setPage(1);
  };

  const toggleSkill = (s: string) => {
    setSelectedSkills(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setPage(1);
  };

  const resetFilters = () => {
    setTiers(new Set(TIERS)); setMinRating(0); setMaxRate(250);
    setAvailability("any"); setVerifiedOnly(false); setSelectedSkills(new Set()); setPage(1);
  };

  const activeFilterCount = [
    tiers.size < TIERS.length,
    minRating > 0,
    maxRate < 250,
    availability !== "any",
    verifiedOnly,
    selectedSkills.size > 0,
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = MOCK_FREELANCERS.filter(f => {
      if (category !== "all" && f.category !== category) return false;
      if (!tiers.has(f.tier)) return false;
      if (f.rating < minRating) return false;
      if (f.hourlyRate > maxRate) return false;
      if (availability === "available" && !f.available) return false;
      if (availability === "busy" && f.available) return false;
      if (verifiedOnly && !f.verified) return false;
      if (selectedSkills.size > 0 && !f.skills.some(s => selectedSkills.has(s))) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.title.toLowerCase().includes(q) || f.skills.some(s => s.toLowerCase().includes(q));
      }
      return true;
    });

    if (sortBy === "elo_desc")  list = [...list].sort((a, b) => b.elo - a.elo);
    if (sortBy === "rating")    list = [...list].sort((a, b) => b.rating - a.rating);
    if (sortBy === "rate_asc")  list = [...list].sort((a, b) => a.hourlyRate - b.hourlyRate);
    if (sortBy === "rate_desc") list = [...list].sort((a, b) => b.hourlyRate - a.hourlyRate);
    if (sortBy === "jobs_desc") list = [...list].sort((a, b) => b.jobsDone - a.jobsDone);

    return list;
  }, [search, category, tiers, minRating, maxRate, availability, verifiedOnly, selectedSkills, sortBy]);

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
          {/* Search + sort bar */}
          <div className="px-6 pt-5 pb-4 border-b border-base-300 bg-base-100 flex flex-col gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Search by name, skill, or ENS..."
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
              <span className="text-xs text-base-content/40 shrink-0 whitespace-nowrap">{filtered.length} freelancers</span>
            </div>

            <div className="flex gap-2 flex-wrap">
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

          {/* Freelancer grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-base-content/30 text-sm gap-2">
                <FunnelIcon className="w-8 h-8 opacity-30" />
                No freelancers match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {paginated.map(f => {
                  const tier = TIER_CONFIG[f.tier];
                  return (
                    <div key={f.id} className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={blo(f.address)} alt={f.name} className="w-11 h-11 rounded-full" />
                          {f.available && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-100" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-sm text-base-content group-hover:text-primary transition-colors truncate">{f.name}</span>
                            {f.verified && <CheckBadgeIcon className="w-3.5 h-3.5 text-primary shrink-0" />}
                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tier.bg} ${tier.color}`}>
                              {tier.label}
                            </span>
                          </div>
                          <p className="text-xs text-base-content/50 truncate">{f.title}</p>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <StarIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-semibold text-base-content">{f.rating.toFixed(1)}</span>
                          <span className="text-base-content/40">({f.totalRatings})</span>
                        </div>
                        <div className="flex items-center gap-1 text-base-content/50">
                          <BoltIcon className="w-3.5 h-3.5" />
                          <span>{f.elo} Elo</span>
                        </div>
                        <div className="ml-auto font-bold text-primary text-sm">${f.hourlyRate}/hr</div>
                      </div>

                      {/* Top skill score */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-base-content/40">Top skill: {f.topSkillScore.skill}</span>
                          <span className="text-[11px] font-bold text-base-content">{f.topSkillScore.score}/10</span>
                        </div>
                        <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
                            style={{ width: `${(f.topSkillScore.score / 10) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5">
                        {f.skills.slice(0, 4).map(s => (
                          <span key={s} className="badge badge-ghost border border-base-300 text-[11px]">{s}</span>
                        ))}
                        {f.skills.length > 4 && (
                          <span className="badge badge-ghost border border-base-300 text-[11px]">+{f.skills.length - 4}</span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-base-content/40 pt-1 border-t border-base-200">
                        <span>{f.jobsDone} jobs completed</span>
                        <span className={f.available ? "text-success font-medium" : "text-base-content/30"}>
                          {f.available ? "Available now" : "Unavailable"}
                        </span>
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
              {activeFilterCount > 0 && <span className="badge badge-primary badge-xs">{activeFilterCount}</span>}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="text-[11px] text-base-content/40 hover:text-error flex items-center gap-0.5">
                <XMarkIcon className="w-3 h-3" />Reset
              </button>
            )}
          </div>

          <div className="flex-1 px-4 py-5 flex flex-col gap-6">
            {/* Tier */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Tier</p>
              {TIERS.map(t => {
                const tc = TIER_CONFIG[t];
                return (
                  <label key={t} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={tiers.has(t)} onChange={() => toggleTier(t)} />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>{tc.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Hourly rate */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Max Hourly Rate</p>
              <input
                type="range" min={10} max={250} step={5} value={maxRate}
                onChange={e => { setMaxRate(Number(e.target.value)); setPage(1); }}
                className="range range-primary range-xs w-full"
              />
              <div className="flex justify-between text-[10px] text-base-content/40 mt-0.5">
                <span>$10/hr</span>
                <span>{maxRate >= 250 ? "$250+/hr" : `$${maxRate}/hr`}</span>
              </div>
            </div>

            {/* Min rating */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Min Rating</p>
              <div className="flex gap-1">
                {[0, 3, 4, 4.5].map(r => (
                  <button
                    key={r}
                    onClick={() => { setMinRating(r); setPage(1); }}
                    className={`btn btn-xs flex-1 ${minRating === r ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  >
                    {r === 0 ? "Any" : `${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Availability</p>
              {(["any", "available", "busy"] as Availability[]).map(a => (
                <label key={a} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="radio" name="availability" className="radio radio-primary radio-sm" checked={availability === a} onChange={() => { setAvailability(a); setPage(1); }} />
                  <span className="text-sm text-base-content/70 capitalize">{a === "any" ? "Any" : a === "available" ? "Available now" : "Busy"}</span>
                </label>
              ))}
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
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Identity</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); setPage(1); }} />
                <span className="text-sm text-base-content/70 flex items-center gap-1">
                  <CheckBadgeIcon className="w-3.5 h-3.5 text-primary" />
                  Verified only
                </span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
