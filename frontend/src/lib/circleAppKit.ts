import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"
import { FEE_RECIPIENT, KIT_KEY } from "./circleConfig"

export async function getAppKit() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No wallet provider found")
  }

  const adapter = await createViemAdapterFromProvider({
    provider: (window as any).ethereum,
  })

  const kit = new AppKit()
  return { kit, adapter }
}

export { FEE_RECIPIENT, KIT_KEY }