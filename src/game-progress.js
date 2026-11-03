import { createContext } from 'react'

export const GameProgressContext = createContext(null)

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

