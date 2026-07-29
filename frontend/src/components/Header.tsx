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
    <header className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="font-bold text-lg text-[var(--text)] shrink-0">Flowlend</div>
          {name ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-sm text-[var(--text-muted)] truncate hover:text-[var(--text)]"
            >
              {name}
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
          >
            Faucet
          </a>
          <button
            type="button"
            onClick={onOpenProfile}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-emerald-400"
          >
            {points} pts
          </button>
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <ConnectButton
            label="Connect Wallet"
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>
    </header>
  )
}