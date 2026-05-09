"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  decryptAttachment,
  encryptAttachment,
  isAttachment,
  isRemoteAttachment,
  isText,
  type DecodedMessage,
  type Dm,
} from "@xmtp/browser-sdk";
import { uploadToIpfs } from "~~/services/xmtp/ipfs";

export type XmtpMessage =
  | { id: string; kind: "text"; senderInboxId: string; sentAtNs: bigint; text: string }
  | {
      id: string;
      kind: "attachment";
      senderInboxId: string;
      sentAtNs: bigint;
      filename: string;
      mimeType: string;
      content: Uint8Array;
    };

async function decodeMsg(msg: DecodedMessage): Promise<XmtpMessage | null> {
  try {
    if (isText(msg)) {
      return {
        id: msg.id,
        kind: "text",
        senderInboxId: msg.senderInboxId,
        sentAtNs: msg.sentAtNs,
        text: msg.content ?? "",
      };
    }

    if (isAttachment(msg)) {
      const att = msg.content!;
      return {
        id: msg.id,
        kind: "attachment",
        senderInboxId: msg.senderInboxId,
        sentAtNs: msg.sentAtNs,
        filename: att.filename ?? "file",
        mimeType: att.mimeType,
        content: att.content,
      };
    }

    if (isRemoteAttachment(msg)) {
      const ra = msg.content!;
      const res = await fetch(ra.url);
      const encBytes = new Uint8Array(await res.arrayBuffer());
      const att = await decryptAttachment(encBytes, ra);
      return {
        id: msg.id,
        kind: "attachment",
        senderInboxId: msg.senderInboxId,
        sentAtNs: msg.sentAtNs,
        filename: att.filename ?? ra.filename ?? "file",
        mimeType: att.mimeType,
        content: att.content,
      };
    }

    return null;
  } catch {
    return null;
  }
}

const MAX_INLINE_BYTES = 1_000_000;

export function useXmtpMessages(conversation: Dm | null) {
  const [messages, setMessages] = useState<XmtpMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const streamRef = useRef<{ return?: (v?: unknown) => void } | null>(null);

  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const raw = await conversation!.messages();
        if (cancelled) return;
        const decoded = (await Promise.all(raw.map(decodeMsg))).filter((m): m is XmtpMessage => m !== null);
        if (!cancelled) setMessages(decoded);
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      // Background sync — ensures first messages sent to a new DM are fetched from the network
      conversation!.sync().then(async () => {
        if (cancelled) return;
        const fresh = await conversation!.messages();
        if (cancelled) return;
        const decoded = (await Promise.all(fresh.map(decodeMsg))).filter((m): m is XmtpMessage => m !== null);
        if (!cancelled) setMessages(decoded);
      }).catch(() => {});
    }

    async function startStream() {
      const stream = await conversation!.stream();
      streamRef.current = stream;
      try {
        for await (const msg of stream) {
          if (cancelled) break;
          const decoded = await decodeMsg(msg);
          if (decoded && !cancelled) {
            setMessages(prev => (prev.some(m => m.id === decoded.id) ? prev : [...prev, decoded]));
          }
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
  }, [conversation]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversation || !text.trim()) return;
      setIsSending(true);
      try {
        await conversation.sendText(text);
      } finally {
        setIsSending(false);
      }
    },
    [conversation],
  );

  const sendAttachment = useCallback(
    async (file: File) => {
      if (!conversation) return;
      setIsSending(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const attachment = { filename: file.name, mimeType: file.type, content: bytes };

        if (bytes.length <= MAX_INLINE_BYTES) {
          await conversation.sendAttachment(attachment);
        } else {
          const encrypted = await encryptAttachment(attachment);
          const url = await uploadToIpfs(encrypted.payload, file.name);
          await conversation.sendRemoteAttachment({
            url,
            contentDigest: encrypted.contentDigest,
            salt: encrypted.salt,
            nonce: encrypted.nonce,
            secret: encrypted.secret,
            scheme: "https",
            contentLength: bytes.length,
            filename: file.name,
          });
        }
      } catch (e) {
        setIsSending(false);
        throw e;
      }
      setIsSending(false);
    },
    [conversation],
  );

  return { messages, isLoading, isSending, sendMessage, sendAttachment };
}
