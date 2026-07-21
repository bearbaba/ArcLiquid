// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {LendingPool} from "../src/LendingPool.sol";

contract DeployLendingPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        LendingPool pool = new LendingPool(usdcAddress);
        vm.stopBroadcast();

        console.log("LendingPool deployed at:", address(pool));
    }
}
