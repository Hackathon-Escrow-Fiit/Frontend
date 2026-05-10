"use client";

import { useMemo, useState } from "react";
import { blo } from "blo";
import type { NextPage } from "next";
import { useReadContracts } from "wagmi";
import { BoltIcon } from "@heroicons/react/24/outline";
import { CheckBadgeIcon, FunnelIcon, MagnifyingGlassIcon, StarIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDeployedContractInfo, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

type Tier = "entry" | "rising" | "skilled" | "expert" | "elite";
type SortBy = "rating" | "elo_desc" | "jobs_desc";

type Freelancer = {
  id: string;
  address: `0x${string}`;
  name: string;
  title: string;
  tier: Tier;
  elo: number;
  rating: number;
  totalRatings: number;
  jobsDone: number;
  skills: string[];
  topSkillScore: { skill: string; score: number };
};

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  entry: { label: "Entry", color: "text-slate-600", bg: "bg-slate-100" },
  rising: { label: "Rising", color: "text-blue-600", bg: "bg-blue-100" },
  skilled: { label: "Skilled", color: "text-violet-600", bg: "bg-violet-100" },
  expert: { label: "Expert", color: "text-amber-600", bg: "bg-amber-100" },
  elite: { label: "Elite", color: "text-rose-600", bg: "bg-rose-100" },
};

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "rating", label: "Top Rated" },
  { key: "elo_desc", label: "Highest Elo" },
  { key: "jobs_desc", label: "Most Jobs Done" },
];

const TIERS: Tier[] = ["entry", "rising", "skilled", "expert", "elite"];
const ITEMS_PER_PAGE = 6;

function eloToTier(elo: number): Tier {
  if (elo >= 2000) return "elite";
  if (elo >= 1500) return "expert";
  if (elo >= 1000) return "skilled";
  if (elo >= 600) return "rising";
  return "entry";
}

