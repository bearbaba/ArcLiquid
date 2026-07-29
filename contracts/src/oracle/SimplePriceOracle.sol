// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPriceOracle} from "./IPriceOracle.sol";

/// @dev Testnet oracle. Owner sets prices. Default 1e18 = $1.
contract SimplePriceOracle is IPriceOracle, Ownable {
    mapping(address => uint256) public prices;

    event PriceUpdated(address indexed asset, uint256 price);

    constructor() Ownable(msg.sender) {}

    function setPrice(address asset, uint256 priceWad) external onlyOwner {
        require(priceWad > 0, "price=0");
        prices[asset] = priceWad;
        emit PriceUpdated(asset, priceWad);
    }

    function getPrice(address asset) external view returns (uint256) {
        uint256 p = prices[asset];
        return p == 0 ? 1e18 : p;
    }
}
