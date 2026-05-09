"use client";

import { useRef, useState } from "react";
import { blo } from "blo";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  FaceSmileIcon,
  FlagIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import type { Dm } from "@xmtp/browser-sdk";
import { useXmtp } from "~~/hooks/useXmtp";
import { useXmtpConversations, type XmtpConversation } from "~~/hooks/useXmtpConversations";
import { useXmtpMessages, type XmtpMessage } from "~~/hooks/useXmtpMessages";

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

function formatNs(ns: bigint): string {
  const date = new Date(Number(ns / 1_000_000n));
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fallbackAddress(str: string): `0x${string}` {
  // derive a deterministic hex from the inbox ID for the avatar
  const hex = str.replace(/[^a-fA-F0-9]/g, "").padEnd(40, "0").slice(0, 40);
  return `0x${hex}` as `0x${string}`;
}

// ── New DM modal ──────────────────────────────────────────────────────────────
function NewDmModal({ onDm, onClose }: { onDm: (address: string) => void; onClose: () => void }) {
  const [addr, setAddr] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-base-100 rounded-2xl p-6 w-80 shadow-xl">
        <h3 className="font-bold text-base-content mb-3">New Message</h3>
        <input
          autoFocus
          type="text"
          placeholder="Recipient address (0x…)"
          className="input input-bordered w-full text-sm mb-3"
          value={addr}
          onChange={e => setAddr(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" disabled={!addr.trim()} onClick={() => onDm(addr.trim())}>
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conversation list item ────────────────────────────────────────────────────
function ConvoItem({
  entry,
  isSelected,
  onClick,
}: {
  entry: XmtpConversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const avatarAddr = entry.peerAddress ?? fallbackAddress(entry.id);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-base-200 text-left transition-colors ${
        isSelected ? "bg-primary/10" : "hover:bg-base-200"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blo(avatarAddr)} alt={entry.peerAddress ?? "peer"} className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-medium text-base-content truncate">
            {entry.peerAddress ? `${entry.peerAddress.slice(0, 6)}…${entry.peerAddress.slice(-4)}` : entry.id.slice(0, 12)}
          </span>
          <span className="text-[10px] text-base-content/40 ml-2 shrink-0">{entry.time}</span>
        </div>
        <p className="text-xs text-base-content/50 truncate">{entry.preview || "No messages yet"}</p>
      </div>
    </button>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg, myInboxId }: { msg: XmtpMessage; myInboxId: string }) {
  const isMine = msg.senderInboxId === myInboxId;
  const time = formatNs(msg.sentAtNs);

  if (isMine) {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="max-w-lg">
          <div className="flex items-center justify-end gap-1.5 mb-1.5">
            <span className="text-xs text-base-content/40">{time}</span>
            <span className="text-sm font-semibold text-base-content">You</span>
          </div>
          {msg.kind === "text" ? (
            <div className="bg-base-100 border-2 border-primary rounded-2xl rounded-br-sm px-4 py-3 text-sm text-base-content/80 leading-relaxed shadow-sm">
              {msg.text}
            </div>
          ) : (
            <AttachmentBubble filename={msg.filename} mimeType={msg.mimeType} content={msg.content} />
          )}
        </div>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <UserCircleIcon className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  const avatarAddr = fallbackAddress(msg.senderInboxId);
  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blo(avatarAddr)} alt="peer" className="w-9 h-9 rounded-full shrink-0 mt-0.5" />
      <div className="max-w-lg">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm font-semibold text-base-content">
            {msg.senderInboxId.slice(0, 8)}…
          </span>
          <CheckBadgeIcon className="w-4 h-4 text-primary" />
          <span className="text-xs text-base-content/40">{time}</span>
        </div>
        {msg.kind === "text" ? (
          <div className="bg-base-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-base-content/80 leading-relaxed shadow-sm">
            {msg.text}
          </div>
        ) : (
          <AttachmentBubble filename={msg.filename} mimeType={msg.mimeType} content={msg.content} />
        )}
      </div>
    </div>
  );
}

function AttachmentBubble({ filename, mimeType, content }: { filename: string; mimeType: string; content: Uint8Array }) {
  const download = () => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="bg-base-100 rounded-xl border border-base-200 px-4 py-3 flex items-center gap-3 w-64 shadow-sm">
      <DocumentTextIcon className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-base-content truncate">{filename}</p>
        <p className="text-[10px] text-base-content/40 mt-0.5">{(content.length / 1024).toFixed(1)} KB</p>
      </div>
      <button className="btn btn-ghost btn-xs btn-square" onClick={download}>
        <ArrowDownTrayIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────
function ChatPanel({ entry }: { entry: XmtpConversation }) {
  const { client } = useXmtp();
  const { address } = useAccount();
  const { messages, isLoading, isSending, sendMessage, sendAttachment } = useXmtpMessages(entry.conversation as Dm);
  const [input, setInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const myInboxId = client?.inboxId ?? "";

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendAttachment(file);
    e.target.value = "";
  };

  const peerDisplay = entry.peerAddress
    ? `${entry.peerAddress.slice(0, 6)}…${entry.peerAddress.slice(-4)}`
    : entry.id.slice(0, 12);

  const avatarAddr = entry.peerAddress ?? fallbackAddress(entry.id);
  const myAddr = (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-200 px-5 py-3 flex items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base-content truncate">{peerDisplay}</h2>
          </div>
          <p className="text-xs text-base-content/40 mt-0.5 flex items-center gap-1">
            <LockClosedIcon className="w-3 h-3" />
            End-to-end encrypted via XMTP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blo(avatarAddr)} alt="peer" className="w-8 h-8 rounded-full border-2 border-base-100" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blo(myAddr)} alt="you" className="w-8 h-8 rounded-full border-2 border-base-100" />
          </div>
          <button className="btn btn-ghost btn-sm btn-square">
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-base-200">
        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex justify-center">
            <span className="text-xs text-base-content/30">No messages yet. Say hello!</span>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} myInboxId={myInboxId} />
        ))}
      </div>

      {/* Footer */}
      <div className="bg-base-100 border-t border-base-200 shrink-0">
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-base-200">
          <button className="btn btn-outline btn-sm btn-error gap-1.5">
            <FlagIcon className="w-3.5 h-3.5" />
            Open Dispute
          </button>
          <span className="ml-auto text-xs text-base-content/40 italic">
            Messages are encrypted end-to-end via XMTP.
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          <button
            className="btn btn-ghost btn-sm btn-square text-base-content/50"
            onClick={() => fileRef.current?.click()}
            disabled={isSending}
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message or drop files..."
            className="flex-1 bg-transparent text-sm outline-none text-base-content placeholder:text-base-content/30"
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="btn btn-ghost btn-sm btn-square text-base-content/50">
            <FaceSmileIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="btn btn-primary btn-sm gap-1.5 px-4"
          >
            {isSending ? <span className="loading loading-spinner loading-xs" /> : <PaperAirplaneIcon className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const MessagesPage = () => {
  const { address: walletAddress } = useAccount();
  const { isConnected, isLoading: xmtpLoading, error: xmtpError, connect } = useXmtp();
  const { conversations, isLoading: convosLoading, createDm } = useXmtpConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewDm, setShowNewDm] = useState(false);

  const selected = conversations.find(c => c.id === selectedId) ?? null;

  const filtered = search.trim()
    ? conversations.filter(
        c =>
          c.peerAddress?.toLowerCase().includes(search.toLowerCase()) ||
          c.preview.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const handleNewDm = async (address: string) => {
    setShowNewDm(false);
    const entry = await createDm(address);
    setSelectedId(entry.id);
  };

  return (
    <AppLayout>
      {showNewDm && <NewDmModal onDm={handleNewDm} onClose={() => setShowNewDm(false)} />}
      <div className="flex h-full">
        {/* ── Conversation list ── */}
        <div className="w-72 shrink-0 bg-base-100 border-r border-base-200 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
            <h2 className="font-bold text-base-content">Messages</h2>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowNewDm(true)}>
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 py-2 border-b border-base-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="input input-sm w-full pl-8 bg-base-200 border-transparent focus:border-primary text-xs rounded-lg"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!isConnected && !xmtpLoading && (
              <div className="p-4 text-center space-y-2">
                {!walletAddress ? (
                  <p className="text-xs text-base-content/50">Connect your wallet first to enable messaging.</p>
                ) : (
                  <>
                    <p className="text-xs text-base-content/50">Enable encrypted messaging with your wallet.</p>
                    <button className="btn btn-primary btn-sm w-full" onClick={connect}>
                      Enable Messaging
                    </button>
                  </>
                )}
                {xmtpError && (
                  <p className="text-xs text-error bg-error/10 rounded-lg px-3 py-2 text-left">{xmtpError}</p>
                )}
              </div>
            )}
            {xmtpLoading && (
              <div className="p-4 text-center space-y-2">
                <span className="loading loading-spinner loading-sm text-primary" />
                <p className="text-xs text-base-content/50">Check your wallet for a signature request…</p>
              </div>
            )}
            {isConnected && !xmtpLoading && (
              <>
                {convosLoading && (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-dots loading-sm text-base-content/30" />
                  </div>
                )}
                {filtered.map(c => (
                  <ConvoItem
                    key={c.id}
                    entry={c}
                    isSelected={selectedId === c.id}
                    onClick={() => setSelectedId(c.id)}
                  />
                ))}
                {!convosLoading && filtered.length === 0 && (
                  <p className="text-xs text-base-content/30 text-center py-6">No conversations found.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Main panel ── */}
        {selected ? (
          <ChatPanel entry={selected} />
        ) : (
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
                <button className="btn btn-outline btn-sm" onClick={() => setShowNewDm(true)}>
                  Start New Chat
                </button>
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
