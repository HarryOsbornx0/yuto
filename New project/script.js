const field = document.querySelector('.field');
const ball = document.getElementById('ball');
const keeper = document.getElementById('goalkeeper');
const scoreEl = document.getElementById('score');
const missesEl = document.getElementById('misses');
const modeLabel = document.getElementById('modeLabel');
const timeLeftEl = document.getElementById('timeLeft');
const streakEl = document.getElementById('streak');
const bestStreakEl = document.getElementById('bestStreak');
const shootBtn = document.getElementById('shootBtn');
const resetBtn = document.getElementById('resetBtn');
const finishBtn = document.getElementById('finishBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const backArrowBtn = document.getElementById('backArrowBtn');
const difficulty = document.getElementById('difficulty');
const modeSelect = document.getElementById('modeSelect');
const shotButtons = document.querySelectorAll('.shot');
const overlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const playAgainBtn = document.getElementById('playAgainBtn');
const confetti = document.getElementById('confetti');
const meteor = document.getElementById('meteor');
const winRocket = document.getElementById('winRocket');
const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const openGameBtn = document.getElementById('openGameBtn');
const backToIosBtn = document.getElementById('backToIosBtn');
const iosHome = document.getElementById('iosHome');
const openAppBtn = document.getElementById('openAppBtn');
const soundToggle = document.getElementById('soundToggle');
const openSecretBtn = document.getElementById('openSecretBtn');
const secretScreen = document.getElementById('secretScreen');
const openDocsBtn = document.getElementById('openDocsBtn');
const backToIosFromSecretBtn = document.getElementById('backToIosFromSecretBtn');
const soonOverlay = document.getElementById('soonOverlay');
const soonTitle = document.getElementById('soonTitle');
const soonText = document.getElementById('soonText');
const soonCloseBtn = document.getElementById('soonCloseBtn');
const ghostIcons = document.querySelectorAll('.ghost-icon');
const loginOverlay = document.getElementById('loginOverlay');
const loginBtn = document.getElementById('loginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const registerOverlay = document.getElementById('registerOverlay');
const registerBtn = document.getElementById('registerBtn');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const bgAudio = document.getElementById('bgAudio');

let score = 0;
let misses = 0;
let isKicking = false;
let currentShot = 'place';
let timeLeft = 60;
let timerId = null;
let gameOver = false;
let outcome = null;
let totalShots = 0;
let streak = 0;
let bestStreak = 0;
let keeperIntervalId = null;
let keeperTempo = 1200;
let difficultyBoost = 0;
let activeBallAnim = null;
let audioCtx = null;
let soundEnabled = true;
let audioTimerId = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playIntroAudio() {
  if (!bgAudio) return;
  bgAudio.currentTime = 0;
  bgAudio.play().catch(() => {});
  if (audioTimerId) clearTimeout(audioTimerId);
  audioTimerId = setTimeout(() => {
    stopIntroAudio();
  }, 15000);
}

function stopIntroAudio() {
  if (!bgAudio) return;
  bgAudio.pause();
  bgAudio.currentTime = 0;
  if (audioTimerId) {
    clearTimeout(audioTimerId);
    audioTimerId = null;
  }
}

function playTone(freq, duration, type = 'sine', gain = 0.08) {
  if (!soundEnabled) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playKick() {
  playTone(180, 0.08, 'square', 0.06);
}

function playGoal() {
  playTone(520, 0.12, 'triangle', 0.08);
}

function playSave() {
  playTone(140, 0.12, 'sawtooth', 0.06);
}

function resetBallPosition() {
  if (ball.getAnimations) {
    ball.getAnimations().forEach((anim) => anim.cancel());
  }
  if (activeBallAnim) {
    activeBallAnim.cancel();
    activeBallAnim = null;
  }
  ball.classList.remove('kick', 'curve');
  ball.style.transitionDuration = '0.6s';
  ball.style.left = '50%';
  ball.style.bottom = '-2%';
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function moveKeeper() {
  const goal = field.querySelector('.goal');
  const goalRect = goal.getBoundingClientRect();
  const keeperWidth = keeper.offsetWidth;

  const min = goalRect.left + keeperWidth * 0.2;
  const max = goalRect.right - keeperWidth * 1.2;
  const target = randomBetween(min, max);

  const fieldRect = field.getBoundingClientRect();
  const leftPercent = ((target - fieldRect.left) / fieldRect.width) * 100;
  keeper.style.left = `${leftPercent}%`;
}

function setKeeperTempo(ms) {
  keeperTempo = ms;
  if (keeperIntervalId) {
    clearInterval(keeperIntervalId);
  }
  keeperIntervalId = setInterval(moveKeeper, keeperTempo);
}

function applyDive(targetXpx, keeperCenter) {
  keeper.classList.remove('dive-left', 'dive-right', 'dive-center');
  if (targetXpx < keeperCenter - 10) {
    keeper.classList.add('dive-left');
  } else if (targetXpx > keeperCenter + 10) {
    keeper.classList.add('dive-right');
  } else {
    keeper.classList.add('dive-center');
  }
  setTimeout(() => {
    keeper.classList.remove('dive-left', 'dive-right', 'dive-center');
  }, 420);
}

function getShotProfile() {
  if (currentShot === 'power') {
    return { spread: 6, speed: 0.35, reach: -8, curve: false };
  }
  if (currentShot === 'curve') {
    return { spread: 10, speed: 0.85, reach: -4, curve: true };
  }
  return { spread: 4, speed: 0.6, reach: 0, curve: false };
}

function startTimerIfNeeded() {
  if (modeSelect.value !== 'time' || timerId) return;
  timerId = setInterval(() => {
    timeLeft -= 1;
    timeLeftEl.textContent = `${timeLeft}s`;
    if (timeLeft <= 0) {
      stopTimer();
      const win = score > misses;
      endGame(win ? 'win' : 'lose', 'time');
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function showOverlay(title, text) {
  resultTitle.textContent = title;
  resultText.textContent = text;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideOverlay() {
  overlay.classList.remove('show');
  overlay.classList.remove('win', 'lose');
  overlay.classList.remove('sync');
  overlay.setAttribute('aria-hidden', 'true');
  if (winRocket) winRocket.classList.remove('show');
}

function showSoon(appName) {
  if (!soonOverlay) return;
  soonTitle.textContent = 'Yakında';
  soonText.textContent = `${appName} yakında eklenecek.`;
  soonOverlay.classList.add('show');
  soonOverlay.setAttribute('aria-hidden', 'false');
}

function hideSoon() {
  if (!soonOverlay) return;
  soonOverlay.classList.remove('show');
  soonOverlay.setAttribute('aria-hidden', 'true');
}

function showLogin() {
  if (!loginOverlay) return;
  if (loginError) loginError.textContent = '';
  loginOverlay.classList.add('show');
  loginOverlay.setAttribute('aria-hidden', 'false');
}

window.openLogin = showLogin;

function hideLogin() {
  if (!loginOverlay) return;
  loginOverlay.classList.remove('show');
  loginOverlay.setAttribute('aria-hidden', 'true');
}

function showRegister() {
  if (!registerOverlay) return;
  if (registerError) registerError.textContent = '';
  registerOverlay.classList.add('show');
  registerOverlay.setAttribute('aria-hidden', 'false');
}

function hideRegister() {
  if (!registerOverlay) return;
  registerOverlay.classList.remove('show');
  registerOverlay.setAttribute('aria-hidden', 'true');
}

function burstConfetti() {
  confetti.innerHTML = '';
  for (let i = 0; i < 24; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'piece';
    piece.style.left = `${randomBetween(5, 95)}%`;
    piece.style.background = i % 2 === 0 ? '#f6ae2d' : '#5bc0be';
    piece.style.animationDelay = `${randomBetween(0, 0.2)}s`;
    confetti.appendChild(piece);
  }
  setTimeout(() => {
    confetti.innerHTML = '';
  }, 1600);
}

function dropMeteor() {
  meteor.classList.remove('show');
  void meteor.offsetWidth;
  meteor.classList.add('show');
}

function endGame(result, modeHint) {
  outcome = result;
  gameOver = true;
  shootBtn.disabled = true;
  finishBtn.disabled = true;
  const modeName =
    modeHint === 'time' ? 'Zamana Karşı' :
    modeHint === 'first5' ? 'İlk 5 Gol' :
    'Serbest';
  if (result === 'win') {
    burstConfetti();
    overlay.classList.add('win');
    overlay.classList.add('sync');
    showOverlay('Tebrikler!', `${modeName} modunda kazandın! Skor: ${score}-${misses}`);
  } else {
    dropMeteor();
    overlay.classList.add('lose');
    showOverlay('Kaybettin!', `${modeName} modunda kaybettin! Skor: ${score}-${misses}`);
  }
}

function resetGame() {
  score = 0;
  misses = 0;
  isKicking = false;
  gameOver = false;
  outcome = null;
  totalShots = 0;
  streak = 0;
  bestStreak = 0;
  difficultyBoost = 0;
  shootBtn.disabled = false;
  finishBtn.disabled = false;
  shotButtons.forEach((btn) => { btn.disabled = false; });
  scoreEl.textContent = '0';
  missesEl.textContent = '0';
  streakEl.textContent = '0';
  bestStreakEl.textContent = '0';
  resetBallPosition();
  stopTimer();
  if (modeSelect.value === 'time') {
    timeLeft = 60;
    timeLeftEl.textContent = `${timeLeft}s`;
  } else {
    timeLeftEl.textContent = '--';
  }
  modeLabel.textContent =
    modeSelect.value === 'endless' ? 'Serbest' :
    modeSelect.value === 'time' ? 'Zamana Karşı' : 'İlk 5 Gol';
  finishBtn.style.display = modeSelect.value === 'endless' ? 'inline-flex' : 'none';
  hideOverlay();
  setKeeperTempo(1200);
}

function shootAt(xPercent) {
  if (isKicking) return;
  if (gameOver) return;
  isKicking = true;
  startTimerIfNeeded();
  totalShots += 1;
  shootBtn.disabled = true;
  shotButtons.forEach((btn) => { btn.disabled = true; });
  field.classList.add('locked');

  const goal = field.querySelector('.goal');
  const goalRect = goal.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();

  const profile = getShotProfile();
  const flightMs = Math.round(profile.speed * 1000);
  const minX = (goalRect.left - fieldRect.left) / fieldRect.width * 100 + 6;
  const maxX = (goalRect.right - fieldRect.left) / fieldRect.width * 100 - 6;
  const baseTarget = xPercent ?? randomBetween(minX, maxX);
  const targetX = Math.min(maxX, Math.max(minX, baseTarget + randomBetween(-profile.spread, profile.spread)));

  const targetY = 74 + randomBetween(-6, 6);

  ball.classList.add('kick');
  playKick();
  ball.style.transitionDuration = `${profile.speed}s`;
  if (profile.curve) {
    ball.classList.add('curve');
  }
  if (profile.curve && ball.animate) {
    if (activeBallAnim) activeBallAnim.cancel();
    const curveDirection = targetX < 50 ? 1 : -1;
    const midX = Math.min(maxX, Math.max(minX, targetX + curveDirection * 12));
    activeBallAnim = ball.animate(
      [
        { left: '50%', bottom: '-2%' },
        { left: `${midX}%`, bottom: `${targetY + 6}%` },
        { left: `${targetX}%`, bottom: `${targetY}%` }
      ],
      { duration: flightMs, easing: 'ease-out', fill: 'forwards' }
    );
    activeBallAnim.onfinish = () => {
      ball.style.left = `${targetX}%`;
      ball.style.bottom = `${targetY}%`;
      activeBallAnim = null;
      setTimeout(() => {
        if (!gameOver) resetBallPosition();
      }, 80);
    };
  } else {
    ball.style.left = `${targetX}%`;
    ball.style.bottom = `${targetY}%`;
  }

  const keeperRect = keeper.getBoundingClientRect();
  const targetXpx = fieldRect.left + (targetX / 100) * fieldRect.width;
  const keeperCenter = keeperRect.left + keeperRect.width / 2;

  const diff = Math.abs(targetXpx - keeperCenter);
  const difficultyFactor = Number(difficulty.value);
  const keeperReach = 45 + difficultyFactor * 12 + profile.reach + difficultyBoost;
  applyDive(targetXpx, keeperCenter);

  setTimeout(() => {
    if (diff < keeperReach) {
      misses += 1;
      missesEl.textContent = String(misses);
      playSave();
      streak = 0;
      streakEl.textContent = String(streak);
    } else {
      score += 1;
      scoreEl.textContent = String(score);
      playGoal();
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      streakEl.textContent = String(streak);
      bestStreakEl.textContent = String(bestStreak);
      difficultyBoost = Math.min(30, difficultyBoost + 3);
      setKeeperTempo(Math.max(500, keeperTempo - 40));
    }
    if (modeSelect.value === 'first5') {
      if (score >= 5) {
        endGame('win', 'first5');
      } else if (misses >= 5) {
        endGame('lose', 'first5');
      }
    }
  }, 450);

  setTimeout(() => {
    resetBallPosition();

    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      ball.removeEventListener('transitionend', unlock);
      isKicking = false;
      field.classList.remove('locked');
      if (!gameOver) {
        shootBtn.disabled = false;
      }
      shotButtons.forEach((btn) => { btn.disabled = false; });
    };
    ball.addEventListener('transitionend', unlock);
    setTimeout(unlock, 700);
  }, flightMs + 150);
}

shootBtn.addEventListener('click', () => {
  moveKeeper();
  shootAt();
});

field.addEventListener('click', (e) => {
  if (isKicking || gameOver || shootBtn.disabled) return;
  const rect = field.getBoundingClientRect();
  const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
  moveKeeper();
  shootAt(xPercent);
});

resetBtn.addEventListener('click', () => {
  resetGame();
});

finishBtn.addEventListener('click', () => {
  if (modeSelect.value === 'endless') {
    const win = score > misses;
    endGame(win ? 'win' : 'lose', 'endless');
  }
});

playAgainBtn.addEventListener('click', () => {
  resetGame();
});

openGameBtn.addEventListener('click', () => {
  homeScreen.classList.remove('show');
  gameScreen.classList.add('show');
  resetGame();
});

backToIosBtn.addEventListener('click', () => {
  homeScreen.classList.remove('show');
  iosHome.classList.add('show');
});

function openApp() {
  iosHome.classList.remove('show');
  homeScreen.classList.add('show');
}

if (openAppBtn) {
  openAppBtn.addEventListener('click', openApp);
}
if (iosHome) {
  iosHome.addEventListener('click', (e) => {
    const target = e.target.closest('.app-icon-main');
    if (target) openApp();
  });
}

if (soundToggle) {
  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    if (soundEnabled) initAudio();
  });
}

ghostIcons.forEach((icon) => {
  icon.addEventListener('click', () => {
    const name = icon.dataset.app || 'Bu uygulama';
    showSoon(name);
  });
});

if (soonCloseBtn) {
  soonCloseBtn.addEventListener('click', () => {
    hideSoon();
  });
}

if (soonOverlay) {
  soonOverlay.addEventListener('click', (e) => {
    if (e.target === soonOverlay) hideSoon();
  });
}

modeSelect.addEventListener('change', () => {
  resetGame();
});

shotButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (isKicking) return;
    shotButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentShot = btn.dataset.shot;
    resetBallPosition();
  });
});

iosHome.classList.add('show');
moveKeeper();
setKeeperTempo(1200);
backToMenuBtn.addEventListener('click', () => {
  gameScreen.classList.remove('show');
  homeScreen.classList.remove('show');
  iosHome.classList.add('show');
  resetGame();
});

backArrowBtn.addEventListener('click', () => {
  gameScreen.classList.remove('show');
  homeScreen.classList.remove('show');
  iosHome.classList.add('show');
  resetGame();
});

if (openSecretBtn) {
  openSecretBtn.addEventListener('click', () => {
    iosHome.classList.remove('show');
    if (homeScreen) homeScreen.classList.remove('show');
    secretScreen.classList.add('show');
  });
}

if (backToIosFromSecretBtn) {
  backToIosFromSecretBtn.addEventListener('click', () => {
    secretScreen.classList.remove('show');
    iosHome.classList.add('show');
  });
}

if (openDocsBtn) {
  openDocsBtn.addEventListener('click', () => {
    showLogin();
  });
}

if (secretScreen) {
  secretScreen.addEventListener('click', (e) => {
    if (e.target.closest('#openDocsBtn')) showLogin();
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    const user = document.getElementById('loginUser')?.value?.trim() || '';
    const pass = document.getElementById('loginPass')?.value || '';
    if (user.toLowerCase() === 'yuto' && pass === 'yuto07') {
      playIntroAudio();
    }
    if (loginError) {
      loginError.textContent = 'Yanlış kullanıcı adı veya şifre.';
    }
  });
}

if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', () => {
    hideLogin();
    showRegister();
  });
}

