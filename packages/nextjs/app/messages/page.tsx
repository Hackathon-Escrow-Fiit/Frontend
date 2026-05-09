"use client";

import { useRef, useState } from "react";
import { blo } from "blo";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  FaceSmileIcon,
  FlagIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Conversation = {
  id: string;
  address: `0x${string}`;
  name: string;
  preview: string;
  time: string;
  taskTitle: string;
  taskStatus: "IN PROGRESS" | "COMPLETED" | "DISPUTED" | "OPEN";
};

type Message =
  | { id: string; kind: "date"; label: string }
  | { id: string; kind: "system"; text: string }
  | {
      id: string;
      kind: "received";
      sender: string;
      senderAddress: `0x${string}`;
      time: string;
      text: string;
      attachment?: { name: string; size: string };
    }
  | { id: string; kind: "sent"; time: string; text: string };

const conversations: Conversation[] = [
  {
    id: "1",
    address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    name: "cryptodev.eth",
    preview: "The smart contract audit for th...",
    time: "10:45 AM",
    taskTitle: "Smart Contract Audit: Liquidity Locker",
    taskStatus: "IN PROGRESS",
  },
  {
    id: "2",
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    name: "alice.eth",
    preview: "I've updated the Figma file with t...",
    time: "Yesterday",
    taskTitle: "UI/UX Redesign — Dashboard",
    taskStatus: "OPEN",
  },
  {
    id: "3",
    address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    name: "bob.eth",
    preview: "is the repository public or private?",
    time: "2 days ago",
    taskTitle: "Backend API Integration",
    taskStatus: "OPEN",
  },
  {
    id: "4",
    address: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    name: "satoshi.eth",
    preview: "Thanks for the quick turnaround!",
    time: "May 13",
    taskTitle: "Tokenomics Whitepaper",
    taskStatus: "COMPLETED",
  },
];

const mockMessages: Message[] = [
  { id: "d1", kind: "date", label: "Monday, Oct 24" },
  {
    id: "m1",
    kind: "received",
    sender: "cryptodev.eth",
    senderAddress: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    time: "10:24 AM",
    text: "I've completed the initial vulnerability scan on the `Lock.sol` contract. Found two medium-severity issues regarding the reentrancy protection in the withdraw function. Attaching the draft report now.",
    attachment: { name: "Audit_Report_Draft_v1.pdf", size: "1.2 MB" },
  },
  {
    id: "m2",
    kind: "sent",
    time: "10:45 AM",
    text: "Thanks for the quick turnaround. Does the reentrancy risk affect the emergency withdrawal function as well? We need to make sure the DAO can still recover funds if the main logic fails.",
  },
  { id: "s1", kind: "system", text: 'Freelancer marked 1 task as "In Review"' },
  {
    id: "m3",
    kind: "received",
    sender: "cryptodev.eth",
    senderAddress: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    time: "11:02 AM",
    text: "Checking that now. It looks like the `emergencyExit` uses a different modifier, but I'll run a specific test suite against it to be 100% sure. Should have the final report by end of day.",
  },
];

const statusColors: Record<Conversation["taskStatus"], string> = {
  "IN PROGRESS": "bg-info/15 text-info",
  COMPLETED: "bg-success/15 text-success",
  DISPUTED: "bg-error/15 text-error",
  OPEN: "bg-base-300 text-base-content/60",
};

