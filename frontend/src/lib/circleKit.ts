export const SWAP_POOLS = {
  'USDC-EURC': '0x4762112F6Ca8Be4eC38aD29838395B18b7AD0eac' as const,
  'USDC-CIRBTC': '0x2C92870dF31EDE2d4B868CbF640b3Bda54b77e93' as const,
  'EURC-CIRBTC': '0x268BF477bceF2d468D3AeBb5580c61ae70a116e0' as const,
}

export const SWAP_POOL = SWAP_POOLS['USDC-EURC']

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
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'shareAmount', type: 'uint256' }],
    outputs: [
      { type: 'uint256' },
      { type: 'uint256' },
    ],
  },
  {
    name: 'reserve0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'reserve1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getUserShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getSharePercentage',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

export async function getSwapQuote(params: {
  tokenIn: string
  amountIn: string
}) {
  const amount = Number(params.amountIn || 0)
  if (!amount) return '0'
  return (amount * 0.9996).toFixed(6)
}

export async function ensureArcRpc() {
  const provider = (window as any).ethereum
  if (!provider) throw new Error('No wallet')

  const chainId = '0x4cef52'

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
            nativeCurrency: {
              name: 'USDC',
              symbol: 'USDC',
              decimals: 18,
            },
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
