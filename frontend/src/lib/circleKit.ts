export const SWAP_POOL = '0x4ff36f84A850A5A9DB826fA4Cd49E21128503CE8' as const

export const swapAbi = [
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

export async function getSwapQuote(params: {
  tokenIn: 'USDC' | 'EURC'
  amountIn: string
}) {
  const amount = Number(params.amountIn || 0)
  if (!amount) return '0'
  return (amount * 0.9996).toFixed(6)
}

export async function ensureArcRpc() {
  const provider = (window as any).ethereum
  if (!provider) throw new Error('No wallet')

  const chainId = '0x4cf1a2'

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    })
  } catch (e: any) {
    if (e.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: 'Arc Testnet',
            nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
            rpcUrls: ['https://5042002.rpc.thirdweb.com'],
            blockExplorerUrls: ['https://testnet.arcscan.app'],
          },
        ],
      })
    } else {
      throw e
    }
  }
}
