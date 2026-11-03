import { useContext, useEffect, useRef, useState } from 'react'
import { PokedexGameContext } from './pokedex-context'
import { scorePokedexRound } from './pokedex-scoring'
import { dailyIndex, loadDaily, newRoundId, recordResult, saveDaily } from './game-progress'
import './pokedex-game.css'

export default function PokedexGame() {
  const { catalog, language, kind, day, onResult, catalogError, retryCatalog, onRoundStart, onExact } = useContext(PokedexGameContext)
  const spanish = language === 'es'
  const [saved] = useState(() => kind === 'daily' ? loadDaily('dex', day) : null)
  const [playerCount, setPlayerCount] = useState(saved?.playerCount ?? 2)
  const [names, setNames] = useState(saved?.names ?? Array(8).fill(''))
  const [players, setPlayers] = useState(saved?.players ?? [])
  const [started, setStarted] = useState(saved?.started ?? false)
  const [round, setRound] = useState(1)
  const [requestNumber, setRequestNumber] = useState(0)
  const [pokemon, setPokemon] = useState(saved?.pokemon ?? null)
  const [target, setTarget] = useState(saved?.target ?? null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [guesses, setGuesses] = useState(saved?.guesses ?? [])
  const [result, setResult] = useState(saved?.result ?? null)
  const [error, setError] = useState('')
  const roundId = useRef(newRoundId())

  useEffect(() => {
    if (!started || !catalog.length || (saved?.pokemon && round === 1 && requestNumber === 0)) return
    const controller = new AbortController()
    const choice = catalog[kind === 'daily' ? dailyIndex(day, 'dex', catalog.length) : Math.floor(Math.random() * catalog.length)]
    fetch(`https://pokeapi.co/api/v2/pokemon/${choice.id}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('pokemon'); return response.json() })
      .then((data) => { setPokemon(data); setTarget(choice); setLoading(false) })
      .catch(() => { if (!controller.signal.aborted) { setLoadError(true); setLoading(false) } })
    return () => controller.abort()
  }, [catalog, started, round, requestNumber, kind, day, saved])

  useEffect(() => {
    if (kind === 'daily' && started && pokemon && target) saveDaily('dex', day, { playerCount, names, players, started, pokemon, target, guesses, result })
  }, [kind, day, playerCount, names, players, started, pokemon, target, guesses, result])

  const start = (event) => {
    event.preventDefault()
    const selectedNames = names.slice(0, playerCount).map((name) => name.trim())
    if (selectedNames.some((name) => !name)) { setError('names'); return }
    if (new Set(selectedNames.map((name) => name.toLocaleLowerCase())).size !== selectedNames.length) { setError('duplicate'); return }
    setPlayers(selectedNames.map((name) => ({ name, score: 0 })))
    setGuesses(selectedNames.map(() => ''))
    setError('')
    setLoading(true)
    setLoadError(false)
    setStarted(true)
    onRoundStart()
  }
  const submit = (event) => {
    event.preventDefault()
    if (!target || result) return
    if (guesses.some((guess) => !/^\d+$/.test(guess) || Number(guess) < 1 || Number(guess) > 1025)) { setError('guess'); return }
    const numbers = guesses.map(Number)
    const outcome = scorePokedexRound(numbers, target.dexNumber)
    setPlayers((current) => current.map((player, index) => ({ ...player, score: player.score + (outcome.winners[index] ? 1 : 0) })))
    setResult({ ...outcome, guesses: numbers })
    recordResult('dex', kind, day, outcome.exact, 1, roundId.current)
    onResult()
    setError('')
    if (outcome.exact) onExact()
  }
  const nextRound = () => {
    roundId.current = newRoundId()
    setPokemon(null)
    setTarget(null)
    setResult(null)
    setGuesses(players.map(() => ''))
    setLoadError(false)
    setLoading(true)
    setError('')
    setRound((current) => current + 1)
    onRoundStart()
  }
  const resetPlayers = () => {
    setStarted(false)
    setPlayers([])
    setPokemon(null)
    setTarget(null)
    setResult(null)
    setRound(1)
    setLoadError(false)
    setError('')
    onRoundStart()
  }
  const errorText = {
    names: spanish ? 'Escribe un nombre para cada jugador.' : 'Enter a name for each player.',
    duplicate: spanish ? 'Los nombres de los jugadores deben ser diferentes.' : 'Player names must be different.',
    guess: spanish ? 'Cada respuesta debe ser un número entero entre 1 y 1025.' : 'Each guess must be a whole number between 1 and 1025.',
  }
  const winnerNames = result ? players.filter((_, index) => result.winners[index]).map((player) => player.name) : []
  const image = pokemon?.sprites.other?.['official-artwork']?.front_default || pokemon?.sprites.front_default
  const targetName = target && (spanish ? target.name.replace('(Primal)', '(Primigenio)') : target.name)

  return <>
    <section className="hero dex-hero"><div className="eyebrow"><span className="dot" /> {spanish ? 'JUEGO DE 1 A 8 JUGADORES' : '1 TO 8 PLAYER GAME'}</div><h1><em>{spanish ? 'Número Pokédex' : 'Pokédex number'}</em></h1><p>{spanish ? 'Adivinad su número de Pokédex. La respuesta más cercana gana un punto; en caso de empate, todos los más cercanos puntúan.' : 'Guess its Pokédex number. The closest answer earns a point; everyone tied for closest scores.'}</p></section>
    <section className="game-card dex-game">
      {!started ? <form className="dex-setup" onSubmit={start}><div><span className="section-kicker"><span className="red-dot" /> {spanish ? 'PREPARA LA PARTIDA' : 'SET UP YOUR GAME'}</span><h2>{spanish ? '¿Quién juega?' : 'Who is playing?'}</h2></div><label htmlFor="dex-player-count">{spanish ? 'Número de jugadores' : 'Number of players'}</label><div className="dex-select"><select id="dex-player-count" value={playerCount} onChange={(event) => { setPlayerCount(Number(event.target.value)); setError('') }}>{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select><svg className="dex-select-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg></div><div className="dex-name-grid">{Array.from({ length: playerCount }, (_, index) => <div key={index}><label htmlFor={`dex-name-${index}`}>{spanish ? 'Jugador' : 'Player'} {index + 1}</label><input id={`dex-name-${index}`} type="text" maxLength={24} value={names[index]} onChange={(event) => { const value = event.target.value; setNames((current) => current.map((name, item) => item === index ? value : name)); setError('') }} placeholder={spanish ? 'Nombre' : 'Name'} required /></div>)}</div>{error && <p className="dex-error" role="alert">{errorText[error]}</p>}{catalogError && <p className="dex-error" role="alert">{spanish ? 'No se ha podido cargar el catálogo.' : 'Could not load the Pokémon catalog.'} <button type="button" className="dex-link" onClick={retryCatalog}>{spanish ? 'Reintentar' : 'Try again'}</button></p>}<button className="primary-button" type="submit" disabled={!catalog.length}>{spanish ? 'Comenzar partida' : 'Start game'} ↗</button>{!catalog.length && !catalogError && <p className="dex-hint">{spanish ? 'Cargando Pokémon...' : 'Loading Pokémon...'}</p>}</form> : <>
        <div className="dex-round-heading"><div><span className="section-kicker"><span className="red-dot" /> {spanish ? 'RONDA' : 'ROUND'} {round}</span><h2>{spanish ? 'Adivina el número' : 'Guess the number'}</h2></div>{kind !== 'daily' && <button type="button" className="dex-link" onClick={resetPlayers}>{spanish ? 'Cambiar jugadores' : 'Change players'}</button>}</div>
        <div className="dex-scoreboard" aria-label={spanish ? 'Marcador' : 'Scoreboard'}>{players.map((player) => <div className="dex-score" key={player.name}><span>{player.name}</span><strong>{player.score} <small>{player.score === 1 ? (spanish ? 'punto' : 'point') : (spanish ? 'puntos' : 'points')}</small></strong></div>)}</div>
        {loading ? <div className="state">{spanish ? 'Preparando el Pokémon...' : 'Preparing the Pokémon...'}</div> : loadError ? <div className="state">{spanish ? 'No se ha podido cargar el Pokémon.' : 'Could not load the Pokémon.'}<br /><button type="button" className="primary-button retry" onClick={() => { setLoading(true); setLoadError(false); setRequestNumber((current) => current + 1) }}>{spanish ? 'Reintentar' : 'Try again'}</button></div> : pokemon && target && <><div className="dex-round-content"><div className="dex-pokemon"><img src={image} alt={result ? targetName : (spanish ? 'Pokémon para adivinar' : 'Pokémon to guess')} onError={(event) => { if (pokemon.sprites.front_default && event.currentTarget.src !== pokemon.sprites.front_default) event.currentTarget.src = pokemon.sprites.front_default }} />{result && <strong>#{target.dexNumber} · {targetName}</strong>}</div><div className="dex-answers">{result ? <div className="dex-result" role="status"><span className="section-kicker"><span className="red-dot" /> {spanish ? 'RESULTADO' : 'RESULT'}</span><h3>{winnerNames.length === 1 ? (spanish ? `¡${winnerNames[0]} gana la ronda!` : `${winnerNames[0]} wins the round!`) : (spanish ? `¡Empate entre ${winnerNames.join(', ')}!` : `Tie between ${winnerNames.join(', ')}!`)}</h3><ul>{players.map((player, index) => <li key={player.name} className={result.winners[index] ? 'dex-winning-answer' : ''}><span>{player.name}: <strong>#{result.guesses[index]}</strong></span><span>{spanish ? 'Diferencia' : 'Difference'}: {result.distances[index]}</span></li>)}</ul>{kind !== 'daily' ? <button type="button" className="primary-button" onClick={nextRound}>{spanish ? 'Siguiente ronda' : 'Next round'} ↗</button> : <p>{spanish ? 'Reto diario completado. Vuelve mañana o juega en modo infinito.' : 'Daily challenge complete. Come back tomorrow or play infinite mode.'}</p>}</div> : <form onSubmit={submit}><label className="dex-answers-title">{spanish ? '¿Qué número tiene en la Pokédex?' : 'What is its Pokédex number?'}</label>{players.map((player, index) => <div className="dex-guess" key={player.name}><label htmlFor={`dex-guess-${index}`}>{player.name}</label><input id={`dex-guess-${index}`} type="number" min="1" max="1025" step="1" inputMode="numeric" value={guesses[index]} onChange={(event) => { const value = event.target.value; setGuesses((current) => current.map((guess, item) => item === index ? value : guess)); setError('') }} placeholder="1–1025" required /></div>)}{error && <p className="dex-error" role="alert">{errorText[error]}</p>}<button className="primary-button" type="submit">{spanish ? 'Comprobar respuestas' : 'Check answers'} ↗</button></form>}</div></div></>}
      </>}
    </section>
  </>
}
