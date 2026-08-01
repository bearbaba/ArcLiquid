import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "../lib/theme"
import { getPoints } from "../lib/points"

interface HeaderProps {
  onOpenProfile: () => void
}

export default function Header({ onOpenProfile }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const points = typeof window !== "undefined" ? getPoints() : 0

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-bold text-base">
            F
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-[var(--text)]">
                Flowlend
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border border-cyan-500/40 text-cyan-400">
                Arc Testnet
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">
              Money markets on Arc · Circle rails
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg border border-emerald-500/40 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
          >
            Faucet
          </a>
          <button
            type="button"
            onClick={onOpenProfile}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-emerald-400"
          >
            {points} pts
          </button>
          <button
            type="button"
            onClick={toggle}
            className="w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus="address"
          />
        </div>
      </div>
    </header>
  )
}
