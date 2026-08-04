import type { NavPage } from "../lib/assets"
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  Droplets,
  Briefcase,
  Send,
  ArrowLeftRight as BridgeIcon,
  Layers,
  Vault,
  User,
  BookOpen,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const PAGES: { id: NavPage; label: string; Icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "lend", label: "Lend", Icon: Landmark },
  { id: "swap", label: "Swap", Icon: ArrowLeftRight },
  { id: "liquidity", label: "Pools", Icon: Droplets },
  { id: "portfolio", label: "Portfolio", Icon: Briefcase },
  { id: "payments", label: "Payments", Icon: Send },
  { id: "bridge", label: "Bridge", Icon: BridgeIcon },
  { id: "unified", label: "Unified", Icon: Layers },
  { id: "treasury", label: "Treasury", Icon: Vault },
  { id: "profile", label: "Profile", Icon: User },
  { id: "guide", label: "Guide", Icon: BookOpen },
]

interface NavbarProps {
  page: NavPage
  setPage: (page: NavPage) => void
}

export default function Navbar({ page, setPage }: NavbarProps) {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {PAGES.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              className={`group flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5"
              }`}
            >
              <Icon
                size={15}
                strokeWidth={active ? 2.25 : 1.75}
                className={active ? "text-emerald-400" : "text-[var(--text-muted)] group-hover:text-cyan-400"}
              />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
