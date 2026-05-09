import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";

/**
 * Resolves an ENS name to its Ethereum address
 * @param ensName - ENS name (e.g., "vitalik.eth")
 * @returns Ethereum address or null if not found
 */
export const useEnsAddress = (ensName?: string | null) => {
  const publicClient = usePublicClient();
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ensName || !publicClient) {
      setAddress(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const resolvedAddress = await publicClient.getEnsAddress({ name: ensName });
        setAddress(resolvedAddress);
      } catch (err) {
        console.error("Error resolving ENS address:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [ensName, publicClient]);

  return { address, isLoading, error };
};
