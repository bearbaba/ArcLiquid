import { useState, useEffect, useMemo } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
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
  Fuel,
  ArrowLeftRight,
} from 'lucide-react'
import { getSwapQuote, ensureArcRpc, SWAP_POOL, swapAbi } from './lib/circleKit'

const ARC_CHAIN_ID = 5042002
const WAD = 10n ** 18n
const CCTP_DOMAIN = 26

type AssetId = 'USDC' | 'EURC' | 'CIRBTC' | 'USYC'
type MainTab = 'supply' | 'withdraw' | 'borrow' | 'repay' | 'swap' | 'bridge'
type SwapToken = 'USDC' | 'EURC'

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
    pool: '0x4455eb4351936996B71fa87425037d7f744F40A2',
  },
  CIRBTC: {
    symbol: 'cirBTC',
    name: 'Circle BTC',
    address: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
    decimals: 8,
    pool: '0x75EA2cFAb03B92822Be363853643E0a538Ab275C',
  },
  USYC: {
    symbol: 'USYC',
    name: 'USYC',
    address: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    decimals: 6,
    pool: null,
  },
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
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatHealth(v?: bigint) {
  if (!v || v > 1000n * 10n ** 18n) return '∞'
  return (Number(v) / 1e18).toFixed(2)
}

function formatApy(rate: bigint) {
  return (Number(rate) / 1e16).toFixed(2) + '%'
}

function rpcHint(msg: string) {
  if (/rate limit/i.test(msg)) {
    return 'RPC rate limited. Set MetaMask Arc RPC to https://5042002.rpc.thirdweb.com, wait 30s, retry once.'
  }
  return msg
}

