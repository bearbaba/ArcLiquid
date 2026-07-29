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
    <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-sm text-[var(--text)]">
      <div className="flex items-center gap-2.5">
        {isLoading && <Loader2 size={18} className="animate-spin text-blue-400" />}
        {isSuccess && <CheckCircle2 size={18} className="text-emerald-400" />}
        {isError && <XCircle size={18} className="text-red-400" />}
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
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
      >
        {hash.slice(0, 10)}...{hash.slice(-8)}
        <ExternalLink size={14} />
      </a>
    </div>
  )
}