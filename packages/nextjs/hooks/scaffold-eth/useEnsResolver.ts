import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { usePublicClient } from "wagmi";

interface EnsResolverData {
  name: string | null;
  avatar: string | null;
  contentHash: string | null;
  address: string | null;
  email: string | null;
  url: string | null;
  description: string | null;
  twitter: string | null;
  github: string | null;
}

/**
 * Resolves all ENS data for an address or ENS name
 * @param addressOrName - Ethereum address or ENS name
 * @returns Full ENS resolver data
 */
export const useEnsResolver = (addressOrName?: string | null) => {
  const publicClient = usePublicClient();
  const [data, setData] = useState<EnsResolverData>({
    name: null,
    avatar: null,
    contentHash: null,
    address: null,
    email: null,
    url: null,
    description: null,
    twitter: null,
    github: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!addressOrName || !publicClient) {
      setData({
        name: null,
        avatar: null,
        contentHash: null,
        address: null,
        email: null,
        url: null,
        description: null,
        twitter: null,
        github: null,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        let ensName: string | null = null;
        let ensAddress: string | null = null;

        // If it's an address, resolve to name; if it's a name, resolve to address
        if (isAddress(addressOrName)) {
          ensName = await publicClient.getEnsName({ address: addressOrName as `0x${string}` });
          ensAddress = addressOrName;
        } else {
          ensAddress = await publicClient.getEnsAddress({ name: addressOrName });
          ensName = addressOrName;
        }

        if (!ensName || !ensAddress) {
          setData({
            name: ensName,
            avatar: null,
            contentHash: null,
            address: ensAddress,
            email: null,
            url: null,
            description: null,
            twitter: null,
            github: null,
          });
          return;
        }

        // Get avatar
        const avatar = await publicClient.getEnsAvatar({ name: ensName });

        // Get text records
        const textRecords = await Promise.all([
          publicClient.getEnsText({ name: ensName, key: "com.twitter" }).catch(() => null),
          publicClient.getEnsText({ name: ensName, key: "com.github" }).catch(() => null),
          publicClient.getEnsText({ name: ensName, key: "description" }).catch(() => null),
          publicClient.getEnsText({ name: ensName, key: "url" }).catch(() => null),
          publicClient.getEnsText({ name: ensName, key: "email" }).catch(() => null),
          publicClient.getEnsText({ name: ensName, key: "content" }).catch(() => null),
        ]);

        setData({
          name: ensName,
          avatar: avatar || null,
          contentHash: textRecords[5],
          address: ensAddress,
          email: textRecords[4],
          url: textRecords[3],
          description: textRecords[2],
          twitter: textRecords[0],
          github: textRecords[1],
        });
      } catch (err) {
        console.error("Error resolving ENS data:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [addressOrName, publicClient]);

  return { data, isLoading, error };
};
