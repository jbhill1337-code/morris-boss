/* ══════════════════════════════════════════════════════════════════════════
   FIREBASE CONFIG
═══════════════════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyBvx5u1OGwS6YAvmVhBF9bstiUn-Vp6TVY",
  authDomain: "corporate-extraction.firebaseapp.com",
  databaseURL: "https://corporate-extraction-default-rtdb.firebaseio.com",
  projectId: "corporate-extraction",
  storageBucket: "corporate-extraction.firebasestorage.app",
  messagingSenderId: "184892788723",
  appId: "1:184892788723:web:93959fe24c883a27088c86"
};

let db, bossRef, employeesRef;
try {
  if (typeof firebase !== 'undefined' && !firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
    db = firebase.database();
    bossRef = db.ref('frank_corporate_data');
    employeesRef = db.ref('active_employees');
  }
} catch(e) { console.warn('Firebase connection failed:', e); }

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

/* ══ AUDIO SYSTEM ══════════════════════════════════════════════════════════ */
const bgm = new Audio('nocturnal-window-lights.mp3');
bgm.loop = true;
bgm.volume = 0.15;

const clickSfxFiles = [
  'sfx pack/Boss hit 1.wav',
  'sfx pack/Bubble 1.wav',
  'sfx pack/Hit damage 1.wav',
  'sfx pack/Select 1.wav'
];

const attackSounds = clickSfxFiles.map(file => {
  const audio = new Audio(encodeURI(file));
  audio.volume = 0.3;
  return audio;
});

function playClickSound() {
  try {
    const randomIdx = Math.floor(Math.random() * attackSounds.length);
    const sound = attackSounds[randomIdx].cloneNode();
    sound.volume = 0.3;
    sound.play().catch(e => {}); 
  } catch(e) {}
}

/* ══ SYSTEM INITIALIZATION ═══ */
function initSystem() {
  // SET BACKGROUND (Root location)
  document.body.style.backgroundImage = "url('background.png')";
  document.body.style.backgroundColor = "#050510"; 

  // SET CHARACTER IMAGES (Removing assets/ prefix based on your root folder structure)
  const bossImgEl = document.getElementById('boss-image');
  const compImgEl = document.getElementById('companion-image');
  if (bossImgEl) bossImgEl.src = 'phases/dave/dave_phase1.png';
  if (compImgEl) compImgEl.src = 'chars/larry_frame1.png';
}

/* ══ INTRO CONTROLLER ══════════════════════════════════════════════════════ */
const introContainer = document.getElementById('intro-container');
const startIntroBtn  = document.getElementById('start-intro-btn');
const skipIntroBtn   = document.getElementById('skip-intro-btn');
let ytPlayer;

const endIntro = () => {
  if (introContainer) {
    introContainer.style.opacity = '0';
    setTimeout(() => { 
      introContainer.remove(); 
      initSystem();
      load(); 
    }, 1000);
  }
};

// YouTube API Callbacks must be global
window.onPlayerReady = function(event) {
  if (!startIntroBtn) return;
  startIntroBtn.style.display = 'block';
  startIntroBtn.onclick = () => {
    startIntroBtn.style.display = 'none';
    if (document.getElementById('yt-player')) document.getElementById('yt-player').style.display = 'block';
    if (skipIntroBtn) skipIntroBtn.style.display = 'block';
    event.target.playVideo();
  };
};

window.onPlayerStateChange = function(event) { 
    if (event.data === 0) endIntro(); 
};

window.onYouTubeIframeAPIReady = function () {
  if (!introContainer || isOBS) return;
  ytPlayer = new YT.Player('yt-player', {
    videoId: 'HeKNgnDyD7I',
    playerVars: { playsinline:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0 },
    events: { onReady: window.onPlayerReady, onStateChange: window.onPlayerStateChange }
  });
};

if (isOBS) {
  if (introContainer) introContainer.style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  window.onload = () => { initSystem(); load(); };
}
if (skipIntroBtn) skipIntroBtn.onclick = endIntro;

