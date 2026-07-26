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
  Info,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Link2,
  ArrowLeftRight,
  Plus,
  Minus,
} from 'lucide-react'
import { ensureArcRpc, SWAP_POOLS, swapAbi } from './lib/circleKit'

const ARC_CHAIN_ID = 5042002
const WAD = 10n ** 18n
const FEE_BPS = 4n
const BPS = 10_000n

type AssetId = 'USDC' | 'EURC' | 'CIRBTC' | 'USYC'
type MainTab = 'supply' | 'withdraw' | 'borrow' | 'repay' | 'swap' | 'liquidity'
type SwapPair = 'USDC-EURC' | 'USDC-CIRBTC' | 'EURC-CIRBTC'
type LiquidityMode = 'add' | 'remove'
type SwapToken = 'USDC' | 'EURC' | 'CIRBTC'

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
  { name: 'complianceEnabled', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'isCompliant', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const

const erc20Abi = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'isBlacklisted', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const

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
  if (/rate limit/i.test(msg)) {
    return 'RPC rate limited. Switch MetaMask Arc RPC and retry.'
  }
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
  const numerator = amountInWithFee * reserveOut
  const denominator = reserveIn * BPS + amountInWithFee
  return numerator / denominator
}

export default function App() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [tab, setTab] = useState<MainTab>('supply')
  const [assetId, setAssetId] = useState<AssetId>('USDC')
  const [amount, setAmount] = useState('')
  const [swapPair, setSwapPair] = useState<SwapPair>('USDC-EURC')
  const [swapFrom, setSwapFrom] = useState<SwapToken>('USDC')
  const [swapTo, setSwapTo] = useState<SwapToken>('EURC')
  const [swapAmount, setSwapAmount] = useState('')
  const [screening, setScreening] = useState(false)
  const [liqMode, setLiqMode] = useState<LiquidityMode>('add')
  const [liqAmount0, setLiqAmount0] = useState('')
  const [liqAmount1, setLiqAmount1] = useState('')
  const [removeShares, setRemoveShares] = useState('')
  const [showFromSelector, setShowFromSelector] = useState(false)
  const [showToSelector, setShowToSelector] = useState(false)

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
    if (isConnected && chainId !== ARC_CHAIN_ID) {
      switchChain?.({ chainId: ARC_CHAIN_ID })
    }
  }, [isConnected, chainId, switchChain])

  useEffect(() => {
    const pair = PAIR_CONFIG[swapPair]
    setSwapFrom(pair.token0)
    setSwapTo(pair.token1)
    setSwapAmount('')
    setLiqAmount0('')
    setLiqAmount1('')
    setRemoveShares('')
  }, [swapPair])

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'totalSupplyUnderlying',
  })
  const { data: totalDebt, refetch: refetchTotalDebt } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'totalDebtUnderlying',
  })
  const { data: util, refetch: refetchUtil } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'utilizationRate',
  })
  const { data: baseRateOnchain } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'baseRatePerYear',
  })
  const { data: slope1Onchain } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'slope1PerYear',
  })
  const { data: slope2Onchain } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'slope2PerYear',
  })
  const { data: optimalUtilOnchain } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'optimalUtilization',
  })
  const { data: reserveFactorOnchain } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'reserveFactor',
  })
  const { data: complianceOn } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'complianceEnabled',
  })
  const { data: isCompliant, refetch: refetchCompliant } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'isCompliant',
    args: address ? [address] : undefined,
  })

  const { data: tokenBal, refetch: refetchBal } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })
  const { data: usdcBal, refetch: refetchUsdc } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })
  const { data: eurcBal, refetch: refetchEurc } = useReadContract({
    address: ASSETS.EURC.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })
  const { data: cirbtcBal, refetch: refetchCirbtc } = useReadContract({
    address: ASSETS.CIRBTC.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })
  const { data: usycBal, refetch: refetchUsyc } = useReadContract({
    address: ASSETS.USYC.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && poolLive ? [address, poolAddr] : undefined,
  })

  const { data: swapAllowance, refetch: refetchSwapAllowance } = useReadContract({
    address: swapTokenAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, currentSwapPool] : undefined,
  })

  const { data: token0LiqAllowance, refetch: refetchToken0LiqAllowance } = useReadContract({
    address: token0.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, currentSwapPool] : undefined,
  })
  const { data: token1LiqAllowance, refetch: refetchToken1LiqAllowance } = useReadContract({
    address: token1.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, currentSwapPool] : undefined,
  })

  const { data: userSupply, refetch: refetchUserSupply } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'supplyBalanceOf',
    args: address ? [address] : undefined,
  })
  const { data: userDebt, refetch: refetchUserDebt } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'debtBalanceOf',
    args: address ? [address] : undefined,
  })
  const { data: health, refetch: refetchHealth } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'healthFactor',
    args: address ? [address] : undefined,
  })
  const { data: maxBorrow, refetch: refetchMaxBorrow } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'maxBorrowable',
    args: address ? [address] : undefined,
  })
  const { data: isBlocked, refetch: refetchBlocked } = useReadContract({
    address: ASSETS.USDC.address,
    abi: erc20Abi,
    functionName: 'isBlacklisted',
    args: address ? [address] : undefined,
  })

  const { data: reserve0Data, refetch: refetchReserve0 } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: 'reserve0',
  })
  const { data: reserve1Data, refetch: refetchReserve1 } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: 'reserve1',
  })
  const { data: userShares, refetch: refetchUserShares } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: 'getUserShares',
    args: address ? [address] : undefined,
  })
  const { data: sharePct, refetch: refetchSharePct } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: 'getSharePercentage',
    args: address ? [address] : undefined,
  })
  const { data: totalShares, refetch: refetchTotalShares } = useReadContract({
    address: currentSwapPool,
    abi: swapAbi,
    functionName: 'totalShares',
  })

  useEffect(() => {
    if (!address || !poolLive) return
    refetchAllowance()
    refetchBal()
    refetchUserSupply()
    refetchUserDebt()
    refetchHealth()
    refetchMaxBorrow()
  }, [assetId, address, poolLive])

  const reserve0 = reserve0Data ?? 0n
  const reserve1 = reserve1Data ?? 0n

  const swapParsed = swapAmount ? parseUnits(swapAmount, ASSETS[swapFrom].decimals) : 0n

  const swapQuoteBn = useMemo(() => {
    if (swapParsed === 0n || reserve0 === 0n || reserve1 === 0n) return 0n
    const isToken0In = ASSETS[swapFrom].address.toLowerCase() === token0.address.toLowerCase()
    if (isToken0In) {
      return getAmountOut(swapParsed, reserve0, reserve1)
    }
    return getAmountOut(swapParsed, reserve1, reserve0)
  }, [swapParsed, reserve0, reserve1, swapFrom, token0.address])

  const swapQuote = swapQuoteBn > 0n ? formatUnits(swapQuoteBn, ASSETS[swapTo].decimals) : '0'

  const { borrowApy, supplyApy } = useMemo(() => {
    if (baseRateOnchain === undefined || slope1Onchain === undefined || slope2Onchain === undefined || optimalUtilOnchain === undefined) {
      return { borrowApy: 0n, supplyApy: 0n }
    }
    const utilization = util ?? 0n
    let borrowRate = baseRateOnchain
    if (utilization <= optimalUtilOnchain) {
      borrowRate = baseRateOnchain + (slope1Onchain * utilization) / WAD
    } else {
      borrowRate = baseRateOnchain + slope1Onchain + (slope2Onchain * (utilization - optimalUtilOnchain)) / WAD
    }
    const rf = reserveFactorOnchain ?? 0n
    const supplyRate = (borrowRate * utilization * (WAD - rf)) / (WAD * WAD)
    return { borrowApy: borrowRate, supplyApy: supplyRate }
  }, [baseRateOnchain, slope1Onchain, slope2Onchain, optimalUtilOnchain, util, reserveFactorOnchain])

  const refreshAll = () => {
    refetchBal()
    refetchUsdc()
    refetchEurc()
    refetchCirbtc()
    refetchUsyc()
    refetchAllowance()
    refetchSwapAllowance()
    refetchToken0LiqAllowance()
    refetchToken1LiqAllowance()
    refetchTotalSupply()
    refetchTotalDebt()
    refetchUtil()
    refetchUserSupply()
    refetchUserDebt()
    refetchHealth()
    refetchMaxBorrow()
    refetchCompliant()
    refetchBlocked()
    refetchReserve0()
    refetchReserve1()
    refetchUserShares()
    refetchSharePct()
    refetchTotalShares()
  }

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed')
      refreshAll()
      setTimeout(() => refreshAll(), 1500)
      setTimeout(() => reset(), 3000)
      setAmount('')
      setSwapAmount('')
      setLiqAmount0('')
      setLiqAmount1('')
      setRemoveShares('')
    }
    if (isError) toast.error('Transaction failed')
  }, [isSuccess, isError])

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(',', '.'))
  }

  const handleLiqAmount0Change = (value: string) => {
    setLiqAmount0(value.replace(',', '.'))
  }

  const handleLiqAmount1Change = (value: string) => {
    setLiqAmount1(value.replace(',', '.'))
  }

  const selectSwapFrom = (token: SwapToken) => {
    if (token === swapTo) {
      setSwapFrom(swapTo)
      setSwapTo(swapFrom)
    } else {
      const pair = findPair(token, swapTo)
      if (pair) {
        setSwapPair(pair)
        setSwapFrom(token)
        setSwapTo(swapTo)
      } else {
        const fallback = token === 'USDC' ? 'EURC' : 'USDC'
        const newPair = findPair(token, fallback)
        if (newPair) {
          setSwapPair(newPair)
          setSwapFrom(token)
          setSwapTo(fallback)
        }
      }
    }
    setSwapAmount('')
    setShowFromSelector(false)
  }

  const selectSwapTo = (token: SwapToken) => {
    if (token === swapFrom) {
      setSwapFrom(swapTo)
      setSwapTo(swapFrom)
    } else {
      const pair = findPair(swapFrom, token)
      if (pair) {
        setSwapPair(pair)
        setSwapFrom(swapFrom)
        setSwapTo(token)
      } else {
        const fallback = token === 'USDC' ? 'EURC' : 'USDC'
        const newPair = findPair(fallback, token)
        if (newPair) {
          setSwapPair(newPair)
          setSwapFrom(fallback)
          setSwapTo(token)
        }
      }
    }
    setSwapAmount('')
    setShowToSelector(false)
  }

  const parsedAmount = amount ? parseUnits(amount, asset.decimals) : 0n
  const isApproved = !!(allowance && amount && allowance >= parsedAmount)
  const isSwapApproved = !!(swapAllowance && swapAmount && swapAllowance >= swapParsed)
  const swapFromBal = swapFrom === 'USDC' ? usdcBal : swapFrom === 'EURC' ? eurcBal : cirbtcBal
  const exceedsSwapBalance = !!(swapFromBal !== undefined && swapParsed > swapFromBal)
  const utilNumber = util ? Number(util) / 1e18 : 0
  const isLendTab = tab === 'supply' || tab === 'withdraw' || tab === 'borrow' || tab === 'repay'

  const liqParsed0 = liqAmount0 ? parseUnits(liqAmount0, token0.decimals) : 0n
  const liqParsed1 = liqAmount1 ? parseUnits(liqAmount1, token1.decimals) : 0n
  const isToken0LiqApproved = !!(token0LiqAllowance && liqParsed0 > 0n && token0LiqAllowance >= liqParsed0)
  const isToken1LiqApproved = !!(token1LiqAllowance && liqParsed1 > 0n && token1LiqAllowance >= liqParsed1)

  const token0Bal = currentPair.token0 === 'USDC' ? usdcBal : currentPair.token0 === 'EURC' ? eurcBal : cirbtcBal
  const token1Bal = currentPair.token1 === 'USDC' ? usdcBal : currentPair.token1 === 'EURC' ? eurcBal : cirbtcBal

  const balanceChips: { id: AssetId; bal?: bigint }[] = [
    { id: 'USDC', bal: usdcBal },
    { id: 'EURC', bal: eurcBal },
    { id: 'CIRBTC', bal: cirbtcBal },
    { id: 'USYC', bal: usycBal },
  ]

  const setPercent = (pct: number) => {
    let base: bigint | undefined
    if (tab === 'supply') base = tokenBal
    if (tab === 'withdraw') base = userSupply
    if (tab === 'borrow') base = maxBorrow
    if (tab === 'repay') base = userDebt
    if (!base) return
    setAmount(formatUnits((base * BigInt(pct)) / 100n, asset.decimals))
  }

  const setLiqPercent0 = (pct: number) => {
    if (!token0Bal) return
    const amt = (token0Bal * BigInt(pct)) / 100n
    setLiqAmount0(formatUnits(amt, token0.decimals))
  }

  const setLiqPercent1 = (pct: number) => {
    if (!token1Bal) return
    const amt = (token1Bal * BigInt(pct)) / 100n
    setLiqAmount1(formatUnits(amt, token1.decimals))
  }

  const screenWallet = async () => {
    if (!address) return toast.error('Connect wallet first')
    setScreening(true)
    try {
      await Promise.all([refetchCompliant(), refetchBlocked()])
      await new Promise((r) => setTimeout(r, 400))
      if (isBlocked) toast.error('Wallet is on Arc USDC blocklist')
      else if (complianceOn && !isCompliant) toast.error('Not on pool whitelist')
      else toast.success('Screening passed')
    } catch {
      toast.error('Screening failed')
    } finally {
      setScreening(false)
    }
  }

  const approve = () => {
    if (!poolLive) return toast.error(`${asset.symbol} pool not deployed`)
    if (!amount) return toast.error('Enter an amount')
    if (!tokenBal || parsedAmount > tokenBal) return toast.error('Amount exceeds balance')
    writeContract(
      {
        address: asset.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [poolAddr, maxUint256],
      },
      {
        onSuccess: () => {
          toast.success('Approve submitted')
          setTimeout(() => refetchAllowance(), 2000)
        },
        onError: (e: any) => toast.error(rpcHint(e?.shortMessage || e?.message || 'Failed')),
      }
    )
  }

  const execute = () => {
    if (!poolLive) return toast.error(`${asset.symbol} pool not deployed`)
    if (!amount || !address) return toast.error('Connect wallet and enter amount')
    if (isWrongNetwork) return toast.error('Switch to Arc Testnet')
    if (assetId === 'USDC' && isBlocked) return toast.error('Blocked by Arc USDC blocklist')
    if (complianceOn && !isCompliant) return toast.error('Not compliant')
    if (tab === 'supply') {
      if (!tokenBal || parsedAmount > tokenBal) return toast.error('Exceeds balance')
      if (!isApproved) return toast.error('Approve first')
    }
    if (tab === 'withdraw' && userSupply && parsedAmount > userSupply) return toast.error('Exceeds supplied')
    if (tab === 'repay') {
      if (!isApproved) return toast.error('Approve first')
      if (userDebt && parsedAmount > userDebt) return toast.error('Exceeds debt')
    }
    if (tab === 'swap' || tab === 'liquidity') return

    const calls = {
      supply: { functionName: 'supply' as const, args: [parsedAmount] as const },
      withdraw: { functionName: 'withdraw' as const, args: [parsedAmount] as const },
      borrow: { functionName: 'borrow' as const, args: [parsedAmount] as const },
      repay: { functionName: 'repay' as const, args: [parsedAmount] as const },
    }
    writeContract(
      { address: poolAddr, abi: poolAbi, ...calls[tab as 'supply' | 'withdraw' | 'borrow' | 'repay'] },
      {
        onSuccess: () => toast.success(`${tab} submitted`),
        onError: (e: any) => toast.error(rpcHint(e?.shortMessage || e?.message || 'Failed')),
      }
    )
  }

  const approveSwap = () => {
    if (!swapAmount || Number(swapAmount) <= 0) return toast.error('Enter amount')
    if (exceedsSwapBalance) return toast.error('Exceeds balance')

    writeContract(
      {
        address: swapTokenAddr,
        abi: erc20Abi,
        functionName: 'approve',
        args: [currentSwapPool, maxUint256],
      },
      {
        onSuccess: () => {
          toast.success('Approve submitted')
          setTimeout(() => refetchSwapAllowance(), 1500)
        },
        onError: (e: any) => toast.error(e?.shortMessage || e?.message || 'Approve failed'),
      }
    )
  }

  const runSwap = () => {
    if (!isConnected || !address) return toast.error('Connect wallet first')
    if (isWrongNetwork) return toast.error('Switch to Arc Testnet')
    if (!swapAmount || Number(swapAmount) <= 0) return toast.error('Enter amount')
    if (!isSwapApproved) return toast.error('Approve first')
    if (exceedsSwapBalance) return toast.error('Exceeds balance')
    if (swapQuoteBn === 0n) return toast.error('Insufficient liquidity')

    const minOut = (swapQuoteBn * 99n) / 100n

    writeContract(
      {
        address: currentSwapPool,
        abi: swapAbi,
        functionName: 'swap',
        args: [swapTokenAddr, swapParsed, minOut],
      },
      {
        onSuccess: () => {
          toast.success('Swap submitted')
          refreshAll()
          setSwapAmount('')
        },
        onError: (e: any) => toast.error(e?.shortMessage || e?.message || 'Swap failed'),
      }
    )
  }

  const approveLiqToken = (which: 0 | 1) => {
    const token = which === 0 ? token0 : token1
    writeContract(
      {
        address: token.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [currentSwapPool, maxUint256],
      },
      {
        onSuccess: () => {
          toast.success(`${token.symbol} approved`)
          setTimeout(() => {
            refetchToken0LiqAllowance()
            refetchToken1LiqAllowance()
          }, 1500)
        },
        onError: (e: any) => toast.error(e?.shortMessage || e?.message || 'Approve failed'),
      }
    )
  }

  const addLiquidity = () => {
    if (!isConnected) return toast.error('Connect wallet first')
    if (isWrongNetwork) return toast.error('Switch to Arc Testnet')
    if (!liqAmount0 || !liqAmount1) return toast.error('Enter both amounts')
    if (!isToken0LiqApproved) return toast.error(`Approve ${token0.symbol} first`)
    if (!isToken1LiqApproved) return toast.error(`Approve ${token1.symbol} first`)

    writeContract(
      {
        address: currentSwapPool,
        abi: swapAbi,
        functionName: 'addLiquidity',
        args: [liqParsed0, liqParsed1],
      },
      {
        onSuccess: () => toast.success('Add liquidity submitted'),
        onError: (e: any) => toast.error(e?.shortMessage || e?.message || 'Add liquidity failed'),
      }
    )
  }

  const removeLiquidity = () => {
    if (!isConnected) return toast.error('Connect wallet first')
    if (isWrongNetwork) return toast.error('Switch to Arc Testnet')
    if (!removeShares || Number(removeShares) <= 0) return toast.error('Enter shares to remove')
    const shareAmount = BigInt(removeShares)
    if (userShares && shareAmount > userShares) return toast.error('Exceeds your shares')

    writeContract(
      {
        address: currentSwapPool,
        abi: swapAbi,
        functionName: 'removeLiquidity',
        args: [shareAmount],
      },
      {
        onSuccess: () => toast.success('Remove liquidity submitted'),
        onError: (e: any) => toast.error(e?.shortMessage || e?.message || 'Remove liquidity failed'),
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

  const tokenOptions: SwapToken[] = ['USDC', 'EURC', 'CIRBTC']

  const estimatedReceive0 =
    userShares && totalShares && totalShares > 0n && removeShares
      ? (BigInt(removeShares || '0') * reserve0) / totalShares
      : 0n
  const estimatedReceive1 =
    userShares && totalShares && totalShares > 0n && removeShares
      ? (BigInt(removeShares || '0') * reserve1) / totalShares
      : 0n

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black">F</div>
            <div>
              <div className="font-semibold text-lg leading-none">Flowlend</div>
              <div className="text-[11px] text-zinc-500">Lend · Swap · Liquidity on Arc</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">TESTNET</span>
            {isWrongNetwork && (
              <button onClick={() => switchChain({ chainId: ARC_CHAIN_ID })} className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium">
                Switch to Arc Testnet
              </button>
            )}
            <ConnectButton label="Connect Wallet" showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {(Object.keys(ASSETS) as AssetId[]).map((id) => (
            <button
              key={id}
              onClick={() => {
                setAssetId(id)
                setAmount('')
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                assetId === id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
              }`}
            >
              {ASSETS[id].symbol}
              {!ASSETS[id].pool && <span className="ml-1 text-[10px] text-zinc-500">soon</span>}
            </button>
          ))}
        </div>

        {!poolLive && isLendTab && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
            <strong>{asset.symbol}</strong> lending pool not deployed. Use <strong>Swap</strong> or <strong>Liquidity</strong>.
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Supplied', value: poolLive ? formatAmt(totalSupply, asset.decimals) : '—', sub: asset.symbol, icon: <TrendingUp size={16} className="text-emerald-400" /> },
            { label: 'Total Borrowed', value: poolLive ? formatAmt(totalDebt, asset.decimals) : '—', sub: asset.symbol, icon: <TrendingDown size={16} className="text-orange-400" /> },
            { label: 'Utilization', value: poolLive ? formatUtil(util ?? 0n) : '—', icon: <Activity size={16} className={getUtilColor()} />, color: getUtilColor() },
            { label: 'Supply / Borrow APY', value: poolLive ? `${formatApy(supplyApy)} / ${formatApy(borrowApy)}` : '—', icon: <Percent size={16} className="text-cyan-400" /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</div>
                {s.icon}
              </div>
              <div className={`text-2xl font-semibold mt-1 ${s.color || ''}`}>{s.value}</div>
              {s.sub && <div className="text-xs text-zinc-600 mt-1">{s.sub}</div>}
            </div>
          ))}
        </div>

        {isConnected && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {balanceChips.map(({ id, bal }) => (
              <div key={id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{ASSETS[id].symbol}</div>
                <div className="text-lg font-semibold text-white mt-1 tabular-nums">{formatAmt(bal, ASSETS[id].decimals)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <div className="text-sm text-zinc-400 mb-5 flex items-center justify-between">
                <span>Your Position · {asset.symbol}</span>
                <button onClick={() => { refreshAll(); toast.success('Refreshed') }} className="p-1.5 rounded-lg hover:bg-white/10">
                  <RefreshCw size={14} />
                </button>
              </div>
              {isConnected ? (
                <div className="space-y-5">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-xs text-zinc-500">Supplied</div>
                      <div className="text-xl font-semibold mt-1">
                        {poolLive ? formatAmt(userSupply, asset.decimals) : '—'} <span className="text-sm text-zinc-500">{asset.symbol}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Borrowed</div>
                      <div className="text-xl font-semibold mt-1">
                        {poolLive ? formatAmt(userDebt, asset.decimals) : '—'} <span className="text-sm text-zinc-500">{asset.symbol}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-zinc-500 flex items-center gap-1">Health Factor <Info size={12} /></div>
                      <div className={`text-lg font-semibold flex items-center gap-1.5 ${getHealthColor()}`}>
                        {healthNum >= 1.5 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {poolLive ? healthValue : '—'}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 space-y-1">
                      <div className="flex justify-between"><span>Max LTV</span><span>75%</span></div>
                      <div className="flex justify-between"><span>Liq. Threshold</span><span>75%</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-zinc-500 text-sm">Connect wallet</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield size={16} className="text-cyan-400" /> Compliance
              </div>
              <div className="text-xs space-y-1.5 mb-3 text-zinc-400">
                <div className="flex justify-between"><span>Pool mode</span><span>{complianceOn ? 'ON' : 'OFF'}</span></div>
                <div className="flex justify-between"><span>Whitelist</span><span>{isConnected ? (isCompliant ? 'Yes' : 'No') : '—'}</span></div>
                <div className="flex justify-between">
                  <span>USDC blocklist</span>
                  <span className={isBlocked ? 'text-red-400' : 'text-emerald-400'}>
                    {isConnected ? (isBlocked ? 'BLOCKED' : 'Clear') : '—'}
                  </span>
                </div>
              </div>
              <button onClick={screenWallet} disabled={!isConnected || screening} className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium disabled:opacity-40">
                {screening ? 'Screening...' : 'Screen Wallet'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <div className="text-sm font-medium mb-2">Get Started</div>
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    try {
                      await ensureArcRpc()
                      toast.success('Arc Testnet ready')
                    } catch (e: any) {
                      toast.error(e?.message || 'Network helper failed')
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium"
                >
                  1. Add / Switch Arc Testnet
                </button>
                <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="inline-flex w-full justify-center py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                  2. Circle Faucet
                </a>
                {(['USDC', 'EURC', 'CIRBTC'] as AssetId[]).map((id, i) => (
                  <button key={id} onClick={() => importToken(id)} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium">
                    {i + 3}. Import {ASSETS[id].symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-xs text-zinc-500 space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                <Link2 size={14} className="text-emerald-400" /> Contracts
              </div>
              <p>USDC: <a className="underline text-zinc-400" href={`https://testnet.arcscan.app/address/${ASSETS.USDC.pool}`} target="_blank" rel="noreferrer">{ASSETS.USDC.pool!.slice(0, 10)}...</a></p>
              <p>EURC: <a className="underline text-zinc-400" href={`https://testnet.arcscan.app/address/${ASSETS.EURC.pool}`} target="_blank" rel="noreferrer">{ASSETS.EURC.pool!.slice(0, 10)}...</a></p>
              <p>cirBTC: <a className="underline text-zinc-400" href={`https://testnet.arcscan.app/address/${ASSETS.CIRBTC.pool}`} target="_blank" rel="noreferrer">{ASSETS.CIRBTC.pool!.slice(0, 10)}...</a></p>
              <p>Swap USDC-EURC: <a className="underline text-zinc-400" href={`https://testnet.arcscan.app/address/${SWAP_POOLS['USDC-EURC']}`} target="_blank" rel="noreferrer">{SWAP_POOLS['USDC-EURC'].slice(0, 10)}...</a></p>
              <p>Swap USDC-cirBTC: <a className="underline text-zinc-400" href={`https://testnet.arcscan.app/address/${SWAP_POOLS['USDC-CIRBTC']}`} target="_blank" rel="noreferrer">{SWAP_POOLS['USDC-CIRBTC'].slice(0, 10)}...</a></p>
              <p>Swap EURC-cirBTC: <a className="underline text-zinc-400" href={`https://testnet.arcscan.app/address/${SWAP_POOLS['EURC-CIRBTC']}`} target="_blank" rel="noreferrer">{SWAP_POOLS['EURC-CIRBTC'].slice(0, 10)}...</a></p>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <div className="flex p-1 bg-black/40 rounded-xl mb-6 overflow-x-auto">
              {(['supply', 'withdraw', 'borrow', 'repay', 'swap', 'liquidity'] as MainTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setAmount('') }}
                  className={`flex-1 min-w-[4.5rem] py-2.5 text-sm font-medium rounded-lg capitalize ${tab === t ? 'bg-white text-black' : 'text-zinc-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {(tab === 'swap' || tab === 'liquidity') && (
              <div className="mb-4 flex gap-2">
                {(Object.keys(PAIR_CONFIG) as SwapPair[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSwapPair(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      swapPair === p ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {tab === 'swap' && (
              <div className="space-y-4">
                <div className="text-sm text-zinc-400 flex items-center gap-2">
                  <ArrowLeftRight size={16} /> {ASSETS[swapFrom].symbol} ↔ {ASSETS[swapTo].symbol} · Fee 0.04% · Slippage 1%
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3 relative">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>You pay</span>
                    {isConnected && (
                      <button
                        type="button"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => {
                          if (swapFromBal) setSwapAmount(formatUnits(swapFromBal, ASSETS[swapFrom].decimals))
                        }}
                      >
                        Balance: {formatAmt(swapFromBal, ASSETS[swapFrom].decimals)} {ASSETS[swapFrom].symbol}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 min-w-0 bg-transparent text-3xl font-semibold outline-none"
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFromSelector(!showFromSelector)
                          setShowToSelector(false)
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:border-white/30"
                      >
                        {ASSETS[swapFrom].symbol} ▾
                      </button>
                      {showFromSelector && (
                        <div className="absolute right-0 top-12 z-20 w-32 rounded-xl border border-white/10 bg-[#12121a] shadow-xl overflow-hidden">
                          {tokenOptions.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => selectSwapFrom(t)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 ${swapFrom === t ? 'text-emerald-400' : 'text-white'}`}
                            >
                              {ASSETS[t].symbol}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-1 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setSwapFrom(swapTo)
                      setSwapTo(swapFrom)
                      setSwapAmount('')
                    }}
                    className="w-10 h-10 rounded-xl bg-[#0a0a0f] border border-white/10 flex items-center justify-center hover:border-emerald-500/40"
                  >
                    ⇅
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3 relative">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>You receive (est.)</span>
                    <span className="text-emerald-400">~ {Number(swapAmount) > 0 ? formatAmt(swapQuoteBn, ASSETS[swapTo].decimals) : '0.00'} {ASSETS[swapTo].symbol}</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 text-3xl font-semibold text-zinc-300 tabular-nums">
                      {Number(swapAmount) > 0 ? formatAmt(swapQuoteBn, ASSETS[swapTo].decimals) : '0.00'}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowToSelector(!showToSelector)
                          setShowFromSelector(false)
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:border-white/30"
                      >
                        {ASSETS[swapTo].symbol} ▾
                      </button>
                      {showToSelector && (
                        <div className="absolute right-0 top-12 z-20 w-32 rounded-xl border border-white/10 bg-[#12121a] shadow-xl overflow-hidden">
                          {tokenOptions.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => selectSwapTo(t)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 ${swapTo === t ? 'text-emerald-400' : 'text-white'}`}
                            >
                              {ASSETS[t].symbol}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {exceedsSwapBalance && (
                  <div className="text-center text-sm text-red-400">
                    Amount exceeds balance ({formatAmt(swapFromBal, ASSETS[swapFrom].decimals)} {ASSETS[swapFrom].symbol})
                  </div>
                )}

                {!isSwapApproved && !!swapAmount && !exceedsSwapBalance && (
                  <button
                    onClick={approveSwap}
                    disabled={isPending || isConfirming || !isConnected || isWrongNetwork}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40"
                  >
                    {isPending || isConfirming ? 'Confirming...' : `1. Approve ${ASSETS[swapFrom].symbol}`}
                  </button>
                )}

                {isSwapApproved && !!swapAmount && !exceedsSwapBalance && (
                  <div className="text-center text-sm text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Approved — ready to swap
                  </div>
                )}

                <button
                  onClick={runSwap}
                  disabled={
                    !isSwapApproved ||
                    isPending ||
                    isConfirming ||
                    !swapAmount ||
                    !isConnected ||
                    isWrongNetwork ||
                    exceedsSwapBalance ||
                    swapQuoteBn === 0n
                  }
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40"
                >
                  {isPending || isConfirming ? 'Confirming...' : `Swap ${ASSETS[swapFrom].symbol} → ${ASSETS[swapTo].symbol}`}
                </button>
              </div>
            )}

            {tab === 'liquidity' && (
              <div className="space-y-5">
                <div className="flex p-1 bg-black/40 rounded-xl">
                  <button
                    onClick={() => setLiqMode('add')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${liqMode === 'add' ? 'bg-white text-black' : 'text-zinc-400'}`}
                  >
                    <Plus size={16} /> Add Liquidity
                  </button>
                  <button
                    onClick={() => setLiqMode('remove')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${liqMode === 'remove' ? 'bg-white text-black' : 'text-zinc-400'}`}
                  >
                    <Minus size={16} /> Remove Liquidity
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Pool Reserves</span>
                    <span className="text-white">{formatAmt(reserve0, token0.decimals)} {token0.symbol} · {formatAmt(reserve1, token1.decimals)} {token1.symbol}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Your Share</span>
                    <span className="text-emerald-400 font-medium">{formatSharePct(sharePct)}</span>
                  </div>
                </div>

                {liqMode === 'add' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>{token0.symbol}</span>
                        {isConnected && <span>Balance: {formatAmt(token0Bal, token0.decimals)}</span>}
                      </div>
                      <div className="flex gap-2 mb-2">
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setLiqPercent0(pct)}
                            className="flex-1 py-1 text-xs rounded-lg bg-white/5 border border-white/10"
                          >
                            {pct === 100 ? 'MAX' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={liqAmount0}
                        onChange={(e) => handleLiqAmount0Change(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-2xl font-semibold outline-none"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>{token1.symbol}</span>
                        {isConnected && <span>Balance: {formatAmt(token1Bal, token1.decimals)}</span>}
                      </div>
                      <div className="flex gap-2 mb-2">
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setLiqPercent1(pct)}
                            className="flex-1 py-1 text-xs rounded-lg bg-white/5 border border-white/10"
                          >
                            {pct === 100 ? 'MAX' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={liqAmount1}
                        onChange={(e) => handleLiqAmount1Change(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-2xl font-semibold outline-none"
                      />
                    </div>

                    {!isToken0LiqApproved && !!liqAmount0 && (
                      <button
                        onClick={() => approveLiqToken(0)}
                        disabled={isPending || isConfirming}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-40"
                      >
                        Approve {token0.symbol}
                      </button>
                    )}
                    {!isToken1LiqApproved && !!liqAmount1 && (
                      <button
                        onClick={() => approveLiqToken(1)}
                        disabled={isPending || isConfirming}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-40"
                      >
                        Approve {token1.symbol}
                      </button>
                    )}

                    <button
                      onClick={addLiquidity}
                      disabled={!isToken0LiqApproved || !isToken1LiqApproved || isPending || isConfirming || !liqAmount0 || !liqAmount1 || !isConnected || isWrongNetwork}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40"
                    >
                      {isPending || isConfirming ? 'Confirming...' : 'Add Liquidity'}
                    </button>
                  </div>
                )}

                {liqMode === 'remove' && (
                  <div className="space-y-4">
                    <div className="text-sm text-zinc-400 text-center">
                      Your share: <span className="text-emerald-400 font-medium">{formatSharePct(sharePct)}</span>
                    </div>

                    <div className="flex gap-2">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            if (!userShares) return
                            const shares = (userShares * BigInt(pct)) / 100n
                            setRemoveShares(shares.toString())
                          }}
                          className="flex-1 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10"
                        >
                          {pct === 100 ? 'MAX' : `${pct}%`}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm space-y-1">
                      <div className="text-zinc-400">You will receive</div>
                      <div className="text-white font-medium">
                        {formatAmt(estimatedReceive0, token0.decimals)} {token0.symbol}
                        {' + '}
                        {formatAmt(estimatedReceive1, token1.decimals)} {token1.symbol}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <div className="text-xs text-zinc-500 mb-2">Shares to remove</div>
                      <input
                        type="number"
                        value={removeShares}
                        onChange={(e) => setRemoveShares(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-2xl font-semibold outline-none"
                      />
                    </div>

                    <button
                      onClick={removeLiquidity}
                      disabled={
                        isPending ||
                        isConfirming ||
                        !removeShares ||
                        !isConnected ||
                        isWrongNetwork ||
                        !userShares ||
                        userShares === 0n
                      }
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold disabled:opacity-40"
                    >
                      {isPending || isConfirming ? 'Confirming...' : 'Remove Liquidity'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isLendTab && (
              <>
                {isConnected && (
                  <div className="mb-3 text-xs text-zinc-500 flex justify-between">
                    <span>Wallet Balance</span>
                    <span className="text-white font-medium">{formatAmt(tokenBal, asset.decimals)} {asset.symbol}</span>
                  </div>
                )}
                {tab === 'borrow' && isConnected && poolLive && (
                  <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-300">
                    You can borrow up to <strong>{formatAmt(maxBorrow, asset.decimals)}</strong> {asset.symbol}
                  </div>
                )}
                {tab === 'withdraw' && isConnected && poolLive && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                    You can withdraw up to <strong>{formatAmt(userSupply, asset.decimals)}</strong> {asset.symbol}</div>
                )}
                {tab === 'repay' && isConnected && poolLive && (
                  <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
                    You can repay up to <strong>{formatAmt(userDebt, asset.decimals)}</strong> {asset.symbol}
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex gap-2 mb-3">
                    {[25, 50, 75, 100].map((pct) => (
                      <button key={pct} onClick={() => setPercent(pct)} disabled={!poolLive} className="flex-1 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 disabled:opacity-40">
                        {pct === 100 ? 'MAX' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.00"
                      disabled={!poolLive}
                      className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-3xl font-semibold outline-none focus:border-emerald-500/50 disabled:opacity-40"
                    />
                    <div className="shrink-0 flex items-center justify-center px-5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-zinc-200">{asset.symbol}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {(tab === 'supply' || tab === 'repay') && !isApproved && poolLive && (
                    <button onClick={approve} disabled={isPending || isConfirming || !amount || isWrongNetwork} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40">
                      {isPending || isConfirming ? 'Confirming...' : `1. Approve ${asset.symbol}`}
                    </button>
                  )}
                  {(tab === 'supply' || tab === 'repay') && isApproved && poolLive && !!amount && (
                    <div className="text-center text-sm text-emerald-400 flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> Approved — ready to {tab}
                    </div>
                  )}
                  <button
                    onClick={execute}
                    disabled={!poolLive || isPending || isConfirming || !amount || !isConnected || isWrongNetwork || ((tab === 'supply' || tab === 'repay') && !isApproved)}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40"
                  >
                    {!poolLive
                      ? `${asset.symbol} pool coming soon`
                      : isPending || isConfirming
                        ? 'Confirming...'
                        : tab === 'supply'
                          ? `Supply ${asset.symbol}`
                          : tab === 'withdraw'
                            ? 'Withdraw'
                            : tab === 'borrow'
                              ? `Borrow ${asset.symbol}`
                              : 'Repay'}
                  </button>
                </div>
              </>
            )}

            {hash && (
              <div className="mt-4 text-center text-xs text-zinc-500">
                Tx:{' '}
                <a href={`https://testnet.arcscan.app/tx/${hash}`} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </a>
              </div>
            )}
            {isSuccess && (
              <div className="mt-3 text-center text-sm text-emerald-400 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Transaction confirmed
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-zinc-600 space-y-2">
          <div>Flowlend · Arc Testnet · USDC · EURC · cirBTC</div>
        </div>
      </main>
    </div>
  )
}