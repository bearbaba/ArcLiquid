// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SimpleStableSwap} from "../src/SimpleStableSwap.sol";

contract DeploySwap is Script {
    address constant USDC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    address constant EURC = 0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        SimpleStableSwap pool = new SimpleStableSwap(USDC, EURC, 0xE89C45eCaE19ff852eC1724C85F193AE12ED0C0A);
        console.log("SimpleStableSwap:", address(pool));
        vm.stopBroadcast();
    }
}
