export type TxRecord = {
  hash: string
  type: string
  detail: string
  time: string
}

const KEY = "flowlend-tx-history"
const MAX = 50

export function pushTx(type: string, detail: string, hash?: string) {
  let list: TxRecord[] = []
  try {
    list = JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    list = []
  }
  const h = hash && hash.startsWith("0x") ? hash : ""
  // skip pure duplicate of same hash+type
  if (h && list[0]?.hash === h && list[0]?.type === type) return
  list.unshift({
    hash: h,
    type,
    detail,
    time: new Date().toISOString(),
  })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  try {
    window.dispatchEvent(new Event("flowlend-tx"))
  } catch {}
}

export function getTxHistory(): TxRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    return []
  }
}

export function extractTxHash(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined
  const r = result as Record<string, any>
  const h =
    r.hash ||
    r.transactionHash ||
    r.txHash ||
    r.txid ||
    (Array.isArray(r.steps)
      ? r.steps.map((s: any) => s?.txHash || s?.hash || s?.transactionHash).find((x: any) => typeof x === "string" && x.startsWith("0x"))
      : undefined)
  return typeof h === "string" && h.startsWith("0x") ? h : undefined
}
