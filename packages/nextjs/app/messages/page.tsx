"use client";

import { useState } from "react";
import { blo } from "blo";
import { CreditCardIcon, DocumentTextIcon, LockClosedIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

type Conversation = {
  id: string;
  address: `0x${string}`;
  name: string;
  preview: string;
  time: string;
};

const conversations: Conversation[] = [
  {
    id: "1",
    address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    name: "vitalik.eth",
    preview: "The smart contract audit for th...",
    time: "10:45 AM",
  },
  {
    id: "2",
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    name: "alice.eth",
    preview: "I've updated the Figma file with t...",
    time: "Yesterday",
  },
  {
    id: "3",
    address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    name: "bob.eth",
    preview: "is the repository public or private?",
    time: "2 days ago",
  },
  {
    id: "4",
    address: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    name: "satoshi.eth",
    preview: "Thanks for the quick turnaround!",
    time: "May 13",
  },
];

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

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Conversation list */}
        <div className="w-72 shrink-0 bg-base-100 border-r border-base-300 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
            <h2 className="font-bold text-base-content">Messages</h2>
            <button className="btn btn-ghost btn-sm btn-square">
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-base-200 text-left transition-colors ${
                  selected === conv.id ? "bg-primary/10" : "hover:bg-base-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={blo(conv.address)} alt={conv.name} className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-base-content truncate">{conv.name}</span>
                    <span className="text-[10px] text-base-content/40 ml-2 shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-xs text-base-content/50 truncate">{conv.preview}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main panel — empty state */}
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

          {/* Feature cards */}
          <div className="px-8 pb-8 grid grid-cols-3 gap-4">
            {features.map(({ Icon, title, desc, color, bg }) => (
              <div key={title} className="rounded-xl border border-base-300 p-4">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-xs font-semibold text-base-content mb-1">{title}</p>
                <p className="text-[11px] text-base-content/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MessagesPage;
