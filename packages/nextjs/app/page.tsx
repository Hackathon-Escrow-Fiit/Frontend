"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CpuChipIcon, GlobeAltIcon, ShieldCheckIcon, UserCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useDecentraWorkRegistry } from "~~/hooks/scaffold-eth";

const testimonials = [
  {
    quote:
      "The AI escrow system is a game changer. I no longer have to worry about clients disappearing after the work is done. Payment is automatic and fair.",
    name: "alice.eth",
    role: "Full-stack Developer",
    initials: "A",
  },
  {
    quote:
      "Hiring globally was always a headache with local banking laws. DecentraWork makes it simple to pay in USDC with instant settlement. Highly recommended.",
    name: "marcus.eth",
    role: "Product Manager",
    initials: "M",
  },
  {
    quote:
      "The reputation system being tied to my ENS name means I truly own my career history. It's portable, verified, and trustless.",
    name: "sarah_dev.eth",
    role: "UI/UX Designer",
    initials: "S",
  },
];

const stats = [
  { value: "12,842", label: "TASKS COMPLETED" },
  { value: "$4.2M+", label: "FUNDS IN ESCROW" },
  { value: "99.8%", label: "DISPUTES RESOLVED" },
];

const Home: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { currentName, isLoadingName } = useDecentraWorkRegistry();
  const [wantsToEnter, setWantsToEnter] = useState(false);

  // Auto-redirect when wallet is connected
  useEffect(() => {
    if (!isConnected || !address || isLoadingName) return;
    router.push(currentName ? "/dashboard" : "/setup");
  }, [isConnected, address, currentName, isLoadingName, router]);

  const handleEnter = (openConnectModal: () => void, connected: boolean, dest: string) => {
    if (!connected) {
      setWantsToEnter(true);
      openConnectModal();
    } else {
      router.push(dest);
    }
  };

  // Once connected after clicking a button, redirect
  useEffect(() => {
    if (!wantsToEnter || !isConnected || !address || isLoadingName) return;
    router.push(currentName ? "/dashboard" : "/setup");
  }, [wantsToEnter, isConnected, address, currentName, isLoadingName, router]);

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-10 py-4 border-b border-base-200">
        <span className="font-bold text-base text-base-content">DecentraWork</span>
        <div className="flex items-center gap-8">
          <span className="text-sm text-base-content/60 cursor-pointer hover:text-base-content transition-colors">
            Post a Task
          </span>
          <span className="text-sm text-base-content/60 cursor-pointer hover:text-base-content transition-colors">
            Find Work
          </span>
          <span className="text-sm text-base-content/60 cursor-pointer hover:text-base-content transition-colors">
            Explore Freelancers
          </span>
        </div>
        <ConnectButton showBalance={false} />
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-10 pt-20 pb-16 flex items-center gap-16">
        <div className="flex-1 min-w-0">
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Decentralized Freelancing
            <br />
            with AI Justice
          </h1>
          <p className="font-medium text-base-content/80 mb-3 leading-relaxed">
            DecentraWork is the world&apos;s first decentralized freelance marketplace engineered for absolute security
            and trustless collaboration.
          </p>
          <p className="text-sm text-base-content/50 leading-relaxed max-w-lg mb-8">
            By leveraging AI-arbitrated escrow and ENS identities, we eliminate middleman fees and regional barriers.
            Our protocol ensures the global workforce can collaborate with confidence, where payments are secured by
            smart contracts and disputes are resolved through objective AI arbitration and DAO governance.
          </p>
          <div className="flex gap-3">
            <ConnectButton.Custom>
              {({ openConnectModal, mounted, account, chain }) => {
                const connected = !!(mounted && account && chain);
                return (
                  <button
                    onClick={() => handleEnter(openConnectModal, connected, "/post-task")}
                    className="btn btn-primary gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Post a Task
                  </button>
                );
              }}
            </ConnectButton.Custom>
            <ConnectButton.Custom>
              {({ openConnectModal, mounted, account, chain }) => {
                const connected = !!(mounted && account && chain);
                return (
                  <button
                    onClick={() => handleEnter(openConnectModal, connected, "/find-work")}
                    className="btn btn-outline"
                  >
                    Find Work
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>

        {/* Trustless badge graphic */}
        <div className="shrink-0 w-64 h-64 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="bg-base-100 rounded-2xl shadow-xl p-6 text-center border border-base-200">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ShieldCheckIcon className="w-6 h-6 text-primary" />
            </div>
            <p className="font-bold text-sm text-base-content">100% Trustless</p>
            <p className="text-xs text-base-content/50 mt-0.5">Secured by Ethereum</p>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="border-y border-base-200">
        <div className="max-w-6xl mx-auto grid grid-cols-3 divide-x divide-base-200">
          {stats.map(({ value, label }) => (
            <div key={label} className="px-12 py-8">
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs text-base-content/50 tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Testimonials ── */}
      <section className="max-w-6xl mx-auto px-10 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Trusted by the Global Workforce</h2>
          <p className="text-base-content/55 max-w-sm mx-auto leading-relaxed">
            See why thousands of freelancers and employers are moving to a decentralized future.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {testimonials.map(({ quote, name, role, initials }) => (
            <div key={name} className="rounded-2xl border border-base-200 p-6">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-base-content/25" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-base-content/65 italic leading-relaxed mb-5">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-base-content/45">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Protocol (dark) ── */}
      <section className="bg-base-content py-20 px-10">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-base-100 mb-3">The DecentraWork Protocol</h2>
          <p className="text-base-100/50 max-w-sm mx-auto leading-relaxed mb-16">
            A seamless, trustless ecosystem where AI and DAO governance ensure every participant is protected.
          </p>

          <div className="flex items-center justify-center gap-6 mb-10">
            {/* Client */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full border border-base-100/20 bg-base-100/5 flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-base-100/60" />
              </div>
              <span className="text-xs text-base-100/55">Client</span>
            </div>

            <svg className="w-6 h-6 text-base-100/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>

            {/* AI Escrow — highlighted */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                <CpuChipIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs text-base-100 font-semibold">AI Escrow</span>
            </div>

            <svg className="w-6 h-6 text-base-100/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>

            {/* Freelancer */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full border border-base-100/20 bg-base-100/5 flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-base-100/60" />
              </div>
              <span className="text-xs text-base-100/55">Freelancer</span>
            </div>
          </div>

          <button className="btn btn-sm border border-base-100/25 text-base-100/70 bg-transparent hover:bg-base-100/10 hover:border-base-100/40 gap-2 normal-case tracking-wide">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m14.95 5.66-.707-.707M6.403 6.403l-.707-.707m12.02 0-.707.707M6.403 17.597l-.707.707"
              />
            </svg>
            DAO GOVERNED RESOLUTION
          </button>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-10 py-20 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          {/* AI Enforcement */}
          <div className="rounded-2xl bg-base-200 p-8 overflow-hidden relative min-h-52">
            <span className="text-xs font-bold tracking-widest text-primary uppercase">AI Enforcement</span>
            <h3 className="text-2xl font-bold mt-2 mb-3 leading-snug">
              Milestones that
              <br />
              trigger themselves.
            </h3>
            <p className="text-sm text-base-content/55 leading-relaxed max-w-xs">
              Our smart contracts automatically analyze project commits and deliverables to release funds instantly upon
              completion.
            </p>
            <div className="absolute bottom-0 right-0 w-44 h-36 rounded-tl-3xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/40 to-primary/70 flex items-center justify-center">
                <CpuChipIcon className="w-12 h-12 text-primary/60" />
              </div>
            </div>
          </div>

          {/* Global Settlement */}
          <div className="rounded-2xl bg-base-200 p-8">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <GlobeAltIcon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Global Settlement</h3>
            <p className="text-sm text-base-content/55 leading-relaxed">
              Pay and get paid in USDC, ETH, or your preferred ERC-20 token. No borders, no delays, no banking hurdles.
            </p>
          </div>
        </div>

        {/* ENS Profiles */}
        <div className="rounded-2xl bg-base-200 p-8 flex items-center gap-16">
          <div className="max-w-xs">
            <h3 className="text-xl font-bold mb-2">ENS Integrated Profiles</h3>
            <p className="text-sm text-base-content/55 leading-relaxed">
              Your profile is your wallet. Verified reviews are permanently tied to your ENS identity, creating a
              portable resume that you truly own. Build reputation that follows you anywhere.
            </p>
          </div>
          {/* Abstract profile graphic */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 rounded-full bg-primary" style={{ width: "60%" }} />
              <div className="h-2 rounded-full bg-base-300 flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-yellow-400 shrink-0" />
              <div className="h-2 rounded-full bg-base-300 flex-1" />
            </div>
            <div className="w-12 h-6 rounded-full bg-primary/20 flex items-center px-1">
              <div className="w-4 h-4 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-base-200 px-10 py-10">
        <div className="max-w-6xl mx-auto flex items-end justify-between">
          <div>
            <p className="font-bold text-base-content mb-1">DecentraWork</p>
            <p className="text-xs text-base-content/40 leading-relaxed">
              © 2024 DecentraWork. Built for the
              <br />
              decentralized workforce. Trustless. Fee-free.
              <br />
              Forever.
            </p>
          </div>
          <div className="flex gap-6">
            {["Terms of Service", "Privacy Policy", "Documentation", "Community Forum"].map(link => (
              <span
                key={link}
                className="text-xs text-base-content/45 hover:text-base-content cursor-pointer transition-colors"
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