export default function App() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [tab, setTab] = useState<MainTab>('supply')
  const [assetId, setAssetId] = useState<AssetId>('USDC')
  const [amount, setAmount] = useState('')
  const [swapFrom, setSwapFrom] = useState<SwapToken>('USDC')
  const [swapTo, setSwapTo] = useState<SwapToken>('EURC')
  const [swapAmount, setSwapAmount] = useState('')
  const [swapQuote, setSwapQuote] = useState('0')
  const [bridgeAmount, setBridgeAmount] = useState('')
  const [screening, setScreening] = useState(false)

  const asset = ASSETS[assetId]
  const poolLive = !!asset.pool
  const poolAddr = (asset.pool || ASSETS.USDC.pool!) as `0x${string}`
  const swapTokenAddr = (swapFrom === 'USDC' ? ASSETS.USDC.address : ASSETS.EURC.address) as `0x${string}`

  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash })
  const isWrongNetwork = isConnected && chainId !== ARC_CHAIN_ID

  useEffect(() => {
    if (isConnected && chainId !== ARC_CHAIN_ID) {
      switchChain?.({ chainId: ARC_CHAIN_ID })
    }
  }, [isConnected, chainId, switchChain])

  useEffect(() => {
    if (tab !== 'swap' || !swapAmount || Number(swapAmount) <= 0) {
      setSwapQuote('0')
      return
    }
    const t = setTimeout(() => {
      getSwapQuote({ tokenIn: swapFrom, amountIn: swapAmount })
        .then(setSwapQuote)
        .catch(() => setSwapQuote('0'))
    }, 400)
    return () => clearTimeout(t)
  }, [tab, swapFrom, swapAmount])

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
  const { data: baseRate } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'baseRatePerYear',
  })
  const { data: slope1 } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'slope1PerYear',
  })
  const { data: slope2 } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'slope2PerYear',
  })
  const { data: optimalUtil } = useReadContract({
    address: poolLive ? poolAddr : undefined,
    abi: poolAbi,
    functionName: 'optimalUtilization',
  })
  const { data: reserveFactor } = useReadContract({
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
    args: address ? [address, SWAP_POOL] : undefined,
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

  const { borrowApy, supplyApy } = useMemo(() => {
    if (baseRate === undefined || slope1 === undefined || slope2 === undefined || optimalUtil === undefined) {
      return { borrowApy: 0n, supplyApy: 0n }
    }
    const utilization = util ?? 0n
    let borrowRate = baseRate
    if (utilization <= optimalUtil) {
      borrowRate = baseRate + (slope1 * utilization) / WAD
    } else {
      borrowRate = baseRate + slope1 + (slope2 * (utilization - optimalUtil)) / WAD
    }
    const rf = reserveFactor ?? 0n
    const supplyRate = (borrowRate * utilization * (WAD - rf)) / (WAD * WAD)
    return { borrowApy: borrowRate, supplyApy: supplyRate }
  }, [baseRate, slope1, slope2, optimalUtil, util, reserveFactor])

  const refreshAll = () => {
    refetchBal()
    refetchUsdc()
    refetchEurc()
    refetchCirbtc()
    refetchUsyc()
    refetchAllowance()
    refetchSwapAllowance()
    refetchTotalSupply()
    refetchTotalDebt()
    refetchUtil()
    refetchUserSupply()
    refetchUserDebt()
    refetchHealth()
    refetchMaxBorrow()
    refetchCompliant()
    refetchBlocked()
  }

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed')
      refreshAll()
      setTimeout(() => refreshAll(), 1500)
      setTimeout(() => reset(), 3000)
      setAmount('')
    }
    if (isError) toast.error('Transaction failed')
  }, [isSuccess, isError])

  const parsedAmount = amount ? parseUnits(amount, asset.decimals) : 0n
  const isApproved = !!(allowance && amount && allowance >= parsedAmount)
  const swapParsed = swapAmount ? parseUnits(swapAmount, 6) : 0n
  const isSwapApproved = !!(swapAllowance && swapAmount && swapAllowance >= swapParsed)
  const swapFromBal = swapFrom === 'USDC' ? usdcBal : eurcBal
  const utilNumber = util ? Number(util) / 1e18 : 0
  const isLendTab = tab === 'supply' || tab === 'withdraw' || tab === 'borrow' || tab === 'repay'

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
      { address: asset.address, abi: erc20Abi, functionName: 'approve', args: [poolAddr, parsedAmount] },
      {
        onSuccess: () => toast.success('Approve submitted'),
        onError: (e: any) => toast.error(rpcHint(e?.shortMessage || e?.message || 'Failed')),
      }
    )
  }

  const execute = () => {
    if (!poolLive) return toast.error(`${asset.symbol} pool not deployed`)
    if (!amount || !address) return toast.error('Connect wallet and enter amount')
    if (isWrongNetwork) return toast.error('Switch to Arc Testnet')
    if (isBlocked) return toast.error('Blocked by Arc USDC blocklist')
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
    if (tab === 'swap' || tab === 'bridge') return

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
    if (swapFromBal && swapParsed > swapFromBal) return toast.error('Exceeds balance')

    writeContract(
      {
        address: swapTokenAddr,
        abi: erc20Abi,
        functionName: 'approve',
        args: [SWAP_POOL, swapParsed],
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
    if (swapFromBal && swapParsed > swapFromBal) return toast.error('Exceeds balance')

    // Slippage protection 0.5%
    const estimatedOut = Number(swapQuote || 0)
    const minOut =
      estimatedOut > 0 ? parseUnits((estimatedOut * 0.995).toFixed(6), 6) : 0n

    writeContract(
      {
        address: SWAP_POOL,
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-black">F</div>
            <div>
              <div className="font-semibold text-lg leading-none">Flowlend</div>
              <div className="text-[11px] text-zinc-500">Lend · Swap on Arc Testnet</div>
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
            <strong>{asset.symbol}</strong> lending pool not deployed. Use <strong>Swap</strong> for USDC ↔ EURC.
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Supplied', value: poolLive ? formatAmt(totalSupply, asset.decimals) : '—', sub: asset.symbol, icon: <TrendingUp size={16} className="text-emerald-400" /> },
            { label: 'Total Borrowed', value: poolLive ? formatAmt(totalDebt, asset.decimals) : '—', sub: asset.symbol, icon: <TrendingDown size={16} className="text-orange-400" /> },
            { label: 'Utilization', value: poolLive ? formatApy(util ?? 0n) : '—', icon: <Activity size={16} className={getUtilColor()} />, color: getUtilColor() },
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
              <p>Swap: SimpleStableSwap</p>
              <div className="flex items-center gap-2"><Fuel size={12} /> CCTP domain {CCTP_DOMAIN}</div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <div className="flex p-1 bg-black/40 rounded-xl mb-6 overflow-x-auto">
              {(['supply', 'withdraw', 'borrow', 'repay', 'swap', 'bridge'] as MainTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setAmount('') }}
                  className={`flex-1 min-w-[4.5rem] py-2.5 text-sm font-medium rounded-lg capitalize ${tab === t ? 'bg-white text-black' : 'text-zinc-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'swap' && (
              <div className="space-y-4">
                <div className="text-sm text-zinc-400 flex items-center gap-2">
                  <ArrowLeftRight size={16} /> SimpleStableSwap · USDC ↔ EURC · Slippage 0.5%
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>You pay</span>
                    {isConnected && (
                      <button
                        type="button"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => {
                          if (swapFromBal) setSwapAmount(formatUnits(swapFromBal, 6))
                        }}
                      >
                        Balance: {formatAmt(swapFromBal)} {swapFrom}
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
                    <div className="flex rounded-xl border border-white/10 overflow-hidden shrink-0">
                      {(['USDC', 'EURC'] as SwapToken[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setSwapFrom(t)
                            setSwapTo(t === 'USDC' ? 'EURC' : 'USDC')
                          }}
                          className={`px-4 py-2 text-sm font-semibold ${
                            swapFrom === t ? 'bg-white text-black' : 'bg-transparent text-zinc-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
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

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>You receive (est.)</span>
                    <span className="text-emerald-400">~ {swapQuote || '0.00'} {swapTo}</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 text-3xl font-semibold text-zinc-300 tabular-nums">
                      {Number(swapAmount) > 0 ? swapQuote : '0.00'}
                    </div>
                    <div className="flex rounded-xl border border-white/10 overflow-hidden shrink-0">
                      {(['USDC', 'EURC'] as SwapToken[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setSwapTo(t)
                            setSwapFrom(t === 'USDC' ? 'EURC' : 'USDC')
                          }}
                          className={`px-4 py-2 text-sm font-semibold ${
                            swapTo === t ? 'bg-white text-black' : 'bg-transparent text-zinc-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {!isSwapApproved && !!swapAmount && (
                  <button
                    onClick={approveSwap}
                    disabled={isPending || isConfirming || !isConnected || isWrongNetwork}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40"
                  >
                    {isPending || isConfirming ? 'Confirming...' : `1. Approve ${swapFrom}`}
                  </button>
                )}

                {isSwapApproved && !!swapAmount && (
                  <div className="text-center text-sm text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Approved — ready to swap
                  </div>
                )}

                <button
                  onClick={runSwap}
                  disabled={!isSwapApproved || isPending || isConfirming || !swapAmount || !isConnected || isWrongNetwork}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold disabled:opacity-40"
                >
                  {isPending || isConfirming ? 'Confirming...' : `Swap ${swapFrom} → ${swapTo}`}
                </button>
              </div>
            )}

            {tab === 'bridge' && (
              <div className="space-y-4">
                <div className="text-sm text-zinc-400">Bridge — coming soon</div>
                {isConnected && (
                  <div className="text-xs text-zinc-500 flex justify-between">
                    <span>USDC balance</span>
                    <span className="text-white font-medium">{formatAmt(usdcBal)} USDC</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <input type="number" value={bridgeAmount} onChange={(e) => setBridgeAmount(e.target.value)} placeholder="0.00" className="flex-1 bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-3xl font-semibold outline-none" />
                  <div className="shrink-0 flex items-center px-5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold">USDC</div>
                </div>
                <button disabled className="w-full py-4 rounded-xl bg-white/10 text-zinc-400 font-semibold cursor-not-allowed">Coming soon</button>
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
                    You can withdraw up to <strong>{formatAmt(userSupply, asset.decimals)}</strong> {asset.symbol}
                  </div>
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
                      onChange={(e) => setAmount(e.target.value)}
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
          <div>Flowlend · Arc Testnet · SimpleStableSwap</div>
        </div>
      </main>
    </div>
  )
}