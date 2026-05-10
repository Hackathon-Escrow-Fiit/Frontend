// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./ReputationSystem.sol";
import "./DecentraWorkRegistry.sol";

/// @title NexoraResolver
/// @notice ENS-compatible text resolver for nexora.eth subnames.
///         Reads reputation and profile data live from on-chain contracts —
///         no extra transactions required after registration.
///
///         Supported text record keys:
///           decentrawork.elo    – ELO reputation score
///           decentrawork.tier   – tier label (entry/rising/skilled/expert/elite)
///           decentrawork.role   – freelancer | client
///           decentrawork.bio    – profile bio text
///           url                 – profile link (standard ENS field)
contract NexoraResolver {
    ReputationSystem public reputation;
    DecentraWorkRegistry public registry;

    /// @notice Only the registry contract may register / clear nodes.
    address public registryAddress;

    /// ENS node (namehash) → wallet address
    mapping(bytes32 => address) private _nodeToAddress;

    // ── Interface IDs ────────────────────────────────────────────────────────
    bytes4 private constant IFACE_TEXT   = 0x59d1d43c; // ITextResolver
    bytes4 private constant IFACE_ADDR   = 0x3b3b57de; // IAddrResolver
    bytes4 private constant IFACE_ERC165 = 0x01ffc9a7; // IERC165

    modifier onlyRegistry() {
        require(msg.sender == registryAddress, "NexoraResolver: caller is not registry");
        _;
    }

    constructor(address _reputation, address _registry) {
        reputation    = ReputationSystem(_reputation);
        registry      = DecentraWorkRegistry(_registry);
        registryAddress = _registry;
    }

    // ── Registry interface ────────────────────────────────────────────────────

    /// @notice Called by DecentraWorkRegistry when a name is registered.
    function setNode(bytes32 node, address owner) external onlyRegistry {
        _nodeToAddress[node] = owner;
    }

    /// @notice Called by DecentraWorkRegistry when a name is released.
    function clearNode(bytes32 node) external onlyRegistry {
        delete _nodeToAddress[node];
    }

    // ── ENS resolver interface ────────────────────────────────────────────────

    /// @notice Resolve address for a node.
    function addr(bytes32 node) external view returns (address) {
        return _nodeToAddress[node];
    }

    /// @notice Resolve text records for a node. Reads live from contracts.
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        address owner = _nodeToAddress[node];
        if (owner == address(0)) return "";

        bytes32 k = keccak256(bytes(key));

        if (k == keccak256("decentrawork.elo")) {
            return _uint256ToString(reputation.getReputation(owner));
        }
        if (k == keccak256("decentrawork.tier")) {
            return _eloToTier(reputation.getReputation(owner));
        }
        if (k == keccak256("decentrawork.role")) {
            return _roleToString(registry.getRole(owner));
        }
        if (k == keccak256("decentrawork.bio")) {
            return registry.getBio(owner);
        }
        if (k == keccak256("url")) {
            return string.concat("https://decentrawork.xyz/profile/", registry.getName(owner));
        }

        return "";
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == IFACE_TEXT ||
               interfaceID == IFACE_ADDR ||
               interfaceID == IFACE_ERC165;
    }

    // ── Utilities ────────────────────────────────────────────────────────────

    function _eloToTier(uint256 elo) internal pure returns (string memory) {
        if (elo >= 2000) return "elite";
        if (elo >= 1500) return "expert";
        if (elo >= 1000) return "skilled";
        if (elo >= 600)  return "rising";
        return "entry";
    }

    function _roleToString(DecentraWorkRegistry.Role role) internal pure returns (string memory) {
        if (role == DecentraWorkRegistry.Role.Freelancer) return "freelancer";
        if (role == DecentraWorkRegistry.Role.Client)     return "client";
        return "unset";
    }

    function _uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
