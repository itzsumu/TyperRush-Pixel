import './style.css';
import { drawBike, SPRITE_W, SPRITE_H } from './sprite.js';

const $ = (id) => document.getElementById(id);

const sentences = [
  'The quick brown fox jumps over the lazy dog.',
  'Small steps every day lead to big achievements.',
  'Practice makes progress, and patience builds skill.',
  'A focused mind can turn a challenge into a victory.',
  'Keep your fingers moving and your eyes on the finish line.'
];

// Rider colours. Order = lane order from top to bottom, so YOU is the last lane (bottom).
const riders = [
  { id: 'ai1', speed: 3.2, body: '#3b8cff', jacket: '#1d2b53', helmet: '#dfe6ee', pants: '#243d70', progress: 0 },
  { id: 'ai2', speed: 3.0, body: '#a35bff', jacket: '#2a1d53', helmet: '#c9b8ff', pants: '#263b65', progress: 0 },
  { id: 'ai3', speed: 3.5, body: '#ffd23f', jacket: '#4a3b12', helmet: '#fff3c4', pants: '#314b6d', progress: 0 },
  { id: 'ai4', speed: 2.9, body: '#2fd0e0', jacket: '#12414a', helmet: '#c8f7fb', pants: '#2c4565', progress: 0 },
  { id: 'ai5', speed: 3.3, body: '#dfe6ee', jacket: '#333c57', helmet: '#8b9bb4', pants: '#24466a', progress: 0 },
  { id: 'player', speed: 0, body: '#e8412f', jacket: '#ffcd75', helmet: '#f4f4f4', pants: '#1a1c2c', progress: 0 }
];
const player = riders.find((r) => r.id === 'player');
const rivals = riders.filter((r) => r.id !== 'player');

let raceState = 'ready', sentenceIndex = 0, raceStartedAt = 0, timerId = null, aiId = null;
let totalTyped = 0, totalCorrect = 0, finished = false;

const input = $('typingInput'), sentenceText = $('sentenceText'), startBtn = $('startBtn'), typingHint = $('typingHint');
const scene = document.querySelector('.scene-wrap');

const currentSentence = () => sentences[sentenceIndex % sentences.length];
const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const getAccuracy = () => (totalTyped ? Math.round((totalCorrect / totalTyped) * 100) : 100);
function getWpm() {
  const mins = Math.max((Date.now() - raceStartedAt) / 60000, 1 / 60);
  return Math.round(totalCorrect / 5 / mins);
}

// ---------- Pixel art ----------
function bikeCanvas(r, frame, cls) {
  const c = document.createElement('canvas');
  c.width = SPRITE_W; c.height = SPRITE_H; c.className = 'sprite ' + cls;
  drawBike(c.getContext('2d'), r, frame);
  return c;
}

function buildLanes() {
  const host = $('runnerLanes');
  host.innerHTML = '';
  riders.forEach((r) => {
    const isYou = r.id === 'player';
    const lane = document.createElement('div');
    lane.className = 'runner-lane' + (isYou ? ' is-you' : '');
    lane.dataset.racer = r.id;

    const fill = document.createElement('div');
    fill.className = 'lane-fill';

    const bike = document.createElement('span');
    bike.className = 'bike';
    if (isYou) {
      const tag = document.createElement('span');
      tag.className = 'you-tag';
      tag.textContent = 'YOU';
      bike.append(tag);
    }
    bike.append(bikeCanvas(r, 0, 'f1'), bikeCanvas(r, 1, 'f2'));
    lane.append(fill, bike);
    host.appendChild(lane);
  });
}

// ---------- Scenery: parallax layers drawn as small pixel canvases, scaled 2x ----------
function layerURL(W, H, draw) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  draw(cv.getContext('2d'));
  return `url(${cv.toDataURL()})`;
}