// EMERGENCY BLACK SCREEN OVERRIDE (Fires if video fails after 8s)
if (introContainer && !isOBS) {
  setTimeout(() => { if(document.body.contains(introContainer)) endIntro(); }, 8000);
}

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = '';
let myInventory = {};
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;
let currentPhase = 0, baseDaveImg = 'phases/dave/dave_phase1.png';
let defMulti = 1.0, lastLevel = 0, itemBuffMultiplier = 1.0, isAnimatingHit = false;
let critChance = 0, critCost = 100, autoInterval = 1000, shopMultiplier = 1.0, synergyCost = 150, rageCost = 75, coinsPerClick = 1, hustleCost = 30, autoTimer = null;

const companions = {
  larry: ['chars/larry_frame1.png', 'chars/larry_frame2.png', 'chars/larry_frame3.png', 'chars/larry_frame4.png', 'chars/larry_frame5.png', 'chars/larry_frame6.png'],
  manny: ['chars/manny_frame1.png', 'chars/manny_frame2.png', 'chars/manny_frame3.png', 'chars/manny_frame4.png', 'chars/manny_frame5.png', 'chars/manny_frame6.png']
};
let currentCompanion = companions.larry;
let frameIndex = 0;

/* ══ DOM REFERENCES ═════════════════════════════════════════════════════════ */
const richardContainer = document.getElementById('richard-event-container');
const richardImage = document.getElementById('richard-image');
const richardDialogue = document.getElementById('richard-dialogue');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');
const corpQuotes = ["SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!"];
const richardImages = ['yourbossvar/boss-pointing.png', 'yourbossvar/boss-crossing.png'];
const richardQuotes = ["Livin' the dream!", "Another day, another dollar.", "Working hard or hardly working?", "Can someone check the back room?", "Corporate is visiting, look busy."];

/* ══ LOOPS ══════════════════════════════════════════════════════════════════ */
setInterval(() => {
  frenzy = Math.max(0, frenzy - 2);
  multi = frenzy >= 100 ? 5 : frenzy >= 75 ? 3 : frenzy >= 50 ? 2 : 1;
  const fill = document.getElementById('frenzy-bar-fill');
  const txt = document.getElementById('frenzy-text');
  if (fill) fill.style.width = frenzy + '%';
  if (txt) txt.innerText = multi > 1 ? `COMBO ${multi}x` : 'CHARGE METER';
}, 100);

setInterval(() => {
  const compImg = document.getElementById('companion-image');
  if (compImg && !isAnimatingHit) {
    let rumbles = 0;
    let rumbleInt = setInterval(() => {
      if (isAnimatingHit) { clearInterval(rumbleInt); return; }
      frameIndex = (frameIndex + 1) % currentCompanion.length;
      compImg.src = currentCompanion[frameIndex];
      rumbles++;
      if (rumbles >= 3) clearInterval(rumbleInt); 
    }, 120);
  }
}, 2500);

/* ══ BOSS SYNC ══════════════════════════════════════════════════════════════ */
if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val();
    if (!b) return;
    if (lastLevel === 0) lastLevel = b.level;
    
    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    const hpPercent = Math.max(0, curHP / maxHP);
    const isDaveEncounter = (b.level % 2 !== 0);
    
    const bossImgEl = document.getElementById('boss-image');
    const companionNameEl = document.getElementById('companion-name');
    const mainBossNameEl = document.getElementById('main-boss-name');

    if (isDaveEncounter) {
      currentCompanion = companions.larry;
      if (companionNameEl) companionNameEl.innerText = 'Security Larry';
      if (mainBossNameEl) mainBossNameEl.innerText = 'VP Dave · Lv.' + b.level;
      if (hpPercent <= 0.25) baseDaveImg = 'phases/dave/dave_phase4.png';
      else if (hpPercent <= 0.50) baseDaveImg = 'phases/dave/dave_phase3.png';
      else if (hpPercent <= 0.75) baseDaveImg = 'phases/dave/dave_phase2.png';
      else baseDaveImg = 'phases/dave/dave_phase1.png';
    } else {
      currentCompanion = companions.manny;
      if (companionNameEl) companionNameEl.innerText = 'Intern Manny';
      if (mainBossNameEl) mainBossNameEl.innerText = 'District Manager Rich · Lv.' + b.level;
      if (hpPercent <= 0.25) baseDaveImg = 'phases/rich/rich_phase4.png';
      else if (hpPercent <= 0.50) baseDaveImg = 'phases/rich/rich_phase3.png';
      else if (hpPercent <= 0.75) baseDaveImg = 'phases/rich/rich_phase2.png';
      else baseDaveImg = 'phases/rich/rich_phase1.png';
    }
    if (bossImgEl && !isAnimatingHit) bossImgEl.src = baseDaveImg;
    if (hpFill) hpFill.style.width = (hpPercent * 100) + '%';
    if (hpText) hpText.innerText = curHP.toLocaleString() + ' / ' + maxHP.toLocaleString();
  });
}

