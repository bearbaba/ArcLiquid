import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"
import { createPublicClient, http } from "viem"

export const FEE_RECIPIENT = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

const RPC_BY_CHAIN: Record<string, string> = {
  Arc_Testnet: "https://rpc.blockdaemon.testnet.arc.network",
  Ethereum_Sepolia: "https://rpc.sepolia.org",
  Base_Sepolia: "https://sepolia.base.org",
}

export async function getAppKit() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No browser wallet found. Open MetaMask.")
  }
  await (window as any).ethereum.request({ method: "eth_requestAccounts" }).catch(() => {
    throw new Error("Wallet connection rejected")
  })

  const adapter = await createViemAdapterFromProvider({
    provider: (window as any).ethereum,
    getPublicClient: ({ chain }: any) => {
      const name = chain?.name || "Arc_Testnet"
      const rpcUrl = RPC_BY_CHAIN[name] || RPC_BY_CHAIN.Arc_Testnet
      return createPublicClient({
        chain,
        transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }),
      })
    },
  } as any)

  return { kit: new AppKit(), adapter }
}

export function resetAppKit() {}
