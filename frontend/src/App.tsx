import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { Wallet, Shield } from 'lucide-react'
import { toast } from 'sonner'

const LENDING_POOL_ADDRESS = '0xYourDeployedLendingPoolAddressHere' as const  // Thay sau khi deploy
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

const lendingPoolAbi = [ /* ABI sẽ paste sau nếu cần, tạm dùng view functions */ ] as const
// Để đơn giản, bạn có thể dùng wagmi với function name trực tiếp

export default function App() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'supply' | 'borrow'>('supply')
  const [supplyAmount, setSupplyAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')

  const { data: poolStats } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: lendingPoolAbi,
    functionName: 'getPoolStats',
  })

  const { writeContract } = useWriteContract()

  const formatUSDC = (value: bigint | undefined) => value ? formatUnits(value, 6) : '0'

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold mb-2">ArcLiquid</h1>
        <p className="text-zinc-400 mb-8">Stablecoin Money Market on Arc L1</p>

        {isConnected && (
          <div className="bg-zinc-900 p-6 rounded-2xl mb-8">
            Connected: {address?.slice(0,6)}...{address?.slice(-4)}
          </div>
        )}

        {/* Pool Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 p-6 rounded-2xl">
            <p className="text-zinc-400">Total Supplied</p>
            <p className="text-3xl font-bold">{formatUSDC(poolStats?.[0])} USDC</p>
          </div>
          {/* Thêm các card khác tương tự */}
        </div>

        <div className="bg-zinc-900 rounded-3xl p-8">
          <div className="flex gap-4 mb-8">
            <button onClick={() => setActiveTab('supply')} className={`px-6 py-3 rounded-2xl ${activeTab === 'supply' ? 'bg-white text-black' : 'bg-zinc-800'}`}>Supply</button>
            <button onClick={() => setActiveTab('borrow')} className={`px-6 py-3 rounded-2xl ${activeTab === 'borrow' ? 'bg-white text-black' : 'bg-zinc-800'}`}>Borrow</button>
          </div>

          {activeTab === 'supply' && (
            <div>
              <input 
                type="number" 
                value={supplyAmount} 
                onChange={(e) => setSupplyAmount(e.target.value)}
                placeholder="Amount to supply"
                className="w-full bg-zinc-800 p-4 rounded-2xl text-xl"
              />
              <button onClick={() => { /* supply logic */ }} className="mt-4 w-full py-4 bg-emerald-600 rounded-2xl font-bold">Supply USDC</button>
            </div>
          )}

          {activeTab === 'borrow' && (
            <div>
              <button onClick={() => writeContract({ address: LENDING_POOL_ADDRESS, functionName: 'enableCompliance' })} className="mb-4 px-6 py-2 bg-yellow-600 rounded-xl">Enable Compliance</button>
              {/* Borrow input similar */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
