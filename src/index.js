import DinoGame from './game/DinoGame.js'

const game = new DinoGame(600, 150, document.getElementById('game-container'))

const keycodes = {
  JUMP: { 38: 1, 32: 1 },
  DUCK: { 40: 1 },
}

const container = document.getElementById('game-container')
const overlay = document.createElement('div')
overlay.id = 'score-overlay'
overlay.style.display = 'none'
container.appendChild(overlay)

overlay.innerHTML = `
  <div id="score-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
    <h2 id="modal-title">GAME OVER</h2>
    <p id="final-score-display" aria-live="polite"></p>
    <div id="submit-section">
      <input 
        type="text" 
        id="player-initials" 
        placeholder="AAA" 
        maxlength="3" 
        autocomplete="off"
        autocapitalize="characters"
        aria-label="Enter your initials (3 letters)"
      />
      <button id="submit-btn" aria-label="Submit your score">SUBMIT</button>
    </div>
    <div id="leaderboard-section" aria-live="polite">
      <div id="leaderboard-list"></div>
    </div>
    <div id="modal-footer">
      <button id="action-btn" aria-label="Play again">PLAY AGAIN</button>
    </div>
  </div>
`

const modalTitle = document.getElementById('modal-title')
const finalScoreDisplay = document.getElementById('final-score-display')
const initialsInput = document.getElementById('player-initials')
const submitBtn = document.getElementById('submit-btn')
const submitSection = document.getElementById('submit-section')
const leaderboardSection = document.getElementById('leaderboard-section')
const leaderboardList = document.getElementById('leaderboard-list')
const actionBtn = document.getElementById('action-btn')

// Focus trap elements
let focusableElements
let firstFocusable
let lastFocusable

function updateFocusTrap() {
  focusableElements = overlay.querySelectorAll('button:not(:disabled), input:not(:disabled)')
  firstFocusable = focusableElements[0]
  lastFocusable = focusableElements[focusableElements.length - 1]
}

// Handle Tab key for focus trap
overlay.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !overlayState.visible) return
  
  if (e.shiftKey) {
    if (document.activeElement === firstFocusable) {
      e.preventDefault()
      lastFocusable.focus()
    }
  } else {
    if (document.activeElement === lastFocusable) {
      e.preventDefault()
      firstFocusable.focus()
    }
  }
})

// Touch to dismiss overlay (tap background)
overlay.addEventListener('click', (e) => {
  if (e.target === overlay && overlayState.visible) {
    hideOverlay()
    game.onInput('jump')
  }
})

// Overlay state management
const overlayState = {
  visible: false,
  submitted: false,
  submitting: false,
  submittedInitials: '',
  currentScore: 0,
  currentEventLog: [],
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function showOverlay(score, eventLog) {
  overlayState.visible = true
  overlayState.submitted = false
  overlayState.submitting = false
  overlayState.submittedInitials = ''
  overlayState.currentScore = score
  overlayState.currentEventLog = eventLog

  modalTitle.textContent = 'GAME OVER'
  finalScoreDisplay.textContent = `SCORE: ${score}`
  initialsInput.value = ''
  submitSection.style.display = ''
  initialsInput.disabled = false
  submitBtn.disabled = false
  submitBtn.textContent = 'SUBMIT'
  overlay.style.display = ''
  updateFocusTrap()
  initialsInput.focus()
  loadLeaderboard(false) // Use cache if available
}

function hideOverlay() {
  overlayState.visible = false
  overlayState.currentScore = 0
  overlayState.currentEventLog = []
  overlay.style.display = 'none'
}

function formatInitials(value) {
  return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
}

initialsInput.addEventListener('input', (e) => {
  e.target.value = formatInitials(e.target.value)
})

async function submitScore() {
  if (overlayState.submitted || overlayState.submitting) return

  const initials = initialsInput.value.trim().toUpperCase() || 'AAA'
  overlayState.submitting = true
  submitBtn.disabled = true

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: initials,
        score: overlayState.currentScore,
        eventLog: overlayState.currentEventLog,
      }),
    })

    if (res.ok) {
      overlayState.submitted = true
      overlayState.submitting = false
      overlayState.submittedInitials = initials
      initialsInput.disabled = true
      submitSection.style.display = 'none'
      updateFocusTrap() // Update after hiding submit section
      loadLeaderboard(true) // Force refresh after submit
    } else {
      const data = await res.json()
      modalTitle.textContent = data.error || 'FAILED'
      overlayState.submitting = false
      submitBtn.disabled = false
      submitBtn.textContent = 'SUBMIT'
    }
  } catch {
    modalTitle.textContent = 'NETWORK ERROR'
    overlayState.submitting = false
    submitBtn.disabled = false
    submitBtn.textContent = 'SUBMIT'
  }
}

