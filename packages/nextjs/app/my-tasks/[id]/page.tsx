"use client";

import { blo } from "blo";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

const ESCROW_STEPS = ["Created", "Funded", "Active", "Review", "Final"];
const CURRENT_STEP = 2;

const CRITERIA = [
  "Responsive design compatible with all modern browsers and mobile devices.",
  "Unit tests coverage > 90% for all smart contract interactions.",
  "Integration with The Graph for historical data indexing.",
];

const JobViewPage = () => {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Job Details */}
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
            <h1 className="text-2xl font-bold text-base-content mb-3">Next-Gen DeFi Dashboard</h1>

            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="badge badge-outline">Design</span>
              <span className="badge badge-outline">Solidity</span>
              <span className="badge badge-primary badge-outline">$12,400 USDC</span>
            </div>

            {/* Participants */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <Participant
                address="0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
                role="Client"
                name="vitalik.eth"
              />
              <Participant
                address="0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
                role="Freelancer"
                name="decentrawork.eth"
              />
            </div>

            <hr className="border-base-300 mb-5" />

            <h2 className="font-semibold text-base-content mb-2">Technical Specifications & Criteria</h2>
            <p className="text-sm text-base-content/70 mb-4 leading-relaxed">
              Develop a high-fidelity dashboard for a decentralized lending protocol. The UI must support real-time
              price feeds, wallet connection (MetaMask/WalletConnect), and interactive supply/borrow graphs.
            </p>
            <div className="space-y-2.5">
              {CRITERIA.map(item => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircleIconSolid className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-base-content/80">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Escrow Status */}
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-base-content">Escrow Status</h2>
                <span className="badge badge-primary">In Progress</span>
              </div>

              <EscrowProgress />

              <div className="flex flex-col gap-3 mt-5">
                <button className="btn btn-primary w-full gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Accept Task
                </button>
                <button className="btn btn-success w-full gap-2">
                  <CreditCardIcon className="w-5 h-5" />
                  Release Milestone 01
                </button>
                <button className="btn btn-outline btn-error w-full gap-2">
                  <ShieldExclamationIcon className="w-5 h-5" />
                  Open Dispute
                </button>
              </div>
            </div>

            {/* Contract Address */}
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
              <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">
                Smart Contract Address
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-base-200 rounded-lg px-3 py-2 text-sm font-mono text-base-content/60 truncate">
                  0x71C7656...d2830f1
                </div>
                <button className="btn btn-ghost btn-sm btn-square">
                  <DocumentDuplicateIcon className="w-4 h-4 text-base-content/50" />
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5">
              <h2 className="font-semibold text-base-content mb-1">Transaction History</h2>
              <div>
                <TxRow
                  Icon={PlusCircleIcon}
                  iconColor="text-success"
                  label="Escrow Funded"
                  sub="2 hours ago"
                  right={<span className="text-success font-medium text-sm shrink-0">+12,400 USDC</span>}
                />
                <TxRow
                  Icon={ClipboardDocumentCheckIcon}
                  iconColor="text-primary"
                  label="Agreement Signed"
                  sub="5 hours ago"
                  right={
                    <button className="btn btn-ghost btn-xs btn-square shrink-0">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-base-content/40" />
                    </button>
                  }
                />
                <TxRow
                  Icon={PencilSquareIcon}
                  iconColor="text-base-content/40"
                  label="Task Created"
                  sub="Oct 10, 2024"
                  right={
                    <button className="btn btn-ghost btn-xs btn-square shrink-0">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-base-content/40" />
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

type ParticipantProps = {
  address: `0x${string}`;
  role: string;
  name: string;
};

const Participant = ({ address, role, name }: ParticipantProps) => (
  <div className="flex items-center gap-3">
    <div className="relative shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blo(address)} alt={name} className="w-10 h-10 rounded-full" />
      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-2 border-base-100 flex items-center justify-center">
        <CheckCircleIconSolid className="w-2.5 h-2.5 text-primary-content" />
      </span>
    </div>
    <div>
      <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider">{role}</p>
      <p className="text-sm font-semibold text-base-content">{name}</p>
    </div>
  </div>
);

const EscrowProgress = () => (
  <div className="flex items-start">
    {ESCROW_STEPS.map((step, i) => (
      <div key={step} className="flex-1 flex flex-col items-center relative">
        {i < ESCROW_STEPS.length - 1 && (
          <div
            className={`absolute top-[7px] left-1/2 w-full h-0.5 ${i < CURRENT_STEP ? "bg-primary" : "bg-base-300"}`}
          />
        )}
        <div
          className={`relative z-10 rounded-full border-2 transition-all ${
            i < CURRENT_STEP
              ? "w-3.5 h-3.5 bg-primary border-primary"
              : i === CURRENT_STEP
                ? "w-4 h-4 bg-primary border-primary"
                : "w-3.5 h-3.5 bg-base-100 border-base-300"
          }`}
        />
        <span
          className={`text-[10px] mt-1.5 whitespace-nowrap text-center ${
            i === CURRENT_STEP ? "font-bold text-primary" : "text-base-content/40"
          }`}
        >
          {step}
        </span>
      </div>
    ))}
  </div>
);

type TxRowProps = {
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  sub: string;
  right: React.ReactNode;
};

const TxRow = ({ Icon, iconColor, label, sub, right }: TxRowProps) => (
  <div className="flex items-center gap-3 py-3 border-b border-base-200 last:border-0">
    <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0">
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-base-content">{label}</p>
      <p className="text-xs text-base-content/40">{sub}</p>
    </div>
    {right}
  </div>
);

export default JobViewPage;
