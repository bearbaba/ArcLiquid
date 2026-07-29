// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SimplePriceOracle} from "../src/oracle/SimplePriceOracle.sol";

contract OracleTest is Test {
    SimplePriceOracle oracle;
    address token = address(0x1234);
    address stranger = address(0xBAD);

    function setUp() public {
        oracle = new SimplePriceOracle();
    }

    function test_default_price_is_one_usd() public view {
        assertEq(oracle.getPrice(token), 1e18);
    }

    function test_owner_sets_price() public {
        oracle.setPrice(token, 2e18);
        assertEq(oracle.getPrice(token), 2e18);
    }

    function test_non_owner_cannot_set_price() public {
        vm.prank(stranger);
        vm.expectRevert();
        oracle.setPrice(token, 3e18);
    }
}
