import { useEffect, useRef, useState } from 'react'
import './app.css'
import './language.css'
import './suggestions.css'
import './extra-clues.css'
import './guess-history.css'
import './game-navigation.css'
import './pokedle.css'

const text = {
  es: { badge: 'EL RETO POKÉMON', title: '¿Quién es ese', titleEnd: 'Pokémon?', intro: 'Pon a prueba tus conocimientos. Un Pokémon misterioso, sus habilidades y todas las pistas que necesitas.', play: 'ADIVINA EL POKÉMON', round: 'PARTIDA ACTUAL', hints: 'PISTAS DE HABILIDAD', attempts: 'intentos fallidos', primary: 'HABILIDAD PRINCIPAL', secondary: 'HABILIDAD SECUNDARIA', hidden: 'HABILIDAD OCULTA', unlock2: 'Se revela tras 2 fallos', unlock4: 'Se revela tras 4 fallos', none: 'No tiene esta habilidad', question: '¿YA SABES QUIÉN ES?', placeholder: 'Escribe el nombre de un Pokémon...', submit: 'Comprobar', helper: 'Introduce un nombre y pulsa comprobar', wrong: 'No es ese Pokémon. ¡Sigue intentándolo!', win: '¡Correcto! Has descubierto a', newGame: 'Jugar de nuevo', loading: 'Preparando tu Pokémon misterioso...', error: 'No hemos podido conectar con PokéAPI.', retry: 'Intentar de nuevo', theme: 'Cambiar tema', language: 'Change language to English', footer: 'HECHO PARA ENTRENADORES CURIOSOS', counter: 'PISTAS DESBLOQUEADAS', success: '¡MISTERIO RESUELTO!', reveal: 'REVELAR POKÉMON', answer: 'El Pokémon era', revealed: 'POKÉMON REVELADO' },
  en: { badge: 'THE POKÉMON CHALLENGE', title: 'Who’s that', titleEnd: 'Pokémon?', intro: 'Put your knowledge to the test. One mystery Pokémon, its abilities, and all the clues you need.', play: 'GUESS THE POKÉMON', round: 'CURRENT GAME', hints: 'ABILITY CLUES', attempts: 'incorrect guesses', primary: 'PRIMARY ABILITY', secondary: 'SECONDARY ABILITY', hidden: 'HIDDEN ABILITY', unlock2: 'Revealed after 2 misses', unlock4: 'Revealed after 4 misses', none: 'No ability in this slot', question: 'KNOW WHO IT IS?', placeholder: 'Enter a Pokémon name...', submit: 'Check', helper: 'Enter a name and press check', wrong: 'That’s not it. Keep trying!', win: 'That’s right! You discovered', newGame: 'Play again', loading: 'Preparing your mystery Pokémon...', error: 'Could not connect to PokéAPI.', retry: 'Try again', theme: 'Change theme', language: 'Cambiar idioma a español', footer: 'MADE FOR CURIOUS TRAINERS', counter: 'CLUES UNLOCKED', success: 'MYSTERY SOLVED!', reveal: 'REVEAL POKÉMON', answer: 'The Pokémon was', revealed: 'POKÉMON REVEALED' },
}

