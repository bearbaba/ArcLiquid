import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "../lib/theme"
import { getPoints, getDisplayName } from "../lib/points"

interface HeaderProps {
  onOpenProfile: () => void
}

export default function Header({ onOpenProfile }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const points = typeof window !== "undefined" ? getPoints() : 0
  const name = typeof window !== "undefined" ? getDisplayName() : ""

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-bold text-sm">
            F
          </div>
          <div>
            <div className="font-semibold text-[var(--text)] leading-tight">Flowlend</div>
            <div className="text-[10px] text-[var(--text-muted)] leading-tight">
              {name || "Bear Crypto"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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