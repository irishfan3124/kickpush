'use strict';

// Scoring and course pacing use seconds and world units, independently of screen size.
const BANK_DELAY = 0.7;
const MANUAL_LIMIT = 4;
const GRAVITY = 1450;
const FLIPS = {
  kickflip: { name: 'Kickflip', points: 350, duration: 0.36, direction: 1 },
  heelflip: { name: 'Heelflip', points: 400, duration: 0.4, direction: -1 },
  shuvit: { name: 'Pop Shuvit', points: 300, duration: 0.3, direction: 1 }
};
const SPINS = {
  '180': { name: '180 Spin', points: 250, duration: 0.28, turns: 0.5 },
  '360': { name: '360 Spin', points: 500, duration: 0.44, turns: 1 },
  '540': { name: '540 Spin', points: 850, duration: 0.64, turns: 1.5 }
};
const OBSTACLE_TYPES = {
  kicker: { label: 'Kicker', hint: 'RIDE IT FOR AIR', width: [95, 130], h: 36, launch: 800 },
  ramp: { label: 'Quarter pipe', hint: 'BIG AIR · MIX TRICKS', width: [135, 165], h: 67, launch: 880 },
  rail: { label: 'Flat rail', hint: 'HOLD LINK TO GRIND', width: [145, 210], h: 45, grind: '50–50 Grind' },
  downrail: { label: 'Down rail', hint: 'HOLD LINK TO SLIDE', width: [155, 210], h: 62, grind: 'Boardslide' },
  ledge: { label: 'Long ledge', hint: 'JUMP OR HOLD LINK', width: [130, 195], h: 34, grind: 'Noseslide' },
  bench: { label: 'Park bench', hint: 'JUMP OR HOLD LINK', width: [100, 145], h: 38, grind: '5–0 Grind' },
  block: { label: 'Low block', hint: 'OLLIE OVER IT', width: [55, 85], h: 30 },
  stairs: { label: 'Stair set', hint: 'JUMP THE STEPS', width: [95, 135], h: 48 },
  barrier: { label: 'Barrier', hint: 'TIME A HIGH OLLIE', width: [45, 65], h: 58 },
  planter: { label: 'Planter', hint: 'CLEAR THE WHOLE BOX', width: [65, 95], h: 50 },
  gap: { label: 'Street gap', hint: 'JUMP BEFORE THE EDGE', width: [85, 130], h: 7 }
};

let state = 'ready', remaining = 90, score = 0, best = 0, velocity = 0;
let hold = false, lastNow = 0, comboBase = 0, comboCount = 0, comboTimer = 0;
let comboNames = [], comboHistory = new Map(), flipLeft = 0, spinLeft = 0, grabLeft = 0;
let activeFlip = FLIPS.kickflip, activeSpin = SPINS['360'];
let selectedFlip = 'kickflip', selectedSpin = '360', stance = 1, pendingSwitch = false;
let feedbackLeft = 0, respawn = 0, manualActive = false, manualTime = 0, railActive = null;
let nextObstacle = 700, courseIndex = 0, courseSeed = 1, courseBag = [];
let soundOn = false, audioContext = null, runBanks = 0, runBails = 0, bestCombo = 0, startingBest = 0;
const obstacles = [], particles = [];
const $ = id => document.getElementById(id);
const format = n => Math.floor(n).toString().padStart(6, '0');
try {
  best = Number(localStorage.getItem('kickpush-best')) || 0;
  soundOn = localStorage.getItem('kickpush-sound') === 'on';
} catch {}

function multiplier() {
  return Math.min(12, 1 + Math.floor(comboCount / 2) + Math.max(0, new Set(comboNames).size - 1));
}

function tell(message, bad = false) {
  $('feedback').textContent = message;
  $('feedback').classList.add('show');
  $('feedback').classList.toggle('bad', bad);
  feedbackLeft = 1.2;
}

function sound(freq = 400, length = 0.1) {
  if (!soundOn) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 0.55, audioContext.currentTime + length);
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + length);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + length);
  } catch {}
}