const normalize = (value) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('♀', 'f').replace('♂', 'm').replace(/[ .’':-]/g, '')
const titleCase = (value) => value.replace(/(^|[-\s])\S/g, (letter) => letter.toUpperCase()).replaceAll('-', ' ')
const speciesName = (name) => name === 'nidoran-f' ? 'Nidoran♀' : name === 'nidoran-m' ? 'Nidoran♂' : titleCase(name)
const spanishColors = { black: 'Negro', blue: 'Azul', brown: 'Marrón', gray: 'Gris', green: 'Verde', pink: 'Rosa', purple: 'Morado', red: 'Rojo', white: 'Blanco', yellow: 'Amarillo' }
const spanishShapes = { ball: 'Esférico', squiggle: 'Serpentino', fish: 'Pez', arms: 'Con brazos', blob: 'Amorfo', upright: 'Erguido', legs: 'Con patas', quadruped: 'Cuadrúpedo', wings: 'Con alas', tentacles: 'Con tentáculos', heads: 'Varias cabezas', humanoid: 'Humanoide', 'bug-wings': 'Alas de insecto', armor: 'Con armadura' }

function findEvolution(chain, name) {
  if (chain.species.name === name) return chain
  for (const evolution of chain.evolves_to) {
    const match = findEvolution(evolution, name)
    if (match) return match
  }
  return null
}

function evolutionInfo(chain, name, stage = 1) {
  if (chain.species.name === name) return { stage, canEvolve: chain.evolves_to.length > 0 }
  for (const evolution of chain.evolves_to) {
    const result = evolutionInfo(evolution, name, stage + 1)
    if (result) return result
  }
  return null
}

async function getEvolutionInfo(species, signal) {
  const response = await fetch(species.evolution_chain.url, { signal })
  if (!response.ok) throw new Error('evolution')
  const data = await response.json()
  const result = evolutionInfo(data.chain, species.name)
  if (!result) throw new Error('evolution species')
  return result
}

async function getPokemon(mode, signal) {
  let id
  while (true) {
    id = Math.floor(Math.random() * 1025) + 1
    if (mode !== 'stats') break
    const candidateResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { signal })
    if (!candidateResponse.ok) throw new Error('species')
    const candidate = await candidateResponse.json()
    const chainResponse = await fetch(candidate.evolution_chain.url, { signal })
    if (!chainResponse.ok) throw new Error('evolution')
    const chain = await chainResponse.json()
    const stage = findEvolution(chain.chain, candidate.name)
    if (stage && stage.evolves_to.length === 0) break
  }
  const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { signal })
  if (!pokemonResponse.ok) throw new Error('pokemon')
  const pokemon = await pokemonResponse.json()
  const [speciesResponse, ...detailResponses] = await Promise.all([
    fetch(pokemon.species.url, { signal }),
    ...pokemon.abilities.map((ability) => fetch(ability.ability.url, { signal })),
    ...pokemon.types.map((type) => fetch(type.type.url, { signal })),
  ])
  if (!speciesResponse.ok || detailResponses.some((response) => !response.ok)) throw new Error('details')
  const [species, ...details] = await Promise.all([speciesResponse.json(), ...detailResponses.map((response) => response.json())])
  const evolution = mode === 'pokedle' ? await getEvolutionInfo(species, signal) : null
  return { pokemon, species, evolution, abilities: details.slice(0, pokemon.abilities.length), types: details.slice(pokemon.abilities.length) }
}

function localizedName(names, language, fallback) {
  return names.find((entry) => entry.language.name === language)?.name || (language === 'es' && spanishShapes[fallback]) || titleCase(fallback)
}

function flag(country) {
  return country === 'es' ? <svg className="flag" viewBox="0 0 30 20" aria-hidden="true"><path fill="#c60b1e" d="M0 0h30v20H0z"/><path fill="#ffc400" d="M0 5h30v10H0z"/></svg> : <svg className="flag" viewBox="0 0 30 20" aria-hidden="true"><path fill="#fff" d="M0 0h30v20H0z"/><path stroke="#b22234" strokeWidth="1.54" d="M0 .77h30M0 3.85h30M0 6.92h30M0 10h30M0 13.08h30M0 16.15h30M0 19.23h30"/><path fill="#3c3b6e" d="M0 0h12v10.77H0z"/><path fill="#fff" d="M2 2h1v1H2zm3 0h1v1H5zm3 0h1v1H8zM3.5 4h1v1h-1zm3 0h1v1h-1zM2 6h1v1H2zm3 0h1v1H5zm3 0h1v1H8zM3.5 8h1v1h-1zm3 0h1v1h-1z"/></svg>
}

