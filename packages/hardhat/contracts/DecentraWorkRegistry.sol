
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title DecentraWorkRegistry
/// @notice Maps short names to wallet addresses, and stores role + bio text per address.
///         Registration is a single transaction covering name, role, and optional bio.
contract DecentraWorkRegistry {
    // 0 = unset, 1 = freelancer, 2 = client
    enum Role { Unset, Freelancer, Client }

    mapping(string => address) private _nameToAddress;
    mapping(address => string) private _addressToName;
    mapping(address => Role) private _addressToRole;
    mapping(address => string) private _addressToBio;

    event NameRegistered(string indexed name, address indexed owner, Role role);
    event NameReleased(string indexed name, address indexed owner);
    event BioUpdated(address indexed owner);

    error NameTaken();
    error AddressAlreadyHasName();
    error NotNameOwner();
    error InvalidName();
    error InvalidRole();
    error BioTooLong();

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

        emit NameRegistered(name, msg.sender, role);
    }

    /// @notice Update bio text after registration (one-time gas fee per update).
    function setBio(string calldata bio) external {
        if (bytes(bio).length > 600) revert BioTooLong();
        _addressToBio[msg.sender] = bio;
        emit BioUpdated(msg.sender);
    }

    /// @notice Release the caller's registered name.
    function release() external {
        string memory name = _addressToName[msg.sender];
        if (bytes(name).length == 0) revert NotNameOwner();
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

    function getName(address owner) external view returns (string memory) {
        return _addressToName[owner];
    }

    function getRole(address owner) external view returns (Role) {
        return _addressToRole[owner];
    }

    function getBio(address owner) external view returns (string memory) {
        return _addressToBio[owner];
    }

    // ── Internal ─────────────────────────────────────────────────────────────

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