function useChainFreelancers() {
  const { data: events, isLoading: eventsLoading } = useScaffoldEventHistory({
    contractName: "DecentraWorkRegistry",
    eventName: "NameRegistered",
    fromBlock: 0n,
    watch: true,
  });

  // Unique freelancers — latest registration wins
  const entries = useMemo(() => {
    if (!events) return [];
    const seen = new Set<string>();
    const result: { name: string; address: `0x${string}` }[] = [];
    for (const e of [...events].reverse()) {
      if (Number(e.args.role) !== 1) continue; // 1 = Freelancer
      const addr = (e.args.owner as string).toLowerCase();
      if (seen.has(addr)) continue;
      seen.add(addr);
      result.push({ name: e.args.name as string, address: e.args.owner as `0x${string}` });
    }
    return result;
  }, [events]);

  const { data: repInfo } = useDeployedContractInfo({ contractName: "ReputationSystem" });
  const { data: regInfo } = useDeployedContractInfo({ contractName: "DecentraWorkRegistry" });

  const contracts = useMemo(() => {
    if (!repInfo || !regInfo || !entries.length) return [];
    return entries.flatMap(e => [
      { address: repInfo.address, abi: repInfo.abi, functionName: "getReputation" as const, args: [e.address] },
      { address: repInfo.address, abi: repInfo.abi, functionName: "getFreelancerRating" as const, args: [e.address] },
      { address: regInfo.address, abi: regInfo.abi, functionName: "getBio" as const, args: [e.address] },
    ]);
  }, [entries, repInfo, regInfo]);

  const { data: reads, isLoading: readsLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const freelancers = useMemo<Freelancer[]>(() => {
    return entries.map((entry, i) => {
      const base = i * 3;
      const elo = Number((reads?.[base]?.result as bigint | undefined) ?? 0n);
      const ratingScaled = Number((reads?.[base + 1]?.result as bigint | undefined) ?? 0n);
      const bio = (reads?.[base + 2]?.result as string | undefined) ?? "";
      const rating = ratingScaled > 0 ? Math.min(5, ratingScaled / 10) : 0;
      const tier = eloToTier(elo);
      const repScore = Math.min(10, Math.round(elo / 250));
      return {
        id: entry.address,
        address: entry.address,
        name: `${entry.name}.nexora.eth`,
        title: bio || "DecentraWork Freelancer",
        tier,
        elo,
        rating,
        totalRatings: 0,
        jobsDone: 0,
        skills: [],
        topSkillScore: { skill: "Reputation", score: repScore },
      };
    });
  }, [entries, reads]);

  return { freelancers, isLoading: eventsLoading || readsLoading };
}

const ExplorePage: NextPage = () => {
  const [search, setSearch] = useState("");
  const [tiers, setTiers] = useState<Set<Tier>>(new Set(TIERS));
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("elo_desc");
  const [page, setPage] = useState(1);

  const { freelancers, isLoading } = useChainFreelancers();

  const toggleTier = (t: Tier) => {
    setTiers(prev => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
    setPage(1);
  };

  const resetFilters = () => {
    setTiers(new Set(TIERS));
    setMinRating(0);
    setPage(1);
  };

  const activeFilterCount = [tiers.size < TIERS.length, minRating > 0].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = freelancers.filter(f => {
      if (!tiers.has(f.tier)) return false;
      if (f.rating > 0 && f.rating < minRating) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.title.toLowerCase().includes(q);
      }
      return true;
    });

    if (sortBy === "elo_desc") list = [...list].sort((a, b) => b.elo - a.elo);
    if (sortBy === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sortBy === "jobs_desc") list = [...list].sort((a, b) => b.jobsDone - a.jobsDone);

    return list;
  }, [search, tiers, minRating, sortBy, freelancers]);

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
          <div className="px-6 pt-5 pb-4 border-b border-base-300 bg-base-100 flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search by name or ENS..."
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
              {isLoading ? "Loading…" : `${filtered.length} freelancers`}
            </span>
          </div>

          {/* Freelancer grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3 animate-pulse"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-full bg-base-300 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-base-300 rounded w-2/3" />
                        <div className="h-2.5 bg-base-300 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-2 bg-base-300 rounded w-full" />
                    <div className="h-2 bg-base-300 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-base-content/30 text-sm gap-2">
                <FunnelIcon className="w-8 h-8 opacity-30" />
                {freelancers.length === 0 ? "No freelancers registered yet." : "No freelancers match your filters."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {paginated.map(f => {
                  const tier = TIER_CONFIG[f.tier];
                  return (
                    <div
                      key={f.id}
                      className="bg-base-100 border border-base-300 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={blo(f.address)} alt={f.name} className="w-11 h-11 rounded-full" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-base-100" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-sm text-base-content group-hover:text-primary transition-colors truncate">
                              {f.name}
                            </span>
                            <CheckBadgeIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span
                              className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${tier.bg} ${tier.color}`}
                            >
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
                          {f.rating > 0 ? (
                            <span className="font-semibold text-base-content">{f.rating.toFixed(1)}</span>
                          ) : (
                            <span className="text-base-content/30">No rating yet</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-base-content/50">
                          <BoltIcon className="w-3.5 h-3.5" />
                          <span>{f.elo > 0 ? `${f.elo} Elo` : "New"}</span>
                        </div>
                      </div>

                      {/* Reputation score bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-base-content/40">{f.topSkillScore.skill}</span>
                          <span className="text-[11px] font-bold text-base-content">{f.topSkillScore.score}/10</span>
                        </div>
                        <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
                            style={{ width: `${(f.topSkillScore.score / 10) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-base-content/40 pt-1 border-t border-base-200">
                        <span className="font-mono text-[10px]">
                          {f.address.slice(0, 6)}…{f.address.slice(-4)}
                        </span>
                        <span className="text-success font-medium">On-chain verified</span>
                      </div>
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

        {/* Filter sidebar — right */}
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
            {/* Tier */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Tier</p>
              {TIERS.map(t => {
                const tc = TIER_CONFIG[t];
                return (
                  <label key={t} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={tiers.has(t)}
                      onChange={() => toggleTier(t)}
                    />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
                      {tc.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Min rating */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">Min Rating</p>
              <div className="flex gap-1">
                {[0, 3, 4, 4.5].map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setMinRating(r);
                      setPage(1);
                    }}
                    className={`btn btn-xs flex-1 ${minRating === r ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  >
                    {r === 0 ? "Any" : `${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Identity */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-2">Identity</p>
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                <CheckBadgeIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                All shown are on-chain verified
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
};

export default ExplorePage;
