// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IReputationSystem {
    function initializeReputation(address user) external;
    function rateFreelancer(address freelancer, uint8 stars, uint256 jobId) external;
    function rateClient(address client, uint8 stars, uint256 jobId) external;
}

interface IDAODispute {
    function initiateDispute(uint256 jobId, address client, uint256 proposedPaymentBps) external;
}

contract JobMarketplace is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant CLIENT_ROLE       = keccak256("CLIENT_ROLE");
    bytes32 public constant FREELANCER_ROLE   = keccak256("FREELANCER_ROLE");
    bytes32 public constant AI_ORACLE_ROLE    = keccak256("AI_ORACLE_ROLE");
    bytes32 public constant DAO_EXECUTOR_ROLE = keccak256("DAO_EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE       = keccak256("PAUSER_ROLE");

    uint256 public constant DISPUTE_WINDOW = 48 hours;

    enum JobStatus {
        Open,
        Assigned,
        Submitted,
        AIApproved,
        DAOVoting,
        Completed,
        PartiallyPaid,
        Disputed,
        Cancelled
    }

    struct Bid {
        address freelancer;
        uint256 amount;
        string  proposal;
        bool    accepted;
    }

    struct Job {
        uint256   id;
        address   client;
        address   freelancer;
        string    title;
        string    description;
        string[]  skills;
        uint256   budget;
        uint256   deadline;
        JobStatus status;
        uint256   bidCount;
        uint256   createdAt;
        uint256   aiDecisionAt;
    }

    IReputationSystem public reputationSystem;
    IDAODispute       public daoDispute;
    IERC20            public decentraToken;

    uint256 public jobCount;
    mapping(uint256 => Job)                      public jobs;
    mapping(uint256 => mapping(uint256 => Bid))  public bids;
    mapping(uint256 => uint256)                  public jobEscrow;

    uint256 public platformFeeBps;
    address public feeRecipient;
    uint256 public jobPostReward;
    uint256 public completionReward;
    uint256 public disputeStake;

    event JobPosted(uint256 indexed jobId, address indexed client, uint256 budget, uint256 deadline);
    event BidPlaced(uint256 indexed jobId, uint256 indexed bidIndex, address indexed freelancer, uint256 amount);
    event BidAccepted(uint256 indexed jobId, uint256 indexed bidIndex, address indexed freelancer);
    event WorkSubmitted(uint256 indexed jobId, address indexed freelancer, string deliverableUri);
    event WorkApproved(uint256 indexed jobId, address indexed freelancer);
    event WorkRejected(uint256 indexed jobId, string reason);
    event PaymentClaimed(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event DAODisputeInitiated(uint256 indexed jobId, address indexed client, uint256 proposedPaymentBps);
    event DAOOutcomeExecuted(uint256 indexed jobId, uint8 outcome, uint256 paymentBps);
    event JobDisputed(uint256 indexed jobId, address indexed client);
    event DisputeResolved(uint256 indexed jobId, address indexed recipient, uint256 amount);
    event JobCancelled(uint256 indexed jobId, address indexed client, uint256 refundAmount);
    event PlatformFeeUpdated(uint256 oldBps, uint256 newBps);

    error NotJobClient();
    error NotJobFreelancer();
    error InvalidJobStatus();
    error DeadlineInPast();
    error ZeroBudget();
    error BidExceedsBudget();
    error InvalidBidIndex();
    error DisputeWindowExpired();
    error DisputeWindowOpen();
    error InvalidPaymentBps();
    error InvalidRecipient();
    error FeeTooHigh();
    error TransferFailed();

    constructor(
        address defaultAdmin,
        address aiOracle,
        address _reputationSystem,
        address _decentraToken,
        address _feeRecipient,
        uint256 _platformFeeBps
    ) {
        if (_platformFeeBps > 10000) revert FeeTooHigh();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(AI_ORACLE_ROLE, aiOracle);
        reputationSystem = IReputationSystem(_reputationSystem);
        decentraToken    = IERC20(_decentraToken);
        feeRecipient     = _feeRecipient;
        platformFeeBps   = _platformFeeBps;
        disputeStake     = 100 * 1e18; // 100 DWT default
    }

    // ─── Job Lifecycle ────────────────────────────────────────────────────────

    function postJob(
        string calldata title,
        string calldata description,
        uint256 deadline,
        string[] calldata skills
    ) external payable whenNotPaused returns (uint256 jobId) {
        if (msg.value == 0) revert ZeroBudget();
        if (deadline <= block.timestamp) revert DeadlineInPast();

        jobId = ++jobCount;

        Job storage job = jobs[jobId];
        job.id          = jobId;
        job.client      = msg.sender;
        job.title       = title;
        job.description = description;
        job.budget      = msg.value;
        job.deadline    = deadline;
        job.status      = JobStatus.Open;
        job.createdAt   = block.timestamp;

        for (uint256 i = 0; i < skills.length; i++) {
            job.skills.push(skills[i]);
        }

        jobEscrow[jobId] = msg.value;

        if (!hasRole(CLIENT_ROLE, msg.sender)) _grantRole(CLIENT_ROLE, msg.sender);
        reputationSystem.initializeReputation(msg.sender);

        // Mint reward — cap exhaustion must not block job posting
        if (jobPostReward > 0) {
            try IERC20Mintable(address(decentraToken)).mint(msg.sender, jobPostReward) {} catch {}
        }

        emit JobPosted(jobId, msg.sender, msg.value, deadline);
    }

    function placeBid(uint256 jobId, uint256 amount, string calldata proposal)
        external
        whenNotPaused
        returns (uint256 bidIndex)
    {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Open) revert InvalidJobStatus();
        if (amount == 0 || amount > job.budget) revert BidExceedsBudget();

        bidIndex = job.bidCount++;
        bids[jobId][bidIndex] = Bid({
            freelancer: msg.sender,
            amount:     amount,
            proposal:   proposal,
            accepted:   false
        });

        if (!hasRole(FREELANCER_ROLE, msg.sender)) _grantRole(FREELANCER_ROLE, msg.sender);
        reputationSystem.initializeReputation(msg.sender);

        emit BidPlaced(jobId, bidIndex, msg.sender, amount);
    }

    function acceptBid(uint256 jobId, uint256 bidIndex) external whenNotPaused {
        Job storage job = jobs[jobId];
        if (msg.sender != job.client) revert NotJobClient();
        if (job.status != JobStatus.Open) revert InvalidJobStatus();
        if (bidIndex >= job.bidCount) revert InvalidBidIndex();

        Bid storage bid = bids[jobId][bidIndex];
        bid.accepted    = true;
        job.freelancer  = bid.freelancer;
        job.status      = JobStatus.Assigned;

        // Refund excess escrow if bid is lower than budget
        uint256 excess = job.budget - bid.amount;
        if (excess > 0) {
            jobEscrow[jobId] = bid.amount;
            _sendEth(job.client, excess);
        }

        emit BidAccepted(jobId, bidIndex, bid.freelancer);
    }

    function submitWork(uint256 jobId, string calldata deliverableUri) external whenNotPaused {
        Job storage job = jobs[jobId];
        if (msg.sender != job.freelancer) revert NotJobFreelancer();
        if (job.status != JobStatus.Assigned) revert InvalidJobStatus();
        job.status = JobStatus.Submitted;
        emit WorkSubmitted(jobId, msg.sender, deliverableUri);
    }

    // AI oracle: moves to AIApproved and starts dispute window. Does NOT release escrow yet.
    function approveWork(uint256 jobId, uint8 freelancerStars, uint8 clientStars)
        external
        onlyRole(AI_ORACLE_ROLE)
    {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Submitted) revert InvalidJobStatus();
        job.status       = JobStatus.AIApproved;
        job.aiDecisionAt = block.timestamp;

        reputationSystem.rateFreelancer(job.freelancer, freelancerStars, jobId);
        reputationSystem.rateClient(job.client, clientStars, jobId);

        emit WorkApproved(jobId, job.freelancer);
    }

    // AI oracle: sends work back to Assigned so freelancer can resubmit
    function rejectWork(uint256 jobId, string calldata reason)
        external
        onlyRole(AI_ORACLE_ROLE)
    {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Submitted) revert InvalidJobStatus();
        job.status = JobStatus.Assigned;
        emit WorkRejected(jobId, reason);
    }

    // Freelancer (or anyone as keeper) claims payment after DISPUTE_WINDOW with no DAO dispute
    function claimPayment(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.AIApproved) revert InvalidJobStatus();
        if (block.timestamp < job.aiDecisionAt + DISPUTE_WINDOW) revert DisputeWindowOpen();

        job.status = JobStatus.Completed;
        uint256 paid = _releaseEscrow(jobId, job.freelancer);

        // Mint completion reward — cap exhaustion must not block payment
        if (completionReward > 0) {
            try IERC20Mintable(address(decentraToken)).mint(job.freelancer, completionReward) {} catch {}
        }

        emit PaymentClaimed(jobId, job.freelancer, paid);
    }

    // Client opens DAO dispute proposing partial payment within the dispute window
    function initiateDAODispute(uint256 jobId, uint256 proposedPaymentBps)
        external
        whenNotPaused
    {
        Job storage job = jobs[jobId];
        if (msg.sender != job.client) revert NotJobClient();
        if (job.status != JobStatus.AIApproved) revert InvalidJobStatus();
        if (block.timestamp >= job.aiDecisionAt + DISPUTE_WINDOW) revert DisputeWindowExpired();
        if (proposedPaymentBps == 0 || proposedPaymentBps >= 10000) revert InvalidPaymentBps();

        job.status = JobStatus.DAOVoting;

        // Client must have approved DAODispute to spend their DWT before calling this
        bool ok = decentraToken.transferFrom(msg.sender, address(daoDispute), disputeStake);
        if (!ok) revert TransferFailed();

        daoDispute.initiateDispute(jobId, msg.sender, proposedPaymentBps);
        emit DAODisputeInitiated(jobId, msg.sender, proposedPaymentBps);
    }

    // Called by DAODispute after vote finalization
    // outcome: 0 = full pay, 1 = partial pay (paymentBps), 2 = 50/50 tie
    function executeDaoOutcome(uint256 jobId, uint8 outcome, uint256 paymentBps)
        external
        nonReentrant
        onlyRole(DAO_EXECUTOR_ROLE)
    {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.DAOVoting) revert InvalidJobStatus();

        if (outcome == 0) {
            job.status = JobStatus.Completed;
            _releaseEscrow(jobId, job.freelancer);
        } else if (outcome == 1) {
            job.status = JobStatus.PartiallyPaid;
            _releasePartialEscrow(jobId, paymentBps);
        } else {
            job.status = JobStatus.PartiallyPaid;
            _splitEscrow(jobId, job.client, job.freelancer);
        }

        emit DAOOutcomeExecuted(jobId, outcome, paymentBps);
    }

    // Fallback admin dispute path
    function disputeJob(uint256 jobId) external whenNotPaused {
        Job storage job = jobs[jobId];
        if (msg.sender != job.client) revert NotJobClient();
        if (job.status != JobStatus.Assigned && job.status != JobStatus.Submitted) {
            revert InvalidJobStatus();
        }
        job.status = JobStatus.Disputed;
        emit JobDisputed(jobId, msg.sender);
    }

    function resolveDispute(
        uint256 jobId,
        address recipient,
        uint8 freelancerStars,
        uint8 clientStars
    ) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Disputed) revert InvalidJobStatus();
        if (recipient != job.client && recipient != job.freelancer) revert InvalidRecipient();

        job.status = JobStatus.Completed;
        uint256 paid = _releaseEscrow(jobId, recipient);

        reputationSystem.rateFreelancer(job.freelancer, freelancerStars, jobId);
        reputationSystem.rateClient(job.client, clientStars, jobId);

        emit DisputeResolved(jobId, recipient, paid);
    }

    function cancelJob(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (msg.sender != job.client) revert NotJobClient();
        if (job.status != JobStatus.Open) revert InvalidJobStatus();

        uint256 refund = jobEscrow[jobId];
        job.status = JobStatus.Cancelled;
        jobEscrow[jobId] = 0;
        _sendEth(job.client, refund);

        emit JobCancelled(jobId, msg.sender, refund);
    }

    // ─── Admin Config ─────────────────────────────────────────────────────────

    function setPlatformFee(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > 10000) revert FeeTooHigh();
        emit PlatformFeeUpdated(platformFeeBps, newFeeBps);
        platformFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = newRecipient;
    }

    function setRewardAmounts(uint256 _jobPostReward, uint256 _completionReward)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        jobPostReward    = _jobPostReward;
        completionReward = _completionReward;
    }

    function setDisputeStake(uint256 _disputeStake) external onlyRole(DEFAULT_ADMIN_ROLE) {
        disputeStake = _disputeStake;
    }

    function setDAODispute(address _daoDispute) external onlyRole(DEFAULT_ADMIN_ROLE) {
        daoDispute = IDAODispute(_daoDispute);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getBid(uint256 jobId, uint256 bidIndex) external view returns (Bid memory) {
        return bids[jobId][bidIndex];
    }

    function getEscrowBalance(uint256 jobId) external view returns (uint256) {
        return jobEscrow[jobId];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    // Checks-effects-interactions: jobEscrow zeroed before any .call{value}
    function _releaseEscrow(uint256 jobId, address freelancer) internal returns (uint256 paid) {
        uint256 total = jobEscrow[jobId];
        jobEscrow[jobId] = 0;

        uint256 fee     = (total * platformFeeBps) / 10000;
        paid            = total - fee;

        if (fee > 0) _sendEth(feeRecipient, fee);
        _sendEth(freelancer, paid);
    }

    function _releasePartialEscrow(uint256 jobId, uint256 paymentBps) internal {
        uint256 total           = jobEscrow[jobId];
        jobEscrow[jobId]        = 0;

        uint256 freelancerGross = (total * paymentBps) / 10000;
        uint256 fee             = (freelancerGross * platformFeeBps) / 10000;
        uint256 freelancerNet   = freelancerGross - fee;
        uint256 clientRefund    = total - freelancerGross;

        Job storage job = jobs[jobId];
        if (fee > 0) _sendEth(feeRecipient, fee);
        _sendEth(job.freelancer, freelancerNet);
        if (clientRefund > 0) _sendEth(job.client, clientRefund);
    }

    function _splitEscrow(uint256 jobId, address client, address freelancer) internal {
        uint256 total    = jobEscrow[jobId];
        jobEscrow[jobId] = 0;

        uint256 half     = total / 2;
        uint256 remainder = total - half * 2; // odd wei

        _sendEth(freelancer, half);
        _sendEth(client, half);
        if (remainder > 0) _sendEth(feeRecipient, remainder);
    }

    function _sendEth(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}

// Minimal interface for minting DWT from JobMarketplace
interface IERC20Mintable {
    function mint(address to, uint256 amount) external;
}
