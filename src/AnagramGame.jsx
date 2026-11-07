import { useContext, useState } from 'react'
import { GameProgressContext, dailyIndex } from './game-progress'
import './anagram.css'

function shuffle(name, day, id) {
  const letters = Array.from(name.normalize('NFC').toUpperCase()).filter((letter) => /[\p{L}\p{N}♀♂]/u.test(letter)).map((letter, index) => ({ letter, id: index }))
  const original = letters.map((entry) => entry.letter).join('')
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const selected = day ? dailyIndex(day, `anagram-${id}`, index + 1, index) : Math.floor(Math.random() * (index + 1))
    ;[letters[index], letters[selected]] = [letters[selected], letters[index]]
  }
  if (letters.length > 1 && letters.map((entry) => entry.letter).join('') === original) {
    const firstDifferent = letters.findIndex((entry) => entry.letter !== letters[0].letter)
    if (firstDifferent > 0) [letters[0], letters[firstDifferent]] = [letters[firstDifferent], letters[0]]
  }
  return letters
}

export default function AnagramGame() {
  const { language, name, pokemonId, day, feedback, onSubmit, onReveal, onEdit } = useContext(GameProgressContext)
  const [letters] = useState(() => shuffle(name, day, pokemonId))
  const [selected, setSelected] = useState([])
  const spanish = language === 'es'
  const remaining = letters.filter((letter) => !selected.includes(letter.id))

  const submit = (event) => {
    event.preventDefault()
    if (selected.length !== letters.length) return
    const answer = selected.map((id) => letters.find((entry) => entry.id === id).letter).join('')
    if (!onSubmit(answer)) setSelected([])
  }

  return <section className="anagram-game">
    <h3>{spanish ? 'ORDENA LAS LETRAS' : 'ARRANGE THE LETTERS'}</h3>
    <p>{spanish ? 'Pulsa las letras para formar el nombre. Si tiene una forma especial, incluye también su nombre.' : 'Tap the letters to form the name. Include the form name for special forms.'}</p>
    <div className="anagram-answer" aria-label={spanish ? 'Tu respuesta' : 'Your answer'}>
      {selected.length ? selected.map((id, index) => { const entry = letters.find((letter) => letter.id === id); return <button type="button" key={id} className="anagram-letter anagram-selected" onClick={() => { setSelected((current) => current.filter((item) => item !== id)); onEdit() }} aria-label={`${spanish ? 'Quitar' : 'Remove'} ${entry.letter} ${index + 1}`}>{entry.letter}</button> }) : <span className="anagram-placeholder">{spanish ? 'Tu respuesta aparecerá aquí' : 'Your answer appears here'}</span>}
    </div>
    <div className="anagram-letters" aria-label={spanish ? 'Letras disponibles' : 'Available letters'}>{remaining.map((entry, index) => <button type="button" key={entry.id} className="anagram-letter" onClick={() => { setSelected((current) => [...current, entry.id]); onEdit() }} aria-label={`${spanish ? 'Añadir' : 'Add'} ${entry.letter} ${index + 1}`}>{entry.letter}</button>)}</div>
    <form onSubmit={submit}><button type="submit" className="primary-button" disabled={remaining.length > 0}>{spanish ? 'Comprobar' : 'Check'} ↗</button><button type="button" className="reveal-button" onClick={onReveal}>{spanish ? 'REVELAR POKÉMON' : 'REVEAL POKÉMON'} ↗</button></form>
    <p className="anagram-feedback" role="status">{feedback === 'wrong' ? (spanish ? 'No es correcto. ¡Sigue intentándolo!' : 'Not quite. Keep trying!') : '\u00a0'}</p>
  </section>
}