function drawScenery() {
  const W = 240, H = 120, TAU = Math.PI * 2;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const wrap = (x0, fn) => [-W, 0, W].forEach((o) => fn(x0 + o));

  // sunset sky: banded + dithered
  const bands = ['#7a1a2e', '#a82434', '#c9302c', '#e04a2d', '#ef6b2f', '#f58f35', '#fbb04a', '#ffd27a'];
  $('lyrSky').style.backgroundImage = layerURL(W, H, (g) => {
    rect(g, 0, 0, W, H, '#ffd27a');
    bands.forEach((c, i) => {
      rect(g, 0, i * 10, W, 10, c);
      if (i < bands.length - 1) for (let y = i * 10 + 7; y < i * 10 + 10; y++) for (let x = 0; x < W; x++)
        if ((x + y) % 2 === 0 && (y > i * 10 + 7 || x % 4 === 0)) rect(g, x, y, 1, 1, bands[i + 1]);
    });
  });

  // cloud streaks
  $('lyrClouds').style.backgroundImage = layerURL(W, H, (g) => {
    for (let k = 0; k < 26; k++) {
      const y = 3 + Math.floor(rnd() * 64), len = 14 + Math.floor(rnd() * 50), x0 = Math.floor(rnd() * W), h = rnd() > 0.7 ? 2 : 1;
      const col = y < 34 ? 'rgba(90,10,40,.45)' : 'rgba(255,225,150,.55)';
      wrap(x0, (x) => rect(g, x, y, len, h, col));
    }
  });

  // snowy mountains
  $('lyrMount').style.backgroundImage = layerURL(W, H, (g) => {
    const base = 84;
    [[30, 28, 36], [95, 22, 22], [150, 32, 40], [208, 20, 26]].forEach(([cx, half, hgt]) => wrap(cx, (X) => {
      for (let y = 0; y < hgt; y++) {
        const hw = Math.round((y / hgt) * half) + (rnd() > 0.7 ? 1 : 0);
        const top = base - hgt + y;
        const cap = y < hgt * 0.32;
        rect(g, X - hw, top, hw, 1, cap ? '#f4f4f4' : '#a9c4dd');
        rect(g, X, top, hw + 1, 1, cap ? '#cfe0ee' : '#6f8cab');
      }
    }));
  });

  // rolling dark-green hills (sine sums with integer periods so the tile loops)
  $('lyrHills').style.backgroundImage = layerURL(W, H, (g) => {
    const far = (x) => 82 + Math.round(4 * Math.sin((TAU * x * 2) / W + 1) + 3 * Math.sin((TAU * x * 5) / W));
    const near = (x) => 92 + Math.round(3 * Math.sin((TAU * x * 3) / W) + 2 * Math.sin((TAU * x * 8) / W + 2));
    for (let x = 0; x < W; x++) {
      const f = far(x), n = near(x);
      rect(g, x, f, 1, H - f, '#1d5a45');
      rect(g, x, f, 1, 2, (x % 2 ? '#2e7d57' : '#256b4d'));
      rect(g, x, n, 1, H - n, '#0c3b2c');
      rect(g, x, n, 1, 2, x % 2 ? '#175a40' : '#0f4a34');
    }
  });

  // guardrail + dark grass verge
  $('lyrRail').style.backgroundImage = layerURL(W, H, (g) => {
    rect(g, 0, 101, W, H - 101, '#0a2a22');
    for (let i = 0; i < 260; i++) rect(g, Math.floor(rnd() * W), 104 + Math.floor(rnd() * 16), 1, 1, '#14463a');
    for (let x = 0; x < W; x += 16) {
      rect(g, x + 6, 100, 3, 9, '#4a5563');
      rect(g, x + 6, 100, 1, 9, '#6c7a89');
      if (x % 48 === 0) rect(g, x + 7, 98, 1, 2, '#ef7d57');
    }
    rect(g, 0, 93, W, 1, '#e8edf2');
    rect(g, 0, 94, W, 3, '#aab4c0');
    rect(g, 0, 97, W, 1, '#6c7a89');
    rect(g, 0, 98, W, 1, '#2a2d3a');
  });

  // asphalt texture for the road
  const road = document.createElement('canvas');
  road.width = 64; road.height = 64;
  const rg = road.getContext('2d');
  rect(rg, 0, 0, 64, 64, '#4b4f5d');
  for (let i = 0; i < 260; i++) rect(rg, Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1, ['#434756', '#555a68', '#3e4250'][Math.floor(rnd() * 3)]);
  for (let i = 0; i < 4; i++) { const x = Math.floor(rnd() * 56), y = Math.floor(rnd() * 64); rect(rg, x, y, 3 + Math.floor(rnd() * 5), 1, '#353845'); }
  $('raceTrack').style.backgroundImage = `url(${road.toDataURL()})`;
}

function paintRacers() {
  riders.forEach((r) => {
    const lane = document.querySelector(`[data-racer="${r.id}"]`);
    if (!lane) return;
    const p = Math.min(100, Math.max(0, r.progress));
    lane.querySelector('.lane-fill').style.width = `${4 + p * 0.88}%`;
    const bike = lane.querySelector('.bike');
    bike.style.left = `${4 + p * 0.88}%`;
    bike.classList.toggle('running', raceState === 'racing' && !finished);
  });
  const moving = raceState === 'racing' && !finished;
  scene.classList.toggle('moving', moving);
}

function renderSentence() {
  const target = currentSentence(), typed = input.value;
  sentenceText.innerHTML = '';
  for (let i = 0; i < target.length; i++) {
    const span = document.createElement('span');
    span.textContent = target[i];
    if (i < typed.length) span.className = typed[i] === target[i] ? 'correct' : 'incorrect';
    else if (i === typed.length && raceState === 'racing') span.className = 'current';
    sentenceText.appendChild(span);
  }
  $('sentenceCount').textContent = `SENTENCE ${Math.min(sentenceIndex + 1, sentences.length)} / ${sentences.length}`;
}

