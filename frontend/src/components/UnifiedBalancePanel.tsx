import { useCallback, useEffect, useState } from "react"
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi"
import { parseUnits, maxUint256 } from "viem"
import { toast } from "sonner"
import { Loader2, RefreshCw } from "lucide-react"
import { getAppKit } from "../lib/circleAppKit"
import { ASSETS, formatAmt, formatHealth } from "../lib/assets"
import { usePoolData } from "../hooks/usePoolData"
import type { AssetId, LendTab, NavPage } from "../lib/assets"

type Mode = "deposit" | "spend" | "supply" | "repay"
type ChainId = "Arc_Testnet" | "Ethereum_Sepolia" | "Base_Sepolia"

const CHAINS: { id: ChainId; label: string }[] = [
  { id: "Base_Sepolia", label: "Base Sepolia" },
  { id: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { id: "Arc_Testnet", label: "Arc Testnet" },
]

const poolAbi = [
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "repay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const

interface Props {
  setPage?: (p: NavPage) => void
  setLendTab?: (t: LendTab) => void
  setAssetId?: (id: AssetId) => void
}

export default function UnifiedBalancePanel({ setPage, setLendTab, setAssetId }: Props) {
  const goLend = (tab: LendTab) => {
    setAssetId?.("USDC")
    setLendTab?.(tab)
    setPage?.("lend")
  }

  const { address, isConnected } = useAccount()
  const [mode, setMode] = useState<Mode>("deposit")
  const [amount, setAmount] = useState("")
  const [fromChain, setFromChain] = useState<ChainId>("Arc_Testnet")
  const [spendChain, setSpendChain] = useState<ChainId>("Arc_Testnet")
  const [spendTo, setSpendTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmed, setConfirmed] = useState("—")
  const [pending, setPending] = useState("—")
  const [step, setStep] = useState("")

  const asset = ASSETS.USDC
  const { poolLive, poolAddr, userSupply, userDebt, health, refetchAll } =
    usePoolData("USDC")

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const { data: arcUsdcBal } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && poolAddr ? [address, poolAddr] : undefined,
  })

  useEffect(() => {
    if (address && !spendTo) setSpendTo(address)
  }, [address])

  const refreshBalance = useCallback(async () => {
    if (!isConnected) return
    setRefreshing(true)
    try {
      const { kit, adapter } = await getAppKit()
      const balances = await kit.unifiedBalance.getBalances({
        sources: [{ adapter }],
        networkType: "testnet",
        includePending: true,
      })
      setConfirmed(balances?.totalConfirmedBalance ?? "0")
      setPending(balances?.totalPendingBalance ?? "0")
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || "Failed to load balance")
    } finally {
      setRefreshing(false)
    }
  }, [isConnected])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

  useEffect(() => {
    if (isSuccess) {
      void refetchAllowance()
      void refetchAll?.()
      void refreshBalance()
    }
  }, [isSuccess])

  const handleDeposit = async () => {
    if (!isConnected) return toast.error("Connect wallet first")
    const clean = amount.replace(",", ".").trim()
    if (!clean || Number(clean) <= 0) return toast.error("Enter a valid amount")
    setLoading(true)
    setStep("Depositing...")
    try {
      const { kit, adapter } = await getAppKit()
      await kit.unifiedBalance.deposit({
        from: { adapter, chain: fromChain },
        amount: clean,
        token: "USDC",
      })
      toast.success("Deposit submitted")
      setAmount("")
      void refreshBalance()
      setTimeout(() => void refreshBalance(), 2000)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || e?.details || "Deposit failed")
    } finally {
      setLoading(false)
      setStep("")
    }
  }

  const handleSpend = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    const clean = amount.replace(",", ".").trim()
    if (!clean || Number(clean) <= 0) return toast.error("Enter a valid amount")
    const recipient = spendTo || address
    setLoading(true)
    setStep("Spending...")
    try {
      const { kit, adapter } = await getAppKit()
      await kit.unifiedBalance.spend({
        amount: clean,
        from: { adapter },
        to: {
          adapter,
          chain: spendChain,
          recipientAddress: recipient,
        },
      })
      toast.success("Spend submitted")
      setAmount("")
      void refreshBalance()
      setTimeout(() => void refreshBalance(), 2000)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.shortMessage || e?.message || e?.details || "Spend failed")
    } finally {
      setLoading(false)
      setStep("")
    }
  }

  const spendToSelf = async (clean: string) => {
    if (!address) throw new Error("No address")
    const { kit, adapter } = await getAppKit()
    setStep("Spending to Arc...")
    await kit.unifiedBalance.spend({
      amount: clean,
      from: { adapter },
      to: {
        adapter,
        chain: "Arc_Testnet",
        recipientAddress: address,
      },
    })
  }

  const handleSupplyOrRepay = async () => {
    if (!isConnected || !address) return toast.error("Connect wallet first")
    if (!poolLive || !poolAddr) return toast.error("USDC pool unavailable")
    const clean = amount.replace(",", ".").trim()
    if (!clean || Number(clean) <= 0) return toast.error("Enter a valid amount")
    let value: bigint
    try {
      value = parseUnits(clean, asset.decimals)
    } catch {
      return toast.error("Invalid amount")
    }
    setLoading(true)
    try {
      await spendToSelf(clean)
      toast.success("Spend submitted — approve then " + mode + " if needed")
      if (!allowance || allowance < value) {
        setStep("Approve...")
        writeContract({
          address: asset.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [poolAddr, maxUint256],
        })
        setLoading(false)
        setStep("")
        return
      }
      setStep(mode === "supply" ? "Supplying..." : "Repaying...")
      writeContract({
        address: poolAddr,
        abi: poolAbi,
        functionName: mode === "supply" ? "supply" : "repay",
        args: [value],
      })
      toast.success(mode === "supply" ? "Supply submitted" : "Repay submitted")
      setAmount("")
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed")
    } finally {
      setLoading(false)
      setStep("")
    }
  }

  const onPrimary = () => {
    if (mode === "deposit") return void handleDeposit()
    if (mode === "spend") return void handleSpend()
    return void handleSupplyOrRepay()
  }

  const busy = loading || isPending || isConfirming
  const primaryLabel =
    mode === "deposit"
      ? "Deposit"
      : mode === "spend"
        ? "Spend"
        : mode === "supply"
          ? "Supply to Lend"
          : "Repay"

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-[var(--text-muted)]">Unified Balance</div>
            <div className="text-3xl font-semibold text-[var(--text)] mt-1">
              {confirmed} USDC
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Pending: {pending} USDC
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshBalance()}
            disabled={refreshing || !isConnected}
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex gap-1.5 p-0.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
          {(
            [
              { id: "deposit" as Mode, label: "Deposit" },
              { id: "spend" as Mode, label: "Spend" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                mode === m.id ? "bg-white text-black" : "text-[var(--text-muted)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("supply")}
            className={`px-2.5 py-1 rounded-lg border ${
              mode === "supply"
                ? "border-emerald-500 text-emerald-400"
                : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            Supply to Lend
          </button>
          <button
            type="button"
            onClick={() => setMode("repay")}
            className={`px-2.5 py-1 rounded-lg border ${
              mode === "repay"
                ? "border-emerald-500 text-emerald-400"
                : "border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            Repay
          </button>
        </div>

        {mode === "deposit" && (
          <div className="space-y-2">
            <div className="text-xs text-[var(--text-muted)]">Source chain</div>
            <select
              value={fromChain}
              onChange={(e) => setFromChain(e.target.value as ChainId)}
              className="field-select w-full px-3 py-2 text-sm"
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "spend" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)]">Destination chain</div>
              <select
                value={spendChain}
                onChange={(e) => setSpendChain(e.target.value as ChainId)}
                className="field-select w-full px-3 py-2 text-sm"
              >
                {CHAINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)]">Recipient address</div>
              <input
                type="text"
                value={spendTo}
                onChange={(e) => setSpendTo(e.target.value.trim())}
                placeholder="0x..."
                className="field-input w-full px-3 py-2 text-sm outline-none font-mono"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>Amount (USDC)</span>
            {mode === "deposit" && fromChain === "Arc_Testnet" && (
              <span>Wallet: {formatAmt(arcUsdcBal, asset.decimals)}</span>
            )}
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            placeholder="0.00"
            className="field-input w-full px-3 py-2 text-xl outline-none font-semibold"
          />
        </div>

        {step && <div className="text-xs text-cyan-400">{step}</div>}

        

        <button
          type="button"
          disabled={!isConnected || !amount || busy}
          onClick={onPrimary}
          className="btn-action w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Working...
            </>
          ) : !isConnected ? (
            "Connect wallet"
          ) : (
            primaryLabel
          )}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3 text-sm">
        <div className="font-medium text-[var(--text)]">What is Unified Balance</div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          One USDC balance across chains via Circle Gateway. Deposit from a source
          chain, then Spend to any supported destination and recipient.
        </p>
        <div className="flex justify-between text-[var(--text-muted)] pt-1">
          <span>Confirmed</span>
          <span className="text-[var(--text)]">{confirmed} USDC</span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Pending</span>
          <span className="text-[var(--text)]">{pending} USDC</span>
        </div>
        <div className="text-xs text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border)]">
          <div><span className="text-[var(--text)] font-medium">Deposit</span> — move USDC into Unified Balance</div>
          <div><span className="text-[var(--text)] font-medium">Spend</span> — pay out to a wallet on a chosen chain</div>
          <div><span className="text-[var(--text)] font-medium">Supply / Repay</span> — optional: fund Arc lending</div>
        </div>
        <div className="pt-2 border-t border-[var(--border)] font-medium text-[var(--text)]">
          USDC Lend (optional)
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Supplied</span>
          <span className="text-emerald-400">
            {poolLive ? formatAmt(userSupply, asset.decimals) : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Borrowed</span>
          <span className="text-orange-400">
            {poolLive ? formatAmt(userDebt, asset.decimals) : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>Health</span>
          <span className="text-[var(--text)]">
            {poolLive ? formatHealth(health) : "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => goLend("borrow")}
          className="w-full mt-2 py-2.5 rounded-xl border border-emerald-500/50 text-emerald-400 text-sm font-semibold"
        >
          Open Lend
        </button>
        <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
          Deposit and Spend are core Unified Balance actions. Supply to Lend and
          Repay are optional shortcuts into the USDC pool.
        </p>
      </div>
    </div>
  )
}
