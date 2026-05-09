import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { usePublicClient } from "wagmi";

/**
 * Resolves an Ethereum address to its ENS name
 * @param address - Ethereum address to resolve
 * @returns ENS name or null if not found
 */
export const useEnsName = (address?: string | null) => {
  const publicClient = usePublicClient();
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address || !isAddress(address) || !publicClient) {
      setEnsName(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const name = await publicClient.getEnsName({ address: address as `0x${string}` });
        setEnsName(name);
      } catch (err) {
        console.error("Error resolving ENS name:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [address, publicClient]);

  return { ensName, isLoading, error };
};
