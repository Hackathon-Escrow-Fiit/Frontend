"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

type Role = "freelancer" | "client" | null;

const SetupPage: NextPage = () => {
  const [ensHandle, setEnsHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>(null);
  const ensAvailable = ensHandle.length > 0;

  const currentStep = displayName && role ? 3 : ensHandle ? 2 : 1;

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="bg-base-100 rounded-2xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-base-content mb-0.5">Setup your identity</h1>
          <p className="text-xs text-base-content/60 mb-6">Join the decentralized workforce in three simple steps.</p>

          {/* Progress stepper */}
          <div className="flex items-center mb-8 select-none">
            <StepNode number={1} label="Connect" active={currentStep >= 1} />
            <StepLine active={currentStep >= 2} />
            <StepNode number={2} label="ENS" active={currentStep >= 2} />
            <StepLine active={currentStep >= 3} />
            <StepNode number={3} label="Profile" active={currentStep >= 3} />
          </div>

          {/* Step 1: Link Wallet */}
          <div className="mb-6">
            <SectionLabel>Step 1: Link Wallet</SectionLabel>
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return connected ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                    <CheckCircleIcon className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-base-content/50 mb-0.5">Connected wallet</p>
                      <Address address={account.address as `0x${string}`} size="sm" />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={openConnectModal}
                    className="btn btn-outline w-full border-base-300 hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    <WalletIcon />
                    Connect Wallet
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Step 2: Claim ENS Handle */}
          <div className="mb-6">
            <SectionLabel>Step 2: Claim ENS Handle</SectionLabel>
            <div className="relative">
              <input
                type="text"
                value={ensHandle}
                onChange={e => setEnsHandle(e.target.value)}
                className="input input-bordered w-full pr-10 text-sm"
                placeholder="yourname.decentrawork.eth"
              />
              {ensAvailable && (
                <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              )}
            </div>
            {ensAvailable && (
              <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                This ENS handle is available to claim.
              </p>
            )}
          </div>

          {/* Step 3: Personalize */}
          <div className="mb-8">
            <SectionLabel>Step 3: Personalize</SectionLabel>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-base-200 border-2 border-dashed border-base-300 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-base-content/30" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input input-bordered flex-1 text-sm"
                placeholder="Your display name"
              />
            </div>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 text-sm ${role === "freelancer" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setRole("freelancer")}
              >
                Freelancer
              </button>
              <button
                className={`btn flex-1 text-sm ${role === "client" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setRole("client")}
              >
                Client
              </button>
            </div>
          </div>

          <button className="btn btn-primary w-full text-sm font-semibold">Complete Setup →</button>

          <p className="text-xs text-center text-base-content/50 mt-4 leading-relaxed">
            By continuing, you agree to our{" "}
            <Link href="#" className="text-primary hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-primary hover:underline">
              Community Guidelines
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="bg-base-100 border-t border-base-300 px-8 py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <p className="font-bold text-sm text-primary">DecentraWork</p>
            <p className="text-xs text-base-content/50">© 2024 DecentraWork. Built for the decentralized workforce.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-base-content/60 justify-center">
            {["Terms of Service", "Privacy Policy", "Documentation", "Community Forum"].map(item => (
              <Link key={item} href="#" className="hover:text-primary transition-colors">
                {item}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold tracking-widest text-base-content/50 uppercase mb-2.5">{children}</p>
);

const StepNode = ({ number, label, active = false }: { number: number; label: string; active?: boolean }) => (
  <div className="flex items-center gap-1.5">
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
        active ? "bg-primary text-primary-content" : "border border-base-300 text-base-content/40"
      }`}
    >
      {number}
    </div>
    <span
      className={`text-[11px] whitespace-nowrap ${active ? "text-base-content font-medium" : "text-base-content/40"}`}
    >
      {label}
    </span>
  </div>
);

const StepLine = ({ active = false }: { active?: boolean }) => (
  <div
    className={`flex-1 border-t border-dashed mx-1 transition-colors ${active ? "border-primary" : "border-base-300"}`}
  />
);

const WalletIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
    />
  </svg>
);

export default SetupPage;
