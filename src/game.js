// ===== GAME STATE =====
let contestants = [];
let currentIndex = -1;   // -1 so first nextTurn() lands on index 0 (the player)
let autoPlayMode = false;
let turnTimer = null;
let playerLocked = false; // blocks double-clicks

// ===== QUESTION GENERATION =====
function generateQuestion(skillLevel) {
  const maxNum = Math.min(4 + skillLevel * 3, 50);
  const a = Math.floor(Math.random() * maxNum) + 1;
  const b = Math.floor(Math.random() * maxNum) + 1;
  const answer = a + b;

  const wrongSet = new Set();
  while (wrongSet.size < 3) {
    const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
    const w = answer + offset;
    if (w > 0 && w !== answer) wrongSet.add(w);
  }

  const choices = [...wrongSet, answer].sort(() => Math.random() - 0.5);
  return { a, b, answer, choices };
}

// ===== AI ACCURACY BY AGE =====
function aiIsCorrect(contestant) {
  const accuracy = Math.min(0.25 + contestant.ageGroup.skillLevel * 0.11, 0.93);
  return Math.random() < accuracy;
}

// ===== INIT =====
function startGame() {
  autoPlayMode = false;
  initAudio();
  initGame();
}

function watchMode() {
  autoPlayMode = true;
  initAudio();
  initGame();
}

function initGame() {
  if (turnTimer) clearTimeout(turnTimer);
  contestants = generateContestants();
  currentIndex = -1;
  playerLocked = false;

  show('screen-game');
  hide('screen-intro');
  hide('screen-win');

  renderGrid();
  updateAliveCount();
  hideResult();
  nextTurn();
}

function handleMute() {
  const muted = toggleMute();
  document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
}

function restartGame() {
  if (turnTimer) clearTimeout(turnTimer);
  show('screen-intro');
  hide('screen-game');
  hide('screen-win');
}

