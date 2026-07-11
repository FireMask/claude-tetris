'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS_RETRO = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#39ff14', // L - neon green
];

const COLORS_NEON = [
  null,
  '#00e5ff',
  '#fff176',
  '#e040fb',
  '#69f0ae',
  '#ff1744',
  '#536dfe',
  '#76ff03',
];

const COLORS_PASTEL = [
  null,
  '#a8dadc',
  '#ffe8a3',
  '#d8b4e2',
  '#b8e0c2',
  '#f4a6a6',
  '#a8b4e2',
  '#b5e8b0',
];

const COLORS_PIXEL = [
  null,
  '#4dd0e1',
  '#ffd54f',
  '#ba68c8',
  '#81c784',
  '#e57373',
  '#7986cb',
  '#39ff14',
];

// SKINS maps a skin name to its color palette and per-block draw routine.
// The draw functions (drawRetroBlock, etc.) are declared later in this file;
// function declarations are hoisted, so referencing them here before their
// textual definition is safe.
const SKINS = {
  retro: { colors: COLORS_RETRO, draw: drawRetroBlock },
  neon: { colors: COLORS_NEON, draw: drawNeonBlock },
  pastel: { colors: COLORS_PASTEL, draw: drawPastelBlock },
  pixel: { colors: COLORS_PIXEL, draw: drawPixelBlock },
};

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const overlayExtra = document.getElementById('overlay-extra');
const overlayHighscoresEl = document.getElementById('overlay-highscores');
const overlayStatsEl = document.getElementById('overlay-stats');
const nameEntry = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const restartBtn = document.getElementById('restart-btn');
const themeSwitch = document.getElementById('theme-switch');
const startScreen = document.getElementById('start-screen');
const startHighscoresEl = document.getElementById('start-highscores');
const startStatsEl = document.getElementById('start-stats');
const startBtn = document.getElementById('start-btn');
const resetRecordsBtns = document.querySelectorAll('.reset-records-btn');
const skinSelect = document.getElementById('skin-select');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const restartMenuBtn = document.getElementById('restart-menu-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const menuControls = document.getElementById('menu-controls');
const startLevelSelect = document.getElementById('start-level-select');

const THEME_KEY = 'tetris-theme';
const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 15;
let gridColor = '#22222e';

const HIGHSCORES_KEY = 'tetris-highscores';
const STATS_KEY = 'tetris-stats';
const MAX_HIGHSCORES = 5;

function loadHighScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(HIGHSCORES_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveHighScores() {
  localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(highScores));
}

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    return {
      bestCombo: Number.isFinite(raw?.bestCombo) ? raw.bestCombo : 0,
      maxLinesCleared: Number.isFinite(raw?.maxLinesCleared) ? raw.maxLinesCleared : 0,
    };
  } catch {
    return { bestCombo: 0, maxLinesCleared: 0 };
  }
}

function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

let highScores = loadHighScores();
let stats = loadStats();

