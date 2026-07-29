import { useWaitForTransactionReceipt } from "wagmi"
import { ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface TxStatusProps {
  hash?: `0x${string}`
}

export default function TxStatus({ hash }: TxStatusProps) {
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  if (!hash) return null

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text)]">
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 size={16} className="animate-spin text-blue-400" />}
        {isSuccess && <CheckCircle2 size={16} className="text-emerald-400" />}
        {isError && <XCircle size={16} className="text-red-400" />}
        <span className="font-medium">
          {isLoading && "Confirming..."}
          {isSuccess && "Transaction successful"}
          {isError && "Transaction failed"}
          {!isLoading && !isSuccess && !isError && "Submitted"}
        </span>
      </div>
      <a
        href={`https://testnet.arcscan.app/tx/${hash}`}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
      >
        {hash.slice(0, 10)}...{hash.slice(-8)}
        <ExternalLink size={12} />
      </a>
    </div>
  )
}