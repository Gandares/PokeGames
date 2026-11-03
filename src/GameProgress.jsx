import { useContext } from 'react'
import { GameProgressContext } from './game-progress'
import './game-progress.css'

export default function GameProgress() {
  const { kind, onKindChange, day, language } = useContext(GameProgressContext)
  const spanish = language === 'es'
  return <div className="game-progress">
    <div className="game-mode-selector" role="group" aria-label={spanish ? 'Modo de juego' : 'Game mode'}>
      <button type="button" aria-pressed={kind === 'daily'} onClick={() => onKindChange('daily')} title={`${spanish ? 'Fecha UTC' : 'UTC date'}: ${day}`}>{spanish ? 'Reto diario' : 'Daily challenge'}</button>
      <button type="button" aria-pressed={kind === 'infinite'} onClick={() => onKindChange('infinite')}>{spanish ? 'Infinito' : 'Infinite'}</button>
    </div>
  </div>
}
