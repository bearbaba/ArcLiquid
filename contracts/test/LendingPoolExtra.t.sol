// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {LendingPool} from "../src/LendingPool.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MOCK") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Extra cases — does not replace LendingPool.t.sol
contract LendingPoolExtraTest is Test {
    MockToken asset;
    LendingPool pool;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    uint256 constant WAD = 1e18;

    function setUp() public {
        asset = new MockToken();
        pool = new LendingPool(
            address(asset),
            (2 * WAD) / 100,
            (5 * WAD) / 100,
            (75 * WAD) / 100,
            (80 * WAD) / 100,
            (10 * WAD) / 100,
            false
        );
        asset.mint(alice, 1_000_000e18);
        asset.mint(bob, 1_000_000e18);
        vm.prank(alice);
        asset.approve(address(pool), type(uint256).max);
        vm.prank(bob);
        asset.approve(address(pool), type(uint256).max);
    }

    function test_withdraw_partial() public {
        vm.prank(alice);
        pool.supply(1000e18);
        vm.prank(alice);
        pool.withdraw(400e18);
        assertEq(asset.balanceOf(alice), 1_000_000e18 - 1000e18 + 400e18);
    }

    function test_zero_supply_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        pool.supply(0);
    }

    function test_health_max_when_no_debt() public {
        vm.prank(alice);
        pool.supply(100e18);
        assertEq(pool.healthFactor(alice), type(uint256).max);
    }
}