function setSoundIcon() {
  $('sound').setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
  $('sound').title = soundOn ? 'Sound on' : 'Sound off';
  $('sound').innerHTML = soundOn
    ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/></svg>';
}

function addTrick(name, points, switchBonus = false) {
  // Diminishing returns apply to every repetition in a combo, not just adjacent tricks.
  const repeats = comboHistory.get(name) || 0;
  const freshness = Math.max(0.2, Math.pow(0.65, repeats));
  comboBase += points * freshness * (switchBonus && stance === -1 ? 1.2 : 1);
  comboHistory.set(name, repeats + 1);
  comboCount++;
  comboNames.push(name);
  comboTimer = BANK_DELAY;
  $('combo-label').textContent = name.toUpperCase();
  sound(name.includes('flip') ? 620 : 440);
  updateHUD();
}

function canBank() {
  return state === 'playing' && respawn <= 0 && comboCount > 0 &&
    (scene.height === 0 || railActive !== null) && flipLeft === 0 && spinLeft === 0 && grabLeft === 0;
}

function updateHUD() {
  $('score').textContent = format(score);
  $('best').textContent = format(best);
  const seconds = Math.ceil(Math.max(0, remaining));
  $('time').textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  $('time').parentElement.classList.toggle('warning', seconds <= 15);
  $('combo').hidden = comboCount === 0;
  const pending = Math.floor(comboBase * multiplier());
  $('combo-score').textContent = pending.toLocaleString();
  $('multiplier').textContent = '×' + multiplier();
  const balance = Math.max(0, 1 - manualTime / MANUAL_LIMIT);
  $('combo-meter').style.width = (manualActive ? balance : Math.max(0, comboTimer / BANK_DELAY)) * 100 + '%';
  $('combo-meter').classList.toggle('balance', manualActive);
  $('combo-meter').classList.toggle('danger', manualActive && balance < 0.3);
  $('combo-hint').textContent = railActive ? 'LOCKED IN · BANK OR POP OUT'
    : scene.height > 0 ? 'LAND TO BANK · HOLD LINK TO CONNECT'
    : manualActive ? 'BALANCE RUNNING OUT · RELEASE OR JUMP'
    : 'BANKING IN ' + Math.max(0, comboTimer).toFixed(1) + 's · HOLD LINK TO CONNECT';
  $('bank-button').disabled = !canBank();
  $('bank-amount').textContent = pending ? '+' + pending.toLocaleString() : 'CASH IN YOUR COMBO';
  const upcoming = obstacles.find(ob => ob.x + ob.w > scene.distance && !ob.failed);
  if (upcoming) {
    const type = OBSTACLE_TYPES[upcoming.type];
    $('next-obstacle').textContent = type.label.toUpperCase();
    $('obstacle-tip').textContent = type.hint;
  }
  scene.stance = stance;
  scene.balance = balance;
}

function clearCombo() {
  comboBase = 0; comboCount = 0; comboTimer = 0; comboNames = []; comboHistory.clear();
  $('combo').hidden = true;
}

function bank() {
  if (!canBank()) return false;
  const earned = Math.floor(comboBase * multiplier());
  score += earned; runBanks++; bestCombo = Math.max(bestCombo, earned);
  if (score > best) {
    best = score;
    try { localStorage.setItem('kickpush-best', String(best)); } catch {}
  }
  if (railActive) {
    scene.height = surfaceHeight(railActive); railActive = null; scene.grind = false; velocity = 660;
  }
  release();
  tell('+' + earned.toLocaleString() + ' BANKED');
  sound(790, 0.18);
  clearCombo(); updateHUD();
  return true;
}

function spark() {
  for (let i = 0; i < 4; i++) particles.push({ x: scene.distance, y: scene.height, dx: -40 - Math.random() * 100, dy: Math.random() * 90, life: 0.4 });
}

