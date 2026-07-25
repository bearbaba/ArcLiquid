// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";

contract DeployPools is Script {
    address constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    address constant CIRBTC = 0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF;

    // Same rate model style as USDC pool (WAD = 1e18)
    uint256 constant BASE = 0.02e18;       // 2%
    uint256 constant SLOPE1 = 0.05e18;     // 5%
    uint256 constant SLOPE2 = 0.80e18;     // 80%
    uint256 constant OPTIMAL = 0.80e18;    // 80%
    uint256 constant RESERVE = 0.10e18;    // 10%
    bool constant COMPLIANCE = false;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        LendingPool eurcPool = new LendingPool(
            EURC, BASE, SLOPE1, SLOPE2, OPTIMAL, RESERVE, COMPLIANCE
        );
        console.log("EURC LendingPool:", address(eurcPool));

        LendingPool cirbtcPool = new LendingPool(
            CIRBTC, BASE, SLOPE1, SLOPE2, OPTIMAL, RESERVE, COMPLIANCE
        );
        console.log("cirBTC LendingPool:", address(cirbtcPool));

        vm.stopBroadcast();
    }
}
