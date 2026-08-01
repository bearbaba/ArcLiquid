import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2"

export const FEE_RECIPIENT = "0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a" as const

export async function getAppKit() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No browser wallet found")
  }

  // Luôn tạo adapter mới — tránh stale khi đổi ví / chain
  const adapter = await createViemAdapterFromProvider({
    provider: (window as any).ethereum,
  })

  const kit = new AppKit()
  return { kit, adapter }
}

export function resetAppKit() {
  // no-op (giữ API cũ nếu chỗ khác còn gọi)
}