function bail(reason = 'BAIL! UNBANKED COMBO LOST') {
  if (respawn > 0) return;
  runBails++; clearCombo();
  scene.height = 0; velocity = 0; flipLeft = spinLeft = grabLeft = 0;
  scene.flip = scene.spin = scene.shuvit = scene.grab = 0;
  scene.bail = 1; scene.grind = false; railActive = null; pendingSwitch = false;
  release(); respawn = 1.2;
  tell(reason, true); sound(110, 0.25);
  $('ride-status').textContent = 'BANKED POINTS ARE SAFE.';
  document.querySelectorAll('.trick').forEach(button => button.classList.remove('pressed'));
}

function randomCourse() {
  courseSeed = (Math.imul(courseSeed, 1664525) + 1013904223) | 0;
  return (courseSeed >>> 0) / 4294967296;
}

function nextType() {
  const opening = ['kicker', 'rail', 'barrier', 'gap', 'stairs', 'ledge'];
  if (courseIndex < opening.length) return opening[courseIndex++];
  courseIndex++;
  if (!courseBag.length) {
    courseBag = Object.keys(OBSTACLE_TYPES);
    for (let i = courseBag.length - 1; i > 0; i--) {
      const j = Math.floor(randomCourse() * (i + 1));
      [courseBag[i], courseBag[j]] = [courseBag[j], courseBag[i]];
    }
  }
  return courseBag.pop();
}

function populate() {
  while (nextObstacle < scene.distance + 3500) {
    const type = nextType(), definition = OBSTACLE_TYPES[type];
    const width = Math.round(definition.width[0] + randomCourse() * (definition.width[1] - definition.width[0]));
    obstacles.push({ x: nextObstacle, type, w: width, hit: false, failed: false, cleared: false });
    // Every feature has a landing/banking stretch measured after its end.
    // Ramp air gets extra space; even at maximum speed this exceeds airtime + BANK_DELAY.
    const runway = 430 + randomCourse() * 160 + (definition.launch ? 140 : 0);
    nextObstacle += width + runway;
  }
  while (obstacles.length && obstacles[0].x + obstacles[0].w < scene.distance - 400) obstacles.shift();
}

function surfaceHeight(obstacle, distance = scene.distance) {
  const definition = OBSTACLE_TYPES[obstacle.type];
  const fraction = Math.max(0, Math.min(1, (distance - obstacle.x) / obstacle.w));
  if (obstacle.type === 'downrail') return definition.h - fraction * 40;
  if (obstacle.type === 'stairs') return (4 - Math.min(3, Math.floor(fraction * 4))) * 12;
  return definition.h;
}

function start() {
  state = 'playing'; remaining = 90; score = 0; startingBest = best;
  runBanks = runBails = bestCombo = 0; stance = 1; pendingSwitch = false;
  scene.distance = 0; scene.height = 0; scene.bail = 0;
  scene.flip = scene.spin = scene.grab = scene.shuvit = 0; scene.grind = false;
  velocity = 0; respawn = 0; hold = false; railActive = null; manualActive = false; manualTime = 0;
  flipLeft = spinLeft = grabLeft = 0; nextObstacle = 700; courseIndex = 0; courseBag = [];
  courseSeed = Math.floor(Math.random() * 4294967296) | 0;
  obstacles.length = 0; particles.length = 0; clearCombo(); populate();
  $('overlay').hidden = true; $('pause').disabled = false;
  $('pause').setAttribute('aria-label', 'Pause game');
  $('ride-status').textContent = 'SHORT COMBOS. BIG SCORES.';
  feedbackLeft = 0; $('feedback').classList.remove('show'); updateHUD(); sound(350, 0.15);
}

function jump() {
  scene.height = Math.max(1, scene.height); velocity = 660;
  scene.grind = false; railActive = null; manualActive = false; manualTime = 0;
  addTrick('Ollie', 100, true);
}

function remainingFlight() {
  return (velocity + Math.sqrt(velocity * velocity + 2 * GRAVITY * scene.height)) / GRAVITY;
}

