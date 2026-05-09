"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IdentifierKind, type Dm } from "@xmtp/browser-sdk";
import { useXmtp } from "~~/hooks/useXmtp";

export type XmtpConversation = {
  id: string;
  conversation: Dm;
  peerAddress: `0x${string}` | null;
  preview: string;
  time: string;
};

function formatTime(ns: bigint | undefined): string {
  if (!ns) return "";
  const ms = Number(ns / 1_000_000n);
  const date = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function useXmtpConversations() {
  const { client } = useXmtp();
  const [conversations, setConversations] = useState<XmtpConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<{ return?: (v?: unknown) => void } | null>(null);

  const buildEntry = useCallback(
    async (convo: Dm): Promise<XmtpConversation> => {
      let peerAddress: `0x${string}` | null = null;
      try {
        const peerInboxId = await convo.peerInboxId();
        const states = await client?.preferences.getInboxStates([peerInboxId]);
        const first = states?.[0]?.accountIdentifiers?.[0]?.identifier;
        if (first) peerAddress = first as `0x${string}`;
      } catch {
        // ignore — peerAddress stays null
      }

      let preview = "";
      let lastNs: bigint | undefined;
      try {
        const msgs = await convo.messages({ limit: 1n });
        const last = msgs[msgs.length - 1];
        if (last) {
          const content = last.content as unknown;
          preview = typeof content === "string" ? content : "[attachment]";
          lastNs = last.sentAtNs;
        }
      } catch {
        // ignore
      }

      return { id: convo.id, conversation: convo, peerAddress, preview, time: formatTime(lastNs) };
    },
    [client],
  );

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    async function load() {
      if (!client) return;
      setIsLoading(true);
      try {
        // List from local cache immediately, sync network in background
        const list = await client.conversations.listDms();
        if (cancelled) return;
        const entries = await Promise.all(list.map(buildEntry));
        if (!cancelled) setConversations(entries);
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      // Background sync — refresh the list once network sync completes
      client.conversations.sync().then(async () => {
        if (cancelled) return;
        const fresh = await client.conversations.listDms();
        if (cancelled) return;
        const entries = await Promise.all(fresh.map(buildEntry));
        if (!cancelled) setConversations(entries);
      }).catch(() => {/* ignore sync errors */});
    }

    async function startStream() {
      if (!client) return;
      const stream = await client.conversations.streamDms();
      streamRef.current = stream;
      try {
        for await (const convo of stream) {
          if (cancelled) break;
          const entry = await buildEntry(convo);
          setConversations(prev => (prev.some(c => c.id === entry.id) ? prev : [entry, ...prev]));
        }
      } catch {
        // stream closed
      }
    }

    load().then(() => {
      if (!cancelled) startStream();
    });

    return () => {
      cancelled = true;
      streamRef.current?.return?.();
    };
  }, [client, buildEntry]);

  const createDm = useCallback(
    async (address: string) => {
      if (!client) throw new Error("XMTP not connected");
      const convo = await client.conversations.createDmWithIdentifier({
        identifier: address,
        identifierKind: IdentifierKind.Ethereum,
      });
      const entry = await buildEntry(convo);
      setConversations(prev => (prev.some(c => c.id === entry.id) ? prev : [entry, ...prev]));
      return entry;
    },
    [client, buildEntry],
  );

  return { conversations, isLoading, createDm };
}
