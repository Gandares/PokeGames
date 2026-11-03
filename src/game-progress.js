import { createContext } from 'react'

export const GameProgressContext = createContext(null)

const resultsKey = 'pokegames-results-v1'
const progressPrefix = 'pokegames-daily-v1-'

export const utcDay = () => new Date().toISOString().slice(0, 10)

export function dailyIndex(day, mode, length, retry = 0) {
  let hash = 2166136261
  for (const character of `${day}:${mode}:${retry}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return (hash >>> 0) % length
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { return false }
  return true
}

export function loadDaily(mode, day) {
  const saved = read(`${progressPrefix}${mode}`, null)
  return saved?.day === day ? saved.data : null
}

export function saveDaily(mode, day, data) {
  return write(`${progressPrefix}${mode}`, { day, data })
}

export function recordResult(mode, kind, day, won, attempts, id) {
  const results = read(resultsKey, {})
  const key = kind === 'daily' ? `daily:${mode}:${day}` : `infinite:${mode}:${id}`
  if (results[key]) return
  results[key] = { mode, kind, day, won, attempts }
  write(resultsKey, results)
}

export function getStats(mode, kind, day) {
  const results = Object.values(read(resultsKey, {})).filter((result) => result.mode === mode && result.kind === kind)
  const wins = results.filter((result) => result.won)
  const average = wins.length ? wins.reduce((total, result) => total + result.attempts, 0) / wins.length : null
  let streak = 0
  const dates = new Set(wins.map((result) => result.day))
  const cursor = new Date(`${day}T00:00:00Z`)
  if (results.some((result) => result.day === day && !result.won)) return { played: results.length, wins: wins.length, average, streak: 0 }
  if (!dates.has(day)) cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (dates.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1) }
  return { played: results.length, wins: wins.length, average, streak }
}

export const newRoundId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
