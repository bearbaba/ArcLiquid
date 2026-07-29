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

contract LendingPoolTest is Test {
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

    function test_supply() public {
        vm.prank(alice);
        pool.supply(1000e18);
        assertGt(asset.balanceOf(address(pool)), 0);
    }

    function test_borrow_ok() public {
        vm.prank(alice);
        pool.supply(1000e18);
        vm.prank(alice);
        pool.borrow(500e18);
        assertGe(pool.healthFactor(alice), WAD);
    }

    function test_borrow_too_much_reverts() public {
        vm.prank(alice);
        pool.supply(1000e18);
        vm.prank(alice);
        vm.expectRevert();
        pool.borrow(900e18);
    }

    function test_repay() public {
        vm.prank(alice);
        pool.supply(1000e18);
        vm.prank(alice);
        pool.borrow(400e18);
        vm.prank(alice);
        pool.repay(400e18);
    }
}
