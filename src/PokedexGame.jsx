import { useContext, useEffect, useState } from 'react'
import { PokedexGameContext } from './pokedex-context'
import { scorePokedexRound } from './pokedex-scoring'
import { dailyIndex, loadDaily, saveDaily } from './game-progress'
import './pokedex-game.css'

export default function PokedexGame() {
  const { catalog, language, kind, day, catalogError, retryCatalog, onRoundStart, onExact } = useContext(PokedexGameContext)
  const spanish = language === 'es'
  const [saved] = useState(() => {
    if (kind !== 'daily') return null
    const previous = loadDaily('dex', day)
    return loadDaily('dex-solo', day) ?? (previous?.started && previous.players?.length === 1 ? previous : null)
  })
  const [setupMode, setSetupMode] = useState(null)
  const [playerCount, setPlayerCount] = useState(kind === 'daily' ? 1 : 2)
  const [names, setNames] = useState(saved?.names ?? Array(8).fill(''))
  const [players, setPlayers] = useState(saved?.players ?? (kind === 'daily' ? [{ name: '', score: 0 }] : []))
  const [started, setStarted] = useState(kind === 'daily')
  const [round, setRound] = useState(1)
  const [requestNumber, setRequestNumber] = useState(0)
  const [pokemon, setPokemon] = useState(saved?.pokemon ?? null)
  const [target, setTarget] = useState(saved?.target ?? null)
  const [loading, setLoading] = useState(kind === 'daily' && !saved?.pokemon)
  const [loadError, setLoadError] = useState(false)
  const [guesses, setGuesses] = useState(saved?.guesses ?? (kind === 'daily' ? [''] : []))
  const [soloAttempts, setSoloAttempts] = useState(saved?.soloAttempts ?? (saved?.players?.length === 1 && saved?.result ? saved.result.guesses : []))
  const [result, setResult] = useState(saved?.result ?? null)
  const [error, setError] = useState('')

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
    if (kind === 'daily' && started && pokemon && target) saveDaily('dex-solo', day, { playerCount, names, players, started, pokemon, target, guesses, soloAttempts, result })
  }, [kind, day, playerCount, names, players, started, pokemon, target, guesses, soloAttempts, result])

  const startSolo = () => {
    setPlayerCount(1)
    setPlayers([{ name: '', score: 0 }])
    setGuesses([''])
    setSoloAttempts([])
    setError('')
    setLoading(true)
    setLoadError(false)
    setStarted(true)
    onRoundStart()
  }

  const start = (event) => {
    event.preventDefault()
    const selectedNames = names.slice(0, playerCount).map((name) => name.trim())
    if (selectedNames.some((name) => !name)) { setError('names'); return }
    if (new Set(selectedNames.map((name) => name.toLocaleLowerCase())).size !== selectedNames.length) { setError('duplicate'); return }
    setPlayers(selectedNames.map((name) => ({ name, score: 0 })))
    setGuesses(selectedNames.map(() => ''))
    setSoloAttempts([])
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
    if (players.length === 1) {
      const value = numbers[0]
      const nextAttempts = [...soloAttempts, value]
      const exact = value === target.dexNumber
      setSoloAttempts(nextAttempts)
      setGuesses([''])
      setError('')
      if (exact || nextAttempts.length >= 5) {
        setResult({ exact, solo: true })
        if (exact) { setPlayers((current) => current.map((player) => ({ ...player, score: player.score + 1 }))); onExact() }
      }
      return
    }
    const outcome = scorePokedexRound(numbers, target.dexNumber)
    setPlayers((current) => current.map((player, index) => ({ ...player, score: player.score + (outcome.winners[index] ? 1 : 0) })))
    setResult({ ...outcome, guesses: numbers })
    setError('')
    if (outcome.exact) onExact()
  }
  const nextRound = () => {
    setPokemon(null)
    setTarget(null)
    setResult(null)
    setGuesses(players.map(() => ''))
    setSoloAttempts([])
    setLoadError(false)
    setLoading(true)
    setError('')
    setRound((current) => current + 1)
    onRoundStart()
  }
  const resetPlayers = () => {
    setStarted(false)
    setSetupMode(null)
    setPlayerCount(2)
    setPlayers([])
    setPokemon(null)
    setTarget(null)
    setResult(null)
    setSoloAttempts([])
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
  const winnerNames = result?.winners ? players.filter((_, index) => result.winners[index]).map((player) => player.name) : []
  const image = pokemon?.sprites.other?.['official-artwork']?.front_default || pokemon?.sprites.front_default
  const targetName = target && (spanish ? target.name.replace('(Primal)', '(Primigenio)') : target.name)
  const renderModeSelection = () => <div className="dex-mode-setup">
    <div><span className="section-kicker"><span className="red-dot" /> {spanish ? 'ELIGE CÓMO JUGAR' : 'CHOOSE HOW TO PLAY'}</span><h2>{spanish ? '¿Cómo quieres jugar?' : 'How do you want to play?'}</h2></div>
    <div className="dex-mode-options">
      <button className="dex-mode-card" type="button" onClick={startSolo} disabled={!catalog.length}><span className="dex-mode-icon" aria-hidden="true">◉</span><strong>{spanish ? 'En solitario' : 'Solo'}</strong><span>{spanish ? 'Cinco intentos con pistas de mayor o menor.' : 'Five guesses with higher-or-lower hints.'}</span></button>
      <button className="dex-mode-card" type="button" onClick={() => { setPlayerCount(2); setSetupMode('group') }}><span className="dex-mode-icon" aria-hidden="true">◈</span><strong>{spanish ? 'En grupo' : 'Group'}</strong><span>{spanish ? 'De 2 a 8 jugadores: gana quien más se acerque.' : '2 to 8 players: the closest guess wins.'}</span></button>
    </div>
    {catalogError ? <p className="dex-error" role="alert">{spanish ? 'No se ha podido cargar el catálogo.' : 'Could not load the Pokémon catalog.'} <button type="button" className="dex-link" onClick={retryCatalog}>{spanish ? 'Reintentar' : 'Try again'}</button></p> : !catalog.length && <p className="dex-hint">{spanish ? 'Cargando Pokémon...' : 'Loading Pokémon...'}</p>}
  </div>
  const renderSolo = () => <div className="dex-solo">
    <span className="section-kicker">{spanish ? `INTENTOS: ${soloAttempts.length} / 5` : `GUESSES: ${soloAttempts.length} / 5`}</span>
    {soloAttempts.length > 0 && <ol className="dex-solo-attempts" aria-live="polite" aria-label={spanish ? 'Intentos anteriores' : 'Previous guesses'}>{soloAttempts.map((number, index) => <li key={`${index}-${number}`}><strong>#{number}</strong><span className={number === target.dexNumber ? 'dex-solo-correct' : 'dex-solo-direction'}>{number === target.dexNumber ? (spanish ? '✓ Correcto' : '✓ Correct') : number < target.dexNumber ? (spanish ? '↑ El número es mayor' : '↑ The number is higher') : (spanish ? '↓ El número es menor' : '↓ The number is lower')}</span></li>)}</ol>}
    {result ? <div className="dex-result" role="status"><h3>{result.exact ? (spanish ? '¡Has acertado!' : 'You got it!') : (spanish ? 'Se acabaron los intentos' : 'No guesses left')}</h3>{kind !== 'daily' ? <button type="button" className="primary-button" onClick={nextRound}>{spanish ? 'Siguiente ronda' : 'Next round'} ↗</button> : <p>{spanish ? 'Reto diario completado. Vuelve mañana o juega en modo infinito.' : 'Daily challenge complete. Come back tomorrow or play infinite mode.'}</p>}</div> : <form onSubmit={submit}><label className="dex-answers-title" htmlFor="dex-solo-guess">{spanish ? '¿Qué número tiene en la Pokédex?' : 'What is its Pokédex number?'}</label><div className="dex-guess"><label htmlFor="dex-solo-guess">{spanish ? 'Tu respuesta' : 'Your guess'}</label><input id="dex-solo-guess" type="number" min="1" max="1025" step="1" inputMode="numeric" value={guesses[0] || ''} onChange={(event) => { setGuesses([event.target.value]); setError('') }} placeholder="1–1025" required /></div>{error && <p className="dex-error" role="alert">{errorText[error]}</p>}<button className="primary-button" type="submit">{spanish ? 'Comprobar' : 'Check'} ↗</button></form>}
  </div>

  return <>
    <section className="hero dex-hero"><div className="eyebrow"><span className="dot" /> {kind === 'daily' ? (spanish ? 'RETO DIARIO EN SOLITARIO' : 'SOLO DAILY CHALLENGE') : (spanish ? 'SOLITARIO O EN GRUPO' : 'SOLO OR GROUP')}</div><h1><em>{spanish ? 'Número Pokédex' : 'Pokédex number'}</em></h1><p>{spanish ? 'En solitario tienes cinco intentos con pistas de mayor o menor. Con varios jugadores, gana la respuesta más cercana.' : 'Play solo with five guesses and higher-or-lower hints, or compete to get closest in multiplayer.'}</p></section>
    <section className="game-card dex-game">
      {!started && !setupMode ? renderModeSelection() : !started ? <form className="dex-setup" onSubmit={start}><div><span className="section-kicker"><span className="red-dot" /> {spanish ? 'MODO EN GRUPO' : 'GROUP MODE'}</span><h2>{spanish ? '¿Quién juega?' : 'Who is playing?'}</h2></div><label htmlFor="dex-player-count">{spanish ? 'Número de jugadores' : 'Number of players'}</label><div className="dex-select"><select id="dex-player-count" value={playerCount} onChange={(event) => { setPlayerCount(Number(event.target.value)); setError('') }}>{[2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select><svg className="dex-select-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg></div><div className="dex-name-grid">{Array.from({ length: playerCount }, (_, index) => <div key={index}><label htmlFor={`dex-name-${index}`}>{spanish ? 'Jugador' : 'Player'} {index + 1}</label><input id={`dex-name-${index}`} type="text" maxLength={24} value={names[index]} onChange={(event) => { const value = event.target.value; setNames((current) => current.map((name, item) => item === index ? value : name)); setError('') }} placeholder={spanish ? 'Nombre' : 'Name'} required /></div>)}</div>{error && <p className="dex-error" role="alert">{errorText[error]}</p>}{catalogError && <p className="dex-error" role="alert">{spanish ? 'No se ha podido cargar el catálogo.' : 'Could not load the Pokémon catalog.'} <button type="button" className="dex-link" onClick={retryCatalog}>{spanish ? 'Reintentar' : 'Try again'}</button></p>}<button type="button" className="dex-link dex-back" onClick={() => setSetupMode(null)}>{spanish ? '← Elegir otro modo' : '← Choose another mode'}</button><button className="primary-button" type="submit" disabled={!catalog.length}>{spanish ? 'Comenzar partida' : 'Start game'} ↗</button>{!catalog.length && !catalogError && <p className="dex-hint">{spanish ? 'Cargando Pokémon...' : 'Loading Pokémon...'}</p>}</form> : <>
        <div className="dex-round-heading"><div><span className="section-kicker"><span className="red-dot" /> {players.length === 1 ? (spanish ? 'SOLITARIO' : 'SOLO') : (spanish ? 'EN GRUPO' : 'GROUP')} · {spanish ? 'RONDA' : 'ROUND'} {round}</span><h2>{spanish ? 'Adivina el número' : 'Guess the number'}</h2></div>{kind !== 'daily' && <button type="button" className="dex-link" onClick={resetPlayers}>{spanish ? 'Cambiar modo' : 'Change mode'}</button>}</div>
        {kind !== 'daily' && <div className="dex-scoreboard" aria-label={spanish ? 'Marcador' : 'Scoreboard'}>{players.map((player) => <div className="dex-score" key={player.name}><span>{player.name || (spanish ? 'Solitario' : 'Solo')}</span><strong>{player.score} <small>{player.score === 1 ? (spanish ? 'punto' : 'point') : (spanish ? 'puntos' : 'points')}</small></strong></div>)}</div>}
        {catalogError && !pokemon ? <div className="state">{spanish ? 'No se ha podido cargar el catálogo.' : 'Could not load the Pokémon catalog.'}<br /><button type="button" className="primary-button retry" onClick={retryCatalog}>{spanish ? 'Reintentar' : 'Try again'}</button></div> : loading ? <div className="state">{spanish ? 'Preparando el Pokémon...' : 'Preparing the Pokémon...'}</div> : loadError ? <div className="state">{spanish ? 'No se ha podido cargar el Pokémon.' : 'Could not load the Pokémon.'}<br /><button type="button" className="primary-button retry" onClick={() => { setLoading(true); setLoadError(false); setRequestNumber((current) => current + 1) }}>{spanish ? 'Reintentar' : 'Try again'}</button></div> : pokemon && target && <><div className="dex-round-content"><div className="dex-pokemon"><img src={image} alt={result ? targetName : (spanish ? 'Pokémon para adivinar' : 'Pokémon to guess')} onError={(event) => { if (pokemon.sprites.front_default && event.currentTarget.src !== pokemon.sprites.front_default) event.currentTarget.src = pokemon.sprites.front_default }} />{result && <strong>#{target.dexNumber} · {targetName}</strong>}</div><div className="dex-answers">{players.length === 1 ? renderSolo() : result ? <div className="dex-result" role="status"><span className="section-kicker"><span className="red-dot" /> {spanish ? 'RESULTADO' : 'RESULT'}</span><h3>{winnerNames.length === 1 ? (spanish ? `¡${winnerNames[0]} gana la ronda!` : `${winnerNames[0]} wins the round!`) : (spanish ? `¡Empate entre ${winnerNames.join(', ')}!` : `Tie between ${winnerNames.join(', ')}!`)}</h3><ul>{players.map((player, index) => <li key={player.name} className={result.winners[index] ? 'dex-winning-answer' : ''}><span>{player.name}: <strong>#{result.guesses[index]}</strong></span><span>{spanish ? 'Diferencia' : 'Difference'}: {result.distances[index]}</span></li>)}</ul>{kind !== 'daily' ? <button type="button" className="primary-button" onClick={nextRound}>{spanish ? 'Siguiente ronda' : 'Next round'} ↗</button> : <p>{spanish ? 'Reto diario completado. Vuelve mañana o juega en modo infinito.' : 'Daily challenge complete. Come back tomorrow or play infinite mode.'}</p>}</div> : <form onSubmit={submit}><label className="dex-answers-title">{spanish ? '¿Qué número tiene en la Pokédex?' : 'What is its Pokédex number?'}</label>{players.map((player, index) => <div className="dex-guess" key={player.name}><label htmlFor={`dex-guess-${index}`}>{player.name}</label><input id={`dex-guess-${index}`} type="number" min="1" max="1025" step="1" inputMode="numeric" value={guesses[index]} onChange={(event) => { const value = event.target.value; setGuesses((current) => current.map((guess, item) => item === index ? value : guess)); setError('') }} placeholder="1–1025" required /></div>)}{error && <p className="dex-error" role="alert">{errorText[error]}</p>}<button className="primary-button" type="submit">{spanish ? 'Comprobar respuestas' : 'Check answers'} ↗</button></form>}</div></div></>}
      </>}
    </section>
  </>
}
