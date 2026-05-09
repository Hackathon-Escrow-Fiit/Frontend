"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const RATE = 2500n; // 1 ETH = 2500 NXR

const SwapPage = () => {
  const { address } = useAccount();
  const [ethInput, setEthInput] = useState("");

  const { data: ethBalance } = useBalance({ address });

  const { data: nxrBalance } = useScaffoldReadContract({
    contractName: "DecentraToken",
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: rate } = useScaffoldReadContract({
    contractName: "TokenSale",
    functionName: "rate",
  });

  const { writeContractAsync: buyNxr, isPending } = useScaffoldWriteContract({
    contractName: "TokenSale",
  });

  const ethWei = (() => {
    try {
      return ethInput && Number(ethInput) > 0 ? parseEther(ethInput) : 0n;
    } catch {
      return 0n;
    }
  })();

  const effectiveRate = rate ?? RATE;
  const nxrOut = ethWei * effectiveRate;

  const handleMax = () => {
    if (!ethBalance) return;
    const maxEth = ethBalance.value > parseEther("0.001") ? ethBalance.value - parseEther("0.001") : 0n;
    setEthInput(formatEther(maxEth));
  };

  const handleBuy = async () => {
    if (ethWei === 0n) return notification.error("Enter an ETH amount");
    if (ethBalance && ethWei > ethBalance.value) return notification.error("Insufficient ETH balance");
    try {
      await buyNxr({ functionName: "buy", value: ethWei });
      notification.success(`Swapped ${ethInput} ETH → ${formatEther(nxrOut)} NXR`);
      setEthInput("");
    } catch (e) {
      notification.error("Swap failed");
      console.error(e);
    }
  };

  const formatNxr = (wei: bigint) => {
    const n = Number(formatEther(wei));
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-base-content mb-1">Buy NXR</h1>
          <p className="text-sm text-base-content/50">Swap ETH for Nexora tokens to post jobs and participate.</p>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-3 p-5">
            {/* Rate badge */}
            <div className="flex justify-center mb-1">
              <span className="badge badge-outline text-xs">1 ETH = {effectiveRate.toString()} NXR</span>
            </div>

            {/* ETH input */}
            <div className="bg-base-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-base-content/50 uppercase tracking-wide">You Pay</span>
                <button className="text-xs text-primary hover:underline" onClick={handleMax} disabled={!ethBalance}>
                  Max: {ethBalance ? Number(formatEther(ethBalance.value)).toFixed(4) : "—"} ETH
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className="input input-ghost text-2xl font-semibold flex-1 px-0 focus:outline-none bg-transparent w-0"
                  placeholder="0.0"
                  value={ethInput}
                  onChange={e => setEthInput(e.target.value)}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-base-content/10 flex items-center justify-center text-xs font-bold">
                    Ξ
                  </div>
                  <span className="font-semibold text-base-content">ETH</span>
                </div>
              </div>
            </div>

            {/* Swap arrow */}
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-base-200 border border-base-300 flex items-center justify-center">
                <ArrowsUpDownIcon className="w-4 h-4 text-base-content/50" />
              </div>
            </div>

            {/* NXR output */}
            <div className="bg-base-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-base-content/50 uppercase tracking-wide">You Receive</span>
                <span className="text-xs text-base-content/40">
                  Balance: {nxrBalance !== undefined ? formatNxr(nxrBalance) : "—"} NXR
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-2xl font-semibold flex-1 ${nxrOut > 0n ? "text-base-content" : "text-base-content/30"}`}
                >
                  {nxrOut > 0n ? formatNxr(nxrOut) : "0.0"}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    N
                  </div>
                  <span className="font-semibold text-base-content">NXR</span>
                </div>
              </div>
            </div>

            {/* Swap button */}
            <button
              className="btn btn-primary w-full mt-1"
              onClick={handleBuy}
              disabled={isPending || !address || ethWei === 0n}
            >
              {isPending ? <span className="loading loading-spinner loading-sm" /> : null}
              {!address ? "Connect Wallet" : isPending ? "Swapping…" : "Swap ETH → NXR"}
            </button>

            {/* Info */}
            <p className="text-xs text-center text-base-content/30 mt-1">
              NXR is minted directly to your wallet. No slippage.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SwapPage;
