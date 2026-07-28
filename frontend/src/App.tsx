import { useState, useEffect, useMemo } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from 'wagmi'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { toast } from 'sonner'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Percent,
  RefreshCw,
  AlertTriangle,
  Shield,
  Link2,
  ArrowLeftRight,
  Plus,
  Minus,
  LayoutDashboard,
  Wallet,
  Send as SendIcon,
  Layers,
  BookOpen,
  Briefcase,
  Landmark,
  Sun,
  Moon,
} from 'lucide-react'
import { ensureArcRpc, SWAP_POOLS, swapAbi } from './lib/circleKit'
import SendPanel from './components/SendPanel'
import BridgePanel from './components/BridgePanel'
import { useTheme } from './lib/theme'
import {
  getDisplayName,
  setDisplayName as saveDisplayName,
  getPoints,
  addPoints,
  canCheckInToday,
  dailyCheckIn,
  getBoard,
  REWARDS,
  type BoardRow,
} from './lib/points'

const ARC_CHAIN_ID = 5042002
const WAD = 10n ** 18n
const FEE_BPS = 4n
const BPS = 10_000n
const TREASURY = '0xe89c45ecae19ff852ec1724c85f193ae12ed0c0a' as const

type NavPage =
  | 'dashboard'
  | 'lend'
  | 'swap'
  | 'liquidity'
  | 'portfolio'
  | 'payments'
  | 'bridge'
  | 'treasury'
  | 'profile'
  | 'guide'

type LendTab = 'supply' | 'withdraw' | 'borrow' | 'repay'
type AssetId = 'USDC' | 'EURC' | 'CIRBTC' | 'USYC'
type SwapPair = 'USDC-EURC' | 'USDC-CIRBTC' | 'EURC-CIRBTC'
type LiquidityMode = 'add' | 'remove'
type SwapToken = 'USDC' | 'EURC' | 'CIRBTC'

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'lend', label: 'Lend', icon: <Landmark size={14} /> },
  { id: 'swap', label: 'Swap', icon: <ArrowLeftRight size={14} /> },
  { id: 'liquidity', label: 'Liquidity', icon: <Layers size={14} /> },
  { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={14} /> },
  { id: 'payments', label: 'Payments', icon: <SendIcon size={14} /> },
  { id: 'bridge', label: 'Bridge', icon: <ArrowLeftRight size={14} /> },
  { id: 'treasury', label: 'Treasury', icon: <Wallet size={14} /> },
  { id: 'profile', label: 'Profile', icon: <Wallet size={14} /> },
  { id: 'guide', label: 'Guide', icon: <BookOpen size={14} /> },
]

const ASSETS: Record<
  AssetId,
  { symbol: string; name: string; address: `0x${string}`; decimals: number; pool: `0x${string}` | null }
> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
    decimals: 6,
    pool: '0x1CA2e7B022f13A546Deb665901A8EfE8d407d864',
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    decimals: 6,
    pool: '0x75EA2cFAb03B92822Be363853643E0a538Ab275C',
  },
  CIRBTC: {
    symbol: 'cirBTC',
    name: 'Circle BTC',
    address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
    decimals: 8,
    pool: '0x4455eb4351936996B71fa87425037d7f744F40A2',
  },
  USYC: {
    symbol: 'USYC',
    name: 'USYC',
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    decimals: 6,
    pool: null,
  },
}

const PAIR_CONFIG: Record<SwapPair, { token0: SwapToken; token1: SwapToken; pool: `0x${string}` }> = {
  'USDC-EURC': { token0: 'USDC', token1: 'EURC', pool: SWAP_POOLS['USDC-EURC'] },
  'USDC-CIRBTC': { token0: 'USDC', token1: 'CIRBTC', pool: SWAP_POOLS['USDC-CIRBTC'] },
  'EURC-CIRBTC': { token0: 'EURC', token1: 'CIRBTC', pool: SWAP_POOLS['EURC-CIRBTC'] },
}

