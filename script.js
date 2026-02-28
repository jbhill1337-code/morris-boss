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
} catch(e) { console.warn('Firebase offline:', e); }

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

/* ══ AUDIO SYSTEM ══════════════════════════════════════════════════════════ */
const bgm = new Audio('nocturnal-window-lights.mp3');
bgm.loop = true;
bgm.volume = 0.15;

const clickSfxFiles = [
  'assets/sfx pack/Boss hit 1.wav',
  'assets/sfx pack/Bubble 1.wav',
  'assets/sfx pack/Hit damage 1.wav',
  'assets/sfx pack/Select 1.wav'
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
  document.body.style.backgroundImage = "url('background.png')";
  document.body.style.backgroundColor = "#050510"; 

  const bossImgEl = document.getElementById('boss-image');
  const compImgEl = document.getElementById('companion-image');
  // Fixed paths to assets folder
  if (bossImgEl) bossImgEl.src = 'assets/phases/dave/dave_phase1.png';
  if (compImgEl) compImgEl.src = 'assets/chars/larry_frame1.png';
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

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = '';
let myInventory = {};
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;
let currentPhase = 0, baseDaveImg = 'assets/phases/dave/dave_phase1.png';
let defMulti = 1.0, lastLevel = 0, itemBuffMultiplier = 1.0, isAnimatingHit = false;
let critChance = 0, critCost = 100, autoInterval = 1000, shopMultiplier = 1.0;

const companions = {
  larry: ['assets/chars/larry_frame1.png', 'assets/chars/larry_frame2.png', 'assets/chars/larry_frame3.png', 'assets/chars/larry_frame4.png', 'assets/chars/larry_frame5.png', 'assets/chars/larry_frame6.png'],
  manny: ['assets/chars/manny_frame1.png', 'assets/chars/manny_frame2.png', 'assets/chars/manny_frame3.png', 'assets/chars/manny_frame4.png', 'assets/chars/manny_frame5.png', 'assets/chars/manny_frame6.png']
};
let currentCompanion = companions.larry;
let frameIndex = 0;

/* ══ DOM REFERENCES ═════════════════════════════════════════════════════════ */
const bossImg = document.getElementById('boss-image');
const companionImg = document.getElementById('companion-image');
const companionNameEl = document.getElementById('companion-name');
const mainBossNameEl = document.getElementById('main-boss-name');
const richardContainer = document.getElementById('richard-event-container');
const richardImage = document.getElementById('richard-image');
const richardDialogue = document.getElementById('richard-dialogue');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');

const richardImages = ['assets/yourbossvar/boss-pointing.png', 'assets/yourbossvar/boss-crossing.png'];
const richardQuotes = ["Livin' the dream!", "Another day, another dollar.", "Working hard or hardly working?", "Can someone check the back room?", "Corporate is visiting, look busy."];
const corpQuotes = ["SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!"];

/* ══ LOOT TABLE ═════════════════════════════════════════════════════════════ */
const lootTable = [
  { id:'paperclip', name:'Bent Paperclip', icon:'📎', buff:0.005, rarity:'common' },
  { id:'sticky', name:'Neon Sticky', icon:'📝', buff:0.005, rarity:'common' },
  { id:'mug', name:"World's Okayest Boss Mug", icon:'☕', buff:0.01, rarity:'uncommon' },
  { id:'stapler', name:'Red Stapler', icon:'🖍️', buff:0.025, rarity:'rare' },
  { id:'gold_blade', name:'The Gold Blade', icon:'🗡️', buff:0.08, rarity:'legendary' }
];

/* ══ LOOPS (CHARGE METER & RUMBLE) ══════════════════════════════════════════ */
setInterval(() => {
  frenzy = Math.max(0, frenzy - 2);
  multi = frenzy >= 100 ? 5 : frenzy >= 75 ? 3 : frenzy >= 50 ? 2 : 1;
  const fill = document.getElementById('frenzy-bar-fill');
  const txt = document.getElementById('frenzy-text');
  if (fill) fill.style.width = frenzy + '%';
  if (txt) txt.innerText = multi > 1 ? `COMBO ${multi}x` : 'CHARGE METER';
}, 100);

setInterval(() => {
  if (companionImg && !isAnimatingHit) {
    let rumbles = 0;
    let rumbleInt = setInterval(() => {
      if (isAnimatingHit) { clearInterval(rumbleInt); return; }
      frameIndex = (frameIndex + 1) % currentCompanion.length;
      companionImg.src = currentCompanion[frameIndex];
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
    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    const hpPercent = Math.max(0, curHP / maxHP);
    const isDaveEncounter = (b.level % 2 !== 0);

    if (isDaveEncounter) {
      currentCompanion = companions.larry;
      if (companionNameEl) companionNameEl.innerText = 'Security Larry';
      if (mainBossNameEl) mainBossNameEl.innerText = 'VP Dave · Lv.' + b.level;
      if (hpPercent <= 0.25) baseDaveImg = 'assets/phases/dave/dave_phase4.png';
      else if (hpPercent <= 0.50) baseDaveImg = 'assets/phases/dave/dave_phase3.png';
      else if (hpPercent <= 0.75) baseDaveImg = 'assets/phases/dave/dave_phase2.png';
      else baseDaveImg = 'assets/phases/dave/dave_phase1.png';
    } else {
      currentCompanion = companions.manny;
      if (companionNameEl) companionNameEl.innerText = 'Intern Manny';
      if (mainBossNameEl) mainBossNameEl.innerText = 'District Manager Rich · Lv.' + b.level;
      if (hpPercent <= 0.25) baseDaveImg = 'assets/phases/rich/rich_phase4.png';
      else if (hpPercent <= 0.50) baseDaveImg = 'assets/phases/rich/rich_phase3.png';
      else if (hpPercent <= 0.75) baseDaveImg = 'assets/phases/rich/rich_phase2.png';
      else baseDaveImg = 'assets/phases/rich/rich_phase1.png';
    }
    if (bossImg && !isAnimatingHit) bossImg.src = baseDaveImg;
    if (hpFill) hpFill.style.width = (hpPercent * 100) + '%';
    if (hpText) hpText.innerText = curHP.toLocaleString() + ' / ' + maxHP.toLocaleString();
  });
}

/* ══ CORE FUNCTIONS (SAVE/LOAD/ATTACK) ═══════════════════════════════════════ */
function save() {
  if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, u:myUser, inv:myInventory }));
}

