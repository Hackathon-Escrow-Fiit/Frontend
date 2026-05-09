"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useDecentraWorkRegistry } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { currentName } = useDecentraWorkRegistry();

  useEffect(() => {
    if (!isConnected || !address) return;
    if (currentName) {
      router.push("/messages");
    } else {
      router.push("/setup");
    }
  }, [isConnected, address, currentName, router]);

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary-content"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-base-content mb-2">DecentraWork</h1>
          <p className="text-base-content/60 text-sm max-w-xs mx-auto leading-relaxed">
            The decentralized freelance marketplace. Verified identities, trustless contracts, on-chain payments.
          </p>
        </div>

        <div className="bg-base-100 rounded-2xl shadow-md p-6 w-full max-w-xs">
          <p className="text-xs font-bold tracking-widest text-base-content/50 uppercase mb-4">Connect to continue</p>
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;
              return connected ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="loading loading-spinner loading-sm text-primary" />
                  <p className="text-xs text-base-content/50">Loading your profile…</p>
                </div>
              ) : (
                <button onClick={openConnectModal} className="btn btn-primary w-full">
                  Connect Wallet
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>

        <p className="text-xs text-base-content/40 mt-6">
          New here? <span className="text-primary">Connect your wallet</span> — we&apos;ll set up your identity in
          seconds.
        </p>
      </div>
    </div>
  );
};

export default Home;
