// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleStableSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    uint256 public constant FEE_BPS = 4;
    uint256 public constant BPS = 10_000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 shares);
    event Swap(address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address _token0, address _token1) Ownable(msg.sender) {
        require(_token0 != address(0) && _token1 != address(0), "zero");
        require(_token0 != _token1, "same");
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external nonReentrant returns (uint256 shares) {
        require(amount0 > 0 && amount1 > 0, "amount");

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        if (totalShares == 0) {
            shares = _sqrt(amount0 * amount1);
            require(shares > MINIMUM_LIQUIDITY, "min liquidity");
            sharesOf[address(0)] += MINIMUM_LIQUIDITY;
            totalShares += MINIMUM_LIQUIDITY;
            shares -= MINIMUM_LIQUIDITY;
        } else {
            uint256 share0 = (amount0 * totalShares) / reserve0;
            uint256 share1 = (amount1 * totalShares) / reserve1;
            shares = share0 < share1 ? share0 : share1;
            require(shares > 0, "shares");
        }

        sharesOf[msg.sender] += shares;
        totalShares += shares;
        reserve0 += amount0;
        reserve1 += amount1;

        emit LiquidityAdded(msg.sender, amount0, amount1, shares);
    }

    function removeLiquidity(uint256 sharesToRemove) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(sharesToRemove > 0, "shares");
        require(sharesOf[msg.sender] >= sharesToRemove, "insufficient");

        amount0 = (sharesToRemove * reserve0) / totalShares;
        amount1 = (sharesToRemove * reserve1) / totalShares;
        require(amount0 > 0 && amount1 > 0, "amount");

        sharesOf[msg.sender] -= sharesToRemove;
        totalShares -= sharesToRemove;
        reserve0 -= amount0;
        reserve1 -= amount1;

        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, sharesToRemove);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0, "in");
        require(reserveIn > 0 && reserveOut > 0, "liquidity");
        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * BPS + amountInWithFee;
        return numerator / denominator;
    }

    function quote(address tokenIn, uint256 amountIn) external view returns (uint256) {
        if (tokenIn == address(token0)) return getAmountOut(amountIn, reserve0, reserve1);
        if (tokenIn == address(token1)) return getAmountOut(amountIn, reserve1, reserve0);
        revert("token");
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "in");
        bool is0 = tokenIn == address(token0);
        require(is0 || tokenIn == address(token1), "token");

        IERC20 tin = is0 ? token0 : token1;
        IERC20 tout = is0 ? token1 : token0;
        uint256 rin = is0 ? reserve0 : reserve1;
        uint256 rout = is0 ? reserve1 : reserve0;

        amountOut = getAmountOut(amountIn, rin, rout);
        require(amountOut >= minAmountOut, "slippage");

        tin.safeTransferFrom(msg.sender, address(this), amountIn);
        tout.safeTransfer(msg.sender, amountOut);

        if (is0) {
            reserve0 = rin + amountIn;
            reserve1 = rout - amountOut;
        } else {
            reserve1 = rin + amountIn;
            reserve0 = rout - amountOut;
        }

        emit Swap(msg.sender, tokenIn, amountIn, address(tout), amountOut);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function getUserShares(address user) external view returns (uint256) {
        return sharesOf[user];
    }

    function getSharePercentage(address user) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (sharesOf[user] * 10_000) / totalShares;
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}