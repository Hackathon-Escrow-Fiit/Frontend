"use client";

import Link from "next/link";
import { blo } from "blo";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Task = {
  id: string;
  title: string;
  tags: string[];
  budget: string;
  role: "client" | "freelancer";
  counterpart: { address: `0x${string}`; name: string };
  status: "Active" | "In Review" | "Funded" | "Completed" | "Disputed";
  updatedAt: string;
};

const TASKS: Task[] = [
  {
    id: "1",
    title: "Next-Gen DeFi Dashboard",
    tags: ["Design", "Solidity"],
    budget: "$12,400 USDC",
    role: "client",
    counterpart: { address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", name: "decentrawork.eth" },
    status: "Active",
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Solidity Smart Contract Audit: Liquidity Protocol",
    tags: ["Smart Contract Security"],
    budget: "$2,500 USDC",
    role: "freelancer",
    counterpart: { address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", name: "vitalik.eth" },
    status: "In Review",
    updatedAt: "Yesterday",
  },
  {
    id: "3",
    title: "NFT Marketplace Smart Contracts",
    tags: ["NFT", "Solidity"],
    budget: "$5,800 USDC",
    role: "client",
    counterpart: { address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", name: "bob.eth" },
    status: "Funded",
    updatedAt: "3 days ago",
  },
  {
    id: "4",
    title: "DeFi Protocol Frontend Integration",
    tags: ["Frontend Development", "DeFi"],
    budget: "$3,200 USDC",
    role: "freelancer",
    counterpart: { address: "0x90f79bf6eb2c4f870365e785982e1f101e93b906", name: "satoshi.eth" },
    status: "Completed",
    updatedAt: "May 13",
  },
  {
    id: "5",
    title: "DAO Governance Dashboard",
    tags: ["UI / UX Design", "Frontend Development"],
    budget: "$1,800 USDC",
    role: "client",
    counterpart: { address: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", name: "alice.eth" },
    status: "Disputed",
    updatedAt: "May 10",
  },
];

const STATUS_STYLES: Record<Task["status"], string> = {
  Active: "badge-primary",
  "In Review": "badge-warning",
  Funded: "badge-info",
  Completed: "badge-success",
  Disputed: "badge-error",
};

const MyTasksPage = () => {
  const active = TASKS.filter(t => t.status !== "Completed");
  const completed = TASKS.filter(t => t.status === "Completed");

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-base-content mb-1">My Tasks</h1>
            <p className="text-sm text-base-content/50">Manage your active and completed engagements.</p>
          </div>
          <Link href="/post-task" className="btn btn-primary gap-2">
            <PlusIcon className="w-4 h-4" />
            Post a Task
          </Link>
        </div>

        {/* Active tasks */}
        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
              Active ({active.length})
            </h2>
            <div className="flex flex-col gap-3">
              {active.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {/* Completed tasks */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3">
              Completed ({completed.length})
            </h2>
            <div className="flex flex-col gap-3">
              {completed.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {TASKS.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardDocumentListIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-base-content mb-1">No tasks yet</h3>
            <p className="text-sm text-base-content/50 mb-5">Post your first task to get started.</p>
            <Link href="/post-task" className="btn btn-primary btn-sm">
              Post a Task
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const TaskCard = ({ task }: { task: Task }) => (
  <Link
    href={`/my-tasks/${task.id}`}
    className="bg-base-100 border border-base-300 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={blo(task.counterpart.address)} alt={task.counterpart.name} className="w-10 h-10 rounded-full shrink-0" />

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-semibold text-base-content truncate group-hover:text-primary transition-colors">
          {task.title}
        </p>
        <span className={`badge badge-sm ${STATUS_STYLES[task.status]} shrink-0`}>{task.status}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-base-content/50">
        <span className="capitalize">{task.role}</span>
        <span>·</span>
        <span>{task.counterpart.name}</span>
        <span>·</span>
        {task.tags.map(tag => (
          <span key={tag} className="badge badge-outline badge-xs">
            {tag}
          </span>
        ))}
      </div>
    </div>

    <div className="text-right shrink-0">
      <p className="text-sm font-semibold text-base-content">{task.budget}</p>
      <p className="text-xs text-base-content/40 mt-0.5">{task.updatedAt}</p>
    </div>
  </Link>
);

export default MyTasksPage;