if (registerBtn) {
  let vx = 1.8;
  let vy = 1.3;
  let rafId = null;

  let x = 20;
  let y = 20;

  const step = () => {
    const field = registerBtn.parentElement;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const btnRect = registerBtn.getBoundingClientRect();

    const maxX = Math.max(0, rect.width - btnRect.width);
    const maxY = Math.max(0, rect.height - btnRect.height);

    x += vx;
    y += vy;

    if (x <= 0 || x >= maxX) {
      vx *= -1;
      x = Math.max(0, Math.min(maxX, x));
    }
    if (y <= 0 || y >= maxY) {
      vy *= -1;
      y = Math.max(0, Math.min(maxY, y));
    }

    registerBtn.style.transform = `translate(${x}px, ${y}px)`;
    rafId = requestAnimationFrame(step);
  };

  const startBounce = () => {
    if (rafId) return;
    x = 10;
    y = 10;
    rafId = requestAnimationFrame(step);
  };

  const stopBounce = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  };

  startBounce();

  if (registerOverlay) {
    registerOverlay.addEventListener('transitionend', () => {
      if (registerOverlay.classList.contains('show')) startBounce();
      else stopBounce();
    });
  }
}

if (registerBtn) {
  registerBtn.addEventListener('click', () => {
    if (registerError) {
      registerError.textContent = 'Kayıt başarısız. Lütfen tekrar deneyin.';
    }
  });
}

if (registerOverlay) {
  registerOverlay.addEventListener('click', (e) => {
    if (e.target === registerOverlay) hideRegister();
  });
}

if (loginOverlay) {
  loginOverlay.addEventListener('click', (e) => {
    if (e.target === loginOverlay) hideLogin();
  });
}