const features = [
  {
    Icon: LockClosedIcon,
    title: "Encrypted Chats",
    desc: "All communications are end-to-end encrypted and verified via ENS.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    Icon: CreditCardIcon,
    title: "Direct Payments",
    desc: "Send milestones and payments directly within the chat interface.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    Icon: DocumentTextIcon,
    title: "Smart Agreements",
    desc: "Link your conversations to on-chain service level agreements.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
];

const MessagesPage = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const conv = conversations.find(c => c.id === selected) ?? null;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* ── Conversation list ── */}
        <div className="w-72 shrink-0 bg-base-100 border-r border-base-200 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
            <h2 className="font-bold text-base-content">Messages</h2>
            <button className="btn btn-ghost btn-sm btn-square">
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-base-200 text-left transition-colors ${
                  selected === c.id ? "bg-primary/10" : "hover:bg-base-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={blo(c.address)} alt={c.name} className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-base-content truncate">{c.name}</span>
                    <span className="text-[10px] text-base-content/40 ml-2 shrink-0">{c.time}</span>
                  </div>
                  <p className="text-xs text-base-content/50 truncate">{c.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main panel ── */}
        {conv ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="bg-base-100 border-b border-base-200 px-5 py-3 flex items-center gap-3 shrink-0">
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm btn-square">
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base-content truncate">{conv.taskTitle}</h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColors[conv.taskStatus]}`}
                  >
                    {conv.taskStatus}
                  </span>
                </div>
                <button className="text-xs text-primary flex items-center gap-1 hover:underline mt-0.5">
                  View Task Details
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blo(conv.address)}
                    alt={conv.name}
                    className="w-8 h-8 rounded-full border-2 border-base-100"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blo("0x90f79bf6eb2c4f870365e785982e1f101e93b906")}
                    alt="you"
                    className="w-8 h-8 rounded-full border-2 border-base-100"
                  />
                </div>
                <button className="btn btn-ghost btn-sm btn-square">
                  <EllipsisVerticalIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-base-200">
              {mockMessages.map(msg => {
                if (msg.kind === "date") {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="bg-base-300 text-base-content/50 text-xs px-3 py-1 rounded-full">
                        {msg.label}
                      </span>
                    </div>
                  );
                }

                if (msg.kind === "system") {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="bg-base-300/70 text-base-content/50 text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5">
                        <InformationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                if (msg.kind === "received") {
                  return (
                    <div key={msg.id} className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={blo(msg.senderAddress)}
                        alt={msg.sender}
                        className="w-9 h-9 rounded-full shrink-0 mt-0.5"
                      />
                      <div className="max-w-lg">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm font-semibold text-base-content">{msg.sender}</span>
                          <CheckBadgeIcon className="w-4 h-4 text-primary" />
                          <span className="text-xs text-base-content/40">{msg.time}</span>
                        </div>
                        <div className="bg-base-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-base-content/80 leading-relaxed shadow-sm">
                          {msg.text}
                        </div>
                        {msg.attachment && (
                          <div className="mt-2 bg-base-100 rounded-xl border border-base-200 px-4 py-3 flex items-center gap-3 w-64 shadow-sm">
                            <DocumentTextIcon className="w-5 h-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-base-content truncate">{msg.attachment.name}</p>
                              <p className="text-[10px] text-base-content/40 mt-0.5">{msg.attachment.size}</p>
                            </div>
                            <button className="btn btn-ghost btn-xs btn-square">
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (msg.kind === "sent") {
                  return (
                    <div key={msg.id} className="flex items-end justify-end gap-3">
                      <div className="max-w-lg">
                        <div className="flex items-center justify-end gap-1.5 mb-1.5">
                          <span className="text-xs text-base-content/40">{msg.time}</span>
                          <span className="text-sm font-semibold text-base-content">You (client.eth)</span>
                        </div>
                        <div className="bg-base-100 border-2 border-primary rounded-2xl rounded-br-sm px-4 py-3 text-sm text-base-content/80 leading-relaxed shadow-sm">
                          {msg.text}
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <UserCircleIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* Footer */}
            <div className="bg-base-100 border-t border-base-200 shrink-0">
              {/* Action bar */}
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-base-200">
                <button className="btn btn-outline btn-sm btn-error gap-1.5">
                  <FlagIcon className="w-3.5 h-3.5" />
                  Open Dispute
                </button>
                <button className="btn btn-outline btn-sm gap-1.5">
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Reopen Task
                </button>
                <span className="ml-auto text-xs text-base-content/40 italic">
                  All conversations are encrypted and stored on-chain.
                </span>
              </div>
              {/* Input bar */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button className="btn btn-ghost btn-sm btn-square text-base-content/50">
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message or drop files..."
                  className="flex-1 bg-transparent text-sm outline-none text-base-content placeholder:text-base-content/30"
                  onKeyDown={e => {
                    if (e.key === "Enter" && input.trim()) setInput("");
                  }}
                />
                <button className="btn btn-ghost btn-sm btn-square text-base-content/50">
                  <FaceSmileIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (input.trim()) setInput("");
                  }}
                  className="btn btn-primary btn-sm gap-1.5 px-4"
                >
                  Send
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col bg-base-100">
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-base-content mb-2">No conversation selected</h3>
              <p className="text-sm text-base-content/50 mb-6 leading-relaxed max-w-xs">
                Select a message from the list on the left to start collaborating, or explore new opportunities in the
                task marketplace.
              </p>
              <div className="flex gap-3">
                <button className="btn btn-outline btn-sm">Browse Tasks</button>
                <button className="btn btn-outline btn-sm">Start New Chat</button>
              </div>
            </div>
            <div className="px-8 pb-8 grid grid-cols-3 gap-4">
              {features.map(({ Icon, title, desc, color, bg }) => (
                <div key={title} className="rounded-xl border border-base-200 p-4">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs font-semibold text-base-content mb-1">{title}</p>
                  <p className="text-[11px] text-base-content/50 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MessagesPage;
