// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SimpleStableSwap} from "../src/SimpleStableSwap.sol";

contract DeploySwap is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        SimpleStableSwap pool = new SimpleStableSwap(USDC, EURC);
        console.log("SimpleStableSwap:", address(pool));
        vm.stopBroadcast();
    }
}