/* ══ CORE FUNCTIONS ═════════════════════════════════════════════════════════ */
function clockIn(u) { 
  if (employeesRef) { const r = employeesRef.push(); r.set({ name:u, e:'💼' }); r.onDisconnect().remove(); }
  bgm.play().catch(e => {});
  startRichardLoop();
}

document.getElementById('btn-clock-in').onclick = () => {
  const val = document.getElementById('username-input').value.trim().toUpperCase();
  if (val) {
    myUser = val;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    clockIn(myUser); save();
  }
};

function attack(e) {
  if (isOBS) return;
  const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
  const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);

  playClickSound();
  const bossImgEl = document.getElementById('boss-image');
  const compImgEl = document.getElementById('companion-image');

  [bossImgEl, compImgEl].forEach(el => {
    if (el) { el.classList.remove('quick-zoom'); void el.offsetWidth; el.classList.add('quick-zoom'); }
  });

  const dmg = Math.floor(myClickDmg * multi * shopMultiplier);
  if (bossRef) bossRef.transaction(b => { if (b) { b.health -= dmg; if (b.health <= 0) { b.level++; b.health = 1000000000 * b.level; } } return b; });

  myCoins += (1 * multi); updateUI(); save();
  createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
  if (Math.random() < 0.1) spawnQuote(x, y);
}

function updateUI() {
  const c = document.getElementById('coin-count');
  const d = document.getElementById('click-power');
  if (c) c.innerText = myCoins.toLocaleString();
  if (d) d.innerText = myClickDmg.toLocaleString();
}

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;

/* ══ POPUPS & RICHARD LOOP ══════════════════════════════════════════════════ */
function createDynamicPopup(text, className, x, y) {
  const p = document.createElement('div');
  p.className = className; p.innerText = text;
  const tx = (Math.random() - 0.5) * 600;
  const ty = -Math.random() * 300 - 200;
  const rot = (Math.random() - 0.5) * 60;
  p.style.setProperty('--tx', `${tx}px`);
  p.style.setProperty('--ty', `${ty}px`);
  p.style.setProperty('--rot', `${rot}deg`);
  p.style.left = x + 'px'; p.style.top = y + 'px';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1200); 
}

function spawnQuote(x, y) {
  createDynamicPopup(corpQuotes[Math.floor(Math.random() * corpQuotes.length)], 'quote-popup', x, y);
}

function startRichardLoop() { 
  setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, Math.random() * 40000 + 45000); 
}

function triggerRichardEvent() {
  const container = document.getElementById('richard-event-container');
  const img = document.getElementById('richard-image');
  const diag = document.getElementById('richard-dialogue');
  if (!container || !img || !diag) return;
  img.src = richardImages[Math.floor(Math.random() * richardImages.length)];
  diag.innerText = richardQuotes[Math.floor(Math.random() * richardQuotes.length)];
  container.classList.add('active'); 
  setTimeout(() => container.classList.remove('active'), 8000);
}

function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, u:myUser })); }
function load() {
  const s = localStorage.getItem('gwm_v11');
  if (s) {
    const d = JSON.parse(s); myCoins = d.c || 0; myClickDmg = d.cd || 2500; myUser = d.u || '';
    if (myUser) { document.getElementById('username-input').value = myUser; }
    updateUI();
  }
}
function startAutoTimer() {}
function scheduleMannyStressTest() {}
