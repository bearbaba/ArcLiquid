import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { formatUnits } from 'viem'
import { toast } from 'sonner'
import { Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

const LENDING_POOL_ADDRESS = '0xYourDeployedLendingPoolAddressHere' as `0x${string}`

const lendingPoolAbi = [ /* Giữ ABI cũ */ ] as const

export default function App() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [activeTab, setActiveTab] = useState<'supply' | 'borrow'>('supply')
  const [amount, setAmount] = useState('')

  const { data: poolStats } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    functionName: 'getPoolStats',
  })

  const { writeContract } = useWriteContract()

  const totalSupplied = poolStats ? formatUnits(poolStats[0], 6) : '0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-6xl font-bold">ArcLiquid</h1>
            <p className="text-zinc-400">Stablecoin Money Market on Arc L1</p>
          </div>

          {isConnected ? (
            <button onClick={() => disconnect()} className="flex items-center gap-2 bg-red-500/10 text-red-400 px-6 py-3 rounded-2xl hover:bg-red-500/20">
              Disconnect {address?.slice(0,6)}...
            </button>
          ) : (
            <button onClick={() => connect()} className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-semibold hover:bg-zinc-200">
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          )}
        </div>

        <div className="text-center mb-12">
          <p className="text-6xl font-bold">{totalSupplied} USDC</p>
          <p className="text-zinc-400">Total Supplied</p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-10">
          <div className="flex mb-8 border-b border-zinc-800">
            <button onClick={() => setActiveTab('supply')} className={`flex-1 py-4 text-lg ${activeTab === 'supply' ? 'border-b-4 border-emerald-500 text-white' : 'text-zinc-400'}`}>
              <ArrowUpCircle className="inline mr-2" /> Supply
            </button>
            <button onClick={() => setActiveTab('borrow')} className={`flex-1 py-4 text-lg ${activeTab === 'borrow' ? 'border-b-4 border-emerald-500 text-white' : 'text-zinc-400'}`}>
              <ArrowDownCircle className="inline mr-2" /> Borrow
            </button>
          </div>

          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-6 py-6 text-4xl text-center focus:outline-none"
            placeholder="0.00"
          />

          <button 
            onClick={() => toast.success('Action triggered! (Demo)')}
            className="mt-8 w-full py-6 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-xl font-bold transition"
          >
            {activeTab === 'supply' ? 'Supply USDC' : 'Borrow USDC'}
          </button>
        </div>
      </div>
    </div>
  )
}