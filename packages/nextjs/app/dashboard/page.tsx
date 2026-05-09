"use client";

import Link from "next/link";
import {
  BriefcaseIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Task = {
  id: string;
  title: string;
  client: string;
  clientRating: number;
  budget: string;
  duration: string;
  complexity: "Low" | "Medium" | "High" | "Expert";
  bids: number;
  tags: string[];
  description: string;
  postedAt: string;
};

const complexityColor: Record<Task["complexity"], string> = {
  Low: "text-success bg-success/10",
  Medium: "text-info bg-info/10",
  High: "text-warning bg-warning/10",
  Expert: "text-error bg-error/10",
};

const tasks: Task[] = [
  {
    id: "1",
    title: "Next-Gen DeFi Dashboard",
    client: "vitalik.eth",
    clientRating: 4.9,
    budget: "$10k – $15k",
    duration: "3 Weeks",
    complexity: "Expert",
    bids: 6,
    tags: ["React / Next.js", "Solidity", "Web3.js"],
    description:
      "Build a high-performance real-time DeFi dashboard aggregating data from Ethereum, Arbitrum, and Optimism with portfolio tracking and cross-chain swap support.",
    postedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Smart Contract Security Audit",
    client: "alice.eth",
    clientRating: 4.7,
    budget: "$2k – $5k",
    duration: "2 Weeks",
    complexity: "High",
    bids: 3,
    tags: ["Solidity", "Security", "Auditing"],
    description:
      "Full audit of staking and liquidity pool contracts. Must identify reentrancy, overflow issues and provide a detailed PDF report with severity ratings.",
    postedAt: "5 hours ago",
  },
  {
    id: "3",
    title: "NFT Marketplace UI Redesign",
    client: "satoshi.eth",
    clientRating: 4.5,
    budget: "$3k – $6k",
    duration: "4 Weeks",
    complexity: "Medium",
    bids: 11,
    tags: ["UI/UX Design", "Figma", "React"],
    description:
      "Redesign of an existing NFT marketplace. Pixel-perfect Figma handoff required. Focus on improved UX for minting, listing, and bidding flows.",
    postedAt: "Yesterday",
  },
  {
    id: "4",
    title: "DAO Governance Dashboard",
    client: "marcus.eth",
    clientRating: 5.0,
    budget: "$5k – $8k",
    duration: "3 Weeks",
    complexity: "High",
    bids: 2,
    tags: ["React", "Subgraph", "TypeScript"],
    description:
      "Build a governance portal for a DAO with on-chain proposal creation, voting, and treasury management integrated via The Graph and Snapshot.",
    postedAt: "Yesterday",
  },
  {
    id: "5",
    title: "Solidity Gas Optimization",
    client: "bob.eth",
    clientRating: 4.3,
    budget: "$800 – $2k",
    duration: "1 Week",
    complexity: "Medium",
    bids: 8,
    tags: ["Solidity", "Gas Optimization"],
    description:
      "Optimize a set of ERC-20 and staking contracts for gas efficiency. Benchmark before/after and deliver an optimization report with inline comments.",
    postedAt: "2 days ago",
  },
  {
    id: "6",
    title: "Cross-Chain Bridge Integration",
    client: "crypto_dev.eth",
    clientRating: 4.8,
    budget: "$8k – $12k",
    duration: "5 Weeks",
    complexity: "Expert",
    bids: 4,
    tags: ["Solidity", "LayerZero", "TypeScript"],
    description:
      "Integrate a cross-chain token bridge using LayerZero. Must support Ethereum, Polygon, and BNB Chain with a clean React frontend and error handling.",
    postedAt: "3 days ago",
  },
];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-base-content">Browse Tasks</h1>
            <p className="text-sm text-base-content/50 mt-0.5">{tasks.length} open tasks available right now</p>
          </div>
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-base-100 border border-base-200 rounded-xl px-4 py-2.5 w-64">
            <MagnifyingGlassIcon className="w-4 h-4 text-base-content/40 shrink-0" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="bg-transparent text-sm outline-none text-base-content placeholder:text-base-content/30 w-full"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: BriefcaseIcon, label: "Open Tasks", value: "248", color: "bg-primary/10 text-primary" },
            {
              icon: CurrencyDollarIcon,
              label: "Total Value Locked",
              value: "$1.2M",
              color: "bg-success/10 text-success",
            },
            { icon: UserGroupIcon, label: "Active Freelancers", value: "1,840", color: "bg-info/10 text-info" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-base-100 rounded-2xl border border-base-200 px-5 py-4 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-base-content/50">{label}</p>
                <p className="text-lg font-bold text-base-content">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Task cards */}
        <div className="space-y-3">
          {tasks.map(task => (
            <Link
              key={task.id}
              href={`/browse/${task.id}`}
              className="block bg-base-100 rounded-2xl border border-base-200 p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-base-content group-hover:text-primary transition-colors mb-1 truncate">
                    {task.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <span className="font-medium text-base-content/70">{task.client}</span>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-primary" />
                    <span>·</span>
                    <span className="text-warning">★</span>
                    <span>{task.clientRating}</span>
                    <span>·</span>
                    <span>{task.postedAt}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-primary">{task.budget}</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${complexityColor[task.complexity]}`}
                    >
                      {task.complexity}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-base-content/60 leading-relaxed mb-3 line-clamp-2">{task.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] border border-base-300 text-base-content/60 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-base-content/40 shrink-0 ml-4">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {task.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserGroupIcon className="w-3.5 h-3.5" />
                    {task.bids} bids
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
