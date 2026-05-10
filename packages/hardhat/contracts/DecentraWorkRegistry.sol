// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface INexoraResolver {
    function setNode(bytes32 node, address owner) external;
    function clearNode(bytes32 node) external;
}

/// @title DecentraWorkRegistry
/// @notice Maps short names to wallet addresses, and stores role + bio text per address.
///         Registration is a single transaction covering name, role, and optional bio.
///         When a NexoraResolver is configured, each name is also registered as an
///         ENS-compatible node so text records resolve live from on-chain data.
contract DecentraWorkRegistry {
    // 0 = unset, 1 = freelancer, 2 = client
    enum Role { Unset, Freelancer, Client }

    mapping(string => address) private _nameToAddress;
    mapping(address => string)  private _addressToName;
    mapping(address => Role)    private _addressToRole;
    mapping(address => string)  private _addressToBio;

    /// @notice ENS resolver for nexora.eth subnames. Optional — set after deployment.
    INexoraResolver public resolver;

    /// @notice namehash("nexora.eth") — set by owner after deployment.
    bytes32 public nexoraEthNode;

    address public owner;

    event NameRegistered(string indexed name, address indexed owner, Role role);
    event NameReleased(string indexed name, address indexed owner);
    event BioUpdated(address indexed owner);
    event ResolverSet(address resolver, bytes32 nexoraEthNode);

    error NameTaken();
    error AddressAlreadyHasName();
    error NotNameOwner();
    error InvalidName();
    error InvalidRole();
    error BioTooLong();
    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Owner config ──────────────────────────────────────────────────────────

    /// @notice Set the ENS resolver and the pre-computed namehash of "nexora.eth".
    ///         Call this after deploying NexoraResolver.
    function setResolver(address _resolver, bytes32 _nexoraEthNode) external onlyOwner {
        resolver = INexoraResolver(_resolver);
        nexoraEthNode = _nexoraEthNode;
        emit ResolverSet(_resolver, _nexoraEthNode);
    }

    // ── Core actions ──────────────────────────────────────────────────────────

    /// @notice Register name + role + optional bio in a single transaction.
    /// @param name  Lowercase alphanumeric handle (3-32 chars, hyphens allowed).
    /// @param role  1 = Freelancer, 2 = Client.
    /// @param bio   Profile bio text (max 600 chars). Pass "" to skip.
    function register(string calldata name, Role role, string calldata bio) external {
        _validateName(name);
        if (role == Role.Unset) revert InvalidRole();
        if (bytes(bio).length > 600) revert BioTooLong();
        if (_nameToAddress[name] != address(0)) revert NameTaken();
        if (bytes(_addressToName[msg.sender]).length != 0) revert AddressAlreadyHasName();

        _nameToAddress[name] = msg.sender;
        _addressToName[msg.sender] = name;
        _addressToRole[msg.sender] = role;

        if (bytes(bio).length > 0) {
            _addressToBio[msg.sender] = bio;
        }

        // Register with ENS resolver if configured
        if (address(resolver) != address(0)) {
            bytes32 node = _computeNode(name);
            resolver.setNode(node, msg.sender);
        }

        emit NameRegistered(name, msg.sender, role);
    }

    /// @notice Update bio text after registration.
    function setBio(string calldata bio) external {
        if (bytes(bio).length > 600) revert BioTooLong();
        _addressToBio[msg.sender] = bio;
        emit BioUpdated(msg.sender);
    }

    /// @notice Release the caller's registered name.
    function release() external {
        string memory name = _addressToName[msg.sender];
        if (bytes(name).length == 0) revert NotNameOwner();

        // Clear from ENS resolver if configured
        if (address(resolver) != address(0)) {
            bytes32 node = _computeNode(name);
            resolver.clearNode(node);
        }

        delete _nameToAddress[name];
        delete _addressToName[msg.sender];
        emit NameReleased(name, msg.sender);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function isAvailable(string calldata name) external view returns (bool) {
        return _nameToAddress[name] == address(0);
    }

    function getAddress(string calldata name) external view returns (address) {
        return _nameToAddress[name];
    }

    function getName(address _owner) external view returns (string memory) {
        return _addressToName[_owner];
    }

    function getRole(address _owner) external view returns (Role) {
        return _addressToRole[_owner];
    }

    function getBio(address _owner) external view returns (string memory) {
        return _addressToBio[_owner];
    }

    /// @notice Returns the ENS node (namehash) for a given subname label.
    function getNode(string calldata name) external view returns (bytes32) {
        return _computeNode(name);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    /// @notice Compute namehash("name.nexora.eth") from the label.
    ///         namehash(label.nexora.eth) = keccak256(nexoraEthNode || keccak256(label))
    function _computeNode(string memory name) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(nexoraEthNode, keccak256(bytes(name))));
    }

    function _validateName(string calldata name) internal pure {
        bytes memory b = bytes(name);
        uint256 len = b.length;
        if (len < 3 || len > 32) revert InvalidName();
        if (b[0] == "-" || b[len - 1] == "-") revert InvalidName();
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) ||
                      (c >= 0x30 && c <= 0x39) ||
                      (c == 0x2d);
            if (!ok) revert InvalidName();
        }
    }
}