function action(name) {
  if (state !== 'playing' || respawn > 0) return false;
  if (name === 'bank') return bank();
  if (name === 'grind') { hold = true; return true; }
  if (name === 'ollie') {
    if (scene.height === 0 || railActive) { jump(); return true; }
    return false;
  }
  if (!['flip', 'spin', 'grab'].includes(name)) return false;
  if (name === 'flip' && (flipLeft > 0 || grabLeft > 0)) return false;
  if (name === 'spin' && spinLeft > 0) return false;
  if (name === 'grab' && (grabLeft > 0 || flipLeft > 0)) { tell('CATCH THE DECK FIRST'); return false; }
  if (scene.height === 0 || railActive) jump();
  const trick = name === 'flip' ? FLIPS[selectedFlip] : name === 'spin' ? SPINS[selectedSpin]
    : { name: 'Melon Grab', points: 300, duration: 0.25 };
  if (remainingFlight() < trick.duration + 0.035) { tell('LAND FIRST'); return false; }
  if (name === 'flip') { activeFlip = trick; flipLeft = trick.duration; }
  else if (name === 'spin') {
    activeSpin = trick; spinLeft = trick.duration;
    if (trick.turns % 1 !== 0) pendingSwitch = !pendingSwitch;
  } else grabLeft = trick.duration;
  addTrick(trick.name, trick.points, true);
  return true;
}

function release() {
  hold = false; manualActive = false; manualTime = 0;
  document.querySelector('[data-action="grind"]').classList.remove('pressed');
}

function pause() {
  if (state === 'playing') {
    state = 'paused'; release(); $('overlay').hidden = false;
    $('overlay').innerHTML = '<div class="start-panel"><span class="panel-kicker">TAKE A BREATHER</span><h2>On a break.</h2><p>Your line will be right here.</p><button class="start-button" data-resume>Keep rolling <svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7Z"/></svg></button><button class="text-button" data-help>How to play</button></div>';
    $('pause').setAttribute('aria-label', 'Resume game'); updateHUD();
  } else if (state === 'paused') resume();
}

function resume() { state = 'playing'; $('overlay').hidden = true; $('pause').setAttribute('aria-label', 'Pause game'); updateHUD(); }

function finish() {
  if (!bank()) clearCombo();
  state = 'finished'; release(); $('overlay').hidden = false;
  $('overlay').innerHTML = '<div class="start-panel result-panel"><span class="panel-kicker">' + (score > startingBest ? 'PERSONAL BEST' : 'THAT’S A WRAP') + '</span><h2>Good session.</h2><div class="result-score">' + score.toLocaleString() + '</div><p>' + runBanks + ' COMBOS BANKED · ' + runBails + ' BAILS<br>Best combo: ' + bestCombo.toLocaleString() + '</p><button class="start-button" data-restart>One more run <svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7Z"/></svg></button></div>';
  $('pause').disabled = true; $('ride-status').textContent = 'SEE YOU ON THE NEXT RUN.'; updateHUD();
}

function land() {
  scene.height = 0; velocity = 0;
  if (flipLeft > 0.045 || spinLeft > 0.045 || grabLeft > 0.045) { bail(); return; }
  flipLeft = spinLeft = grabLeft = 0;
  scene.flip = scene.spin = scene.shuvit = scene.grab = 0;
  if (pendingSwitch) stance *= -1;
  pendingSwitch = false; comboTimer = BANK_DELAY;
  sound(220, 0.05);
  $('ride-status').textContent = stance === -1 ? 'SWITCH STANCE · +20% TRICK POINTS' : 'CLEAN LANDING · READY TO BANK.';
}

