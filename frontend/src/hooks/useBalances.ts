// hooks/useBalances.ts
import { useAccount, useReadContract } from "wagmi"
import { ASSETS } from "../lib/assets"

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

export function useBalances() {
  const { address } = useAccount()

  const { data: usdcBal, refetch: refetchUsdc } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })
  const { data: eurcBal, refetch: refetchEurc } = useReadContract({
    address: ASSETS.EURC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })
  const { data: cirbtcBal, refetch: refetchCirbtc } = useReadContract({
    address: ASSETS.CIRBTC.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })

  const refetchAll = () => {
    refetchUsdc()
    refetchEurc()
    refetchCirbtc()
  }

  return {
    usdcBal,
    eurcBal,
    cirbtcBal,
    refetchAll,
  }
}