function updateStats() {
  const wpm = raceState === 'racing' || finished ? getWpm() : 0;
  const accuracy = getAccuracy();
  const target = currentSentence(), typed = input.value;
  let correct = 0;
  for (let i = 0; i < Math.min(typed.length, target.length); i++) if (typed[i] === target[i]) correct++;
  const progress = Math.min(100, Math.round(((sentenceIndex + (target.length ? correct / target.length : 0)) / sentences.length) * 100));
  player.progress = progress;
  $('wpmValue').textContent = wpm;
  $('accuracyValue').textContent = accuracy;
  $('progressValue').textContent = progress;
  $('wpmBar').style.width = `${Math.min(wpm, 100)}%`;
  $('accuracyBar').style.width = `${accuracy}%`;
  $('progressBar').style.width = `${progress}%`;
  $('hudWpm').textContent = wpm;
  $('hudAccuracy').textContent = `${accuracy}%`;
  $('distanceLabel').textContent = `${Math.round(progress)} / 100 m`;
  paintRacers();
}

function stopRace() {
  clearInterval(timerId); clearInterval(aiId);
  timerId = null; aiId = null;
}

function startRace() {
  stopRace();
  document.querySelector('.race-over-overlay')?.remove();
  sentenceIndex = 0; totalTyped = 0; totalCorrect = 0; finished = false;
  riders.forEach((r) => (r.progress = 0));
  input.value = ''; input.disabled = false;
  raceStartedAt = Date.now(); raceState = 'racing';
  startBtn.textContent = 'Race in progress…'; startBtn.disabled = true;
  $('raceStatus').textContent = 'LIVE RACE';
  typingHint.textContent = 'Type the sentence accurately to speed up your bike!';
  $('resultPanel').classList.add('hidden');
  $('timerLabel').textContent = '00:00';
  renderSentence(); updateStats(); input.focus();

  timerId = setInterval(() => {
    $('timerLabel').textContent = formatTime(Math.floor((Date.now() - raceStartedAt) / 1000));
    if (rivals.some((r) => r.progress >= 100)) endRace(false);
  }, 200);

  aiId = setInterval(() => {
    if (raceState !== 'racing' || finished) return;
    rivals.forEach((r, i) => {
      const variation = Math.sin(Date.now() / 1500 + i * 2) * 0.32;
      r.progress = Math.min(100, r.progress + (r.speed + variation) * 0.12);
    });
    paintRacers();
    if (rivals.some((r) => r.progress >= 100)) endRace(false);
  }, 120);
}

function endRace(playerWon) {
  if (finished) return;
  finished = true; raceState = 'finished';
  input.disabled = true; stopRace(); paintRacers();
  startBtn.disabled = false; startBtn.textContent = 'Race again ↻';
  $('raceStatus').textContent = 'FINISHED';
  const wpm = getWpm(), accuracy = getAccuracy();
  $('resultTitle').textContent = playerWon ? 'You won the race!' : 'The other bikes beat you this time!';
  $('resultSubtitle').textContent = playerWon ? 'Amazing ride! You reached the finish line first.' : 'Keep practising — every race makes you faster.';
  $('resultWpm').textContent = wpm;
  $('resultAccuracy').textContent = `${accuracy}%`;
  $('resultTime').textContent = formatTime(Math.floor((Date.now() - raceStartedAt) / 1000));
  $('resultPanel').classList.remove('hidden');
  typingHint.textContent = 'Race finished. Choose Race again to play another round.';
  const overlay = document.createElement('div');
  overlay.className = 'race-over-overlay';
  overlay.innerHTML = `<div><strong>${playerWon ? 'FINISH! YOU WIN!' : 'RACE FINISHED'}</strong><span>${playerWon ? 'Amazing ride!' : 'Better luck next race!'}</span></div>`;
  $('raceTrack').appendChild(overlay);
  setTimeout(() => $('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
}

input.addEventListener('input', () => {
  if (raceState !== 'racing' || finished) return;
  const target = currentSentence(), typed = input.value;
  totalTyped++;
  const i = typed.length - 1;
  if (i >= 0 && typed[i] === target[i]) totalCorrect++;
  renderSentence(); updateStats();
  if (typed === target) {
    sentenceIndex++;
    if (sentenceIndex >= sentences.length) {
      player.progress = 100; paintRacers();
      $('progressValue').textContent = '100';
      $('progressBar').style.width = '100%';
      $('distanceLabel').textContent = '100 / 100 m';
      endRace(!rivals.some((r) => r.progress >= 100));
    } else {
      input.value = ''; renderSentence(); updateStats();
      typingHint.textContent = 'Nice! Next sentence — keep going.';
    }
  }
});

startBtn.addEventListener('click', startRace);
$('playAgainBtn').addEventListener('click', () => {
  startRace();
  $('racePanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

buildLanes(); drawScenery(); renderSentence(); paintRacers();
$('timerLabel').textContent = '00:00';
