const AudioContext = window.AudioContext || window.webkitAudioContext
const audioContext = new AudioContext()
const soundNames = ['game-over', 'jump', 'level-up']
const soundBuffers = {}
let SOUNDS_LOADED = false
let muted = localStorage.getItem('dino-muted') === 'true'

loadSounds().catch(console.error)
export function playSound(name) {
  if (SOUNDS_LOADED && !muted) {
    audioContext.resume()
    playBuffer(soundBuffers[name])
  }
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  muted = !muted
  localStorage.setItem('dino-muted', muted)
  return muted
}

async function loadSounds() {
  await Promise.all(
    soundNames.map(async (soundName) => {
      soundBuffers[soundName] = await loadBuffer(`/assets/${soundName}.mp3`)
    })
  )

  SOUNDS_LOADED = true
}

async function loadBuffer(filepath) {
  const response = await fetch(filepath)
  const arrayBuffer = await response.arrayBuffer()
  return audioContext.decodeAudioData(arrayBuffer)
}

function playBuffer(buffer) {
  const source = audioContext.createBufferSource()

  source.buffer = buffer
  source.connect(audioContext.destination)
  source.start()
}