const poolAbi = [
  { name: 'supply', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'borrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'repay', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'totalSupplyUnderlying', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'totalDebtUnderlying', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'utilizationRate', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'baseRatePerYear', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'slope1PerYear', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'slope2PerYear', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'optimalUtilization', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'reserveFactor', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'supplyBalanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'debtBalanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'healthFactor', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'maxBorrowable', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'isCompliant', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const

const erc20Abi = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'isBlacklisted', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const

const selectCls = "select-neutral w-28 shrink-0 rounded-xl border px-2 py-2 text-sm font-semibold"
  'w-28 shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-[var(--text)] px-2 py-2 text-sm font-semibold'

function formatAmt(v?: bigint, decimals = 6) {
  if (v === undefined || v === null) return '0.00'
  const n = Number(formatUnits(v, decimals))
  if (decimals >= 8) {
    if (n === 0) return '0.00'
    if (n < 0.0001) return n.toFixed(8)
    return n.toFixed(6)
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
}

function formatHealth(v?: bigint) {
  if (!v || v > 1000n * 10n ** 18n) return '∞'
  return (Number(v) / 1e18).toFixed(2)
}

function formatApy(rate: bigint) {
  return (Number(rate) / 1e16).toFixed(2) + '%'
}

function formatUtil(util: bigint) {
  return (Number(util) / 1e16).toFixed(2) + '%'
}

function formatSharePct(bps?: bigint) {
  if (!bps) return '0.00%'
  return (Number(bps) / 100).toFixed(2) + '%'
}

function rpcHint(msg: string) {
  if (/rate limit/i.test(msg)) return 'RPC rate limited. Switch MetaMask Arc RPC and retry.'
  return msg
}

function findPair(tokenA: SwapToken, tokenB: SwapToken): SwapPair | null {
  const key1 = `${tokenA}-${tokenB}` as SwapPair
  const key2 = `${tokenB}-${tokenA}` as SwapPair
  if (PAIR_CONFIG[key1]) return key1
  if (PAIR_CONFIG[key2]) return key2
  return null
}

function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n
  const amountInWithFee = amountIn * (BPS - FEE_BPS)
  return (amountInWithFee * reserveOut) / (reserveIn * BPS + amountInWithFee)
}

export default function App() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { theme, toggle } = useTheme()

  const [page, setPage] = useState<NavPage>('dashboard')
  const [lendTab, setLendTab] = useState<LendTab>('supply')
  const [assetId, setAssetId] = useState<AssetId>('USDC')
  const [amount, setAmount] = useState('')
  const [swapPair, setSwapPair] = useState<SwapPair>('USDC-EURC')
  const [swapFrom, setSwapFrom] = useState<SwapToken>('USDC')
  const [swapTo, setSwapTo] = useState<SwapToken>('EURC')
  const [swapAmount, setSwapAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(100)
  const [showSwapSettings, setShowSwapSettings] = useState(false)
  const [screening, setScreening] = useState(false)
  const [liqMode, setLiqMode] = useState<LiquidityMode>('add')
  const [liqAmount0, setLiqAmount0] = useState('')
  const [liqAmount1, setLiqAmount1] = useState('')
  const [removeAmount0, setRemoveAmount0] = useState('')
  const [displayName, setDisplayName] = useState(() => (typeof window !== 'undefined' ? getDisplayName() : ''))
  const [points, setPoints] = useState(() => (typeof window !== 'undefined' ? getPoints() : 0))
  const [board, setBoard] = useState<BoardRow[]>(() => (typeof window !== 'undefined' ? getBoard() : []))

  const refreshPointsUi = () => {
    setPoints(getPoints())
    setBoard(getBoard())
  }

  const reward = (key: keyof typeof REWARDS) => {
    addPoints(REWARDS[key])
    refreshPointsUi()
  }

  const asset = ASSETS[assetId]
  const poolLive = !!asset.pool
  const poolAddr = (asset.pool || ASSETS.USDC.pool!) as `0x${string}`
  const currentPair = PAIR_CONFIG[swapPair]
  const currentSwapPool = currentPair.pool
  const token0 = ASSETS[currentPair.token0]
  const token1 = ASSETS[currentPair.token1]
  const swapTokenAddr = ASSETS[swapFrom].address

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash })
  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  useEffect(() => {
    if (isConnected && chainId !== ARC_CHAIN_ID) switchChain?.({ chainId: ARC_CHAIN_ID })
  }, [isConnected, chainId, switchChain])

  useEffect(() => {
    const pair = PAIR_CONFIG[swapPair]
    setSwapFrom(pair.token0)
    setSwapTo(pair.token1)
    setSwapAmount('')
    setLiqAmount0('')
    setLiqAmount1('')
    setRemoveAmount0('')
  }, [swapPair])

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'totalSupplyUnderlying' })
  const { data: totalDebt, refetch: refetchTotalDebt } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'totalDebtUnderlying' })
  const { data: util, refetch: refetchUtil } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'utilizationRate' })
  const { data: baseRateOnchain } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'baseRatePerYear' })
  const { data: slope1Onchain } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'slope1PerYear' })
  const { data: slope2Onchain } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'slope2PerYear' })
  const { data: optimalUtilOnchain } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'optimalUtilization' })
  const { data: reserveFactorOnchain } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'reserveFactor' })
  const { refetch: refetchCompliant } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'isCompliant', args: address ? [address] : undefined })
  const { data: tokenBal, refetch: refetchBal } = useReadContract({ address: asset.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: usdcBal, refetch: refetchUsdc } = useReadContract({ address: ASSETS.USDC.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: eurcBal, refetch: refetchEurc } = useReadContract({ address: ASSETS.EURC.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: cirbtcBal, refetch: refetchCirbtc } = useReadContract({ address: ASSETS.CIRBTC.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { refetch: refetchUsyc } = useReadContract({ address: ASSETS.USYC.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: asset.address, abi: erc20Abi, functionName: 'allowance', args: address && poolLive ? [address, poolAddr] : undefined })
  const { data: swapAllowance, refetch: refetchSwapAllowance } = useReadContract({ address: swapTokenAddr, abi: erc20Abi, functionName: 'allowance', args: address ? [address, currentSwapPool] : undefined })
  const { data: token0LiqAllowance, refetch: refetchToken0LiqAllowance } = useReadContract({ address: token0.address, abi: erc20Abi, functionName: 'allowance', args: address ? [address, currentSwapPool] : undefined })
  const { data: token1LiqAllowance, refetch: refetchToken1LiqAllowance } = useReadContract({ address: token1.address, abi: erc20Abi, functionName: 'allowance', args: address ? [address, currentSwapPool] : undefined })
  const { data: userSupply, refetch: refetchUserSupply } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'supplyBalanceOf', args: address ? [address] : undefined })
  const { data: userDebt, refetch: refetchUserDebt } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'debtBalanceOf', args: address ? [address] : undefined })
  const { data: health, refetch: refetchHealth } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'healthFactor', args: address ? [address] : undefined })
  const { data: maxBorrow, refetch: refetchMaxBorrow } = useReadContract({ address: poolLive ? poolAddr : undefined, abi: poolAbi, functionName: 'maxBorrowable', args: address ? [address] : undefined })
  const { refetch: refetchBlocked } = useReadContract({ address: ASSETS.USDC.address, abi: erc20Abi, functionName: 'isBlacklisted', args: address ? [address] : undefined })
  const { data: reserve0Data, refetch: refetchReserve0 } = useReadContract({ address: currentSwapPool, abi: swapAbi, functionName: 'reserve0' })
  const { data: reserve1Data, refetch: refetchReserve1 } = useReadContract({ address: currentSwapPool, abi: swapAbi, functionName: 'reserve1' })
  const { data: userShares, refetch: refetchUserShares } = useReadContract({ address: currentSwapPool, abi: swapAbi, functionName: 'getUserShares', args: address ? [address] : undefined })
  const { data: sharePct, refetch: refetchSharePct } = useReadContract({ address: currentSwapPool, abi: swapAbi, functionName: 'getSharePercentage', args: address ? [address] : undefined })
  const { data: totalShares, refetch: refetchTotalShares } = useReadContract({ address: currentSwapPool, abi: swapAbi, functionName: 'totalShares' })
  const { data: treasuryUsdc } = useReadContract({ address: ASSETS.USDC.address, abi: erc20Abi, functionName: 'balanceOf', args: [TREASURY] })

  const reserve0 = reserve0Data ?? 0n
  const reserve1 = reserve1Data ?? 0n
  const swapParsed = swapAmount ? parseUnits(swapAmount, ASSETS[swapFrom].decimals) : 0n

  const swapQuoteBn = useMemo(() => {
    if (swapParsed === 0n || reserve0 === 0n || reserve1 === 0n) return 0n
    const isToken0In = ASSETS[swapFrom].address.toLowerCase() === token0.address.toLowerCase()
    return isToken0In ? getAmountOut(swapParsed, reserve0, reserve1) : getAmountOut(swapParsed, reserve1, reserve0)
  }, [swapParsed, reserve0, reserve1, swapFrom, token0.address])

  const minReceived = (swapQuoteBn * BigInt(10000 - slippageBps)) / 10000n

  const removeSharesBn = useMemo(() => {
    if (!removeAmount0 || reserve0 === 0n || !totalShares || totalShares === 0n) return 0n
    try {
      const amt0 = parseUnits(removeAmount0, token0.decimals)
      if (amt0 === 0n) return 0n
      const shares = (amt0 * totalShares) / reserve0
      return userShares && shares > userShares ? userShares : shares
    } catch {
      return 0n
    }
  }, [removeAmount0, reserve0, totalShares, token0.decimals, userShares])

  const estimatedReceive0 = totalShares && totalShares > 0n && removeSharesBn > 0n ? (removeSharesBn * reserve0) / totalShares : 0n
  const estimatedReceive1 = totalShares && totalShares > 0n && removeSharesBn > 0n ? (removeSharesBn * reserve1) / totalShares : 0n

  const { borrowApy, supplyApy } = useMemo(() => {
    if (baseRateOnchain === undefined || slope1Onchain === undefined || slope2Onchain === undefined || optimalUtilOnchain === undefined)
      return { borrowApy: 0n, supplyApy: 0n }
    const utilization = util ?? 0n
    let borrowRate = baseRateOnchain
    if (utilization <= optimalUtilOnchain) borrowRate = baseRateOnchain + (slope1Onchain * utilization) / WAD
    else borrowRate = baseRateOnchain + slope1Onchain + (slope2Onchain * (utilization - optimalUtilOnchain)) / WAD
    const rf = reserveFactorOnchain ?? 0n
    return { borrowApy: borrowRate, supplyApy: (borrowRate * utilization * (WAD - rf)) / (WAD * WAD) }
  }, [baseRateOnchain, slope1Onchain, slope2Onchain, optimalUtilOnchain, util, reserveFactorOnchain])

  const refreshAll = () => {
    refetchBal(); refetchUsdc(); refetchEurc(); refetchCirbtc(); refetchUsyc()
    refetchAllowance(); refetchSwapAllowance(); refetchToken0LiqAllowance(); refetchToken1LiqAllowance()
    refetchTotalSupply(); refetchTotalDebt(); refetchUtil()
    refetchUserSupply(); refetchUserDebt(); refetchHealth(); refetchMaxBorrow()
    refetchCompliant(); refetchBlocked()
    refetchReserve0(); refetchReserve1(); refetchUserShares(); refetchSharePct(); refetchTotalShares()
  }

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed')
      refreshAll()
      setTimeout(() => refreshAll(), 1500)
      setTimeout(() => reset(), 3000)
      setAmount(''); setSwapAmount(''); setLiqAmount0(''); setLiqAmount1(''); setRemoveAmount0('')
    }
    if (isError) toast.error('Transaction failed')
  }, [isSuccess, isError])

  const parsedAmount = amount ? parseUnits(amount, asset.decimals) : 0n
  const isApproved = !!(allowance && amount && allowance >= parsedAmount)
  const isSwapApproved = !!(swapAllowance && swapAmount && swapAllowance >= swapParsed)
  const swapFromBal = swapFrom === 'USDC' ? usdcBal : swapFrom === 'EURC' ? eurcBal : cirbtcBal
  const exceedsSwapBalance = !!(swapFromBal !== undefined && swapParsed > swapFromBal)
  const utilNumber = util ? Number(util) / 1e18 : 0
  const liqParsed0 = liqAmount0 ? parseUnits(liqAmount0, token0.decimals) : 0n
  const liqParsed1 = liqAmount1 ? parseUnits(liqAmount1, token1.decimals) : 0n
  const isToken0LiqApproved = !!(token0LiqAllowance && liqParsed0 > 0n && token0LiqAllowance >= liqParsed0)
  const isToken1LiqApproved = !!(token1LiqAllowance && liqParsed1 > 0n && token1LiqAllowance >= liqParsed1)

  const setPercent = (pct: number) => {
    let base: bigint | undefined
    if (lendTab === 'supply') base = tokenBal
    if (lendTab === 'withdraw') base = userSupply
    if (lendTab === 'borrow') base = maxBorrow
    if (lendTab === 'repay') base = userDebt
    if (!base) return
    setAmount(formatUnits((base * BigInt(pct)) / 100n, asset.decimals))
  }

  const selectFrom = (next: SwapToken) => {
    if (next === swapTo) {
      setSwapFrom(swapTo)
      setSwapTo(swapFrom)
    } else {
      const pair = findPair(next, swapTo)
      if (pair) {
        setSwapPair(pair)
        setSwapFrom(next)
      } else toast.error('No pool for this pair')
    }
    setSwapAmount('')
  }

  const selectTo = (next: SwapToken) => {
    if (next === swapFrom) {
      setSwapFrom(swapTo)
      setSwapTo(swapFrom)
    } else {
      const pair = findPair(swapFrom, next)
      if (pair) {
        setSwapPair(pair)
        setSwapTo(next)
      } else toast.error('No pool for this pair')
    }
    setSwapAmount('')
  }

  const approve = () => {
    if (!poolLive || !amount) return toast.error('Enter amount')
    writeContract(
      { address: asset.address, abi: erc20Abi, functionName: 'approve', args: [poolAddr, maxUint256] },
      { onSuccess: () => { toast.success('Approve submitted'); setTimeout(() => refetchAllowance(), 2000) }, onError: (e: any) => toast.error(rpcHint(e?.shortMessage || e?.message || 'Failed')) }
    )
  }

  const execute = () => {
    if (!poolLive || !amount || !address) return toast.error('Connect and enter amount')
    if (isWrongNetwork) return toast.error('Switch to Arc Testnet')
    if ((lendTab === 'supply' || lendTab === 'repay') && !isApproved) return toast.error('Approve first')
    const calls = {
      supply: { functionName: 'supply' as const, args: [parsedAmount] as const },
      withdraw: { functionName: 'withdraw' as const, args: [parsedAmount] as const },
      borrow: { functionName: 'borrow' as const, args: [parsedAmount] as const },
      repay: { functionName: 'repay' as const, args: [parsedAmount] as const },
    }
    writeContract(
      { address: poolAddr, abi: poolAbi, ...calls[lendTab] },
      {
        onSuccess: () => {
          toast.success(`${lendTab} submitted`)
          reward(lendTab)
        },
        onError: (e: any) => toast.error(rpcHint(e?.shortMessage || e?.message || 'Failed')),
      }
    )
  }

  const approveSwap = () => {
    if (!swapAmount || exceedsSwapBalance) return toast.error('Invalid amount')
    writeContract(
      { address: swapTokenAddr, abi: erc20Abi, functionName: 'approve', args: [currentSwapPool, maxUint256] },
      { onSuccess: () => { toast.success('Approve submitted'); setTimeout(() => refetchSwapAllowance(), 1500) }, onError: (e: any) => toast.error(e?.shortMessage || 'Approve failed') }
    )
  }

  const runSwap = () => {
    if (!isSwapApproved || exceedsSwapBalance || swapQuoteBn === 0n) return toast.error('Not ready')
    writeContract(
      { address: currentSwapPool, abi: swapAbi, functionName: 'swap', args: [swapTokenAddr, swapParsed, minReceived] },
      {
        onSuccess: () => {
          toast.success('Swap submitted')
          reward('swap')
          refreshAll()
          setSwapAmount('')
        },
        onError: (e: any) => toast.error(e?.shortMessage || 'Swap failed'),
      }
    )
  }

  const approveLiqToken = (which: 0 | 1) => {
    const token = which === 0 ? token0 : token1
    writeContract(
      { address: token.address, abi: erc20Abi, functionName: 'approve', args: [currentSwapPool, maxUint256] },
      {
        onSuccess: () => {
          toast.success(`${token.symbol} approved`)
          setTimeout(() => {
            refetchToken0LiqAllowance()
            refetchToken1LiqAllowance()
          }, 1500)
        },
        onError: (e: any) => toast.error(e?.shortMessage || 'Failed'),
      }
    )
  }

  const addLiquidity = () => {
    if (!isToken0LiqApproved || !isToken1LiqApproved) return toast.error('Approve both tokens')
    writeContract(
      { address: currentSwapPool, abi: swapAbi, functionName: 'addLiquidity', args: [liqParsed0, liqParsed1] },
      {
        onSuccess: () => {
          toast.success('Add liquidity submitted')
          reward('addLiquidity')
        },
        onError: (e: any) => toast.error(e?.shortMessage || 'Failed'),
      }
    )
  }

  const removeLiquidity = () => {
    if (removeSharesBn === 0n) return toast.error('Enter amount')
    writeContract(
      { address: currentSwapPool, abi: swapAbi, functionName: 'removeLiquidity', args: [removeSharesBn] },
      {
        onSuccess: () => {
          toast.success('Remove liquidity submitted')
          reward('removeLiquidity')
        },
        onError: (e: any) => toast.error(e?.shortMessage || 'Failed'),
      }
    )
  }

  const importToken = async (id: AssetId) => {
    const a = ASSETS[id]
    try {
      // @ts-ignore
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: { type: 'ERC20', options: { address: a.address, symbol: a.symbol, decimals: a.decimals } },
      })
      toast.success(`${a.symbol} imported`)
    } catch {
      toast.error('Import failed')
    }
  }

  const healthValue = formatHealth(health)
  const healthNum = healthValue === '∞' ? 999 : Number(healthValue)
  const getHealthColor = () => (healthNum >= 1.5 ? 'text-emerald-400' : healthNum >= 1.1 ? 'text-yellow-400' : 'text-red-400')
  const getUtilColor = () => (utilNumber > 0.8 ? 'text-red-400' : utilNumber > 0.5 ? 'text-yellow-400' : 'text-emerald-400')
  const supplyColor = 'text-emerald-400'
  const debtColor = healthNum < 1.1 ? 'text-red-400' : healthNum < 1.5 ? 'text-amber-400' : 'text-orange-400'
  const showHfWarning = isConnected && poolLive && healthNum < 1.5 && healthValue !== '∞'
  const needLendApprove = lendTab === 'supply' || lendTab === 'repay'
  const tokenBalOf = (t: SwapToken) => (t === 'USDC' ? usdcBal : t === 'EURC' ? eurcBal : cirbtcBal)

  const hfBanner = showHfWarning && (
    <div className={`mb-6 p-4 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${healthNum < 1.1 ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">{healthNum < 1.1 ? 'High liquidation risk' : 'Health factor needs attention'}</div>
          <div className="text-xs opacity-80 mt-0.5">HF {healthValue}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setPage('lend'); setLendTab('repay') }} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-semibold">Repay</button>
        <button type="button" onClick={() => { setPage('lend'); setLendTab('supply') }} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-semibold">Add collateral</button>
      </div>
    </div>
  )

  const pctRow = (onPct: (n: number) => void) => (
    <div className="flex gap-1 mb-2 max-w-[200px]">
      {[25, 50, 75, 100].map((pct) => (
        <button key={pct} type="button" onClick={() => onPct(pct)} className="flex-1 py-1 text-[10px] font-medium rounded-md border border-white/10 bg-white/5 hover:bg-white/10">
          {pct === 100 ? 'MAX' : `${pct}%`}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-lg font-black text-black shadow-lg shadow-emerald-500/20">F</div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Flowlend</div>
              <div className="text-[11px] text-zinc-500 font-medium mt-0.5">Stablecoin-native DeFi on Arc</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">TESTNET</span>
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25">Faucet</a>
            <button type="button" onClick={() => setPage('profile')} className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10">
              {points} pts
            </button>
            <button type="button" onClick={toggle} className="p-2 rounded-xl border border-white/10 text-zinc-400" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <ConnectButton label="Connect Wallet" showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>
      </header>

      <nav className="border-b border-white/5 bg-[#0a0a0f]/90 sticky top-16 z-40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setPage(id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${page === id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
              {icon}{label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {(page === 'dashboard' || page === 'lend') && (
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(ASSETS) as AssetId[]).map((id) => (
              <button key={id} onClick={() => { setAssetId(id); setAmount('') }} className={`px-4 py-2 rounded-xl text-sm font-medium border ${assetId === id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10'}`}>
                {ASSETS[id].symbol}
              </button>
            ))}
          </div>
        )}

        {page === 'dashboard' && (
          <div className="space-y-6">
            {hfBanner}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Supplied', value: poolLive ? formatAmt(totalSupply, asset.decimals) : '—', icon: <TrendingUp size={16} className="text-emerald-400" /> },
                { label: 'Total Borrowed', value: poolLive ? formatAmt(totalDebt, asset.decimals) : '—', icon: <TrendingDown size={16} className="text-orange-400" /> },
                { label: 'Utilization', value: poolLive ? formatUtil(util ?? 0n) : '—', icon: <Activity size={16} className={getUtilColor()} /> },
                { label: 'APY S/B', value: poolLive ? `${formatApy(supplyApy)} / ${formatApy(borrowApy)}` : '—', icon: <Percent size={16} className="text-cyan-400" /> },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                  <div className="flex justify-between text-xs text-zinc-500">{s.label}{s.icon}</div>
                  <div className="text-2xl font-semibold mt-1">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                <div className="text-xs text-zinc-500">Health</div>
                <div className={`text-3xl font-semibold ${getHealthColor()}`}>{isConnected && poolLive ? healthValue : '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                <div className="text-xs text-zinc-500">Supplied</div>
                <div className={`text-3xl font-semibold ${supplyColor}`}>{isConnected && poolLive ? formatAmt(userSupply, asset.decimals) : '—'}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                <div className="text-xs text-zinc-500">Borrowed</div>
                <div className={`text-3xl font-semibold ${debtColor}`}>{isConnected && poolLive ? formatAmt(userDebt, asset.decimals) : '—'}</div>
              </div>
            </div>
          </div>
        )}

        {page === 'lend' && (
          <>
            {hfBanner}
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Position · {asset.symbol}</span>
                  <button type="button" onClick={() => { refreshAll(); toast.success('Refreshed') }}><RefreshCw size={14} /></button>
                </div>
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-zinc-500">Supplied</div>
                    <div className={`text-xl font-semibold ${supplyColor}`}>{formatAmt(userSupply, asset.decimals)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">Borrowed</div>
                    <div className={`text-xl font-semibold ${debtColor}`}>{formatAmt(userDebt, asset.decimals)}</div>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${getHealthColor()}`}>HF {healthValue}</div>
                <button
                  onClick={async () => {
                    setScreening(true)
                    try {
                      await Promise.all([refetchCompliant(), refetchBlocked()])
                      toast.success('Screened')
                    } finally {
                      setScreening(false)
                    }
                  }}
                  disabled={!isConnected || screening}
                  className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm"
                >
                  <Shield size={14} className="inline mr-1" />{screening ? '...' : 'Screen Wallet'}
                </button>
              </div>
              <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                <div className="flex p-1 bg-black/40 rounded-xl mb-4">
                  {(['supply', 'withdraw', 'borrow', 'repay'] as LendTab[]).map((t) => (
                    <button key={t} onClick={() => { setLendTab(t); setAmount('') }} className={`flex-1 py-2 text-sm capitalize rounded-lg ${lendTab === t ? 'bg-white text-black' : 'text-zinc-400'}`}>{t}</button>
                  ))}
                </div>
                <div className="mb-2 text-xs text-zinc-500">
                  {lendTab === 'supply' && `Wallet balance: ${formatAmt(tokenBal, asset.decimals)} ${asset.symbol}`}
                  {lendTab === 'withdraw' && `Withdrawable: ${formatAmt(userSupply, asset.decimals)} ${asset.symbol}`}
                  {lendTab === 'borrow' && `Max borrow: ${formatAmt(maxBorrow, asset.decimals)} ${asset.symbol}`}
                  {lendTab === 'repay' && `Debt to repay: ${formatAmt(userDebt, asset.decimals)} ${asset.symbol}`}
                </div>
                {pctRow(setPercent)}
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} placeholder="0.00" className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-3xl font-semibold outline-none mb-4 text-[var(--text)]" />
                {needLendApprove && !!amount && !isApproved && (
                  <button onClick={approve} disabled={isPending || isConfirming} className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 mb-3">
                    {isPending || isConfirming ? 'Confirming...' : `Approve ${asset.symbol}`}
                  </button>
                )}
                {(!needLendApprove || isApproved) && !!amount && (
                  <button onClick={execute} disabled={isPending || isConfirming || !isConnected || isWrongNetwork || !poolLive} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40">
                    {isPending || isConfirming ? 'Confirming...' : `${lendTab} ${asset.symbol}`}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {page === 'swap' && (
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">Swap</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Slippage <span className="text-emerald-400 font-semibold">{slippageBps / 100}%</span></span>
                  <button type="button" onClick={() => setShowSwapSettings((v) => !v)} className="p-2 rounded-lg border border-white/10 text-zinc-400">⚙</button>
                </div>
              </div>
              {showSwapSettings && (
                <div className="rounded-xl border border-white/10 p-3 space-y-2 text-sm">
                  <div className="text-xs font-medium text-zinc-300">Slippage tolerance</div>
                  <div className="flex gap-2">
                    {[10, 50, 100, 300].map((bps) => (
                      <button key={bps} type="button" onClick={() => setSlippageBps(bps)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${slippageBps === bps ? 'bg-white text-black' : 'bg-white/5'}`}>{bps / 100}%</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Min received</span>
                    <span>{formatAmt(minReceived, ASSETS[swapTo].decimals)} {ASSETS[swapTo].symbol}</span>
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 min-h-[120px] flex flex-col justify-between">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>You pay</span>
                  {isConnected && <span>Bal: {formatAmt(swapFromBal, ASSETS[swapFrom].decimals)} {ASSETS[swapFrom].symbol}</span>}
                </div>
                {pctRow((pct) => { if (swapFromBal) setSwapAmount(formatUnits((swapFromBal * BigInt(pct)) / 100n, ASSETS[swapFrom].decimals)) })}
                <div className="flex gap-2 items-center mt-2">
                  <input type="number" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.00" className="flex-1 min-w-0 bg-transparent text-3xl font-semibold outline-none text-[var(--text)]" />
                  <select value={swapFrom} onChange={(e) => selectFrom(e.target.value as SwapToken)} className={selectCls}>
                    {(['USDC', 'EURC', 'CIRBTC'] as SwapToken[]).map((t) => (<option key={t} value={t}>{ASSETS[t].symbol}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex justify-center">
                <button type="button" onClick={() => { setSwapFrom(swapTo); setSwapTo(swapFrom); setSwapAmount('') }} className="w-10 h-10 rounded-xl border border-white/10">⇅</button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 min-h-[120px] flex flex-col justify-between">
                <div className="text-xs text-zinc-500">You receive (est.)</div>
                <div className="flex gap-2 items-center mt-2">
                  <div className="flex-1 min-w-0 text-3xl font-semibold text-[var(--text)]">{formatAmt(swapQuoteBn, ASSETS[swapTo].decimals)}</div>
                  <select value={swapTo} onChange={(e) => selectTo(e.target.value as SwapToken)} className={selectCls}>
                    {(['USDC', 'EURC', 'CIRBTC'] as SwapToken[]).map((t) => (<option key={t} value={t}>{ASSETS[t].symbol}</option>))}
                  </select>
                </div>
              </div>
              {!!swapAmount && !exceedsSwapBalance && !isSwapApproved && (
                <button onClick={approveSwap} disabled={isPending || isConfirming || !isConnected} className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40">
                  {isPending || isConfirming ? 'Confirming...' : `Approve ${ASSETS[swapFrom].symbol}`}
                </button>
              )}
              {!!swapAmount && !exceedsSwapBalance && isSwapApproved && (
                <button onClick={runSwap} disabled={isPending || isConfirming || swapQuoteBn === 0n} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40">
                  {isPending || isConfirming ? 'Confirming...' : `Swap ${ASSETS[swapFrom].symbol} → ${ASSETS[swapTo].symbol}`}
                </button>
              )}
            </div>
          </div>
        )}

        {page === 'liquidity' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
                <button key={p} onClick={() => setSwapPair(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${swapPair === p ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-zinc-400'}`}>{p}</button>
              ))}
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm space-y-2">
              <div className="font-medium text-zinc-200">Active pool · {swapPair}</div>
              <div className="flex justify-between text-zinc-400">
                <span>Reserves</span>
                <span>{formatAmt(reserve0, token0.decimals)} {token0.symbol} · {formatAmt(reserve1, token1.decimals)} {token1.symbol}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Your share</span>
                <span className="text-emerald-400">{formatSharePct(sharePct)}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-4">
              <div className="flex p-1 bg-black/40 rounded-xl">
                <button onClick={() => setLiqMode('add')} className={`flex-1 py-2 rounded-lg text-sm ${liqMode === 'add' ? 'bg-white text-black' : 'text-zinc-400'}`}><Plus size={14} className="inline" /> Add</button>
                <button onClick={() => setLiqMode('remove')} className={`flex-1 py-2 rounded-lg text-sm ${liqMode === 'remove' ? 'bg-white text-black' : 'text-zinc-400'}`}><Minus size={14} className="inline" /> Remove</button>
              </div>
              {liqMode === 'add' && (
                <>
                  <div className="text-xs text-zinc-500 flex justify-between"><span>{token0.symbol}</span><span>Bal: {formatAmt(tokenBalOf(currentPair.token0), token0.decimals)}</span></div>
                  {pctRow((pct) => { const bal = tokenBalOf(currentPair.token0); if (bal) setLiqAmount0(formatUnits((bal * BigInt(pct)) / 100n, token0.decimals)) })}
                  <input type="number" value={liqAmount0} onChange={(e) => setLiqAmount0(e.target.value)} placeholder={`0.00 ${token0.symbol}`} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xl outline-none text-[var(--text)]" />
                  <div className="text-xs text-zinc-500 flex justify-between"><span>{token1.symbol}</span><span>Bal: {formatAmt(tokenBalOf(currentPair.token1), token1.decimals)}</span></div>
                  {pctRow((pct) => { const bal = tokenBalOf(currentPair.token1); if (bal) setLiqAmount1(formatUnits((bal * BigInt(pct)) / 100n, token1.decimals)) })}
                  <input type="number" value={liqAmount1} onChange={(e) => setLiqAmount1(e.target.value)} placeholder={`0.00 ${token1.symbol}`} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xl outline-none text-[var(--text)]" />
                  {!!liqAmount0 && !isToken0LiqApproved && <button onClick={() => approveLiqToken(0)} className="w-full py-3 rounded-xl bg-blue-600 text-white">Approve {token0.symbol}</button>}
                  {!!liqAmount1 && isToken0LiqApproved && !isToken1LiqApproved && <button onClick={() => approveLiqToken(1)} className="w-full py-3 rounded-xl bg-blue-600 text-white">Approve {token1.symbol}</button>}
                  {isToken0LiqApproved && isToken1LiqApproved && !!liqAmount0 && !!liqAmount1 && (
                    <button onClick={addLiquidity} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold">Add Liquidity · {swapPair}</button>
                  )}
                </>
              )}
              {liqMode === 'remove' && (
                <>
                  <div className="text-xs text-zinc-500">Amount ({token0.symbol} side)</div>
                  {pctRow((pct) => {
                    if (userShares && totalShares && totalShares > 0n && reserve0 > 0n) {
                      const max0 = (userShares * reserve0) / totalShares
                      setRemoveAmount0(formatUnits((max0 * BigInt(pct)) / 100n, token0.decimals))
                    }
                  })}
                  <input type="number" value={removeAmount0} onChange={(e) => setRemoveAmount0(e.target.value)} placeholder={`0.00 ${token0.symbol}`} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xl outline-none text-[var(--text)]" />
                  <div className="text-sm text-zinc-400">Receive ~ {formatAmt(estimatedReceive0, token0.decimals)} {token0.symbol} + {formatAmt(estimatedReceive1, token1.decimals)} {token1.symbol}</div>
                  <button onClick={removeLiquidity} disabled={removeSharesBn === 0n} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold disabled:opacity-40">Remove Liquidity · {swapPair}</button>
                </>
              )}
            </div>
          </div>
        )}

        {page === 'portfolio' && (
          <div className="space-y-6">
            {hfBanner}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Portfolio</h1>
              <button type="button" onClick={() => setPage('profile')} className="text-xs text-emerald-400 hover:underline">Points & Leaderboard →</button>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
              <div className="text-sm font-medium">Wallet balances</div>
              {([{ id: 'USDC' as AssetId, bal: usdcBal }, { id: 'EURC' as AssetId, bal: eurcBal }, { id: 'CIRBTC' as AssetId, bal: cirbtcBal }] as const).map(({ id, bal }) => (
                <div key={id} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
                  <span>{ASSETS[id].symbol}</span>
                  <span className="font-semibold">{formatAmt(bal, ASSETS[id].decimals)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
              <div className="text-sm font-medium">Lending · {asset.symbol}</div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-zinc-500">Supplied</div><div className={`text-lg font-semibold ${supplyColor}`}>{formatAmt(userSupply, asset.decimals)}</div></div>
                <div><div className="text-xs text-zinc-500">Borrowed</div><div className={`text-lg font-semibold ${debtColor}`}>{formatAmt(userDebt, asset.decimals)}</div></div>
                <div><div className="text-xs text-zinc-500">Health</div><div className={`text-lg font-semibold ${getHealthColor()}`}>{healthValue}</div></div>
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-zinc-500">
                <span>Max borrow: {formatAmt(maxBorrow, asset.decimals)}</span>
                <span>Debt to repay: {formatAmt(userDebt, asset.decimals)}</span>
              </div>
              <button onClick={() => setPage('lend')} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs">Manage Lend</button>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
              <div className="text-sm font-medium">Liquidity positions</div>
              {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
                <div key={p} className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-0">
                  <span>{p}{swapPair === p && <span className="ml-2 text-emerald-400 text-xs">share {formatSharePct(sharePct)}</span>}</span>
                  <button type="button" onClick={() => { setSwapPair(p); setPage('liquidity') }} className="px-3 py-1 rounded-lg bg-white/5 text-xs">Manage</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'payments' && (
          <div className="max-w-xl mx-auto rounded-2xl border border-white/5 bg-white/[0.03] p-6"><SendPanel /></div>
        )}

        {page === 'bridge' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">Bridge</h1>
              <p className="text-sm text-zinc-500 mt-1">CCTP USDC · Circle App Kit</p>
            </div>
            <div className="bridge-note rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-1.5">
              <div className="bridge-note-title font-semibold text-amber-100">Bridge in 3 steps</div>
              <p>1. Approve USDC if MetaMask asks (one-time allowance).</p>
              <p>2. Confirm the bridge transaction on the source chain.</p>
              <p>3. MetaMask may switch network (e.g. to Sepolia) to mint USDC — that is normal for CCTP.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6"><BridgePanel /></div>
          </div>
        )}

        {page === 'treasury' && (
          <div className="max-w-2xl rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-3">
            <div className="text-xs font-mono break-all text-zinc-500">{TREASURY}</div>
            <div className="text-2xl font-semibold">{formatAmt(treasuryUsdc, 6)} USDC</div>
          </div>
        )}

        {page === 'profile' && (
          <div className="max-w-lg mx-auto space-y-5">
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Wallet</div>
                <div className="font-mono text-sm truncate text-[var(--text)]">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'}
                </div>
              </div>
              {address && (
                <button type="button" onClick={() => { navigator.clipboard.writeText(address); toast.success('Address copied') }} className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5">
                  Copy
                </button>
              )}
            </div>
            <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-6 space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Your points</div>
                  <div className="text-4xl font-extrabold text-emerald-400 tabular-nums">{points}</div>
                </div>
                <button
                  type="button"
                  disabled={!canCheckInToday()}
                  onClick={() => {
                    const r = dailyCheckIn()
                    if (!r.ok) return toast.error('Already checked in today')
                    refreshPointsUi()
                    toast.success(`Check-in +${REWARDS.checkin} pts`)
                  }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-sm font-bold disabled:opacity-40 shadow-lg shadow-emerald-500/20"
                >
                  {canCheckInToday() ? `Check in · +${REWARDS.checkin}` : 'Done today'}
                </button>
              </div>
              <div className="flex gap-2">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name for Leaderboard" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none text-[var(--text)]" />
                <button type="button" onClick={() => { saveDisplayName(displayName); refreshPointsUi(); toast.success('Saved') }} className="px-4 py-2.5 rounded-xl bg-white/10 text-sm font-semibold">Save</button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <div className="text-sm font-semibold">Missions</div>
              <p className="text-xs text-zinc-500">Complete actions to earn points.</p>
              <div className="space-y-2">
                {[
                  { label: 'Swap tokens', pts: REWARDS.swap, page: 'swap' as NavPage },
                  { label: 'Add liquidity', pts: REWARDS.addLiquidity, page: 'liquidity' as NavPage },
                  { label: 'Supply to Lend', pts: REWARDS.supply, page: 'lend' as NavPage },
                  { label: 'Send payment', pts: REWARDS.send, page: 'payments' as NavPage },
                ].map((m) => (
                  <button key={m.label} type="button" onClick={() => setPage(m.page)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-sm">
                    <span>{m.label}</span>
                    <span className="text-emerald-400 font-semibold text-xs">+{m.pts} pts</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold mb-3">Leaderboard</div>
              {board.length === 0 ? (
                <p className="text-xs text-zinc-500">Check in or save a name to appear here.</p>
              ) : (
                board.map((row, i) => (
                  <div key={row.name + i} className="flex justify-between items-center py-2.5 text-sm border-b border-white/5 last:border-0">
                    <span><span className="text-zinc-500 text-xs mr-2">#{i + 1}</span>{row.name}</span>
                    <span className="text-emerald-400 font-semibold tabular-nums">{row.points}</span>
                  </div>
                ))
              )}
              <p className="text-[11px] text-zinc-600 mt-3">Local demo board on this browser.</p>
            </div>
          </div>
        )}

        {page === 'guide' && (
          <div className="max-w-2xl space-y-4">
            <h1 className="text-2xl font-semibold">Guide</h1>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
              <button onClick={async () => { try { await ensureArcRpc(); toast.success('Arc ready') } catch (e: any) { toast.error(e?.message || 'Failed') } }} className="w-full py-3 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm">Add Arc Testnet</button>
              <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="block text-center py-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold">Circle Faucet</a>
              {(['USDC', 'EURC', 'CIRBTC'] as AssetId[]).map((id) => (
                <button key={id} onClick={() => importToken(id)} className="w-full py-3 rounded-xl bg-white/5 text-sm">Import {ASSETS[id].symbol}</button>
              ))}
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-sm text-zinc-400 space-y-3">
              <div className="font-medium text-[var(--text)]">How to use</div>
              <p><span className="text-emerald-400 font-medium">Dashboard</span> — pool stats and your health.</p>
              <p><span className="text-emerald-400 font-medium">Lend</span> — Supply / Withdraw / Borrow / Repay. Each tab shows wallet, withdrawable, max borrow, or debt. Approve before Supply or Repay.</p>
              <p><span className="text-emerald-400 font-medium">Swap</span> — Pick tokens. Slippage is always shown; open ⚙ to change.</p>
              <p><span className="text-emerald-400 font-medium">Liquidity</span> — Choose pair, see reserves and share, Add or Remove with %.</p>
              <p><span className="text-emerald-400 font-medium">Portfolio</span> — Wallet, lend, LP positions.</p>
              <p><span className="text-emerald-400 font-medium">Payments / Bridge</span> — App Kit send; CCTP bridge in 3 steps (Approve → Bridge → possible network switch).</p>
              <p><span className="text-emerald-400 font-medium">Profile</span> — Check-in, missions, Leaderboard. Tap <span className="text-[var(--text)]">pts</span> in the header.</p>
            </div>
            <div className="text-xs text-zinc-500 flex items-center gap-2"><Link2 size={14} /> testnet.arcscan.app</div>
          </div>
        )}

        {hash && (
          <div className="mt-4 text-center text-xs text-zinc-500">
            Tx: <a href={`https://testnet.arcscan.app/tx/${hash}`} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{hash.slice(0, 10)}...</a>
          </div>
        )}
        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-zinc-600">Flowlend · Arc · App Kit · Circle Wallet</div>
      </main>
    </div>
  )
}