function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('pokegames-language') || 'es')
  const [theme, setTheme] = useState(() => localStorage.getItem('pokegames-theme') || 'light')
  const [game, setGame] = useState(null)
  const [status, setStatus] = useState('loading')
  const [attempts, setAttempts] = useState(0)
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState('')
  const [round, setRound] = useState(0)
  const [mode, setMode] = useState('abilities')
  const [species, setSpecies] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [extraClues, setExtraClues] = useState([false, false])
  const [failedGuesses, setFailedGuesses] = useState([])
  const [comparisons, setComparisons] = useState([])
  const requestVersion = useRef(0)
  const copy = { ...text[language], duplicate: language === 'es' ? 'Ya has probado ese Pokémon.' : 'You already tried that Pokémon.', invalid: language === 'es' ? 'Selecciona un Pokémon válido de la lista.' : 'Select a valid Pokémon from the list.', checking: language === 'es' ? 'Comprobando Pokémon...' : 'Checking Pokémon...', compareError: language === 'es' ? 'No se ha podido comprobar. Inténtalo de nuevo.' : 'Could not check that Pokémon. Please try again.' }

  useEffect(() => { localStorage.setItem('pokegames-language', language); document.documentElement.lang = language }, [language])
  useEffect(() => { localStorage.setItem('pokegames-theme', theme); document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    const controller = new AbortController()
    fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1025', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('species'); return response.json() })
      .then((data) => setSpecies(data.results.map((entry) => ({ name: speciesName(entry.name), id: entry.url.split('/').filter(Boolean).pop() }))))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    getPokemon(mode, controller.signal).then((result) => { if (active) { setGame(result); setStatus('playing') } }).catch(() => { if (active) setStatus('error') })
    return () => { active = false; controller.abort() }
  }, [round, mode])

  const reset = () => { requestVersion.current += 1; setStatus('loading'); setGame(null); setAttempts(0); setGuess(''); setFeedback(''); setExtraClues([false, false]); setFailedGuesses([]); setComparisons([]); setRound((value) => value + 1) }
  const selectMode = (nextMode) => { if (nextMode !== mode) { setMode(nextMode); reset() } }
  const checkGuess = async (value) => {
    if (!value.trim() || status !== 'playing') return
    setSuggestionsOpen(false)
    setActiveSuggestion(-1)
    if (failedGuesses.some((entry) => normalize(entry.name) === normalize(value))) { setFeedback('duplicate'); return }
    if (mode === 'pokedle') {
      const selected = species.find((entry) => normalize(entry.name) === normalize(value))
      if (!selected) { setFeedback('invalid'); return }
      const version = ++requestVersion.current
      setStatus('checking')
      setFeedback('checking')
      try {
        const [pokemonResponse, speciesResponse] = await Promise.all([fetch(`https://pokeapi.co/api/v2/pokemon/${selected.id}`), fetch(`https://pokeapi.co/api/v2/pokemon-species/${selected.id}`)])
        if (!pokemonResponse.ok || !speciesResponse.ok) throw new Error('comparison')
        const [pokemon, guessedSpecies] = await Promise.all([pokemonResponse.json(), speciesResponse.json()])
        const [evolution, shapeResponse, ...typeResponses] = await Promise.all([getEvolutionInfo(guessedSpecies), guessedSpecies.shape ? fetch(guessedSpecies.shape.url) : Promise.resolve(null), ...pokemon.types.map((type) => fetch(type.type.url))])
        if ((shapeResponse && !shapeResponse.ok) || typeResponses.some((response) => !response.ok)) throw new Error('details')
        const [shape, ...types] = await Promise.all([shapeResponse ? shapeResponse.json() : null, ...typeResponses.map((response) => response.json())])
        if (version !== requestVersion.current) return
        setComparisons((current) => [{ ...selected, pokemon, species: guessedSpecies, evolution, shape, types }, ...current])
        setGuess('')
        if (pokemon.id === game.pokemon.id) { setStatus('won'); setFeedback(''); setExtraClues([true, true]) }
        else { setFailedGuesses((current) => [...current, selected]); setAttempts((current) => current + 1); setFeedback('wrong'); setStatus('playing') }
      } catch {
        if (version === requestVersion.current) { setStatus('playing'); setFeedback('compareError') }
      }
      return
    }
    const accepted = [game.pokemon.name, ...game.species.names.map((entry) => entry.name)]
    if (accepted.some((name) => normalize(name) === normalize(value))) { setStatus('won'); setFeedback(''); setExtraClues([true, true]) }
    else { setFailedGuesses((current) => [...current, species.find((entry) => normalize(entry.name) === normalize(value)) || { name: value.trim() }]); setAttempts((current) => current + 1); setFeedback('wrong'); setGuess('') }
  }
  const submit = (event) => { event.preventDefault(); checkGuess(guess) }
  const revealed = status === 'won' || status === 'revealed'
  const displayName = game && localizedName(game.species.names, language, game.pokemon.name)
  const slots = game ? [game.pokemon.abilities.findIndex((ability) => ability.slot === 1), game.pokemon.abilities.findIndex((ability) => ability.slot === 2 && !ability.is_hidden), game.pokemon.abilities.findIndex((ability) => ability.is_hidden)] : [-1, -1, -1]
  const labels = [copy.primary, copy.secondary, copy.hidden, language === 'es' ? 'GENERACIÓN' : 'GENERATION', language === 'es' ? 'TIPOS' : 'TYPES']
  const unlocked = [true, attempts >= 2 || revealed, attempts >= 4 || revealed, attempts >= 6 || status === 'won', attempts >= 8 || status === 'won']
  const statLabels = language === 'es' ? ['VIDA', 'ATAQUE', 'DEFENSA', 'ATAQUE ESPECIAL', 'DEFENSA ESPECIAL', 'VELOCIDAD'] : ['HP', 'ATTACK', 'DEFENSE', 'SPECIAL ATTACK', 'SPECIAL DEFENSE', 'SPEED']
  const unlockedStats = statLabels.map((_, index) => attempts >= index || revealed)
  const unlockedCount = mode === 'stats' ? unlockedStats.filter(Boolean).length + unlocked.slice(3).filter(Boolean).length : unlocked.filter(Boolean).length
  const clueCount = mode === 'stats' ? 8 : 5
  const renderClue = (index) => {
    const remaining = index * 2 - attempts
    let content
    if (!unlocked[index]) {
      content = language === 'es' ? `Se desbloqueará en ${remaining} ${remaining === 1 ? 'fallo' : 'fallos'}` : `Unlocks in ${remaining} ${remaining === 1 ? 'miss' : 'misses'}`
    } else if (index < 3) {
      content = slots[index] === -1 ? copy.none : localizedName(game.abilities[slots[index]].names, language, game.pokemon.abilities[slots[index]].ability.name)
    } else if (!extraClues[index - 3]) {
      content = <button className="reveal-clue" type="button" onClick={() => setExtraClues((current) => current.map((value, clueIndex) => clueIndex === index - 3 ? true : value))}>{language === 'es' ? 'Pulsa para revelar' : 'Click to reveal'} ↗</button>
    } else if (index === 3) {
      content = `${language === 'es' ? 'Generación' : 'Generation'} ${game.species.generation.name.replace('generation-', '').toUpperCase()}`
    } else {
      content = <span className="pokemon-types">{game.types.map((type) => <span className={`pokemon-type type-${type.name}`} key={type.name}>{localizedName(type.names, language, type.name)}</span>)}</span>
    }
    return <div className={`clue ${unlocked[index] ? 'unlocked' : 'locked'}`} key={labels[index]}><span className="clue-number">{unlocked[index] ? '✦' : '⌑'}</span><div><span className="clue-label">{labels[index]}</span><strong>{content}</strong></div><span className="clue-index">0{index + 1}</span></div>
  }
  const suggestions = guess.trim().length >= 3 ? species.filter((entry) => normalize(entry.name).startsWith(normalize(guess)) && !failedGuesses.some((failed) => normalize(failed.name) === normalize(entry.name))) : []
  const showSuggestions = suggestionsOpen && suggestions.length > 0
  const selectSuggestion = (name) => { checkGuess(name) }
  const handleSuggestionKey = (event) => {
    if (!showSuggestions) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveSuggestion((current) => (current + 1) % suggestions.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveSuggestion((current) => current <= 0 ? suggestions.length - 1 : current - 1) }
    if (event.key === 'Enter' && activeSuggestion >= 0) { event.preventDefault(); selectSuggestion(suggestions[activeSuggestion].name) }
    if (event.key === 'Escape') { event.preventDefault(); setSuggestionsOpen(false) }
  }
  const compareNumber = (actual, target) => actual === target ? 'match' : 'miss'
  const direction = (actual, target) => actual === target ? '' : actual < target ? ' ↑' : ' ↓'

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-icon"><span /></span><span>POKÉ<span>GAMES</span><small>{language === 'es' ? 'por Gandares' : 'by Gandares'}</small></span></a><nav className="game-nav" aria-label={language === 'es' ? 'Juegos' : 'Games'}><a href="#habilidades" aria-current={mode === 'abilities' ? 'page' : undefined} onClick={() => selectMode('abilities')}>{language === 'es' ? 'Habilidades' : 'Abilities'}</a><a href="#estadisticas" aria-current={mode === 'stats' ? 'page' : undefined} onClick={() => selectMode('stats')}>{language === 'es' ? 'Estadísticas' : 'Stats'}</a><a href="#pokedle" aria-current={mode === 'pokedle' ? 'page' : undefined} onClick={() => selectMode('pokedle')}>Pokédle</a></nav><div className="nav-actions"><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy.theme}>{theme === 'light' ? '☾' : '☀'}</button><details className="language-selector"><summary className="lang-button" aria-label={language === 'es' ? 'Seleccionar idioma' : 'Select language'}>{flag(language)} {language.toUpperCase()} <span className="chevron">⌄</span></summary><div className="language-menu">{[['es', 'Español'], ['en', 'English']].map(([code, name]) => <button key={code} type="button" aria-pressed={language === code} onClick={(event) => { setLanguage(code); event.currentTarget.closest('details').open = false }}>{flag(code)} {name}</button>)}</div></details></div></header>
    <main id="top"><section className="hero"><div className="eyebrow"><span className="dot" /> {copy.badge}</div><h1>{copy.title}<br /><em>{copy.titleEnd}</em></h1><p>{mode === 'abilities' ? copy.intro : mode === 'stats' ? language === 'es' ? 'Adivina un Pokémon completamente evolucionado a partir de sus estadísticas base.' : 'Guess a fully evolved Pokémon from its base stats.' : language === 'es' ? 'Adivina el Pokémon misterioso comparando cada intento con sus características.' : 'Guess the mystery Pokémon by comparing each guess with its characteristics.'}</p><div className="hero-mark">✳ <span>{copy.play}</span> ✳</div></section>
      <section className="game-card"><div className="card-heading"><div><div className="section-kicker"><span className="red-dot" /> {copy.round}</div><h2>{language === 'es' ? 'PISTAS DEL POKÉMON' : 'POKÉMON CLUES'}</h2></div><div className="attempt-pill"><span>✕</span> <strong>{attempts}</strong> {copy.attempts}</div></div>
        {status === 'loading' ? <div className="state">{copy.loading}</div> : status === 'error' ? <div className="state">{copy.error}<br /><button className="primary-button retry" onClick={reset}>{copy.retry}</button></div> : <>{mode !== 'pokedle' && <><div className="game-layout"><div className="mystery"><div className="mystery-top"><span>NO. ???</span><span>✦</span></div><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="question-mark">{revealed ? <img src={game.pokemon.sprites.other['official-artwork'].front_default || game.pokemon.sprites.front_default} alt={displayName} /> : '?'}</div><div className="mystery-bottom">{revealed ? displayName : '???'} <span>✦</span></div></div>
          <div className="clue-area"><div className="clue-heading"><span>{copy.counter}</span><strong>{unlockedCount}<span> / {clueCount}</span></strong></div><div className="progress"><i style={{ width: `${unlockedCount / clueCount * 100}%` }} /></div><div className="clues">{mode === 'abilities' ? [0, 1, 2].map(renderClue) : statLabels.map((label, index) => <div className={`clue stat-clue ${unlockedStats[index] ? 'unlocked' : 'locked'}`} key={label}><div className="stat-content"><span className="clue-label">{label}</span>{unlockedStats[index] ? <div className="stat-row"><div className="stat-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={255} aria-valuenow={Math.min(game.pokemon.stats[index].base_stat, 255)}><span className={`stat-fill stat-color-${index}`} style={{ width: `${Math.min(game.pokemon.stats[index].base_stat / 255 * 100, 100)}%` }} /></div><strong className="stat-value">{game.pokemon.stats[index].base_stat}</strong></div> : <strong>{language === 'es' ? `Se desbloqueará en ${index - attempts} ${index - attempts === 1 ? 'fallo' : 'fallos'}` : `Unlocks in ${index - attempts} ${index - attempts === 1 ? 'miss' : 'misses'}`}</strong>}</div></div>)}</div></div></div>
          <section className="extra-clues"><h3>{language === 'es' ? 'PISTAS ADICIONALES' : 'ADDITIONAL CLUES'}</h3><div className="extra-clues-grid">{[3, 4].map(renderClue)}</div></section></>}
          <div className="guess-section">{revealed ? <div className="result" role="status"><div><span className="section-kicker"><span className="red-dot" /> {status === 'won' ? copy.success : copy.revealed}</span><h3>{status === 'won' ? copy.win : copy.answer} <em>{displayName}!</em></h3></div><button className="primary-button" onClick={reset}>{copy.newGame} <span>↗</span></button></div> : <><label htmlFor="guess">{copy.question}</label><form onSubmit={submit}><div className="suggestion-field"><input id="guess" role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls="pokemon-suggestions" aria-activedescendant={showSuggestions && activeSuggestion >= 0 ? `pokemon-option-${suggestions[activeSuggestion].id}` : undefined} value={guess} onChange={(event) => { setGuess(event.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1) }} onFocus={() => setSuggestionsOpen(true)} onBlur={() => setSuggestionsOpen(false)} onKeyDown={handleSuggestionKey} placeholder={copy.placeholder} autoComplete="off" />{showSuggestions && <ul id="pokemon-suggestions" className="suggestion-list" role="listbox">{suggestions.map((entry, index) => <li id={`pokemon-option-${entry.id}`} key={entry.id} role="option" aria-selected={index === activeSuggestion} onPointerDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(entry.name)}><img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`} alt="" loading="lazy" /><span>{entry.name}</span></li>)}</ul>}</div><button className="primary-button" type="submit">{copy.submit} <span>↗</span></button></form><div className="form-foot"><span className={feedback ? 'feedback' : ''} role="status">{feedback ? copy[feedback] : copy.helper}</span><button className="reveal-button" onClick={() => setStatus('revealed')}>{copy.reveal} ↗</button></div></>}</div></>}
      {mode === 'pokedle' && game && <section className="pokedle-results"><p className="pokedle-legend">{language === 'es' ? 'Verde: coincide · Rojo: no coincide · ↑ mayor · ↓ menor. Los tipos coinciden aunque estén en otra posición.' : 'Green: match · Red: no match · ↑ higher · ↓ lower. Types match even in a different position.'}</p>{comparisons.length > 0 && <div className="pokedle-scroll"><table><thead><tr><th>Pokémon</th><th>{language === 'es' ? 'Generación' : 'Generation'}</th><th>{language === 'es' ? 'Tipo 1' : 'Type 1'}</th><th>{language === 'es' ? 'Tipo 2' : 'Type 2'}</th><th>Color</th><th>{language === 'es' ? 'Altura' : 'Height'}</th><th>{language === 'es' ? 'Peso' : 'Weight'}</th><th>{language === 'es' ? 'Puede evolucionar' : 'Can evolve'}</th><th>{language === 'es' ? 'Etapa evolutiva' : 'Evolution stage'}</th><th>{language === 'es' ? 'Estadísticas totales' : 'Base stat total'}</th><th>{language === 'es' ? 'Forma corporal' : 'Body shape'}</th></tr></thead><tbody>{comparisons.map((entry) => { const guessedGeneration = Number(entry.species.generation.url.split('/').filter(Boolean).pop()); const targetGeneration = Number(game.species.generation.url.split('/').filter(Boolean).pop()); const targetTypes = game.pokemon.types.map((type) => type.type.name); const total = entry.pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0); const targetTotal = game.pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0); const shapeAvailable = entry.species.shape && game.species.shape; return <tr key={entry.id}><th scope="row"><img src={entry.pokemon.sprites.front_default} alt="" /><span>{entry.name}</span></th><td className={compareNumber(guessedGeneration, targetGeneration)}>{guessedGeneration}{direction(guessedGeneration, targetGeneration)}</td>{[0, 1].map((index) => { const type = entry.types[index]; const matches = type ? targetTypes.includes(type.name) : targetTypes.length < 2; return <td key={index} className={matches ? 'match' : 'miss'}>{type ? localizedName(type.names, language, type.name) : '—'}</td> })}<td className={compareNumber(entry.species.color.name, game.species.color.name)}>{language === 'es' ? spanishColors[entry.species.color.name] || titleCase(entry.species.color.name) : titleCase(entry.species.color.name)}</td><td className={compareNumber(entry.pokemon.height, game.pokemon.height)}>{entry.pokemon.height / 10} m{direction(entry.pokemon.height, game.pokemon.height)}</td><td className={compareNumber(entry.pokemon.weight, game.pokemon.weight)}>{entry.pokemon.weight / 10} kg{direction(entry.pokemon.weight, game.pokemon.weight)}</td><td className={compareNumber(entry.evolution.canEvolve, game.evolution.canEvolve)}>{entry.evolution.canEvolve ? language === 'es' ? 'Sí' : 'Yes' : 'No'}</td><td className={compareNumber(entry.evolution.stage, game.evolution.stage)}>{entry.evolution.stage}{direction(entry.evolution.stage, game.evolution.stage)}</td><td className={compareNumber(total, targetTotal)}>{total}{direction(total, targetTotal)}</td><td className={shapeAvailable ? compareNumber(entry.species.shape.name, game.species.shape.name) : ''}>{entry.shape ? localizedName(entry.shape.names, language, entry.shape.name) : '—'}</td></tr> })}</tbody></table></div>}</section>}
      {mode !== 'pokedle' && game && failedGuesses.length > 0 && <section className="guess-history" aria-label={language === 'es' ? 'Pokémon intentados' : 'Pokémon guessed'}><h3>{language === 'es' ? 'POKÉMON INTENTADOS' : 'POKÉMON GUESSED'}</h3><ul>{failedGuesses.map((entry) => <li key={normalize(entry.name)}>{entry.id && <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.id}.png`} alt="" loading="lazy" />}<span>{entry.name}</span></li>)}</ul></section>}</section><div className="below-card"><span>✦</span> {copy.footer} <span>✦</span></div></main><footer><span>© POKÉGAMES</span><span>POWERED BY <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">POKÉAPI ↗</a></span></footer>
  </div>
}

export default App
