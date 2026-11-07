import { useContext, useRef, useState } from 'react'
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
  const [letters, setLetters] = useState(() => shuffle(name, day, pokemonId))
  const [dragPreview, setDragPreview] = useState(null)
  const drag = useRef(null)
  const spanish = language === 'es'

  const moveLetter = (id, targetId) => {
    setLetters((current) => {
      const from = current.findIndex((entry) => entry.id === id)
      const to = current.findIndex((entry) => entry.id === targetId)
      if (from < 0 || to < 0 || from === to) return current
      const reordered = [...current]
      const [moved] = reordered.splice(from, 1)
      reordered.splice(to, 0, moved)
      return reordered
    })
  }

  const startDrag = (event, entry) => {
    if (event.button !== 0) return
    drag.current = { id: entry.id, letter: entry.letter, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 4) current.moved = true
    if (!current.moved) return
    setDragPreview({ id: current.id, letter: current.letter, x: event.clientX, y: event.clientY })
  }

  const finishDrag = (event, cancelled = false) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    if (current.moved && !cancelled) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-anagram-id]')
      if (target && Number(target.dataset.anagramId) !== current.id) { moveLetter(current.id, Number(target.dataset.anagramId)); onEdit() }
    }
    drag.current = null
    setDragPreview(null)
  }

  const handleKey = (event, index) => {
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
    if (!direction) return
    event.preventDefault()
    const target = letters[index + direction]
    if (target) { moveLetter(letters[index].id, target.id); onEdit() }
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit(letters.map((entry) => entry.letter).join(''))
  }

  return <section className="anagram-game">
    <h3>{spanish ? 'ORDENA LAS LETRAS' : 'ARRANGE THE LETTERS'}</h3>
    <p>{spanish ? 'Arrastra las letras para ordenarlas. Con teclado, usa las flechas. Incluye el nombre de la forma especial si lo tiene.' : 'Drag the letters to reorder them. Use arrow keys with a keyboard. Include the form name for special forms.'}</p>
    <div className="anagram-letters" aria-label={spanish ? 'Letras para ordenar' : 'Letters to arrange'}>{letters.map((entry, index) => <button type="button" key={entry.id} data-anagram-id={entry.id} className={`anagram-letter ${dragPreview?.id === entry.id ? 'anagram-dragging' : ''}`} onPointerDown={(event) => startDrag(event, entry)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={(event) => finishDrag(event, true)} onKeyDown={(event) => handleKey(event, index)} aria-label={`${spanish ? 'Letra' : 'Letter'} ${entry.letter}, ${index + 1} / ${letters.length}`} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown">{entry.letter}</button>)}</div>
    {dragPreview && <span className="anagram-letter anagram-drag-preview" style={{ left: dragPreview.x, top: dragPreview.y }} aria-hidden="true">{dragPreview.letter}</span>}
    <form onSubmit={submit}><button type="submit" className="primary-button">{spanish ? 'Comprobar' : 'Check'} ↗</button><button type="button" className="reveal-button" onClick={onReveal}>{spanish ? 'REVELAR POKÉMON' : 'REVEAL POKÉMON'} ↗</button></form>
    <p className="anagram-feedback" role="status">{feedback === 'wrong' ? (spanish ? 'No es correcto. ¡Sigue intentándolo!' : 'Not quite. Keep trying!') : '\u00a0'}</p>
  </section>
}
