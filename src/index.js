import DinoGame from './game/DinoGame.js'

const game = new DinoGame(600, 150, document.getElementById('game-container'))

// Touch controls
document.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      game.onInput('jump')
    } else if (e.touches.length === 2) {
      game.onInput('duck')
    }
  },
  { passive: false }
)

document.addEventListener('touchend', (e) => {
  game.onInput('stop-duck')
})

// Keyboard controls
const keycodes = {
  JUMP: { 38: 1, 32: 1 },
  DUCK: { 40: 1 },
}

document.addEventListener('keydown', ({ keyCode }) => {
  if (keycodes.JUMP[keyCode]) {
    game.onInput('jump')
  } else if (keycodes.DUCK[keyCode]) {
    game.onInput('duck')
  }
})

document.addEventListener('keyup', ({ keyCode }) => {
  if (keycodes.DUCK[keyCode]) {
    game.onInput('stop-duck')
  }
})

game.start().catch(console.error)