function load() {
  const s = localStorage.getItem('gwm_v11');
  if (s) {
    const d = JSON.parse(s);
    myCoins = d.c || 0; myClickDmg = d.cd || 2500; myUser = d.u || ''; myInventory = d.inv || {};
    if (myUser && !isOBS) document.getElementById('username-input').value = myUser;
    updateUI();
    renderInventory();
    calculateLootBuff();
  }
}

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
  playHitAnimation(x, y);

  const dmg = Math.floor(myClickDmg * multi * itemBuffMultiplier);
  if (bossRef) bossRef.transaction(b => { if (b) { b.health -= dmg; if (b.health <= 0) { b.level++; b.health = 1000000000 * b.level; } } return b; });

  myCoins += (1 * multi);
  frenzy = Math.min(100, frenzy + 8);
  updateUI(); save();
  createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
  rollForLoot(x, y);
}

function updateUI() {
  document.getElementById('coin-count').innerText = myCoins.toLocaleString();
  document.getElementById('click-power').innerText = myClickDmg.toLocaleString();
}

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;

/* ══ UTILS (POPUPS, LOOT, RICHARD) ══════════════════════════════════════════ */
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
  setTimeout(() => p.remove(), className.includes('loot-popup') ? 3500 : 1200); 
}

function playHitAnimation(x, y) {
  if (isAnimatingHit) return;
  isAnimatingHit = true;
  const bossArea = document.getElementById('boss-area');
  if (bossArea) { bossArea.style.filter = 'drop-shadow(0 0 20px rgba(255, 0, 0, 0.4)) brightness(1.2)'; setTimeout(() => bossArea.style.filter = 'none', 300); }
  if (bossImg) { bossImg.classList.add('quick-zoom'); void bossImg.offsetWidth; setTimeout(() => bossImg.classList.remove('quick-zoom'), 250); }
  setTimeout(() => { if (companionImg) { companionImg.classList.add('quick-zoom'); void companionImg.offsetWidth; setTimeout(() => { companionImg.classList.remove('quick-zoom'); isAnimatingHit = false; }, 250); } }, 150);
  if (Math.random() < 0.1) createDynamicPopup(corpQuotes[Math.floor(Math.random() * corpQuotes.length)], 'quote-popup', x, y);
}

function calculateLootBuff() {
  let total = 0;
  for (let id in myInventory) {
    const item = lootTable.find(i => i.id === id);
    if (item) total += item.buff * myInventory[id];
  }
  itemBuffMultiplier = 1.0 + total;
  const el = document.getElementById('loot-buff');
  if (el) el.innerText = Math.floor(total * 100);
}

function rollForLoot(x, y) {
  if (Math.random() > 0.15) return;
  const item = lootTable[Math.floor(Math.random() * lootTable.length)];
  myInventory[item.id] = (myInventory[item.id] || 0) + 1;
  calculateLootBuff();
  save(); 
  renderInventory();
  createDynamicPopup(`Loot: ${item.name}!`, 'loot-popup', x, y);
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let id in myInventory) {
    const item = lootTable.find(i => i.id === id);
    if (item && myInventory[id] > 0) {
      const slot = document.createElement('div');
      slot.className = `inv-item rarity-${item.rarity}`;
      slot.innerHTML = `${item.icon}<span class="inv-count">${myInventory[id]}</span>`;
      grid.appendChild(slot);
    }
  }
}

function startRichardLoop() { setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, Math.random() * 40000 + 45000); }
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

function startAutoTimer() {}
function scheduleMannyStressTest() {}
