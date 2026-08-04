import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"

export const FEE_RECIPIENT = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

export async function getAppKit() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No browser wallet found. Open MetaMask.")
  }
  await (window as any).ethereum.request({ method: "eth_requestAccounts" }).catch(() => {
    throw new Error("Wallet connection rejected")
  })
  const adapter = await createViemAdapterFromProvider({
    provider: (window as any).ethereum,
  })
  return { kit: new AppKit(), adapter }
}

export function resetAppKit() {}
