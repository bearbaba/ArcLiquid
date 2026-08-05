import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"
import { createPublicClient, http } from "viem"

export const FEE_RECIPIENT = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

const RPC_BY_NAME: Record<string, string> = {
  Arc_Testnet: "https://5042002.rpc.thirdweb.com",
  Ethereum_Sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
  Base_Sepolia: "https://sepolia.base.org",
  "Ethereum Sepolia": "https://ethereum-sepolia-rpc.publicnode.com",
  "Base Sepolia": "https://sepolia.base.org",
  Sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
}

const RPC_BY_ID: Record<number, string> = {
  5042002: "https://5042002.rpc.thirdweb.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
  84532: "https://sepolia.base.org",
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
      const id = Number(chain?.id)
      const name = String(chain?.name || "")
      const rpcUrl =
        RPC_BY_ID[id] ||
        RPC_BY_NAME[name] ||
        RPC_BY_NAME[name.replace(/\s+/g, "_")] ||
        "https://ethereum-sepolia-rpc.publicnode.com"
      return createPublicClient({
        chain,
        transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }),
      })
    },
  } as any)

  return { kit: new AppKit(), adapter }
}

export function resetAppKit() {}