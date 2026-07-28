const POINTS_KEY = "flowlend-points"
const CHECKIN_KEY = "flowlend-checkin"
const NAME_KEY = "flowlend-name"
const BOARD_KEY = "flowlend-board"

export type BoardRow = { name: string; points: number; updatedAt: string }

export const REWARDS = {
  checkin: 10,
  supply: 5,
  withdraw: 2,
  borrow: 3,
  repay: 3,
  swap: 3,
  addLiquidity: 5,
  removeLiquidity: 2,
  send: 2,
  bridge: 5,
} as const

export function getDisplayName() {
  return localStorage.getItem(NAME_KEY) || ""
}

export function setDisplayName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim())
  syncBoard()
}

export function getPoints() {
  return Number(localStorage.getItem(POINTS_KEY) || "0")
}

export function addPoints(amount: number) {
  const next = getPoints() + amount
  localStorage.setItem(POINTS_KEY, String(next))
  syncBoard()
  return next
}

export function canCheckInToday() {
  const last = localStorage.getItem(CHECKIN_KEY)
  if (!last) return true
  return new Date(last).toDateString() !== new Date().toDateString()
}

export function dailyCheckIn() {
  if (!canCheckInToday()) return { ok: false as const, points: getPoints() }
  localStorage.setItem(CHECKIN_KEY, new Date().toISOString())
  const points = addPoints(REWARDS.checkin)
  return { ok: true as const, points }
}

function syncBoard() {
  const name = getDisplayName() || "Anon"
  const points = getPoints()
  let board: BoardRow[] = []
  try {
    board = JSON.parse(localStorage.getItem(BOARD_KEY) || "[]")
  } catch {
    board = []
  }
  const i = board.findIndex((r) => r.name === name)
  const row = { name, points, updatedAt: new Date().toISOString() }
  if (i >= 0) board[i] = row
  else board.push(row)
  board.sort((a, b) => b.points - a.points)
  localStorage.setItem(BOARD_KEY, JSON.stringify(board.slice(0, 20)))
}

export function getBoard(): BoardRow[] {
  try {
    return JSON.parse(localStorage.getItem(BOARD_KEY) || "[]")
  } catch {
    return []
  }
}