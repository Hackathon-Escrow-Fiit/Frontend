export type MockDispute = {
  id: number;
  title: string;
  description: string;
  skills: string[];
  budgetNXR: number;
  votingDeadlineOffset: number; // seconds from now
  client: `0x${string}`;
  freelancer: `0x${string}`;
  voterCount: number;
  proposedPaymentBps: number; // what freelancer gets
  aiConfidence: number;
  aiMetrics: { label: string; pass: boolean }[];
  clientStatement: string;
  freelancerDefence: string;
};

export const MOCK_DISPUTES: MockDispute[] = [
  {
    id: 9001,
    title: "Smart Contract Security Audit Dispute",
    description:
      "Complete security audit for ERC-721 smart contract including fuzz testing and formal verification of the bridge logic. The auditor claims the project has a critical reentrancy vulnerability in the staking contract. The developer disputes this, stating the checks-effects-interactions pattern was followed throughout.",
    skills: ["Smart Contracts", "Security Audit", "Formal Verification"],
    budgetNXR: 12400,
    votingDeadlineOffset: 18 * 3600 + 42 * 60 + 10,
    client: "0x82bf3b2c8d48a9f78de1c9e02f48a5f549e1a1e1",
    freelancer: "0xf3c4a8c27b91d4e0f3a2b1c9d8e7f6a5b4c3d2e1",
    voterCount: 7,
    proposedPaymentBps: 0,
    aiConfidence: 90,
    aiMetrics: [
      { label: "Code Quality", pass: true },
      { label: "Test Coverage", pass: true },
      { label: "Protocol Compliance", pass: false },
    ],
    clientStatement:
      "The freelancer provided a standard audit report but completely ignored the formal verification section required for the bridge. This bridge handles over $5M in TVL and we cannot launch without mathematical proof of safety. They are now refusing to respond to our requests for the missing proofs.",
    freelancerDefence:
      "Formal verification was attempted but the client's bridge logic uses assembly blocks that are currently unsupported by standard FV tools. I provided manual verification and exhaustive fuzzing which covers the same edge cases. I've delivered 100% of the work that is technically possible given their codebase.",
  },
  {
    id: 9002,
    title: "Mobile App Redesign Rejection",
    description:
      "Complete UI/UX redesign of a mobile application following brand guidelines provided by the client. Final Figma deliverables were rejected by the client claiming they do not follow the provided brand guidelines. Designer provides proof of adherence and multiple revision rounds completed.",
    skills: ["UI/UX Design", "Branding", "Figma"],
    budgetNXR: 3200,
    votingDeadlineOffset: 2 * 24 * 3600 + 14 * 3600,
    client: "0x4a7b9c2d1e3f5a6b8c0d2e4f6a8b0c2d4e6f8a0b",
    freelancer: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
    voterCount: 3,
    proposedPaymentBps: 5000,
    aiConfidence: 74,
    aiMetrics: [
      { label: "Brand Consistency", pass: true },
      { label: "Component Coverage", pass: true },
      { label: "Accessibility Standards", pass: false },
    ],
    clientStatement:
      "The designer submitted screens that use a purple-dominant palette when our brand guidelines clearly specify teal as the primary color. The typography hierarchy is also wrong — headings use 16px when the style guide requires 24px minimum. We went through 3 revisions and none addressed these fundamental issues.",
    freelancerDefence:
      "The brand guide provided was a 2021 version. The client verbally approved the updated purple palette in our Slack call on Oct 15th. I have screenshots of the approval. The 16px heading size was specifically requested for the compact mobile view where 24px caused overflow on small screens.",
  },
  {
    id: 9003,
    title: "DEX Interface Integration Failure",
    description:
      "Frontend developer failed to integrate the swap functionality with the custom wallet connector provided. Developer claims the wallet connector SDK has an undocumented breaking change that makes the integration impossible without backend changes.",
    skills: ["Frontend", "React", "Web3"],
    budgetNXR: 8500,
    votingDeadlineOffset: 4 * 3600 + 12 * 60,
    client: "0x9f8e7d6c5b4a3928171615141312111009080706",
    freelancer: "0x0a1b2c3d4e5f6071829384958697a8b9c0d1e2f3",
    voterCount: 12,
    proposedPaymentBps: 3000,
    aiConfidence: 65,
    aiMetrics: [
      { label: "UI Implementation", pass: true },
      { label: "Wallet Connection", pass: false },
      { label: "Swap Execution", pass: false },
    ],
    clientStatement:
      "The developer delivered a beautiful UI but the core swap functionality is completely broken. Clicking swap produces a console error related to the wallet connector. We paid for a working DEX interface, not a static mockup. The wallet connector SDK hasn't changed — other developers on our team use it fine.",
    freelancerDefence:
      "The wallet connector SDK version 3.2.1 introduced a breaking change to the signTransaction API without documentation. I reported this to the client on day 8 of the project and proposed a workaround requiring a small backend endpoint. The client refused to provide backend access. The UI and all other functionality is complete and production-ready.",
  },
  {
    id: 9004,
    title: "GraphQL API Schema Mismatch",
    description:
      "Backend developer was hired to implement a GraphQL API matching a provided schema specification. Client claims the delivered API has missing resolvers and type mismatches. Developer argues the schema provided was incomplete and evolved during development.",
    skills: ["GraphQL", "Node.js", "TypeScript"],
    budgetNXR: 5800,
    votingDeadlineOffset: 5 * 24 * 3600 + 2 * 3600,
    client: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    freelancer: "0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
    voterCount: 1,
    proposedPaymentBps: 7000,
    aiConfidence: 81,
    aiMetrics: [
      { label: "Schema Coverage", pass: true },
      { label: "Resolver Completeness", pass: true },
      { label: "Type Safety", pass: false },
    ],
    clientStatement:
      "The delivered GraphQL API is missing 4 of the 12 specified resolvers and 3 types have incorrect return shapes breaking our frontend queries. We provided a clear schema.graphql file on day 1. The developer acknowledged receipt. This is incomplete work.",
    freelancerDefence:
      "The original schema.graphql was updated 3 times during the project without versioning. The missing resolvers were added in revision 2 of the schema which was shared informally via Slack message and not in the official project document. I implemented everything present in the v1 schema I was contracted against.",
  },
];

export const getMockDispute = (id: number) => MOCK_DISPUTES.find(d => d.id === id) ?? null;

export const getVotingDeadline = (d: MockDispute) => BigInt(Math.floor(Date.now() / 1000) + d.votingDeadlineOffset);
