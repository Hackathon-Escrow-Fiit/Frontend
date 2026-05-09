# Smart Contract Architecture

## Overview

This platform is a decentralized freelance marketplace built on four interdependent contracts. Jobs are paid in **Nexora Token (NXR)**, reputation is tracked on-chain, and disputes are resolved by a weighted DAO vote.

---

## Contracts

### 1. DecentraToken — `NexoraToken.sol`

ERC20 token (`NXR`) with a hard supply cap, pausability, and role-based minting.

**Roles**

| Role | Permission |
|------|-----------|
| `DEFAULT_ADMIN_ROLE` | Grants/revokes roles, can pause |
| `MINTER_ROLE` | Mints new tokens (assigned to JobMarketplace) |
| `PAUSER_ROLE` | Freezes all transfers |

**Key functions**

| Function | Who can call | Description |
|----------|-------------|-------------|
| `mint(to, amount)` | MINTER_ROLE | Mint tokens up to the cap |
| `pause()` / `unpause()` | PAUSER_ROLE | Freeze / resume all transfers |
| `burn(amount)` | Any holder | Burn own tokens |

---

### 2. ReputationSystem — `ReputationSystem.sol`

On-chain registry for user reputation scores and per-skill ratings.

**Starting score:** Every new user initializes at `BASE_REPUTATION = 300`.

**Roles**

| Role | Permission |
|------|-----------|
| `MARKETPLACE_ROLE` | Initialize reputation, rate clients/freelancers |
| `AI_ORACLE_ROLE` | Set skill scores after job completion |
| `DAO_ROLE` | Adjust reputation after dispute votes |

**Key functions**

| Function | Who can call | Description |
|----------|-------------|-------------|
| `initializeReputation(user)` | MARKETPLACE_ROLE | Sets user to base score 300 (no-op if already initialized) |
| `updateReputation(user, delta)` | MARKETPLACE_ROLE or DAO_ROLE | Adds or subtracts from score; floors at 0 |
| `rateFreelancer(freelancer, stars, jobId)` | MARKETPLACE_ROLE | Records 1–5 star rating; sets `hasCompletedJob = true` |
| `rateClient(client, stars, jobId)` | MARKETPLACE_ROLE | Records 1–5 star rating for client |
| `setSkill(user, skill, score, jobId)` | AI_ORACLE_ROLE | Sets a 0–10 skill score; sets `hasCompletedJob = true` |

**Rating reads**

Averages are scaled ×100 to avoid fractions (e.g. `450` = 4.50 stars).

```solidity
getFreelancerRating(user) → (averageScaled, totalRatings)
getClientRating(user)     → (averageScaled, totalRatings)
getReputation(user)       → uint256
getSkill(user, skill)     → uint8 (0–10)
```

---

### 3. JobMarketplace — `JobMarketplace.sol`

Central contract managing the full job lifecycle, escrow, and payment distribution.

#### Job Status State Machine

```
Open ──acceptBid()──→ Assigned ──submitWork()──→ Submitted
 |                       |                           |
cancelJob()          disputeJob()              approveWork() / rejectWork()
 |                       |                           |
Cancelled            Disputed             AIApproved (48h dispute window starts)
                         |                    |              |
                   resolveDispute()     claimPayment()  initiateDAODispute()
                         |              (after 48h)          |
                      Completed         Completed         DAOVoting
                                                              |
                                                     executeDaoOutcome()
                                                              |
                                               Completed / PartiallyPaid
```

#### Job Lifecycle — Step by Step

| Step | Actor | Function | Effect |
|------|-------|----------|--------|
| 1 | Client | `postJob(title, desc, budget, deadline, skills)` | Job created; `budget` NXR locked in escrow; client role granted |
| 2 | Freelancer | `placeBid(jobId, amount, proposal)` | Bid recorded; freelancer role granted |
| 3 | Client | `acceptBid(jobId, bidIndex)` | Job moves to `Assigned`; excess escrow above bid refunded |
| 4 | Freelancer | `submitWork(jobId, deliverableUri)` | Deliverable URI stored; status → `Submitted` |
| 5 | AI Oracle | `approveWork(jobId, freelancerStars, clientStars)` | Status → `AIApproved`; 48h dispute window starts; both parties rated |
| 5b | AI Oracle | `rejectWork(jobId, reason)` | Status reverts to `Assigned` for rework |
| 6a | Anyone | `claimPayment(jobId)` | After 48h with no dispute; escrow released minus platform fee |
| 6b | Client | `initiateDAODispute(jobId, proposedPaymentBps)` | Within 48h; client stakes NXR; status → `DAOVoting` |

#### Escrow Release Logic

| Outcome | Freelancer receives | Client receives |
|---------|-------------------|----------------|
| Full pay | `escrow − platformFee` | — |
| Partial pay (`paymentBps`) | `escrow × bps / 10000 − fee` | Remainder |
| 50/50 tie | `escrow / 2` | `escrow / 2` (odd wei → fee recipient) |

