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

    // Each proposed resolution
    struct Solution {
        address proposer;
        uint256 paymentBps;    // % of escrow released to freelancer (0–10000)
        string  description;
        uint256 totalWeight;
        uint256 voterCount;
    }

    struct Dispute {
        address  client;
        uint256  stakedTokens;
        uint256  votingDeadline;
        uint256  solutionCount;
        uint256  totalVoterCount;
        bool     finalized;
        uint256  winningSolutionIndex;
        string   defenseStatement;
    }

    IJobMarketplace   public jobMarketplace;
    IReputationSystem public reputationSystem;
    IERC20            public decentraToken;
    address           public treasury;

    uint256 public votingDuration;
    uint256 public minimumVoters;
    uint256 public voterRewardBps;
    uint256 public minorityReputationPenalty;
    uint256 public minimumTokensToVote;

    mapping(uint256 => Dispute)                          public disputes;
    mapping(uint256 => mapping(uint256 => Solution))     public solutions;
    mapping(uint256 => mapping(address => bool))         public hasVoted;
    mapping(uint256 => mapping(address => uint256))      public votedForSolution; // solutionIndex voted for
    mapping(uint256 => mapping(address => uint256))      public voterWeight;
    mapping(uint256 => address[])                        public voters;

    event DisputeInitiated(uint256 indexed jobId, address indexed client, uint256 proposedPaymentBps, uint256 stakedTokens);
    event SolutionProposed(uint256 indexed jobId, address indexed proposer, uint256 solutionIndex, uint256 paymentBps, string description);
    event VoteCast(uint256 indexed jobId, address indexed voter, uint256 solutionIndex, uint256 weight);
    event DisputeFinalized(uint256 indexed jobId, uint256 winningSolutionIndex, uint256 winningPaymentBps, uint256 winningWeight);
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
    error InvalidSolutionIndex();
    error InvalidPaymentBps();

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

    // Called by JobMarketplace; creates dispute and adds client's proposal as Solution 0
    function initiateDispute(uint256 jobId, address client, uint256 proposedPaymentBps, uint256 stakedTokens)
        external
        onlyRole(MARKETPLACE_ROLE)
    {
        if (disputes[jobId].votingDeadline != 0) revert DisputeAlreadyExists();
        require(stakedTokens > 0, "DAODispute: stake required");
        if (proposedPaymentBps > 10000) revert InvalidPaymentBps();

        decentraToken.transferFrom(client, address(this), stakedTokens);

        disputes[jobId] = Dispute({
            client:               client,
            stakedTokens:         stakedTokens,
            votingDeadline:       block.timestamp + votingDuration,
            solutionCount:        1,
            totalVoterCount:      0,
            finalized:            false,
            winningSolutionIndex: 0,
            defenseStatement:     ""
        });

        // Solution 0 = client's initial proposal
        solutions[jobId][0] = Solution({
            proposer:    client,
            paymentBps:  proposedPaymentBps,
            description: "Client's initial proposal",
            totalWeight: 0,
            voterCount:  0
        });

        emit DisputeInitiated(jobId, client, proposedPaymentBps, stakedTokens);
        emit SolutionProposed(jobId, client, 0, proposedPaymentBps, "Client's initial proposal");
    }

    // Freelancer submits defense statement
    function submitDefense(uint256 jobId, string calldata statement) external {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        IJobMarketplace.Job memory job = jobMarketplace.getJob(jobId);
        if (msg.sender != job.freelancer) revert NotFreelancer();
        d.defenseStatement = statement;
        emit DefenseSubmitted(jobId, msg.sender, statement);
    }

    // Any eligible juror (or the freelancer) can propose a resolution
    function suggestSolution(uint256 jobId, uint256 paymentBps, string calldata description) external {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        if (block.timestamp >= d.votingDeadline) revert VotingOver();
        if (paymentBps > 10000) revert InvalidPaymentBps();

        // Client and freelancer can always suggest; others need eligibility
        IJobMarketplace.Job memory job = jobMarketplace.getJob(jobId);
        bool isParty = msg.sender == d.client || msg.sender == job.freelancer;
        if (!isParty) {
            if (!reputationSystem.hasCompletedJob(msg.sender)) revert NotEligibleVoter();
            if (decentraToken.balanceOf(msg.sender) < minimumTokensToVote) revert InsufficientTokenBalance();
        }

        uint256 idx = d.solutionCount;
        solutions[jobId][idx] = Solution({
            proposer:    msg.sender,
            paymentBps:  paymentBps,
            description: description,
            totalWeight: 0,
            voterCount:  0
        });
        d.solutionCount++;

        emit SolutionProposed(jobId, msg.sender, idx, paymentBps, description);
    }

    // Vote for a specific solution by index
    function vote(uint256 jobId, uint256 solutionIndex) external {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        if (block.timestamp >= d.votingDeadline) revert VotingOver();
        if (solutionIndex >= d.solutionCount) revert InvalidSolutionIndex();

        // Dispute parties cannot vote
        IJobMarketplace.Job memory job = jobMarketplace.getJob(jobId);
        require(msg.sender != d.client && msg.sender != job.freelancer, "DAODispute: party cannot vote");

        if (!reputationSystem.hasCompletedJob(msg.sender)) revert NotEligibleVoter();
        if (decentraToken.balanceOf(msg.sender) < minimumTokensToVote) revert InsufficientTokenBalance();
        if (hasVoted[jobId][msg.sender]) revert AlreadyVoted();

        uint256 weight = _calculateVoteWeight(msg.sender, jobId);

        hasVoted[jobId][msg.sender]            = true;
        votedForSolution[jobId][msg.sender]    = solutionIndex;
        voterWeight[jobId][msg.sender]         = weight;
        voters[jobId].push(msg.sender);

        d.totalVoterCount++;
        solutions[jobId][solutionIndex].totalWeight += weight;
        solutions[jobId][solutionIndex].voterCount++;

        emit VoteCast(jobId, msg.sender, solutionIndex, weight);
    }

    // Callable by anyone after votingDeadline
    function finalizeDispute(uint256 jobId) external nonReentrant {
        Dispute storage d = disputes[jobId];
        if (d.votingDeadline == 0) revert DisputeNotFound();
        if (d.finalized) revert AlreadyFinalized();
        if (block.timestamp < d.votingDeadline) revert VotingNotOver();

        d.finalized = true;

        // Find winning solution (highest totalWeight; ties go to lower index)
        uint256 winningSolutionIndex = 0;
        uint256 winningWeight = 0;
        for (uint256 i = 0; i < d.solutionCount; i++) {
            if (solutions[jobId][i].totalWeight > winningWeight) {
                winningWeight = solutions[jobId][i].totalWeight;
                winningSolutionIndex = i;
            }
        }

        d.winningSolutionIndex = winningSolutionIndex;
        Solution storage winner = solutions[jobId][winningSolutionIndex];

        emit DisputeFinalized(jobId, winningSolutionIndex, winner.paymentBps, winningWeight);

        // No quorum → full payment to freelancer (AI decision overturned; client loses stake)
        uint8 outcome;
        if (d.totalVoterCount < minimumVoters) {
            outcome = 0; // full pay
        } else {
            outcome = 1; // partial pay per winning solution
        }

        jobMarketplace.executeDaoOutcome(jobId, outcome, winner.paymentBps);

        if (d.totalVoterCount >= minimumVoters) {
            _distributeRewardsAndPenalties(jobId, winningSolutionIndex, d.stakedTokens);
        } else {
            _transferToken(treasury, d.stakedTokens);
        }
    }

    function _distributeRewardsAndPenalties(uint256 jobId, uint256 winningSolutionIndex, uint256 staked) internal {
        address[] storage voterList = voters[jobId];
        uint256 len = voterList.length;
        uint256 winningWeight = solutions[jobId][winningSolutionIndex].totalWeight;

        uint256 rewardPool     = (staked * voterRewardBps) / 10000;
        uint256 treasuryAmount = staked - rewardPool;

        if (winningWeight > 0) {
            for (uint256 i = 0; i < len; i++) {
                address v = voterList[i];
                if (votedForSolution[jobId][v] == winningSolutionIndex) {
                    uint256 reward = (rewardPool * voterWeight[jobId][v]) / winningWeight;
                    if (reward > 0) {
                        _transferToken(v, reward);
                        emit VoterRewarded(jobId, v, reward);
                    }
                } else {
                    int256 penalty = -int256(minorityReputationPenalty);
                    reputationSystem.updateReputation(v, penalty);
                    emit VoterPenalized(jobId, v, penalty);
                }
            }
        }

        if (treasuryAmount > 0) _transferToken(treasury, treasuryAmount);
    }

    function _calculateVoteWeight(address voter, uint256 jobId) internal view returns (uint256) {
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

    function calculateVoteWeight(address voter, uint256 jobId) external view returns (uint256) {
        return _calculateVoteWeight(voter, jobId);
    }

    function getDispute(uint256 jobId)
        external
        view
        returns (
            uint256 stakedTokens,
            uint256 votingDeadline,
            uint256 solutionCount,
            uint256 totalVoterCount,
            bool    finalized,
            uint256 winningSolutionIndex,
            string memory defenseStatement
        )
    {
        Dispute storage d = disputes[jobId];
        return (
            d.stakedTokens,
            d.votingDeadline,
            d.solutionCount,
            d.totalVoterCount,
            d.finalized,
            d.winningSolutionIndex,
            d.defenseStatement
        );
    }

    function getSolution(uint256 jobId, uint256 solutionIndex)
        external
        view
        returns (
            address proposer,
            uint256 paymentBps,
            string memory description,
            uint256 totalWeight,
            uint256 voterCount
        )
    {
        Solution storage s = solutions[jobId][solutionIndex];
        return (s.proposer, s.paymentBps, s.description, s.totalWeight, s.voterCount);
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

    function setDAODisputeAddress(address _daoDispute) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // placeholder for future upgrades
    }
}
