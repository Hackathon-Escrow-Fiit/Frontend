"use client";

import { useState } from "react";
import { blo } from "blo";
import { useAccount, useDisconnect } from "wagmi";
import {
  ArrowRightOnRectangleIcon,
  BoltIcon,
  CheckBadgeIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { namehash } from "viem/ens";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useDecentraWorkRegistry, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type Tab = "overview" | "history" | "portfolio";

const MOCK_ADDRESS = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" as const;

const stats = [
  { label: "COMPLETION RATE", value: "99.2%" },
  { label: "AVG AI SCORE", value: "4.9/5" },
  { label: "DISPUTE WIN RATE", value: "100%" },
  { label: "TOTAL TASKS", value: "142" },
];

const skillKeys = [
  "Solidity",
  "Rust",
  "TypeScript",
  "Smart Contract Auditing",
  "EVM Architecture",
  "CSS",
  "Web Development",
];

const verifications = ["BrightID Verified", "ENS Delegate", "Proof of Personhood"];

const networkStats = [
  { label: "Gitcoin Score", value: "74.2", progress: 74 },
  { label: "PoAP Count", value: "12", progress: null },
  { label: "Followers", value: "1.4k", progress: null },
];

type Tier = {
  label: string;
  color: string;
  bg: string;
  min: number;
  max: number | null;
  multiplier: string;
  access: string;
};

const TIERS: Tier[] = [
  {
    label: "Entry",
    color: "text-slate-500",
    bg: "bg-slate-100",
    min: 0,
    max: 799,
    multiplier: "0.7x",
    access: "Simple tasks (complexity < 800)",
  },
  {
    label: "Rising",
    color: "text-blue-600",
    bg: "bg-blue-100",
    min: 800,
    max: 1199,
    multiplier: "1.0x",
    access: "Standard tasks (complexity < 1200)",
  },
  {
    label: "Skilled",
    color: "text-violet-600",
    bg: "bg-violet-100",
    min: 1200,
    max: 1599,
    multiplier: "1.3x",
    access: "All tasks including complex",
  },
  {
    label: "Expert",
    color: "text-amber-600",
    bg: "bg-amber-100",
    min: 1600,
    max: 1999,
    multiplier: "1.7x",
    access: "All tasks + invited-only premium",
  },
  {
    label: "Elite",
    color: "text-rose-600",
    bg: "bg-rose-100",
    min: 2000,
    max: null,
    multiplier: "2.2x+",
    access: "All tasks + featured + priority",
  },
];

const getTier = (elo: number): Tier => TIERS.findLast(t => elo >= t.min) ?? TIERS[0];

const ProfilePage = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { currentName, role, bio, isLoadingBio } = useDecentraWorkRegistry();

  const displayAddress = address ?? MOCK_ADDRESS;
  const ensHandle = currentName ? `@${currentName}.nexora.eth` : "@alexrivers.nexora.eth";
  const displayName = currentName ?? "Alex Rivers";

  // Read Elo / reputation from ReputationSystem
  const { data: rawElo } = useScaffoldReadContract({
    contractName: "ReputationSystem",
    functionName: "getReputation",
    args: [displayAddress],
  });

  // Read star rating
  const { data: ratingData } = useScaffoldReadContract({
    contractName: "ReputationSystem",
    functionName: "getFreelancerRating",
    args: [displayAddress],
  });

  // Read per-skill scores
  const skillResults = skillKeys.map(skill => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useScaffoldReadContract({
      contractName: "ReputationSystem",
      functionName: "getSkill",
      args: [displayAddress, skill],
    });
    return { skill, score: data != null ? Number(data) : null };
  });

  // ENS resolver text records — reads live from NexoraResolver
  const ensNode = currentName ? namehash(`${currentName}.nexora.eth`) : undefined;

  const { data: ensElo } = useScaffoldReadContract({
    contractName: "NexoraResolver",
    functionName: "text",
    args: ensNode ? [ensNode, "decentrawork.elo"] : undefined,
    query: { enabled: !!ensNode },
  });
  const { data: ensTier } = useScaffoldReadContract({
    contractName: "NexoraResolver",
    functionName: "text",
    args: ensNode ? [ensNode, "decentrawork.tier"] : undefined,
    query: { enabled: !!ensNode },
  });
  const { data: ensRole } = useScaffoldReadContract({
    contractName: "NexoraResolver",
    functionName: "text",
    args: ensNode ? [ensNode, "decentrawork.role"] : undefined,
    query: { enabled: !!ensNode },
  });
  const { data: ensBio } = useScaffoldReadContract({
    contractName: "NexoraResolver",
    functionName: "text",
    args: ensNode ? [ensNode, "decentrawork.bio"] : undefined,
    query: { enabled: !!ensNode },
  });

  const elo = rawElo != null ? Number(rawElo) : 300;
  const tier = getTier(elo);
  const tierIndex = TIERS.indexOf(tier);

  const avgStars = ratingData ? (Number(ratingData[0]) / 100).toFixed(1) : null;
  const totalRatings = ratingData ? Number(ratingData[1]) : 0;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        <div className="h-40 w-full bg-gradient-to-br from-purple-300 via-purple-200 to-violet-100 shrink-0" />

        {/* Profile header */}
        <div className="px-8 pb-0 relative">
          <div className="flex items-end justify-between -mt-14 mb-5">
            <div className="flex items-end gap-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blo(displayAddress as `0x${string}`)}
                  alt="avatar"
                  className="w-24 h-24 rounded-full border-4 border-base-100 shadow-md"
                />
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckBadgeIcon className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-xl font-bold text-base-content">{displayName}</h1>
                  {role && (
                    <span className="badge badge-sm bg-purple-100 text-purple-700 border-purple-200 font-medium capitalize">
                      {role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-base-content/50">
                  <span>{ensHandle}</span>
                  <CheckBadgeIcon className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <button className="btn btn-primary btn-sm gap-1.5">
                <EnvelopeIcon className="w-4 h-4" />
                Message
              </button>
              <div className="relative">
                <button
                  className="btn btn-ghost btn-sm btn-square border border-base-300"
                  onClick={() => setMenuOpen(o => !o)}
                >
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-base-100 border border-base-300 rounded-xl shadow-lg py-1 min-w-[140px]">
                      <button
                        onClick={() => {
                          disconnect();
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error hover:bg-base-200 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 divide-x divide-base-300 border border-base-300 rounded-xl mb-6 bg-base-100">
            {stats.map(({ label, value }) => (
              <div key={label} className="px-6 py-4">
                <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-1">{label}</p>
                <p className="text-2xl font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-base-300 mb-6">
            {(["overview", "history", "portfolio"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content"
                }`}
              >
                {t === "history" ? "Task History" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="flex gap-5 pb-10">
              {/* Left column */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">
                {/* Professional Summary */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-5">
                  <h2 className="font-bold text-base-content mb-3">Professional Summary</h2>

                  {isLoadingBio && <span className="loading loading-spinner loading-sm text-primary" />}

                  {!isLoadingBio && bio && <p className="text-sm text-base-content/60 leading-relaxed">{bio}</p>}

                  {!isLoadingBio && !bio && (
                    <p className="text-sm text-base-content/40 italic">No summary provided yet.</p>
                  )}
                </div>

                {/* Skill Scores */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BoltIcon className="w-4 h-4 text-primary" />
                    <h2 className="font-bold text-base-content">AI-Evaluated Skill Scores</h2>
                    <span className="text-[10px] text-base-content/40 ml-auto">out of 10</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {skillResults.map(({ skill, score }) => {
                      const display = score ?? 0;
                      const pct = (display / 10) * 100;
                      return (
                        <div key={skill}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-base-content/70">{skill}</span>
                            <span className="text-sm font-bold text-base-content">
                              {score != null ? `${display}/10` : "—"}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all"
                              style={{ width: score != null ? `${pct}%` : "0%" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Star Rating */}
                {(avgStars || totalRatings > 0) && (
                  <div className="bg-base-100 border border-base-300 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <StarIcon className="w-4 h-4 text-amber-400" />
                      <h2 className="font-bold text-base-content">Client Ratings</h2>
                    </div>
                    <div className="flex items-end gap-2 mt-2">
                      <span className="text-4xl font-bold text-base-content">{avgStars ?? "—"}</span>
                      <span className="text-base-content/40 text-sm mb-1">/ 5.0 · {totalRatings} reviews</span>
                    </div>
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <StarIcon
                          key={i}
                          className={`w-5 h-5 ${avgStars && i <= Math.round(Number(avgStars)) ? "text-amber-400" : "text-base-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Contributions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-base-content">Recent Contributions</h2>
                    <button className="text-xs text-primary hover:underline">View All Portfolio</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["/thumbnail.jpg", "/thumbnail.jpg"].map((src, i) => (
                      <div
                        key={i}
                        className="rounded-xl overflow-hidden border border-base-300 aspect-video bg-base-300"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`contribution ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="w-60 shrink-0 flex flex-col gap-4">
                {/* Elo / Tier */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Reputation & Tier
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge font-bold text-sm px-3 py-3 ${tier.bg} ${tier.color} border-0`}>
                      {tier.label}
                    </span>
                    <span className="text-2xl font-bold text-base-content">{elo}</span>
                  </div>

                  {/* Tier progress bar */}
                  <div className="flex gap-0.5 mb-3">
                    {TIERS.map((t, i) => (
                      <div
                        key={t.label}
                        className={`h-1.5 flex-1 rounded-full ${i <= tierIndex ? "bg-primary" : "bg-base-300"}`}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-base-content/50">Rate multiplier</span>
                      <span className="font-bold text-base-content">{tier.multiplier}</span>
                    </div>
                    <div className="text-base-content/50 leading-relaxed">{tier.access}</div>
                  </div>

                  {/* Tier ladder */}
                  <div className="mt-4 flex flex-col gap-1">
                    {TIERS.map((t, i) => (
                      <div
                        key={t.label}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                          i === tierIndex ? `${t.bg} ${t.color} font-semibold` : "text-base-content/40"
                        }`}
                      >
                        <span>{t.label}</span>
                        <span>{t.max ? `${t.min}–${t.max}` : `${t.min}+`}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Verification
                  </p>
                  <div className="flex flex-col gap-2">
                    {verifications.map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-base-content/70">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ENS Profile */}
                {currentName && (
                  <div className="bg-base-100 border border-primary/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 shrink-0" />
                      <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">
                        ENS Profile
                      </p>
                    </div>
                    <p className="text-xs font-mono text-primary mb-3 truncate">
                      {currentName}.nexora.eth
                    </p>
                    <div className="flex flex-col gap-2">
                      {[
                        { key: "decentrawork.elo", value: ensElo as string | undefined },
                        { key: "decentrawork.tier", value: ensTier as string | undefined },
                        { key: "decentrawork.role", value: ensRole as string | undefined },
                        { key: "decentrawork.bio", value: ensBio as string | undefined },
                      ].map(({ key, value }) => (
                        <div key={key}>
                          <p className="text-[10px] text-base-content/30 font-mono">{key}</p>
                          {value ? (
                            <p className="text-xs text-base-content/70 truncate font-medium">
                              {key === "decentrawork.bio" && value.length > 40
                                ? value.slice(0, 40) + "…"
                                : value}
                            </p>
                          ) : (
                            <p className="text-xs text-base-content/20 italic">resolving…</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-base-content/25 mt-3 leading-relaxed">
                      Readable by any ENS-compatible app
                    </p>
                  </div>
                )}

                {/* Network Stats */}
                <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                  <p className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase mb-3">
                    Network Stats
                  </p>
                  <div className="flex flex-col gap-3">
                    {networkStats.map(({ label, value, progress }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-base-content/60">{label}</span>
                          <span className="text-sm font-bold text-base-content">{value}</span>
                        </div>
                        {progress !== null && (
                          <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="pb-10">
              <p className="text-sm text-base-content/40 py-8 text-center">No task history yet.</p>
            </div>
          )}

          {tab === "portfolio" && (
            <div className="pb-10">
              <p className="text-sm text-base-content/40 py-8 text-center">No portfolio items yet.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