function step(dt) {
  if (state !== 'playing') return;
  remaining = Math.max(0, remaining - dt);
  const previous = scene.distance;
  scene.distance += dt * (245 + (90 - remaining) * 0.45);
  populate();
  if (feedbackLeft > 0) { feedbackLeft -= dt; if (feedbackLeft <= 0) $('feedback').classList.remove('show'); }
  if (respawn > 0) {
    respawn = Math.max(0, respawn - dt);
    if (respawn === 0) { scene.bail = 0; $('ride-status').textContent = 'BACK ON THE BOARD.'; }
    updateHUD(); if (remaining === 0) finish(); return;
  }

  flipLeft = Math.max(0, flipLeft - dt); spinLeft = Math.max(0, spinLeft - dt); grabLeft = Math.max(0, grabLeft - dt);
  scene.flip = flipLeft > 0 && activeFlip !== FLIPS.shuvit ? (1 - flipLeft / activeFlip.duration) * activeFlip.direction : 0;
  scene.shuvit = flipLeft > 0 && activeFlip === FLIPS.shuvit ? 1 - flipLeft / activeFlip.duration : 0;
  scene.spin = spinLeft > 0 ? 1 - spinLeft / activeSpin.duration : 0;
  scene.spinTurns = activeSpin.turns; scene.grab = grabLeft > 0 ? Math.sin((1 - grabLeft / 0.25) * Math.PI) : 0;

  if (railActive) {
    if (!hold || scene.distance > railActive.x + railActive.w) {
      scene.height = surfaceHeight(railActive, Math.min(scene.distance, railActive.x + railActive.w));
      railActive = null; scene.grind = false; velocity = 80;
    } else {
      scene.height = surfaceHeight(railActive); velocity = 0; scene.grind = true;
      if (comboCount) comboBase += dt * 190;
      comboTimer = BANK_DELAY;
      if (Math.random() < dt * 18) spark();
    }
  }
  if (!railActive && scene.height > 0) {
    velocity -= GRAVITY * dt; scene.height += velocity * dt;
    if (scene.height <= 0) land();
  }

  if (respawn === 0) for (const obstacle of obstacles) {
    const definition = OBSTACLE_TYPES[obstacle.type];
    const inside = scene.distance >= obstacle.x && scene.distance <= obstacle.x + obstacle.w;
    const entered = previous < obstacle.x && scene.distance >= obstacle.x;
    const height = surfaceHeight(obstacle);
    if (definition.launch && entered && scene.height < 8 && !obstacle.hit) {
      obstacle.hit = true; scene.height = 18; velocity = definition.launch;
      manualActive = false; manualTime = 0;
      addTrick(obstacle.type === 'kicker' ? 'Kicker air' : 'Ramp air', 200, true); tell('SEND IT!');
    }
    if (definition.grind && inside && hold && !railActive && scene.height < height + 45 && (velocity <= 0 || scene.height === 0)) {
      railActive = obstacle; scene.height = height; velocity = 0; scene.grind = true;
      manualActive = false; manualTime = 0;
      if (!obstacle.hit) { obstacle.hit = true; addTrick(definition.grind, 600); tell('LOCKED IN'); }
    }
    if (inside && !obstacle.failed && !definition.launch && railActive !== obstacle && scene.height < height) {
      obstacle.failed = true; bail(); break;
    }
    const exited = previous <= obstacle.x + obstacle.w && scene.distance > obstacle.x + obstacle.w;
    if (exited && !obstacle.failed && !obstacle.cleared && !definition.launch && !definition.grind && scene.height > 0) {
      obstacle.cleared = true;
      addTrick(obstacle.type === 'gap' ? 'Gap clear' : obstacle.type === 'stairs' ? 'Stair clear' : 'Obstacle clear', obstacle.type === 'gap' ? 200 : 150);
    }
  }

  if (respawn === 0 && scene.height === 0 && hold) {
    scene.grind = true;
    if (!manualActive) { manualActive = true; manualTime = 0; addTrick('Manual', 100); }
    manualTime += dt; comboBase += dt * 55; comboTimer = BANK_DELAY;
    if (manualTime >= MANUAL_LIMIT) bail('BALANCE LOST · COMBO LOST');
  } else if (!railActive) { scene.grind = false; manualActive = false; manualTime = 0; }
  if (comboCount && !railActive && scene.height === 0 && !hold && respawn === 0) {
    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer === 0) bank();
  }
  updateHUD(); if (remaining === 0) finish();
}

