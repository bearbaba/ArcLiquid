import { useState } from "react"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import {
  getDisplayName,
  setDisplayName as saveDisplayName,
  getPoints,
  canCheckInToday,
  dailyCheckIn,
  getBoard,
  REWARDS,
  type BoardRow,
} from "../lib/points"
import type { NavPage } from "../lib/assets"

interface ProfileProps {
  setPage: (page: NavPage) => void
}

export default function Profile({ setPage }: ProfileProps) {
  const { address } = useAccount()
  const [displayName, setDisplayName] = useState(() =>
    typeof window !== "undefined" ? getDisplayName() : ""
  )
  const [editing, setEditing] = useState(false)
  const [points, setPoints] = useState(() =>
    typeof window !== "undefined" ? getPoints() : 0
  )
  const [board, setBoard] = useState<BoardRow[]>(() =>
    typeof window !== "undefined" ? getBoard() : []
  )

  const refresh = () => {
    setPoints(getPoints())
    setBoard(getBoard())
  }

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"
  const name = displayName || "Anon"

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      {/* Wallet + name on top */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <span className="text-lg font-semibold text-[var(--text)]">{name}</span>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="p-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                    aria-label="Edit name"
                  >
                    <Pencil size={14} />
                  </button>
                </>
              ) : (
                <div className="flex gap-2 w-full">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm outline-none text-[var(--text)]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveDisplayName(displayName)
                      setEditing(false)
                      refresh()
                      toast.success("Saved")
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white text-black text-sm font-semibold"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
            <div className="font-mono text-sm text-[var(--text-muted)] mt-1 truncate">{short}</div>
          </div>
          {address && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(address)
                toast.success("Address copied")
              }}
              className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-6 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">Your points</div>
            <div className="text-4xl font-extrabold text-emerald-400 tabular-nums">{points}</div>
          </div>
          <button
            type="button"
            disabled={!canCheckInToday()}
            onClick={() => {
              const r = dailyCheckIn()
              if (!r.ok) return toast.error("Already checked in today")
              refresh()
              toast.success(`Check-in +${REWARDS.checkin} pts`)
            }}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black text-sm font-bold disabled:opacity-40"
          >
            {canCheckInToday() ? `Check in · +${REWARDS.checkin}` : "Done today"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
        <div className="text-sm font-semibold">Missions</div>
        <div className="space-y-2">
          {[
            { label: "Swap tokens", pts: REWARDS.swap, page: "swap" as NavPage },
            { label: "Add liquidity", pts: REWARDS.addLiquidity, page: "liquidity" as NavPage },
            { label: "Supply to Lend", pts: REWARDS.supply, page: "lend" as NavPage },
            { label: "Send payment", pts: REWARDS.send, page: "payments" as NavPage },
          ].map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setPage(m.page)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-sm"
            >
              <span>{m.label}</span>
              <span className="text-emerald-400 font-semibold text-xs">+{m.pts} pts</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="text-sm font-semibold mb-3">Leaderboard</div>
        {board.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Check in or save a name to appear here.</p>
        ) : (
          board.map((row, i) => (
            <div
              key={row.name + i}
              className="flex justify-between items-center py-2.5 text-sm border-b border-[var(--border)] last:border-0"
            >
              <span>
                <span className="text-[var(--text-muted)] text-xs mr-2">#{i + 1}</span>
                {row.name}
              </span>
              <span className="text-emerald-400 font-semibold tabular-nums">{row.points}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}