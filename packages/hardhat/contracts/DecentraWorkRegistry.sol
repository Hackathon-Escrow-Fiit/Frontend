// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title DecentraWorkRegistry
/// @notice Maps short names (e.g. "alice") to wallet addresses for the DecentraWork platform.
///         Each address may hold exactly one name; each name is owned by exactly one address.
contract DecentraWorkRegistry {
    mapping(string => address) private _nameToAddress;
    mapping(address => string) private _addressToName;

    event NameRegistered(string indexed name, address indexed owner);
    event NameReleased(string indexed name, address indexed owner);

    error NameTaken();
    error AddressAlreadyHasName();
    error NotNameOwner();
    error InvalidName();

    /// @notice Register `name` for the caller. Reverts if the name or address is already registered.
    function register(string calldata name) external {
        _validateName(name);

        if (_nameToAddress[name] != address(0)) revert NameTaken();
        if (bytes(_addressToName[msg.sender]).length != 0) revert AddressAlreadyHasName();

        _nameToAddress[name] = msg.sender;
        _addressToName[msg.sender] = name;

        emit NameRegistered(name, msg.sender);
    }

    /// @notice Release the caller's currently registered name.
    function release() external {
        string memory name = _addressToName[msg.sender];
        if (bytes(name).length == 0) revert NotNameOwner();

        delete _nameToAddress[name];
        delete _addressToName[msg.sender];

        emit NameReleased(name, msg.sender);
    }

    /// @notice Returns true if `name` is available to register.
    function isAvailable(string calldata name) external view returns (bool) {
        return _nameToAddress[name] == address(0);
    }

    function getAddress(string calldata name) external view returns (address) {
        return _nameToAddress[name];
    }

    function getName(address owner) external view returns (string memory) {
        return _addressToName[owner];
    }

    /// @dev Allows only lowercase alphanumeric + hyphens, 3-32 chars, no leading/trailing hyphen.
    function _validateName(string calldata name) internal pure {
        bytes memory b = bytes(name);
        uint256 len = b.length;
        if (len < 3 || len > 32) revert InvalidName();
        if (b[0] == "-" || b[len - 1] == "-") revert InvalidName();
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) || // a-z
                      (c >= 0x30 && c <= 0x39) || // 0-9
                      (c == 0x2d);                // -
            if (!ok) revert InvalidName();
        }
    }
}