submitBtn.addEventListener('click', submitScore)
actionBtn.addEventListener('click', () => {
  hideOverlay()
  game.onInput('jump')
})
initialsInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitScore()
  }
})

// Leaderboard caching
const leaderboardCache = {
  data: null,
  timestamp: 0,
  TTL: 10000, // 10 seconds
}

async function loadLeaderboard(forceRefresh = false) {
  const now = Date.now()

  // Use cache if valid and not forcing refresh
  if (
    !forceRefresh &&
    leaderboardCache.data &&
    now - leaderboardCache.timestamp < leaderboardCache.TTL
  ) {
    renderLeaderboard(leaderboardCache.data)
    return
  }

  leaderboardList.innerHTML = '<p class="loading">LOADING...</p>'

  try {
    const res = await fetch('/api/scores')
    const data = await res.json()

    leaderboardCache.data = data
    leaderboardCache.timestamp = now

    renderLeaderboard(data)
  } catch {
    leaderboardList.innerHTML = '<p class="error">FAILED TO LOAD</p>'
  }
}

function renderLeaderboard(data) {
  if (data.scores && data.scores.length > 0) {
    leaderboardList.innerHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>NAME</th>
            <th>SCORE</th>
          </tr>
        </thead>
        <tbody>
          ${data.scores
            .map(
              (s, i) => `
            <tr class="${s.score === overlayState.currentScore && s.player_name === overlayState.submittedInitials ? 'highlight' : ''}">
              <td>${i + 1}</td>
              <td>${escapeHtml(s.player_name)}</td>
              <td>${s.score}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
  } else {
    leaderboardList.innerHTML = '<p class="empty">NO SCORES YET</p>'
  }
}

game.onGameOver = (score, eventLog) => {
  setTimeout(() => showOverlay(score, eventLog), 300)
}

document.addEventListener('keydown', (e) => {
  if (!overlayState.visible) {
    if (keycodes.JUMP[e.keyCode]) {
      game.onInput('jump')
    } else if (keycodes.DUCK[e.keyCode]) {
      game.onInput('duck')
    }
  } else {
    // Escape key closes modal
    if (e.key === 'Escape') {
      hideOverlay()
      game.onInput('jump')
      return
    }
    // Space/Enter closes only if not in input field
    if (document.activeElement !== initialsInput && keycodes.JUMP[e.keyCode]) {
      hideOverlay()
      game.onInput('jump')
    }
  }
})

document.addEventListener('keyup', (e) => {
  if (!overlayState.visible && keycodes.DUCK[e.keyCode]) {
    game.onInput('stop-duck')
  }
})

document.addEventListener(
  'touchstart',
  (e) => {
    if (!overlayState.visible) {
      e.preventDefault()
      if (e.touches.length === 1) {
        game.onInput('jump')
      } else if (e.touches.length === 2) {
        game.onInput('duck')
      }
    }
  },
  { passive: false }
)

document.addEventListener('touchend', (e) => {
  if (!overlayState.visible) {
    game.onInput('stop-duck')
  }
})

game.start().catch(console.error)
