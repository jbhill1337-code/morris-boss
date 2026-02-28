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

/* ══ COMPACT LAYOUT ENGINE (CSS-IN-JS) ═════════════════════════════════════ */
function injectCompactStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    #game-container { max-width: 1200px; margin: 0 auto; display: flex; gap: 15px; padding: 10px; }
    #boss-area { 
      display: flex; justify-content: center; align-items: flex-end; 
      min-height: 400px; gap: 20px; transition: all 0.3s ease;
    }
    #boss-image, #companion-image { 
      height: auto; 
      image-rendering: pixelated; /* Keeps Dave sharp when scaled up */
      max-width: 100%;
    }
    /* Desktop Scaling */
    @media (min-width: 769px) {
      #boss-image, #companion-image { width: 380px; }
      #left-col, #right-col { width: 280px; flex-shrink: 0; }
    }
    /* Mobile Compact View */
    @media (max-width: 768px) {
      #game-container { flex-direction: column; align-items: center; }
      #boss-area { min-height: 250px; gap: 10px; }
      #boss-image, #companion-image { width: 160px; }
      .column { width: 100% !important; max-width: 400px; }
    }
  `;
  document.head.appendChild(style);
}

function applyBossLayout() {
  const bossImgEl = document.getElementById('boss-image');
  const compImgEl = document.getElementById('companion-image');
  // Ensuring Dave stays as big as Larry via CSS injection
  if (bossImgEl) bossImgEl.style.display = "block";
  if (compImgEl) compImgEl.style.display = "block";
}

/* ══ INTRO & SYSTEM INIT ═══════════════════════════════════════════════════ */
const introContainer = document.getElementById('intro-container');
const startIntroBtn  = document.getElementById('start-intro-btn');
const skipIntroBtn   = document.getElementById('skip-intro-btn');
let ytPlayer;

function initSystem() {
  injectCompactStyles();
  document.body.style.backgroundImage = "url('background.png')";
  document.body.style.backgroundColor = "#050510"; 
  applyBossLayout();

  const bossImgEl = document.getElementById('boss-image');
  const compImgEl = document.getElementById('companion-image');
  if (bossImgEl) bossImgEl.src = 'phases/dave/dave_phase1.png';
  if (compImgEl) compImgEl.src = 'chars/larry_frame1.png';
}

const endIntro = () => {
  if (introContainer) {
    introContainer.style.opacity = '0';
    setTimeout(() => { introContainer.remove(); initSystem(); load(); }, 1000);
  }
};

window.onPlayerReady = function(event) {
  if (startIntroBtn) {
    startIntroBtn.style.display = 'block';
    startIntroBtn.onclick = () => {
      startIntroBtn.style.display = 'none';
      if (document.getElementById('yt-player')) document.getElementById('yt-player').style.display = 'block';
      if (skipIntroBtn) skipIntroBtn.style.display = 'block';
      event.target.playVideo();
    };
  }
};
window.onPlayerStateChange = function(event) { if (event.data === 0) endIntro(); };
window.onYouTubeIframeAPIReady = function () {
  if (!introContainer || isOBS) return;
  ytPlayer = new YT.Player('yt-player', {
    videoId: 'HeKNgnDyD7I',
    playerVars: { playsinline:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0 },
    events: { onReady: window.onPlayerReady, onStateChange: window.onPlayerStateChange }
  });
};
if (skipIntroBtn) skipIntroBtn.onclick = endIntro;
if (introContainer && !isOBS) setTimeout(() => { if(document.body.contains(introContainer)) endIntro(); }, 12000);

/* ══ GAME STATE & LOOPS ═════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, frenzy = 0, multi = 1, itemBuffMultiplier = 1.0, myUser = '';
let myInventory = {};
let currentPhase = 0, baseDaveImg = 'phases/dave/dave_phase1.png', lastLevel = 0, isAnimatingHit = false;

const companions = {
  larry: ['chars/larry_frame1.png', 'chars/larry_frame2.png', 'chars/larry_frame3.png', 'chars/larry_frame4.png', 'chars/larry_frame5.png', 'chars/larry_frame6.png'],
  manny: ['chars/manny_frame1.png', 'chars/manny_frame2.png', 'chars/manny_frame3.png', 'chars/manny_frame4.png', 'chars/manny_frame5.png', 'chars/manny_frame6.png']
};
let currentCompanion = companions.larry;
let frameIndex = 0;
const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];

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
    frameIndex = (frameIndex + 1) % currentCompanion.length;
    compImg.src = currentCompanion[frameIndex];
  }
}, 2500);

/* ══ BOSS SYNC ══════════════════════════════════════════════════════════════ */
if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val();
    if (!b) return;
    if (lastLevel === 0) lastLevel = b.level;
    
    const hpPercent = Math.max(0, b.health / (1000000000 * b.level));
    const isDaveEncounter = (b.level % 2 !== 0);
    
    if (isDaveEncounter) {
      currentCompanion = companions.larry;
      document.getElementById('companion-name').innerText = 'Security Larry';
      document.getElementById('main-boss-name').innerText = 'VP Dave · Lv.' + b.level;
      if (hpPercent <= 0.25) baseDaveImg = 'phases/dave/dave_phase4.png';
      else if (hpPercent <= 0.50) baseDaveImg = 'phases/dave/dave_phase3.png';
      else if (hpPercent <= 0.75) baseDaveImg = 'phases/dave/dave_phase2.png';
      else baseDaveImg = 'phases/dave/dave_phase1.png';
    } else {
      currentCompanion = companions.manny;
      document.getElementById('companion-name').innerText = 'Intern Manny';
      document.getElementById('main-boss-name').innerText = 'District Manager Rich · Lv.' + b.level;
      if (hpPercent <= 0.25) baseDaveImg = 'phases/rich/rich_phase4.png';
      else if (hpPercent <= 0.50) baseDaveImg = 'phases/rich/rich_phase3.png';
      else if (hpPercent <= 0.75) baseDaveImg = 'phases/rich/rich_phase2.png';
      else baseDaveImg = 'phases/rich/rich_phase1.png';
    }
    if (bossImg && !isAnimatingHit) bossImg.src = baseDaveImg;
    document.getElementById('health-bar-fill').style.width = (hpPercent * 100) + '%';
    document.getElementById('health-text').innerText = b.health.toLocaleString() + ' / ' + (1000000000 * b.level).toLocaleString();
  });
}

/* ══ ATTACK LOGIC ═══════════════════════════════════════════════════════════ */
function playHitAnimation(x, y) {
  if (isAnimatingHit) return;
  isAnimatingHit = true;
  const bossImg = document.getElementById('boss-image');
  const compImg = document.getElementById('companion-image');
  const bossArea = document.getElementById('boss-area');

  if (bossArea) { bossArea.style.filter = 'drop-shadow(0 0 30px rgba(255, 0, 0, 0.4))'; setTimeout(() => bossArea.style.filter = 'none', 300); }
  
  if (bossImg) {
    const originalSrc = bossImg.src;
    bossImg.src = daveHitFrames[Math.floor(Math.random() * daveHitFrames.length)];
    bossImg.classList.add('quick-zoom');
    setTimeout(() => { bossImg.src = originalSrc; bossImg.classList.remove('quick-zoom'); }, 250);
  }
  
  setTimeout(() => {
    if (compImg) {
      compImg.classList.add('quick-zoom');
      setTimeout(() => { compImg.classList.remove('quick-zoom'); isAnimatingHit = false; }, 250);
    }
  }, 150);
}

function attack(e) {
  if (isOBS) return;
  const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
  const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);

  playClickSound();
  playHitAnimation(x, y);

  const dmg = Math.floor(myClickDmg * multi * itemBuffMultiplier);
  if (bossRef) bossRef.transaction(b => { if (b) { b.health -= dmg; if (b.health <= 0) { b.level++; b.health = 1000000000 * b.level; } } return b; });

  myCoins += (1 * multi);
  frenzy = Math.min(100, frenzy + 8);
  updateUI(); save();
  createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
  rollForLoot(x, y);
}

/* ══════════════════════════════════════════════════════════════════════════
   PHISHING MINIGAME (RESTORED DATABASE & LOGIC) ════════════════════════════
═══════════════════════════════════════════════════════════════════════════ */
const emailDatabase = [
  { sender: "IT-Support@corp-extraction.com", body: "URGENT: Your password expires in 2 hours. Click here to reset.", isPhish: true },
  { sender: "HR@corporate-extraction.com", body: "Please find the updated PTO policy for Q1 attached.", isPhish: false },
  { sender: "rich.dm@gmail.com", body: "I am in a meeting. Please buy 5 Apple Gift Cards ($100 each) and send codes.", isPhish: true },
  { sender: "Mikita.Supply@corporate-extraction.com", body: "The monitor shipment has arrived. Please verify counts.", isPhish: false }
];

let phishActive = false, phishScore = 0, phishEmailsPlayed = 0, phishTimerInt = null;

function startPhishingGame() {
  document.getElementById('mikita-overlay').style.display = 'none';
  if (phishActive) return;
  phishActive = true; phishScore = 0; phishEmailsPlayed = 0;
  document.getElementById('phishing-game-overlay').style.display = 'flex';
  loadNextEmail();
}

function loadNextEmail() {
  if (phishEmailsPlayed >= 5) return endPhishingGame(true);
  const email = emailDatabase[Math.floor(Math.random() * emailDatabase.length)];
  document.getElementById('phish-sender').innerText = email.sender;
  document.getElementById('phish-body').innerText = email.body;
  document.getElementById('phish-score').innerText = phishScore;
  
  let timeLeft = 80;
  clearInterval(phishTimerInt);
  phishTimerInt = setInterval(() => {
    timeLeft--;
    document.getElementById('phish-timer-fill').style.width = (timeLeft / 80 * 100) + '%';
    if (timeLeft <= 0) handleChoice(null, email.isPhish);
  }, 100);
}

function handleChoice(chosePhish, isActuallyPhish) {
  clearInterval(phishTimerInt);
  if (chosePhish === isActuallyPhish) { phishScore++; phishEmailsPlayed++; loadNextEmail(); }
  else { endPhishingGame(false); }
}

function endPhishingGame(won) {
  phishActive = false; clearInterval(phishTimerInt);
  if (won) { myCoins += 25000 * multi; createDynamicPopup("CLEANUP BONUS!", 'loot-popup', window.innerWidth/2, window.innerHeight/2); }
  document.getElementById('phishing-game-overlay').style.display = 'none';
  updateUI(); save();
}

/* ══ UTILS & SAVE/LOAD ══════════════════════════════════════════════════════ */
const lootTable = [{ id:'paperclip', name:'Bent Paperclip', icon:'📎', buff:0.005, rarity:'common' }, { id:'mug', name:"World's Okayest Boss Mug", icon:'☕', buff:0.01, rarity:'uncommon' }, { id:'stapler', name:'Red Stapler', icon:'🖍️', buff:0.025, rarity:'rare' }, { id:'gold_blade', name:'The Gold Blade', icon:'🗡️', buff:0.08, rarity:'legendary' }];
function createDynamicPopup(t, c, x, y) { const p = document.createElement('div'); p.className = c; p.innerText = t; p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1200); }
function rollForLoot(x, y) { if (Math.random() > 0.15) return; const i = lootTable[Math.floor(Math.random() * lootTable.length)]; myInventory[i.id] = (myInventory[i.id] || 0) + 1; calculateLootBuff(); renderInventory(); save(); createDynamicPopup(`Loot: ${i.name}!`, 'loot-popup', x, y); }
function renderInventory() { const g = document.getElementById('inventory-grid'); if (!g) return; g.innerHTML = ''; for (let id in myInventory) { const i = lootTable.find(x => x.id === id); if (i && myInventory[id] > 0) { const s = document.createElement('div'); s.className = `inv-item rarity-${i.rarity}`; s.innerHTML = `${i.icon}<span class="inv-count">${myInventory[id]}</span>`; g.appendChild(s); } } }
function calculateLootBuff() { let t = 0; for (let id in myInventory) { const i = lootTable.find(x => x.id === id); if (i) t += i.buff * myInventory[id]; } itemBuffMultiplier = 1.0 + t; }
function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, u:myUser, inv:myInventory })); }
function load() { const s = localStorage.getItem('gwm_v11'); if (s) { const d = JSON.parse(s); myCoins = d.c || 0; myClickDmg = d.cd || 2500; myUser = d.u || ''; myInventory = d.inv || {}; if (myUser && !isOBS) document.getElementById('username-input').value = myUser; updateUI(); renderInventory(); calculateLootBuff(); } }
function clockIn(u) { if (employeesRef) { const r = employeesRef.push(); r.set({ name:u, e:'💼' }); r.onDisconnect().remove(); } bgm.play().catch(e => {}); startRichardLoop(); }
document.getElementById('btn-clock-in').onclick = () => { const v = document.getElementById('username-input').value.trim().toUpperCase(); if (v) { myUser = v; document.getElementById('login-screen').style.display = 'none'; document.getElementById('game-container').style.display = 'block'; clockIn(myUser); save(); } };
function updateUI() { document.getElementById('coin-count').innerText = myCoins.toLocaleString(); document.getElementById('click-power').innerText = myClickDmg.toLocaleString(); }
function startRichardLoop() { setTimeout(() => { const c = document.getElementById('richard-event-container'); if(c){ c.classList.add('active'); setTimeout(() => c.classList.remove('active'), 8000); } startRichardLoop(); }, 45000); }

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;
document.getElementById('skill-phishing').onclick = () => document.getElementById('mikita-overlay').style.display = 'flex';
document.getElementById('mikita-start-game-btn').onclick = startPhishingGame;
document.getElementById('btn-legit').onclick = () => handleChoice(false, false);
document.getElementById('btn-phish').onclick = () => handleChoice(true, true);
