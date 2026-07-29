// hooks/usePoolData.ts
import { useAccount, useReadContract } from "wagmi"
import { ASSETS, type AssetId } from "../lib/assets"

const poolAbi = [
  { name: "totalSupplyUnderlying", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalDebtUnderlying", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "utilizationRate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "baseRatePerYear", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "slope1PerYear", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "slope2PerYear", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "optimalUtilization", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "reserveFactor", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "supplyBalanceOf", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "debtBalanceOf", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "healthFactor", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "maxBorrowable", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "isCompliant", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "bool" }] },
] as const

export function usePoolData(assetId: AssetId) {
  const { address } = useAccount()
  const asset = ASSETS[assetId]
  const poolLive = !!asset.pool
  const poolAddr = (asset.pool || ASSETS.USDC.pool!) as `0x${string}`

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "totalSupplyUnderlying",
  })
  const { data: totalDebt, refetch: refetchTotalDebt } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "totalDebtUnderlying",
  })
  const { data: util, refetch: refetchUtil } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "utilizationRate",
  })
  const { data: baseRate } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "baseRatePerYear",
  })
  const { data: slope1 } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "slope1PerYear",
  })
  const { data: slope2 } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "slope2PerYear",
  })
  const { data: optimalUtil } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "optimalUtilization",
  })
  const { data: reserveFactor } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "reserveFactor",
  })
  const { data: userSupply, refetch: refetchUserSupply } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "supplyBalanceOf",
    args: address ? [address] : undefined,
  })
  const { data: userDebt, refetch: refetchUserDebt } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "debtBalanceOf",
    args: address ? [address] : undefined,
  })
  const { data: health, refetch: refetchHealth } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "healthFactor",
    args: address ? [address] : undefined,
  })
  const { data: maxBorrow, refetch: refetchMaxBorrow } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: "maxBorrowable",
    args: address ? [address] : undefined,
  })

  const refetchAll = () => {
    refetchTotalSupply()
    refetchTotalDebt()
    refetchUtil()
    refetchUserSupply()
    refetchUserDebt()
    refetchHealth()
    refetchMaxBorrow()
  }

  return {
    poolLive,
    poolAddr,
    totalSupply,
    totalDebt,
    util,
    baseRate,
    slope1,
    slope2,
    optimalUtil,
    reserveFactor,
    userSupply,
    userDebt,
    health,
    maxBorrow,
    refetchAll,
  }
}