**Platform fee** is applied only to the freelancer's portion and is configurable in basis points (`platformFeeBps / 10000`).

#### Incentive Rewards (optional, mintable)

| Trigger | Recipient | Amount |
|---------|-----------|--------|
| Job posted | Client | `jobPostReward` NXR |
| Payment claimed | Freelancer | `completionReward` NXR |

Minting silently fails if the token cap is exhausted — it never blocks job flow.

#### Admin Functions

| Function | Description |
|----------|-------------|
| `setPlatformFee(bps)` | Update platform fee (max 100%) |
| `setFeeRecipient(addr)` | Change fee destination |
| `setRewardAmounts(post, completion)` | Set NXR mint rewards |
| `setDisputeStake(amount)` | Set required stake to open a DAO dispute |
| `setDAODispute(addr)` | Wire in the DAODispute contract |
| `pause()` / `unpause()` | Emergency stop for all write operations |

---

### 4. DAODispute — `DAODispute.sol`

Weighted voting contract where the community arbitrates client–freelancer disputes.

#### Voter Eligibility

To vote, a user must:
1. Have `hasCompletedJob == true` (at least one completed job on the platform)
2. Hold at least `minimumTokensToVote` NXR tokens

#### Vote Weight Formula

```
weight = sqrt(reputation) + average(skill scores for the job's required skills)
```

Higher reputation and more relevant skills yield more voting power. The square root dampens reputation whales.

#### Dispute Flow

| Step | Who | Action |
|------|-----|--------|
| 1 | JobMarketplace | Calls `initiateDispute()` with client's staked NXR |
| 2 | Eligible voters | Call `vote(jobId, support)` within `votingDuration` |
| 3 | Anyone | Calls `finalizeDispute(jobId)` after deadline |
| 4 | DAODispute | Calls `executeDaoOutcome()` on JobMarketplace |

#### Voting Outcomes

| Condition | Outcome | Code |
|-----------|---------|------|
| `forWeight > againstWeight` | Partial pay (client's proposed split) | `1` |
| `againstWeight > forWeight` | Full pay to freelancer | `0` |
| Equal weights | 50/50 split | `2` |
| Voter count < `minimumVoters` (no quorum) | Full pay (AI decision stands) | `0` |

#### Post-Finalization Incentives

When there is a clear majority (outcome `0` or `1`, quorum met):

- **Majority voters** share `voterRewardBps` % of the client's staked tokens, distributed proportionally by vote weight
- **Minority voters** receive a reputation penalty of `−minorityReputationPenalty`
- **Treasury** receives the remaining stake

On tie or no quorum: entire stake goes to treasury.

#### Admin Config

| Function | Description |
|----------|-------------|
| `setVotingDuration(seconds)` | Change the voting window |
| `setMinimumVoters(n)` | Change quorum threshold |
| `setVoterRewardBps(bps)` | Change majority voter reward share |
| `setMinorityPenalty(amount)` | Change reputation penalty for minority voters |
| `setMinimumTokensToVote(amount)` | Change minimum NXR balance to vote |
| `setTreasury(addr)` | Change treasury destination |

---

## Contract Interaction Diagram

```
                        ┌─────────────────┐
                        │  DecentraToken  │
                        │     (NXR)       │
                        └────────┬────────┘
                 mints rewards   │   holds escrow & stakes
                        ┌────────┴────────┐
          ┌─────────────│  JobMarketplace │─────────────┐
          │             └────────┬────────┘             │
          │    initiateDispute() │  ↑ executeDaoOutcome()│
          │             ┌────────┴────────┐             │
          │             │   DAODispute    │             │
          │             └────────┬────────┘             │
          │    vote weight from  │                      │
          │             ┌────────┴────────┐             │
          └────────────→│ ReputationSystem│←────────────┘
         initReputation │                 │ updateReputation
         rateFreelancer │                 │ (DAO penalties)
         rateClient     └─────────────────┘
                                ↑
                          setSkill (AI Oracle)
```

---

## Roles Summary

| Role | Granted to | Contracts |
|------|-----------|-----------|
| `DEFAULT_ADMIN_ROLE` | Deployer | All |
| `MINTER_ROLE` | JobMarketplace | DecentraToken |
| `PAUSER_ROLE` | Deployer | DecentraToken, JobMarketplace |
| `MARKETPLACE_ROLE` | JobMarketplace | ReputationSystem, DAODispute |
| `AI_ORACLE_ROLE` | AI service wallet | JobMarketplace, ReputationSystem |
| `DAO_ROLE` | DAODispute | ReputationSystem |
| `DAO_EXECUTOR_ROLE` | DAODispute | JobMarketplace |
| `CLIENT_ROLE` | Auto-granted on `postJob` | JobMarketplace |
| `FREELANCER_ROLE` | Auto-granted on `placeBid` | JobMarketplace |
