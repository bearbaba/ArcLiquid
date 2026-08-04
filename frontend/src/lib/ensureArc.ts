import { toast } from "sonner"
export const ARC_CHAIN_ID = 5042002
export const ARC_CHAIN_HEX = "0x4cef52"
export async function switchToArc(opts?: { silent?: boolean }): Promise<boolean> {
  const eth = (window as any)?.ethereum
  if (!eth?.request) {
    if (!opts?.silent) toast.error("Open MetaMask and switch to Arc Testnet")
    return false
  }
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_HEX }] })
    if (!opts?.silent) toast.success("Wallet on Arc Testnet")
    return true
  } catch (e: any) {
    if (e?.code === 4902) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: ARC_CHAIN_HEX,
            chainName: "Arc Testnet",
            nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
            rpcUrls: ["https://5042002.rpc.thirdweb.com"],
            blockExplorerUrls: ["https://testnet.arcscan.app"],
          }],
        })
        return true
      } catch { return false }
    }
    return false
  }
}
export async function ensureArcChain(chainId?: number): Promise<boolean> {
  if (chainId === ARC_CHAIN_ID) return true
  const ok = await switchToArc({ silent: false })
  if (ok) toast.message("Network updated — confirm again")
  return false
}
