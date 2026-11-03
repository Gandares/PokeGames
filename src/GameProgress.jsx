import { useContext } from 'react'
import { GameProgressContext, getStats } from './game-progress'
import './game-progress.css'

export default function GameProgress() {
  const { mode, kind, onKindChange, day, language, revision } = useContext(GameProgressContext)
  const spanish = language === 'es'
  const stats = getStats(mode, kind, day, revision)
  return <section className="game-progress" aria-label={spanish ? 'Modo y estadísticas' : 'Mode and statistics'}>
    <div className="game-mode-selector" role="group" aria-label={spanish ? 'Modo de juego' : 'Game mode'}>
      <button type="button" aria-pressed={kind === 'infinite'} onClick={() => onKindChange('infinite')}>{spanish ? 'Infinito' : 'Infinite'}</button>
      <button type="button" aria-pressed={kind === 'daily'} onClick={() => onKindChange('daily')}>{spanish ? 'Reto diario' : 'Daily challenge'}</button>
    </div>
    {kind === 'daily' && <p className="daily-date">{spanish ? 'Un reto por día · Fecha UTC:' : 'One challenge per day · UTC date:'} {day}</p>}
    <details className="personal-stats"><summary>{spanish ? 'Mis estadísticas' : 'My statistics'}</summary><div className="personal-stats-grid">
      <div><strong>{stats.played}</strong><span>{spanish ? 'Partidas terminadas' : 'Finished games'}</span></div>
      <div><strong>{stats.wins}</strong><span>{mode === 'dex' ? (spanish ? 'Números exactos' : 'Exact guesses') : (spanish ? 'Victorias' : 'Wins')}</span></div>
      {mode !== 'dex' && <div><strong>{stats.average === null ? '—' : stats.average.toFixed(1)}</strong><span>{spanish ? 'Intentos por victoria' : 'Guesses per win'}</span></div>}
      {kind === 'daily' && <div><strong>{stats.streak}</strong><span>{spanish ? 'Racha diaria' : 'Daily streak'}</span></div>}
    </div>{mode === 'dex' && <p>{spanish ? 'Se cuenta un acierto si al menos un jugador indica el número exacto.' : 'A win means at least one player guessed the exact number.'}</p>}<p>{spanish ? 'Datos guardados en este navegador.' : 'Data is stored in this browser.'}</p></details>
  </section>
}
