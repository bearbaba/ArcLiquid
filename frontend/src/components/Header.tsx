import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "../lib/theme"
import type { NavPage } from "../lib/assets"

interface HeaderProps {
  points: number
  onProfileClick: () => void
}

export default function Header({ points, onProfileClick }: HeaderProps) {
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-lg font-black text-black shadow-lg shadow-emerald-500/20">
            F
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Flowlend</div>
            <div className="text-[11px] text-zinc-500 font-medium mt-0.5">Stablecoin-native DeFi on Arc</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
            TESTNET
          </span>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
          >
            Faucet
          </a>
          <button
            type="button"
            onClick={onProfileClick}
            className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10"
          >
            {points} pts
          </button>
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-xl border border-white/10 text-zinc-400"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ConnectButton label="Connect Wallet" showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  )
}