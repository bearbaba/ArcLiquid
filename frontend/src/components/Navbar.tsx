import type { NavPage } from "../lib/assets"

const PAGES: { id: NavPage; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lend", label: "Lend" },
  { id: "swap", label: "Swap" },
  { id: "liquidity", label: "Pools" },
  { id: "portfolio", label: "Portfolio" },
  { id: "payments", label: "Payments" },
  { id: "bridge", label: "Bridge" },
  { id: "treasury", label: "Treasury" },
  { id: "profile", label: "Profile" },
  { id: "guide", label: "Guide" },
]

interface NavbarProps {
  page: NavPage
  setPage: (page: NavPage) => void
}

export default function Navbar({ page, setPage }: NavbarProps) {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-start gap-1.5">
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPage(p.id)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
              page === p.id
                ? "bg-white text-black"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </nav>
  )
}