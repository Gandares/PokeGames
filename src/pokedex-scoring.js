export function scorePokedexRound(guesses, answer) {
  const distances = guesses.map((guess) => Math.abs(guess - answer))
  const closest = Math.min(...distances)
  return { distances, winners: distances.map((distance) => distance === closest), exact: closest === 0 }
}
