// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IJobMarketplace {
    struct Job {
        uint256   id;
        address   client;
        address   freelancer;
        string    title;
        string    description;
        string[]  skills;
        uint256   budget;
        uint256   deadline;
        uint8     status;
        uint256   bidCount;
        uint256   createdAt;
        uint256   aiDecisionAt;
    }
    function executeDaoOutcome(uint256 jobId, uint8 outcome, uint256 paymentBps) external;
    function getJob(uint256 jobId) external view returns (Job memory);
}

interface IReputationSystem {
    function getReputation(address user) external view returns (uint256);
    function getSkill(address user, string calldata skill) external view returns (uint8);
    function hasCompletedJob(address user) external view returns (bool);
    function updateReputation(address user, int256 delta) external;
}

contract DAODispute is AccessControl, ReentrancyGuard {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    struct Dispute {
        uint256 jobId;
        address client;
        uint256 proposedPaymentBps;
        uint256 stakedTokens;
        uint256 votingDeadline;
        uint256 forWeight;       // votes FOR client proposal (partial pay)
        uint256 againstWeight;   // votes AGAINST (full pay)
        uint256 voterCount;
        bool    finalized;
        string  defenseStatement;
    }

    IJobMarketplace   public jobMarketplace;
    IReputationSystem public reputationSystem;
    IERC20            public decentraToken;
    address           public treasury;

    uint256 public votingDuration;
    uint256 public minimumVoters;
    uint256 public voterRewardBps;           // % of staked tokens to majority voters
    uint256 public minorityReputationPenalty;
    uint256 public minimumTokensToVote;

    mapping(uint256 => Dispute)                   public disputes;
    mapping(uint256 => mapping(address => bool))   public hasVoted;
    mapping(uint256 => mapping(address => bool))   public votedFor;    // true = voted for client proposal
    mapping(uint256 => mapping(address => uint256)) public voterWeight;
    mapping(uint256 => address[])                  public voters;

    event DisputeInitiated(uint256 indexed jobId, address indexed client, uint256 proposedPaymentBps, uint256 stakedTokens);
    event VoteCast(uint256 indexed jobId, address indexed voter, bool support, uint256 weight);
    event DisputeFinalized(uint256 indexed jobId, uint8 outcome, uint256 forWeight, uint256 againstWeight);
    event VoterRewarded(uint256 indexed jobId, address indexed voter, uint256 amount);
    event VoterPenalized(uint256 indexed jobId, address indexed voter, int256 delta);
    event DefenseSubmitted(uint256 indexed jobId, address indexed freelancer, string statement);

    error AlreadyFinalized();
    error VotingNotOver();
    error VotingOver();
    error NotEligibleVoter();
    error InsufficientTokenBalance();
    error AlreadyVoted();
    error DisputeNotFound();
    error DisputeAlreadyExists();
    error NotFreelancer();

    constructor(
        address defaultAdmin,
        address _jobMarketplace,
        address _reputationSystem,
        address _decentraToken,
        address _treasury,
        uint256 _votingDuration,
        uint256 _minimumVoters,
        uint256 _voterRewardBps,
        uint256 _minorityReputationPenalty,
        uint256 _minimumTokensToVote
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        jobMarketplace            = IJobMarketplace(_jobMarketplace);
        reputationSystem          = IReputationSystem(_reputationSystem);
        decentraToken             = IERC20(_decentraToken);
        treasury                  = _treasury;
        votingDuration            = _votingDuration;
        minimumVoters             = _minimumVoters;
        voterRewardBps            = _voterRewardBps;
        minorityReputationPenalty = _minorityReputationPenalty;
        minimumTokensToVote       = _minimumTokensToVote;
    }

    // Called by JobMarketplace; client must have approved `stakedTokens` to this contract beforehand
    function initiateDispute(uint256 jobId, address client, uint256 proposedPaymentBps, uint256 stakedTokens)
        external
        onlyRole(MARKETPLACE_ROLE)
    {
        if (disputes[jobId].votingDeadline != 0) revert DisputeAlreadyExists();
        require(stakedTokens > 0, "DAODispute: stake required");

        decentraToken.transferFrom(client, address(this), stakedTokens);

        disputes[jobId] = Dispute({
            jobId:              jobId,
            client:             client,
            proposedPaymentBps: proposedPaymentBps,
            stakedTokens:       stakedTokens,
            votingDeadline:     block.timestamp + votingDuration,
            forWeight:          0,
            againstWeight:      0,
            voterCount:         0,
            finalized:          false,
            defenseStatement:   ""
        });

        emit DisputeInitiated(jobId, client, proposedPaymentBps, stakedTokens);
    }

    // support = true → agree with client (partial pay); false → full pay to freelancer
    function vote(uint256 jobId, bool support) external {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        if (block.timestamp >= d.votingDeadline) revert VotingOver();
        if (!reputationSystem.hasCompletedJob(msg.sender)) revert NotEligibleVoter();
        if (decentraToken.balanceOf(msg.sender) < minimumTokensToVote) revert InsufficientTokenBalance();
        if (hasVoted[jobId][msg.sender]) revert AlreadyVoted();

        uint256 weight = _calculateVoteWeight(msg.sender, jobId);

        hasVoted[jobId][msg.sender]  = true;
        votedFor[jobId][msg.sender]  = support;
        voterWeight[jobId][msg.sender] = weight;
        voters[jobId].push(msg.sender);
        d.voterCount++;

        if (support) {
            d.forWeight += weight;
        } else {
            d.againstWeight += weight;
        }

        emit VoteCast(jobId, msg.sender, support, weight);
    }

    function submitDefense(uint256 jobId, string calldata statement) external {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        IJobMarketplace.Job memory job = jobMarketplace.getJob(jobId);
        if (msg.sender != job.freelancer) revert NotFreelancer();
        d.defenseStatement = statement;
        emit DefenseSubmitted(jobId, msg.sender, statement);
    }

    // Callable by anyone after votingDeadline
    function finalizeDispute(uint256 jobId) external nonReentrant {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        if (block.timestamp < d.votingDeadline) revert VotingNotOver();

        d.finalized = true;

        uint8 outcome;
        bool  majorityIsFor; // true = majority voted FOR client proposal

        if (d.voterCount < minimumVoters) {
            // No quorum — confirm full payment (AI decision stands)
            outcome      = 0;
            majorityIsFor = false;
        } else if (d.forWeight > d.againstWeight) {
            outcome      = 1; // partial pay
            majorityIsFor = true;
        } else if (d.againstWeight > d.forWeight) {
            outcome      = 0; // full pay
            majorityIsFor = false;
        } else {
            outcome      = 2; // tie → 50/50
            majorityIsFor = false; // no clear majority; skip penalty/reward logic
        }

        emit DisputeFinalized(jobId, outcome, d.forWeight, d.againstWeight);

        // Callback to JobMarketplace to execute escrow action
        jobMarketplace.executeDaoOutcome(jobId, outcome, d.proposedPaymentBps);

        // Distribute rewards only when there is a clear majority (not tie and not no-quorum with 0 voters)
        if (outcome != 2 && d.voterCount >= minimumVoters) {
            _distributeRewardsAndPenalties(jobId, majorityIsFor, d.stakedTokens);
        } else {
            // No clear majority or no quorum: return staked tokens to treasury
            _transferToken(treasury, d.stakedTokens);
        }
    }

    function _distributeRewardsAndPenalties(
        uint256 jobId,
        bool    majorityIsFor,
        uint256 staked
    ) internal {
        address[] storage voterList = voters[jobId];
        uint256 len = voterList.length;

        // Calculate total weight of majority side
        uint256 majorityTotalWeight = 0;
        for (uint256 i = 0; i < len; i++) {
            address v = voterList[i];
            if (votedFor[jobId][v] == majorityIsFor) {
                majorityTotalWeight += voterWeight[jobId][v];
            }
        }

        uint256 rewardPool     = (staked * voterRewardBps) / 10000;
        uint256 treasuryAmount = staked - rewardPool;

        // Reward majority voters proportionally to their weight
        if (majorityTotalWeight > 0) {
            for (uint256 i = 0; i < len; i++) {
                address v = voterList[i];
                if (votedFor[jobId][v] == majorityIsFor) {
                    uint256 reward = (rewardPool * voterWeight[jobId][v]) / majorityTotalWeight;
                    if (reward > 0) {
                        _transferToken(v, reward);
                        emit VoterRewarded(jobId, v, reward);
                    }
                } else {
                    // Minority: apply reputation penalty
                    int256 penalty = -int256(minorityReputationPenalty);
                    reputationSystem.updateReputation(v, penalty);
                    emit VoterPenalized(jobId, v, penalty);
                }
            }
        }

        if (treasuryAmount > 0) _transferToken(treasury, treasuryAmount);
    }

    function _calculateVoteWeight(address voter, uint256 jobId)
        internal
        view
        returns (uint256)
    {
        uint256 rep    = reputationSystem.getReputation(voter);
        uint256 weight = _sqrt(rep);

        IJobMarketplace.Job memory job = jobMarketplace.getJob(jobId);
        uint256 skillCount = job.skills.length;
        if (skillCount > 0) {
            uint256 skillTotal = 0;
            for (uint256 i = 0; i < skillCount; i++) {
                skillTotal += reputationSystem.getSkill(voter, job.skills[i]);
            }
            weight += skillTotal / skillCount;
        }

        return weight;
    }

    // Babylonian integer square root
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function _transferToken(address to, uint256 amount) internal {
        if (amount == 0) return;
        decentraToken.transfer(to, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function calculateVoteWeight(address voter, uint256 jobId)
        external
        view
        returns (uint256)
    {
        return _calculateVoteWeight(voter, jobId);
    }

    function getDispute(uint256 jobId)
        external
        view
        returns (
            uint256 proposedPaymentBps,
            uint256 stakedTokens,
            uint256 votingDeadline,
            uint256 forWeight,
            uint256 againstWeight,
            uint256 voterCount,
            bool    finalized,
            string memory defenseStatement
        )
    {
        Dispute storage d = disputes[jobId];
        return (
            d.proposedPaymentBps,
            d.stakedTokens,
            d.votingDeadline,
            d.forWeight,
            d.againstWeight,
            d.voterCount,
            d.finalized,
            d.defenseStatement
        );
    }

    // ─── Admin Config ─────────────────────────────────────────────────────────

    function setVotingDuration(uint256 _votingDuration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingDuration = _votingDuration;
    }

    function setMinimumVoters(uint256 _minimumVoters) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumVoters = _minimumVoters;
    }

    function setVoterRewardBps(uint256 _voterRewardBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_voterRewardBps <= 10000, "DAODispute: reward bps exceeds 10000");
        voterRewardBps = _voterRewardBps;
    }

    function setMinorityPenalty(uint256 _penalty) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minorityReputationPenalty = _penalty;
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = _treasury;
    }

    function setMinimumTokensToVote(uint256 _minimum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumTokensToVote = _minimum;
    }
}
