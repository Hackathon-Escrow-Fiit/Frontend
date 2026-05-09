// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDecentraToken {
    function mint(address to, uint256 amount) external;
}

contract TokenSale is Ownable, ReentrancyGuard {
    IDecentraToken public token;
    uint256 public rate; // NXR per ETH (e.g. 2500 means 1 ETH = 2500 NXR)

    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 nxrAmount);
    event RateUpdated(uint256 oldRate, uint256 newRate);

    error ZeroValue();
    error ZeroRate();

    constructor(address _token, address _owner, uint256 _rate) Ownable(_owner) {
        if (_rate == 0) revert ZeroRate();
        token = IDecentraToken(_token);
        rate  = _rate;
    }

    function buy() external payable nonReentrant {
        if (msg.value == 0) revert ZeroValue();
        uint256 nxrAmount = msg.value * rate;
        token.mint(msg.sender, nxrAmount);
        emit TokensPurchased(msg.sender, msg.value, nxrAmount);
    }

    function setRate(uint256 _rate) external onlyOwner {
        if (_rate == 0) revert ZeroRate();
        emit RateUpdated(rate, _rate);
        rate = _rate;
    }

    function withdraw() external onlyOwner {
        (bool ok,) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
