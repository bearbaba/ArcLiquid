import { createPublicClient, http, parseUnits, formatUnits } from 'viem'

export const SWAP_POOL = '0x30547bD3c187A1914a1F63bA593EEd437AC2f58f' as const

export const swapAbi = [
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'sharesToRemove', type: 'uint256' }],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
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
    name: 'quote',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }],
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
    name: 'totalShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
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
] as const

const publicClient = createPublicClient({
  chain: {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://5042002.rpc.thirdweb.com'] },
    },
  },
  transport: http(),
})

export async function getSwapQuote(params: {
  tokenIn: 'USDC' | 'EURC'
  amountIn: string
}) {
  try {
    const amount = Number(params.amountIn || 0)
    if (!amount) return '0'

    const tokenIn =
      params.tokenIn === 'USDC'
        ? '0x3600000000000000000000000000000000000000'
        : '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a'

    const amountIn = parseUnits(params.amountIn, 6)

    const amountOut = await publicClient.readContract({
      address: SWAP_POOL,
      abi: swapAbi,
      functionName: 'quote',
      args: [tokenIn as `0x${string}`, amountIn],
    })

    return formatUnits(amountOut as bigint, 6)
  } catch {
    return '0'
  }
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