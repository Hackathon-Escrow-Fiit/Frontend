import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export type UserRole = "freelancer" | "client" | null;

const roleFromContract = (raw: number | undefined): UserRole => {
  if (raw === 1) return "freelancer";
  if (raw === 2) return "client";
  return null;
};

const roleToContract = (role: UserRole): number => {
  if (role === "freelancer") return 1;
  if (role === "client") return 2;
  return 0;
};

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

  const { data: rawRole, refetch: refetchRole } = useScaffoldReadContract({
    contractName: "DecentraWorkRegistry",
    functionName: "getRole",
    args: [address],
    query: { enabled: !!address },
  });

  const {
    data: bio,
    isLoading: isLoadingBio,
    refetch: refetchBio,
  } = useScaffoldReadContract({
    contractName: "DecentraWorkRegistry",
    functionName: "getBio",
    args: [address],
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending: isRegistering } = useScaffoldWriteContract({
    contractName: "DecentraWorkRegistry",
  });

  // Single tx: name + role + optional bio
  const register = async (name: string, role: UserRole, bio = "") => {
    await writeContractAsync({ functionName: "register", args: [name, roleToContract(role), bio] });
    await Promise.all([refetchName(), refetchRole(), refetchBio()]);
  };

  const release = async () => {
    await writeContractAsync({ functionName: "release" });
    await refetchName();
  };

  // Update bio text after registration
  const saveBio = async (text: string) => {
    await writeContractAsync({ functionName: "setBio", args: [text] });
    await refetchBio();
  };

  return {
    isAvailable: debouncedName.length >= 3 ? isAvailable : undefined,
    isChecking,
    currentName: currentName ?? null,
    isLoadingName,
    isRegistering,
    role: roleFromContract(rawRole as number | undefined),
    bio: bio ?? null,
    isLoadingBio,
    register,
    release,
    saveBio,
  };
};
