import { useXmtpContext } from "~~/components/decentrawork/XmtpProvider";

export function useXmtp() {
  const { client, isLoading, error, connect, disconnect } = useXmtpContext();
  return {
    client,
    isLoading,
    isConnected: client !== null,
    error,
    connect,
    disconnect,
  };
}