function drawParticles() {
  const scale = Math.min(W / 950, H / 450) * (W < 600 ? 1.25 : 1);
  for (const p of particles) ellipse(W * 0.28 + (p.x - scene.distance) * scale, H * 0.78 - p.y * scale, 2, 1, '#f4e9b2');
}

function frame(now) {
  const dt = Math.min(0.04, Math.max(0, (now - lastNow) / 1000)); lastNow = now; tick = now / 1000;
  step(dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.dx * dt; p.y += p.dy * dt; p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  render(); drawParticles(); requestAnimationFrame(frame);
}

function snapshot() {
  return { state, score, best, timeLeft: Math.ceil(remaining), airborne: scene.height > 0 && !railActive,
    comboPoints: Math.floor(comboBase * multiplier()), multiplier: multiplier(), canBank: canBank(), bankedCombos: runBanks };
}

// All input paths share the same validated game actions.
setSoundIcon(); updateHUD();
$('sound').addEventListener('click', () => {
  soundOn = !soundOn; setSoundIcon();
  try { localStorage.setItem('kickpush-sound', soundOn ? 'on' : 'off'); } catch {}
  if (soundOn) sound(500);
});
$('flip-select').addEventListener('change', event => {
  if (FLIPS[event.target.value]) { selectedFlip = event.target.value; $('flip-label').textContent = FLIPS[selectedFlip].name; }
});
$('spin-select').addEventListener('change', event => {
  if (SPINS[event.target.value]) { selectedSpin = event.target.value; $('spin-label').textContent = selectedSpin + ' Spin'; }
});
$('overlay').addEventListener('click', event => {
  if (event.target.closest('#start,[data-restart]')) start();
  else if (event.target.closest('[data-resume]')) resume();
  else if (event.target.closest('[data-help]')) $('help').showModal();
});
$('pause').addEventListener('click', pause);
$('close-help').addEventListener('click', () => $('help').close());
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (button.disabled || (event.button !== 0 && event.pointerType === 'mouse')) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('pressed'); action(button.dataset.action);
  });
  const up = () => { button.classList.remove('pressed'); if (button.dataset.action === 'grind') release(); };
  button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up);
  button.addEventListener('click', event => { if (event.detail === 0 && button.dataset.action !== 'grind') action(button.dataset.action); });
});
const keyMap = { Space: 'ollie', KeyK: 'flip', KeyL: 'spin', KeyJ: 'grind', KeyI: 'grab', KeyB: 'bank' };
document.addEventListener('keydown', event => {
  if ($('help').open || ['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.code in keyMap) {
    event.preventDefault(); if (event.repeat) return;
    if (state === 'ready' || state === 'finished') { if (event.code === 'Space') start(); return; }
    action(keyMap[event.code]); document.querySelector('[data-action="' + keyMap[event.code] + '"]').classList.add('pressed');
  } else if (event.code === 'Escape' || event.code === 'KeyP') pause();
});
document.addEventListener('keyup', event => {
  if (event.code in keyMap) {
    document.querySelector('[data-action="' + keyMap[event.code] + '"]').classList.remove('pressed');
    if (event.code === 'KeyJ') release();
  }
});
window.addEventListener('blur', () => { if (state === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });
populate(); updateHUD(); requestAnimationFrame(frame);

if (document.modelContext?.registerTool) {
  const controller = new AbortController();
  window.addEventListener('pagehide', () => controller.abort(), { once: true });
  const tools = [
    { name: 'get_skate_session', description: 'Read the current skate score, combo, banking availability, and remaining time.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => snapshot() },
    { name: 'start_skate_run', description: 'Start a fresh 90-second skate run from the ready or finished screen.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: () => {
      if (state !== 'ready' && state !== 'finished') throw new Error('Finish the current run before starting another.');
      start(); return snapshot();
    } }
  ];
  for (const tool of tools) { try { Promise.resolve(document.modelContext.registerTool(tool, { signal: controller.signal })).catch(() => {}); } catch {} }
}
