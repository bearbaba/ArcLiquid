// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title LendingPool
/// @notice Single-asset (USDC) over-collateralized money market with
///         index-based interest accrual, dynamic utilization rate,
///         health-factor based liquidation, and an optional compliance gate.
/// @dev All internal accounting uses 1e18 fixed point ("RAY-lite") unless noted.
contract LendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant WAD = 1e18;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant LTV_BPS = 7_500; // 75.00%
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 7_500;
    uint256 public constant LIQUIDATION_BONUS_BPS = 500; // 5.00%
    uint256 public constant CLOSE_FACTOR_BPS = 5_000; // 50.00%
    uint256 private constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable asset;
    bool public complianceEnabled;
    mapping(address => bool) public isCompliant;

    uint256 public baseRatePerYear;
    uint256 public slope1PerYear;
    uint256 public slope2PerYear;
    uint256 public optimalUtilization;
    uint256 public reserveFactor;

    uint256 public supplyIndex = WAD;
    uint256 public borrowIndex = WAD;
    uint256 public lastAccrualTimestamp;
    uint256 public totalScaledSupply;
    uint256 public totalScaledDebt;
    uint256 public totalReserves;

    struct SupplierAccount {
        uint256 scaledSupply;
        uint256 collateral;
    }

    struct BorrowerAccount {
        uint256 scaledDebt;
    }

    mapping(address => SupplierAccount) public suppliers;
    mapping(address => BorrowerAccount) public borrowers;

    event Supply(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed payer, address indexed borrower, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed borrower, uint256 repaidDebt, uint256 seizedCollateral);
    event InterestAccrued(uint256 supplyIndex, uint256 borrowIndex, uint256 timestamp);
    event ComplianceModeUpdated(bool enabled);
    event ComplianceStatusUpdated(address indexed user, bool status);
    event RateModelUpdated(uint256 baseRatePerYear, uint256 slope1PerYear, uint256 slope2PerYear, uint256 optimalUtilization);
    event ReservesWithdrawn(address indexed to, uint256 amount);

    error ZeroAmount();
    error InsufficientLiquidity();
    error InsufficientCollateral();
    error NotCompliant(address user);
    error HealthFactorTooHigh();
    error HealthFactorTooLow();
    error RepayExceedsCloseFactor();
    error NothingToLiquidate();

    modifier onlyCompliant(address user) {
        if (complianceEnabled && !isCompliant[user]) revert NotCompliant(user);
        _;
    }

    modifier accrue() {
        _accrueInterest();
        _;
    }

    constructor(
        address _asset,
        uint256 _baseRatePerYear,
        uint256 _slope1PerYear,
        uint256 _slope2PerYear,
        uint256 _optimalUtilization,
        uint256 _reserveFactor,
        bool _complianceEnabled
    ) Ownable(msg.sender) {
        require(_asset != address(0), "asset=0");
        require(_optimalUtilization <= WAD, "optimal>1");
        require(_reserveFactor <= WAD, "reserve>1");

        asset = IERC20(_asset);
        baseRatePerYear = _baseRatePerYear;
        slope1PerYear = _slope1PerYear;
        slope2PerYear = _slope2PerYear;
        optimalUtilization = _optimalUtilization;
        reserveFactor = _reserveFactor;
        complianceEnabled = _complianceEnabled;
        lastAccrualTimestamp = block.timestamp;
    }

    function _accrueInterest() internal {
        uint256 elapsed = block.timestamp - lastAccrualTimestamp;
        if (elapsed == 0) return;

        uint256 totalDebt = _totalDebt();
        uint256 totalSupply_ = _totalSupply();

        if (totalDebt == 0 || totalSupply_ == 0) {
            lastAccrualTimestamp = block.timestamp;
            return;
        }

        uint256 borrowRatePerYear = _getBorrowRatePerYear(totalDebt, totalSupply_);
        uint256 interestFactor = (borrowRatePerYear * elapsed) / SECONDS_PER_YEAR;
        uint256 interestAccrued = (totalDebt * interestFactor) / WAD;

        borrowIndex = borrowIndex + (borrowIndex * interestFactor) / WAD;

        uint256 reservePortion = (interestAccrued * reserveFactor) / WAD;
        uint256 supplierPortion = interestAccrued - reservePortion;

        totalReserves += reservePortion;

        if (totalSupply_ > 0) {
            uint256 supplyGrowthFactor = (supplierPortion * WAD) / totalSupply_;
            supplyIndex = supplyIndex + (supplyIndex * supplyGrowthFactor) / WAD;
        }

        lastAccrualTimestamp = block.timestamp;
        emit InterestAccrued(supplyIndex, borrowIndex, block.timestamp);
    }

    function _getBorrowRatePerYear(uint256 totalDebt, uint256 totalSupply_) public view returns (uint256) {
        if (totalSupply_ == 0) return baseRatePerYear;
        uint256 utilization = (totalDebt * WAD) / totalSupply_;

        if (utilization <= optimalUtilization) {
            return baseRatePerYear + (slope1PerYear * utilization) / optimalUtilization;
        }

        uint256 excessUtilization = utilization - optimalUtilization;
        uint256 maxExcess = WAD - optimalUtilization;
        return baseRatePerYear + slope1PerYear + (slope2PerYear * excessUtilization) / maxExcess;
    }

    function getBorrowRatePerYear() external view returns (uint256) {
        return _getBorrowRatePerYear(_totalDebt(), _totalSupply());
    }

    function getSupplyRatePerYear() external view returns (uint256) {
        uint256 totalDebt = _totalDebt();
        uint256 totalSupply_ = _totalSupply();
        if (totalSupply_ == 0) return 0;
        uint256 borrowRate = _getBorrowRatePerYear(totalDebt, totalSupply_);
        uint256 utilization = (totalDebt * WAD) / totalSupply_;
        uint256 grossSupplyRate = (borrowRate * utilization) / WAD;
        return (grossSupplyRate * (WAD - reserveFactor)) / WAD;
    }

    function supply(uint256 amount) external nonReentrant accrue onlyCompliant(msg.sender) {
        if (amount == 0) revert ZeroAmount();

        asset.safeTransferFrom(msg.sender, address(this), amount);

        uint256 scaled = (amount * WAD) / supplyIndex;
        suppliers[msg.sender].scaledSupply += scaled;
        suppliers[msg.sender].collateral += amount;
        totalScaledSupply += scaled;

        emit Supply(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant accrue {
        if (amount == 0) revert ZeroAmount();

        SupplierAccount storage account = suppliers[msg.sender];
        uint256 currentBalance = (account.scaledSupply * supplyIndex) / WAD;
        if (amount > currentBalance) revert InsufficientLiquidity();
        if (asset.balanceOf(address(this)) < amount) revert InsufficientLiquidity();

        uint256 scaledAmount = (amount * WAD) / supplyIndex;
        account.scaledSupply -= scaledAmount;
        account.collateral = account.collateral > amount ? account.collateral - amount : 0;
        totalScaledSupply -= scaledAmount;

        if (_healthFactor(msg.sender) < WAD && borrowers[msg.sender].scaledDebt > 0) {
            revert HealthFactorTooLow();
        }

        asset.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    function borrow(uint256 amount) external nonReentrant accrue onlyCompliant(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        if (asset.balanceOf(address(this)) < amount) revert InsufficientLiquidity();

        uint256 scaled = (amount * WAD) / borrowIndex;
        borrowers[msg.sender].scaledDebt += scaled;
        totalScaledDebt += scaled;

        if (_healthFactor(msg.sender) < WAD) revert InsufficientCollateral();

        asset.safeTransfer(msg.sender, amount);
        emit Borrow(msg.sender, amount);
    }

    function repay(address borrowerAddr, uint256 amount) external nonReentrant accrue {
        if (amount == 0) revert ZeroAmount();

        BorrowerAccount storage account = borrowers[borrowerAddr];
        uint256 currentDebt = (account.scaledDebt * borrowIndex) / WAD;
        uint256 repayAmount = amount > currentDebt ? currentDebt : amount;
        if (repayAmount == 0) revert ZeroAmount();

        asset.safeTransferFrom(msg.sender, address(this), repayAmount);

        uint256 scaledRepay = (repayAmount * WAD) / borrowIndex;
        scaledRepay = scaledRepay > account.scaledDebt ? account.scaledDebt : scaledRepay;
        account.scaledDebt -= scaledRepay;
        totalScaledDebt -= scaledRepay;

        emit Repay(msg.sender, borrowerAddr, repayAmount);
    }

    function liquidate(address borrowerAddr, uint256 repayAmount)
        external
        nonReentrant
        accrue
        onlyCompliant(msg.sender)
    {
        if (repayAmount == 0) revert ZeroAmount();

        uint256 healthFactor = _healthFactor(borrowerAddr);
        if (healthFactor >= WAD) revert HealthFactorTooHigh();

        BorrowerAccount storage account = borrowers[borrowerAddr];
        uint256 currentDebt = (account.scaledDebt * borrowIndex) / WAD;
        if (currentDebt == 0) revert NothingToLiquidate();

        uint256 maxRepay = (currentDebt * CLOSE_FACTOR_BPS) / BPS_DENOMINATOR;
        uint256 actualRepay = repayAmount > maxRepay ? maxRepay : repayAmount;
        if (actualRepay > currentDebt) revert RepayExceedsCloseFactor();

        uint256 seizeAmount = actualRepay + (actualRepay * LIQUIDATION_BONUS_BPS) / BPS_DENOMINATOR;

        SupplierAccount storage collateralAccount = suppliers[borrowerAddr];
        uint256 currentCollateralBalance = (collateralAccount.scaledSupply * supplyIndex) / WAD;
        if (seizeAmount > currentCollateralBalance) {
            seizeAmount = currentCollateralBalance;
        }

        asset.safeTransferFrom(msg.sender, address(this), actualRepay);

        uint256 scaledRepay = (actualRepay * WAD) / borrowIndex;
        scaledRepay = scaledRepay > account.scaledDebt ? account.scaledDebt : scaledRepay;
        account.scaledDebt -= scaledRepay;
        totalScaledDebt -= scaledRepay;

        uint256 scaledSeize = (seizeAmount * WAD) / supplyIndex;
        scaledSeize = scaledSeize > collateralAccount.scaledSupply ? collateralAccount.scaledSupply : scaledSeize;
        collateralAccount.scaledSupply -= scaledSeize;
        collateralAccount.collateral = collateralAccount.collateral > seizeAmount
            ? collateralAccount.collateral - seizeAmount
            : 0;

        totalScaledSupply -= scaledSeize;
        asset.safeTransfer(msg.sender, seizeAmount);

        emit Liquidate(msg.sender, borrowerAddr, actualRepay, seizeAmount);
    }

    function _healthFactor(address user) internal view returns (uint256) {
        uint256 collateralValue = (suppliers[user].scaledSupply * supplyIndex) / WAD;
        uint256 debtValue = (borrowers[user].scaledDebt * borrowIndex) / WAD;

        if (debtValue == 0) return type(uint256).max;

        uint256 adjustedCollateral = (collateralValue * LIQUIDATION_THRESHOLD_BPS) / BPS_DENOMINATOR;
        return (adjustedCollateral * WAD) / debtValue;
    }

    function healthFactor(address user) external view returns (uint256) {
        return _healthFactor(user);
    }

    function maxBorrowable(address user) external view returns (uint256) {
        uint256 collateralValue = (suppliers[user].scaledSupply * supplyIndex) / WAD;
        uint256 debtValue = (borrowers[user].scaledDebt * borrowIndex) / WAD;

        uint256 borrowCapacity = (collateralValue * LTV_BPS) / BPS_DENOMINATOR;
        if (borrowCapacity <= debtValue) return 0;
        return borrowCapacity - debtValue;
    }

    function supplyBalanceOf(address user) external view returns (uint256) {
        return (suppliers[user].scaledSupply * supplyIndex) / WAD;
    }

    function debtBalanceOf(address user) external view returns (uint256) {
        return (borrowers[user].scaledDebt * borrowIndex) / WAD;
    }

    function _totalSupply() internal view returns (uint256) {
        return (totalScaledSupply * supplyIndex) / WAD;
    }

    function _totalDebt() internal view returns (uint256) {
        return (totalScaledDebt * borrowIndex) / WAD;
    }

    function totalSupplyUnderlying() external view returns (uint256) {
        return _totalSupply();
    }

    function totalDebtUnderlying() external view returns (uint256) {
        return _totalDebt();
    }

    function utilizationRate() external view returns (uint256) {
        uint256 s = _totalSupply();
        if (s == 0) return 0;
        return (_totalDebt() * WAD) / s;
    }

    function setComplianceEnabled(bool enabled) external onlyOwner {
        complianceEnabled = enabled;
        emit ComplianceModeUpdated(enabled);
    }

    function setCompliance(address user, bool status) external onlyOwner {
        isCompliant[user] = status;
        emit ComplianceStatusUpdated(user, status);
    }

    function setRateModel(
        uint256 _baseRatePerYear,
        uint256 _slope1PerYear,
        uint256 _slope2PerYear,
        uint256 _optimalUtilization
    ) external onlyOwner accrue {
        require(_optimalUtilization <= WAD, "optimal>1");
        baseRatePerYear = _baseRatePerYear;
        slope1PerYear = _slope1PerYear;
        slope2PerYear = _slope2PerYear;
        optimalUtilization = _optimalUtilization;
        emit RateModelUpdated(_baseRatePerYear, _slope1PerYear, _slope2PerYear, _optimalUtilization);
    }

    function setReserveFactor(uint256 _reserveFactor) external onlyOwner accrue {
        require(_reserveFactor <= WAD, "reserve>1");
        reserveFactor = _reserveFactor;
    }

    function withdrawReserves(address to, uint256 amount) external onlyOwner nonReentrant accrue {
        require(amount <= totalReserves, "exceeds reserves");
        require(asset.balanceOf(address(this)) >= amount, "insufficient liquidity");
        totalReserves -= amount;
        asset.safeTransfer(to, amount);
        emit ReservesWithdrawn(to, amount);
    }
}