// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LendingPool is Ownable {
    IERC20 public immutable USDC;
    uint256 public constant DECIMALS = 6;

    mapping(address => uint256) public supplied;
    mapping(address => uint256) public borrowed;
    mapping(address => bool) public isCompliant;

    uint256 public totalSupplied;
    uint256 public totalBorrowed;
    uint256 public lastAccrualTimestamp;

    uint256 public baseBorrowRatePerYear = 5e16; // 5%
    uint256 public slope = 2e17; // 20% slope

    event Supplied(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event ComplianceEnabled(address indexed user);

    constructor(address _usdc) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        lastAccrualTimestamp = block.timestamp;
    }

    function accrueInterest() internal {
        uint256 timeElapsed = block.timestamp - lastAccrualTimestamp;
        if (timeElapsed == 0 || totalBorrowed == 0 || totalSupplied == 0) {
            lastAccrualTimestamp = block.timestamp;
            return;
        }

        uint256 utilization = (totalBorrowed * 1e18) / totalSupplied;
        uint256 borrowRatePerYear = baseBorrowRatePerYear + (slope * utilization) / 1e18;
        if (borrowRatePerYear > 1e18) borrowRatePerYear = 1e18;

        uint256 interest = (totalBorrowed * borrowRatePerYear * timeElapsed) / (365 days * 1e18);
        
        totalBorrowed += interest;
        uint256 supplierYield = interest * 80 / 100;
        totalSupplied += supplierYield;

        lastAccrualTimestamp = block.timestamp;
    }

    function supply(uint256 amount) external {
        accrueInterest();
        require(amount > 0, "Amount must be greater than 0");
        require(USDC.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        supplied[msg.sender] += amount;
        totalSupplied += amount;
        emit Supplied(msg.sender, amount);
    }

    function borrow(uint256 amount) external {
        accrueInterest();
        require(isCompliant[msg.sender], "Please enable compliance first");
        require(amount > 0, "Amount must be greater than 0");

        uint256 available = totalSupplied > totalBorrowed ? totalSupplied - totalBorrowed : 0;
        require(amount <= available, "Insufficient liquidity");

        borrowed[msg.sender] += amount;
        totalBorrowed += amount;
        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");

        emit Borrowed(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        accrueInterest();
        require(amount > 0, "Amount must be greater than 0");

        uint256 debt = borrowed[msg.sender];
        uint256 repayAmount = amount > debt ? debt : amount;

        require(USDC.transferFrom(msg.sender, address(this), repayAmount), "USDC transfer failed");
        borrowed[msg.sender] -= repayAmount;
        totalBorrowed -= repayAmount;

        emit Repaid(msg.sender, repayAmount);
    }

    function withdraw(uint256 amount) external {
        accrueInterest();
        require(amount > 0, "Amount must be greater than 0");

        uint256 userBal = supplied[msg.sender];
        uint256 wdAmount = amount > userBal ? userBal : amount;

        supplied[msg.sender] -= wdAmount;
        totalSupplied -= wdAmount;
        require(USDC.transfer(msg.sender, wdAmount), "USDC transfer failed");

        emit Withdrawn(msg.sender, wdAmount);
    }

    function enableCompliance() external {
        isCompliant[msg.sender] = true;
        emit ComplianceEnabled(msg.sender);
    }

    function getUtilization() public view returns (uint256) {
        if (totalSupplied == 0) return 0;
        return (totalBorrowed * 10000) / totalSupplied;
    }

    function getBorrowAPY() public view returns (uint256) {
        uint256 util = getUtilization();
        return 500 + (util * 20) / 100;
    }

    function getSupplyAPY() public view returns (uint256) {
        if (totalSupplied == 0) return 0;
        return (getBorrowAPY() * getUtilization() * 80) / 1_000_000;
    }

    function getPoolStats() external view returns (
        uint256 _totalSupplied,
        uint256 _totalBorrowed,
        uint256 _utilization,
        uint256 _borrowAPY,
        uint256 _supplyAPY
    ) {
        _totalSupplied = totalSupplied;
        _totalBorrowed = totalBorrowed;
        _utilization = getUtilization();
        _borrowAPY = getBorrowAPY();
        _supplyAPY = getSupplyAPY();
    }
}