// ===== HELPERS =====
function show(id) { document.getElementById(id).style.display = 'flex'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function el(id)   { return document.getElementById(id); }

// ===== GRID RENDERING =====
function renderGrid() {
  const zone = el('platform-zone');
  zone.innerHTML = '';
  contestants.forEach(c => {
    const div = document.createElement('div');
    div.className = 'ctile' + (c.isPlayer ? ' is-player' : '');
    div.id = `c-${c.id}`;
    div.innerHTML = `
      <div class="cshirt" style="background:${c.shirtColor}">
        <span class="cnum">${c.number}</span>
        <span class="cage">${c.ageGroup.emoji}</span>
      </div>
      <div class="cname">${c.isPlayer ? 'YOU' : c.name}</div>
    `;
    zone.appendChild(div);
  });
}

function updateAliveCount() {
  const n = contestants.filter(c => c.alive).length;
  el('alive-count').textContent = n;
}

// ===== TURN LOGIC =====
function nextTurn() {
  // Find next alive contestant
  let attempts = 0;
  do {
    currentIndex = (currentIndex + 1) % contestants.length;
    attempts++;
    if (attempts > contestants.length) { checkWin(); return; }
  } while (!contestants[currentIndex].alive);

  const alive = contestants.filter(c => c.alive).length;
  if (alive <= 1) { checkWin(); return; }

  const c = contestants[currentIndex];
  activateContestant(currentIndex);
  renderQuestion(c);
}

function checkWin() {
  const alive = contestants.filter(c => c.alive);
  if (alive.length <= 1) showWin(alive[0] || contestants[currentIndex]);
}

function activateContestant(idx) {
  document.querySelectorAll('.ctile').forEach(e => e.classList.remove('active'));
  const tile = el(`c-${contestants[idx].id}`);
  if (tile) {
    tile.classList.add('active');
    tile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

// ===== QUESTION RENDERING =====
function renderQuestion(c) {
  const q = generateQuestion(c.ageGroup.skillLevel);
  const isPlayer = c.isPlayer && !autoPlayMode;

  // Contestant info
  el('cur-avatar').textContent  = c.ageGroup.emoji;
  el('cur-avatar').style.background = c.shirtColor;
  el('cur-name').textContent    = isPlayer ? 'YOUR TURN!' : `#${c.number} ${c.name}`;
  el('cur-age').textContent     = `${c.ageGroup.label} · Age ${c.ageGroup.ageRange}`;
  el('equation').textContent    = `${q.a}  +  ${q.b}  =  ?`;

  // Panel highlight + music intensity
  const panelClass = isPlayer ? 'question-panel player-turn' : 'question-panel ai-turn';
  el('question-panel').className = panelClass;
  el('announcer').textContent    = isPlayer ? '🎤 BRYCE BEAST ASKS YOU!' : `🎤 Bryce asks ${c.name}...`;
  setIntensity(isPlayer ? 'player' : 'normal');

  renderChoices(q, c, isPlayer);
}

function renderChoices(q, c, isPlayer) {
  const box = el('choices-box');
  box.innerHTML = '';

  q.choices.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (isPlayer ? ' player-btn' : ' ai-btn');
    btn.textContent = val;
    btn.dataset.val = val;

    if (isPlayer) {
      btn.addEventListener('click', () => handlePlayerChoice(val, q, c));
    }
    box.appendChild(btn);
  });

  if (!isPlayer) {
    // AI auto-answers after a delay
    playerLocked = true;
    const delay = autoPlayMode ? 900 : 1500;
    turnTimer = setTimeout(() => {
      const correct = aiIsCorrect(c);
      const picked = correct ? q.answer : q.choices.find(v => v !== q.answer);
      highlightAIChoice(picked, q.answer);
      turnTimer = setTimeout(() => {
        processResult(c, correct, q);
      }, 700);
    }, delay);
  } else {
    playerLocked = false;
  }
}

function highlightAIChoice(picked, answer) {
  document.querySelectorAll('.choice-btn').forEach(btn => {
    const v = parseInt(btn.dataset.val);
    if (v === picked) {
      btn.classList.add(picked === answer ? 'btn-correct' : 'btn-wrong');
      btn.classList.add('btn-picked');
    }
  });
}

// ===== PLAYER INPUT =====
function handlePlayerChoice(val, q, c) {
  if (playerLocked) return;
  playerLocked = true;

  const correct = val === q.answer;

  // Show which button they picked + correct answer
  document.querySelectorAll('.choice-btn').forEach(btn => {
    const v = parseInt(btn.dataset.val);
    btn.disabled = true;
    if (v === q.answer) btn.classList.add('btn-correct');
    if (v === val && !correct) btn.classList.add('btn-wrong');
  });

  processResult(c, correct, q);
}

// ===== RESULT =====
function processResult(c, correct, q) {
  setIntensity('normal');
  showResult(c, correct, q);

  if (correct) {
    playCorrect();
    announce('Correct!');
    flashCorrect(c);
  } else {
    playWrong();
    announce('Wrong!');
    eliminateContestant(c);
  }

  const delay = autoPlayMode ? 900 : (c.isPlayer ? 1800 : 1200);
  turnTimer = setTimeout(() => {
    hideResult();
    // Check if player just lost
    if (!correct && c.isPlayer) {
      showGameOver();
      return;
    }
    nextTurn();
  }, delay);
}

function showResult(c, correct, q) {
  const overlay = el('result-overlay');
  const content = el('result-content');
  overlay.style.display = 'flex';

  if (correct) {
    overlay.className = 'result-overlay res-correct';
    content.innerHTML = `
      <div class="res-icon">✅</div>
      <div class="res-text">CORRECT!</div>
      <div class="res-name">${c.isPlayer ? 'YOU STAY!' : `${c.name} STAYS!`}</div>
    `;
  } else {
    const cry = c.ageGroup.cry ? '<div class="res-cry">WAAAAAAH! 😭</div>' : '';
    overlay.className = 'result-overlay res-wrong';
    content.innerHTML = `
      <div class="res-icon">❌</div>
      <div class="res-text">WRONG!</div>
      <div class="res-name">${c.isPlayer ? 'YOU FELL!' : `${c.name} FALLS!`}</div>
      <div class="res-answer">Answer: <strong>${q.answer}</strong></div>
      ${cry}
    `;
  }
}

function hideResult() {
  el('result-overlay').style.display = 'none';
}

function flashCorrect(c) {
  const tile = el(`c-${c.id}`);
  if (tile) {
    tile.classList.add('correct-flash');
    setTimeout(() => tile.classList.remove('correct-flash'), 600);
  }
}

function eliminateContestant(c) {
  c.alive = false;
  updateAliveCount();
  const tile = el(`c-${c.id}`);
  if (tile) {
    tile.classList.add('falling');
    setTimeout(() => {
      tile.classList.remove('falling');
      tile.classList.add('eliminated');
    }, 700);
  }
}

// ===== GAME OVER (player lost) =====
function showGameOver() {
  const overlay = el('result-overlay');
  const content = el('result-content');
  overlay.style.display = 'flex';
  overlay.className = 'result-overlay res-wrong';

  const remaining = contestants.filter(c => c.alive).length;
  content.innerHTML = `
    <div class="res-icon">💀</div>
    <div class="res-text">YOU'RE OUT!</div>
    <div class="res-name">${remaining} contestants remain</div>
    <div class="gameover-btns">
      <button class="btn-gameover-watch" onclick="continueAsSpectator()">WATCH THE REST</button>
      <button class="btn-gameover-restart" onclick="restartGame()">PLAY AGAIN</button>
    </div>
  `;
}

function continueAsSpectator() {
  hideResult();
  autoPlayMode = true;
  nextTurn();
}

// ===== WIN SCREEN =====
function showWin(winner) {
  hide('screen-game');
  const winScreen = el('screen-win');
  winScreen.style.display = 'flex';

  el('winner-display').innerHTML = `
    <div class="winner-badge" style="background:${winner.shirtColor}">
      <span class="winner-emoji-big">${winner.ageGroup.emoji}</span>
      <span class="winner-num-big">#${winner.number}</span>
    </div>
    <div class="winner-name-big">${winner.isPlayer ? '🎉 YOU WON! 🎉' : winner.name}</div>
    <div class="winner-age-label">${winner.ageGroup.label}</div>
  `;

  el('win-sub').textContent = winner.isPlayer
    ? 'You outlasted all 10 other contestants in Bryce\'s Math Challenge!'
    : `${winner.name} the ${winner.ageGroup.label} was the last one standing!`;

  spawnConfetti();
}

function spawnConfetti() {
  const c = el('confetti-container');
  c.innerHTML = '';
  const colors = ['#FF3B30','#FF9500','#FFCC00','#34C759','#007AFF','#5856D6','#FF2D55'];
  for (let i = 0; i < 100; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left:${Math.random()*100}%;
      background:${colors[i % colors.length]};
      animation-delay:${Math.random()*2.5}s;
      animation-duration:${2.5 + Math.random()*2}s;
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
      border-radius:${Math.random() < 0.5 ? '50%' : '2px'};
    `;
    c.appendChild(p);
  }
}
