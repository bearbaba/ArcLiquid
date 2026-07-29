// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    /// @return price asset/USD in 1e18 (1 USD = 1e18)
    function getPrice(address asset) external view returns (uint256 price);
}
