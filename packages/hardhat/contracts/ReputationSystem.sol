// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ReputationSystem is AccessControl {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 public constant AI_ORACLE_ROLE   = keccak256("AI_ORACLE_ROLE");
    bytes32 public constant DAO_ROLE         = keccak256("DAO_ROLE");

    uint256 public constant BASE_REPUTATION = 300;

    struct Rating {
        uint256 totalScore;
        uint256 count;
    }

    mapping(address => uint256) public reputation;
    mapping(address => bool)    public initialized;
    mapping(address => bool)    public hasCompletedJob;

    mapping(address => mapping(string => uint8)) public skills;

    mapping(address => Rating) public clientRatings;
    mapping(address => Rating) public freelancerRatings;

    event ReputationInitialized(address indexed user, uint256 base);
    event ReputationUpdated(address indexed user, int256 delta, uint256 newReputation);
    event SkillUpdated(address indexed user, string skill, uint8 score, uint256 jobId);
    event ClientRated(address indexed client, uint8 stars, uint256 jobId);
    event FreelancerRated(address indexed freelancer, uint8 stars, uint256 jobId);

    error InvalidStars();
    error InvalidSkillScore();

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    function initializeReputation(address user) external onlyRole(MARKETPLACE_ROLE) {
        if (initialized[user]) return;
        initialized[user] = true;
        reputation[user] = BASE_REPUTATION;
        emit ReputationInitialized(user, BASE_REPUTATION);
    }

    function updateReputation(address user, int256 delta)
        external
    {
        require(
            hasRole(MARKETPLACE_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender),
            "AccessControl: caller lacks required role"
        );
        uint256 current = reputation[user];
        if (delta < 0) {
            uint256 decrease = uint256(-delta);
            reputation[user] = current > decrease ? current - decrease : 0;
        } else {
            reputation[user] = current + uint256(delta);
        }
        emit ReputationUpdated(user, delta, reputation[user]);
    }

    function rateFreelancer(address freelancer, uint8 stars, uint256 jobId)
        external
        onlyRole(MARKETPLACE_ROLE)
    {
        if (stars < 1 || stars > 5) revert InvalidStars();
        freelancerRatings[freelancer].totalScore += stars;
        freelancerRatings[freelancer].count += 1;
        hasCompletedJob[freelancer] = true;
        emit FreelancerRated(freelancer, stars, jobId);
    }

    function rateClient(address client, uint8 stars, uint256 jobId)
        external
        onlyRole(MARKETPLACE_ROLE)
    {
        if (stars < 1 || stars > 5) revert InvalidStars();
        clientRatings[client].totalScore += stars;
        clientRatings[client].count += 1;
        emit ClientRated(client, stars, jobId);
    }

    function setSkill(address user, string calldata skill, uint8 score, uint256 jobId)
        external
        onlyRole(AI_ORACLE_ROLE)
    {
        if (score > 10) revert InvalidSkillScore();
        skills[user][skill] = score;
        hasCompletedJob[user] = true;
        emit SkillUpdated(user, skill, score, jobId);
    }

    function getReputation(address user) external view returns (uint256) {
        return reputation[user];
    }

    function getSkill(address user, string calldata skill) external view returns (uint8) {
        return skills[user][skill];
    }

    // Returns average scaled ×100 to avoid fractions (e.g. 450 = 4.50 stars)
    function getFreelancerRating(address user)
        external
        view
        returns (uint256 averageScaled, uint256 total)
    {
        Rating storage r = freelancerRatings[user];
        total = r.count;
        averageScaled = total == 0 ? 0 : (r.totalScore * 100) / total;
    }

    function getClientRating(address user)
        external
        view
        returns (uint256 averageScaled, uint256 total)
    {
        Rating storage r = clientRatings[user];
        total = r.count;
        averageScaled = total == 0 ? 0 : (r.totalScore * 100) / total;
    }
}
