import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  Layers,
  Briefcase,
  Send as SendIcon,
  Wallet,
  BookOpen,
} from "lucide-react"
import type { NavPage } from "../lib/assets"

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={14} /> },
  { id: "lend", label: "Lend", icon: <Landmark size={14} /> },
  { id: "swap", label: "Swap", icon: <ArrowLeftRight size={14} /> },
  { id: "liquidity", label: "Liquidity", icon: <Layers size={14} /> },
  { id: "portfolio", label: "Portfolio", icon: <Briefcase size={14} /> },
  { id: "payments", label: "Payments", icon: <SendIcon size={14} /> },
  { id: "bridge", label: "Bridge", icon: <ArrowLeftRight size={14} /> },
  { id: "treasury", label: "Treasury", icon: <Wallet size={14} /> },
  { id: "profile", label: "Profile", icon: <Wallet size={14} /> },
  { id: "guide", label: "Guide", icon: <BookOpen size={14} /> },
]

interface NavbarProps {
  page: NavPage
  setPage: (page: NavPage) => void
}

export default function Navbar({ page, setPage }: NavbarProps) {
  return (
    <nav className="border-b border-white/5 bg-[#0a0a0f]/90 sticky top-16 z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              page === id ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}