function renderHighScoreList(el, highlightIdx) {
  el.innerHTML = '';
  if (highScores.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Sin puntuaciones aún';
    li.classList.add('empty');
    el.appendChild(li);
    return;
  }
  highScores.forEach((entry, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${entry.name} — ${entry.score.toLocaleString()}`;
    if (i === highlightIdx) li.classList.add('highlight');
    el.appendChild(li);
  });
}

function renderStats(el) {
  el.textContent = `Mejor combo: ${stats.bestCombo} · Máx. líneas en una jugada: ${stats.maxLinesCleared}`;
}

function renderRecords(highlightIdx) {
  renderHighScoreList(overlayHighscoresEl, highlightIdx);
  renderHighScoreList(startHighscoresEl, highlightIdx);
  renderStats(overlayStatsEl);
  renderStats(startStatsEl);
}

function scoreQualifies(value) {
  return value > 0 && (highScores.length < MAX_HIGHSCORES || value > highScores[highScores.length - 1].score);
}

function saveHighScoreEntry() {
  const name = playerNameInput.value.trim().slice(0, 15) || 'Jugador';
  highScores.push({ name, score });
  highScores.sort((a, b) => b.score - a.score);
  highScores = highScores.slice(0, MAX_HIGHSCORES);
  saveHighScores();
  nameEntry.classList.add('hidden');
  const idx = highScores.findIndex(e => e.name === name && e.score === score);
  renderRecords(idx);
}

function resetRecords() {
  highScores = [];
  stats = { bestCombo: 0, maxLinesCleared: 0 };
  localStorage.removeItem(HIGHSCORES_KEY);
  localStorage.removeItem(STATS_KEY);
  renderRecords(null);
}

saveScoreBtn.addEventListener('click', saveHighScoreEntry);
playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveHighScoreEntry();
});
resetRecordsBtns.forEach(btn => btn.addEventListener('click', resetRecords));
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

for (let lvl = 1; lvl <= MAX_START_LEVEL; lvl++) {
  const opt = document.createElement('option');
  opt.value = lvl;
  opt.textContent = lvl;
  startLevelSelect.appendChild(opt);
}

function getStartLevel() {
  const stored = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  if (Number.isInteger(stored) && stored >= 1 && stored <= MAX_START_LEVEL) return stored;
  return 1;
}

startLevelSelect.value = getStartLevel();

startLevelSelect.addEventListener('change', () => {
  localStorage.setItem(START_LEVEL_KEY, startLevelSelect.value);
});

function updateGridColor() {
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
}

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  themeSwitch.checked = theme === 'light';
  updateGridColor();
}

themeSwitch.addEventListener('change', () => {
  const theme = themeSwitch.checked ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
});

applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

const SKIN_KEY = 'tetris-skin';
let currentSkin = 'retro';

function applySkin(skin) {
  currentSkin = SKINS[skin] ? skin : 'retro';
  document.body.dataset.skin = currentSkin;
  skinSelect.value = currentSkin;
  updateGridColor();
}

skinSelect.addEventListener('change', () => {
  const skin = skinSelect.value;
  localStorage.setItem(SKIN_KEY, skin);
  applySkin(skin);
  // Redraw immediately so the switch applies live. board/current only exist
  // once init() has run (below); guard so an early change event can't throw.
  if (typeof board !== 'undefined' && board && typeof current !== 'undefined' && current) {
    draw();
    drawNext();
  }
});

applySkin(localStorage.getItem(SKIN_KEY) || 'retro');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, combo, started;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    combo++;
    let statsChanged = false;
    if (combo > stats.bestCombo) {
      stats.bestCombo = combo;
      statsChanged = true;
    }
    if (cleared > stats.maxLinesCleared) {
      stats.maxLinesCleared = cleared;
      statsChanged = true;
    }
    if (statsChanged) saveStats();
    updateHUD();
  } else {
    combo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin] || SKINS.retro;
  const color = skin.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  skin.draw(context, x, y, color, size);
  context.globalAlpha = 1;
}

// Retro: the original flat block with a light top highlight strip.
function drawRetroBlock(context, gx, gy, color, size) {
  context.fillStyle = color;
  context.fillRect(gx * size + 1, gy * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(gx * size + 1, gy * size + 1, size - 2, 4);
}

// Neon: glowing block on (CSS-driven) black board background.
function drawNeonBlock(context, gx, gy, color, size) {
  const px = gx * size + 1;
  const py = gy * size + 1;
  const s = size - 2;
  context.save();
  context.shadowBlur = 10;
  context.shadowColor = color;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  context.restore();
}

// Pastel: muted palette with rounded corners and a soft top highlight.
function drawPastelBlock(context, gx, gy, color, size) {
  const px = gx * size + 1;
  const py = gy * size + 1;
  const s = size - 2;
  const radius = Math.min(6, s / 3);
  context.fillStyle = color;
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(px, py, s, s, radius);
    context.fill();
  } else {
    context.fillRect(px, py, s, s);
  }
  context.fillStyle = 'rgba(255,255,255,0.3)';
  const highlightH = Math.max(0, s / 2 - 2);
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(px + 2, py + 2, s - 4, highlightH, Math.max(0, radius - 2));
    context.fill();
  } else {
    context.fillRect(px + 2, py + 2, s - 4, highlightH);
  }
}

// Pixel art: flat fill with a small checkerboard texture over each block.
function drawPixelBlock(context, gx, gy, color, size) {
  const px = gx * size + 1;
  const py = gy * size + 1;
  const s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const cells = 4;
  const cellSize = s / cells;
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if ((r + c) % 2 === 0) {
        context.fillRect(px + c * cellSize, py + r * cellSize, cellSize, cellSize);
      }
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlayExtra.classList.remove('hidden');
  renderRecords(null);
  const qualifies = scoreQualifies(score);
  nameEntry.classList.toggle('hidden', !qualifies);
  if (qualifies) playerNameInput.value = '';
  overlay.classList.remove('hidden');
  if (qualifies) playerNameInput.focus();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    pauseOverlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = getStartLevel();
  combo = 0;
  paused = false;
  gameOver = false;
  started = true;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  nameEntry.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  menuControls.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!started) return;
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

resumeBtn.addEventListener('click', () => {
  if (paused) togglePause();
});

restartMenuBtn.addEventListener('click', () => {
  init();
});

toggleControlsBtn.addEventListener('click', () => {
  menuControls.classList.toggle('hidden');
});

renderRecords(null);
