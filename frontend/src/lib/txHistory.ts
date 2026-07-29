export type TxRecord = {
  hash: string
  type: string
  detail: string
  time: string
}

const KEY = "flowlend-tx-history"
const MAX = 20

export function pushTx(type: string, detail: string, hash?: string) {
  if (!hash) return
  let list: TxRecord[] = []
  try {
    list = JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    list = []
  }
  list.unshift({
    hash,
    type,
    detail,
    time: new Date().toISOString(),
  })
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
}

export function getTxHistory(): TxRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    return []
  }
}
