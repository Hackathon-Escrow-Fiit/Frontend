"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Client } from "@xmtp/browser-sdk";
import { useWalletClient } from "wagmi";
import { clearXmtpClient, getXmtpClient } from "~~/services/xmtp/client";

type XmtpContextValue = {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const XmtpContext = createContext<XmtpContextValue>({
  client: null,
  isLoading: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
});

export function XmtpProvider({ children }: { children: React.ReactNode }) {
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    if (!walletClient) {
      setError("Connect your wallet first before enabling messaging.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const xmtp = await getXmtpClient(walletClient);
      setClient(xmtp);
      addressRef.current = walletClient.account?.address ?? null;
    } catch (e) {
      console.error("[XMTP] Client.create failed:", e);
      setError(e instanceof Error ? e.message : "Failed to connect XMTP");
    } finally {
      setIsLoading(false);
    }
  }, [walletClient]);

  const disconnect = useCallback(() => {
    if (addressRef.current) {
      clearXmtpClient(addressRef.current);
      addressRef.current = null;
    }
    setClient(null);
    setError(null);
  }, []);

  return <XmtpContext.Provider value={{ client, isLoading, error, connect, disconnect }}>{children}</XmtpContext.Provider>;
}

export function useXmtpContext() {
  return useContext(XmtpContext);
}
