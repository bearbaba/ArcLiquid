import type { AssetId, NavPage } from "../lib/assets"

const PAGES: { id: NavPage; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lend", label: "Lend" },
  { id: "swap", label: "Swap" },
  { id: "liquidity", label: "Liquidity" },
  { id: "portfolio", label: "Portfolio" },
  { id: "payments", label: "Payments" },
  { id: "bridge", label: "Bridge" },
  { id: "treasury", label: "Treasury" },
  { id: "guide", label: "Guide" },
]

interface NavbarProps {
  page: NavPage
  setPage: (page: NavPage) => void
  assetId?: AssetId
  setAssetId?: (id: AssetId) => void
}

export default function Navbar({ page, setPage, assetId, setAssetId }: NavbarProps) {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2">
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPage(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              page === p.id
                ? "bg-white text-black"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {p.label}
          </button>
        ))}

        {setAssetId && (
          <select
            value={assetId || "USDC"}
            onChange={(e) => setAssetId(e.target.value as AssetId)}
            className="field-select ml-auto px-2 py-1.5 text-xs"
          >
            <option value="USDC">USDC</option>
            <option value="EURC">EURC</option>
            <option value="CIRBTC">cirBTC</option>
          </select>
        )}
      </div>
    </nav>
  )
}