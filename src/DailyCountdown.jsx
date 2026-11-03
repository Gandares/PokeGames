import { useContext, useEffect, useState } from 'react'
import { GameProgressContext } from './game-progress'

export default function DailyCountdown() {
  const { language } = useContext(GameProgressContext)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const date = new Date(now)
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  const remaining = Math.ceil((next - now) / 1000)
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor(remaining % 3600 / 60)
  const seconds = remaining % 60
  const display = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')

  return <div className="daily-countdown"><span>{language === 'es' ? 'Próximo reto diario en' : 'Next daily challenge in'}</span><time dateTime={new Date(next).toISOString()}>{display}</time></div>
}
