import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const useDecentraWorkRegistry = (nameToCheck?: string) => {
  const { address } = useAccount();
  const [debouncedName, setDebouncedName] = useState(nameToCheck ?? "");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedName(nameToCheck ?? ""), 400);
    return () => clearTimeout(id);
  }, [nameToCheck]);

  const { data: isAvailable, isLoading: isChecking } = useScaffoldReadContract({
    contractName: "DecentraWorkRegistry",
    functionName: "isAvailable",
    args: [debouncedName],
    query: { enabled: debouncedName.length >= 3 },
  });

  const {
    data: currentName,
    isLoading: isLoadingName,
    refetch: refetchName,
  } = useScaffoldReadContract({
    contractName: "DecentraWorkRegistry",
    functionName: "getName",
    args: [address],
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending: isRegistering } = useScaffoldWriteContract({
    contractName: "DecentraWorkRegistry",
  });

  const register = async (name: string) => {
    await writeContractAsync({ functionName: "register", args: [name] });
    await refetchName();
  };

  const release = async () => {
    await writeContractAsync({ functionName: "release" });
    await refetchName();
  };

  return {
    isAvailable: debouncedName.length >= 3 ? isAvailable : undefined,
    isChecking,
    currentName: currentName ?? null,
    isLoadingName,
    isRegistering,
    register,
    release,
  };
};
