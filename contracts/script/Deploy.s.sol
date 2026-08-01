// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {LendingPool} from "../src/LendingPool.sol";

contract DeployLendingPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        uint256 baseRatePerYear     = 0.02e18;   // 2%   // 5%
        uint256 slope1PerYear       = 0.05e18;   // 5%   // 8%
        uint256 slope2PerYear       = 0.80e18;   // 80%   // 100%
        uint256 optimalUtilization  = 0.80e18;   // 80%
        uint256 reserveFactor       = 0.10e18;   // 10%
        bool    complianceEnabled   = true;

        vm.startBroadcast(deployerPrivateKey);

        LendingPool pool = new LendingPool(
            usdcAddress,
            baseRatePerYear,
            slope1PerYear,
            slope2PerYear,
            optimalUtilization,
            reserveFactor,
            complianceEnabled
        );

        vm.stopBroadcast();

        console.log("=================================");
        console.log("LendingPool deployed at:", address(pool));
        console.log("USDC asset:", usdcAddress);
        console.log("=================================");
    }
}