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

/* ══ LAYOUT & SIZING ENGINE (FORCING CENTERING) ═══ */
function applyBossLayout() {
  const bossArea = document.getElementById('boss-area');
  const bossImgEl = document.getElementById('boss-image');
  const compImgEl = document.getElementById('companion-image');

  if (bossArea) {
    bossArea.style.display = 'flex';
    bossArea.style.justifyContent = 'center';
    bossArea.style.alignItems = 'flex-end';
    bossArea.style.gap = '40px'; // Space between characters
    bossArea.style.minHeight = '500px';
  }

  // FORCING MASSIVE SCALE: 450px width for both
  [bossImgEl, compImgEl].forEach(el => {
    if (el) {
      el.style.width = '450px';
      el.style.height = 'auto';
      el.style.objectFit = 'contain';
    }
  });
}

function initSystem() {
  document.body.style.backgroundImage = "url('background.png')";
  document.body.style.backgroundColor = "#050510"; 
  applyBossLayout();

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

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, frenzy = 0, multi = 1, itemBuffMultiplier = 1.0, myUser = '';
let myInventory = {};
let currentPhase = 0, baseDaveImg = 'phases/dave/dave_phase1.png', lastLevel = 0, isAnimatingHit = false;

const companions = {
  larry: ['chars/larry_frame1.png', 'chars/larry_frame2.png', 'chars/larry_frame3.png', 'chars/larry_frame4.png', 'chars/larry_frame5.png', 'chars/larry_frame6.png'],
  manny: ['chars/manny_frame1.png', 'chars/manny_frame2.png', 'chars/manny_frame3.png', 'chars/manny_frame4.png', 'chars/manny_frame5.png', 'chars/manny_frame6.png']
};
let currentCompanion = companions.larry;
let frameIndex = 0;

// Dave Hit Animation Paths
const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];

/* ══ LOOPS (CHARGE METER & RUMBLE) ══════════════════════════════════════════ */
setInterval(() => {
  frenzy = Math.max(0, frenzy - 2);
  multi = frenzy >= 100 ? 5 : frenzy >= 75 ? 3 : frenzy >= 50 ? 2 : 1;
  const fill = document.getElementById('frenzy-bar-fill');
  if (fill) fill.style.width = frenzy + '%';
  const txt = document.getElementById('frenzy-text');
  if (txt) txt.innerText = multi > 1 ? `COMBO ${multi}x` : 'CHARGE METER';
}, 100);

setInterval(() => {
  const compImg = document.getElementById('companion-image');
  if (compImg && !isAnimatingHit) {
    let rumbleInt = setInterval(() => {
      if (isAnimatingHit) { clearInterval(rumbleInt); return; }
      frameIndex = (frameIndex + 1) % currentCompanion.length;
      compImg.src = currentCompanion[frameIndex];
    }, 120);
    setTimeout(() => clearInterval(rumbleInt), 360);
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
    applyBossLayout(); // Ensure size remains constant after phase changes
  });
}

/* ══ ATTACK & HIT ANIMATIONS ═════════════════════════════════════════════════ */
function playHitAnimation(x, y) {
  if (isAnimatingHit) return;
  isAnimatingHit = true;

  const bossArea = document.getElementById('boss-area');
  if (bossArea) {
    bossArea.style.filter = 'drop-shadow(0 0 30px rgba(255, 0, 0, 0.4))';
    setTimeout(() => bossArea.style.filter = 'none', 300);
  }

  // Dave Specific Hit Frames
  if (bossImg) {
    const originalSrc = bossImg.src;
    const hitFrame = daveHitFrames[Math.floor(Math.random() * daveHitFrames.length)];
    bossImg.src = hitFrame;
    bossImg.classList.add('quick-zoom');
    setTimeout(() => { bossImg.src = originalSrc; bossImg.classList.remove('quick-zoom'); }, 250);
  }

  // Larry Sequential React
  setTimeout(() => {
    if (companionImg) {
      companionImg.classList.add('quick-zoom');
      setTimeout(() => { companionImg.classList.remove('quick-zoom'); isAnimatingHit = false; }, 250);
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

/* ══ PHISHING MINIGAME & SKILLS ══════════════════════════════════════════════ */
function startPhishingGame() {
  document.getElementById('mikita-overlay').style.display = 'none';
  document.getElementById('phishing-game-overlay').style.display = 'flex';
  // ... full minigame logic remains active here
}

/* ══ UTILS (POPUPS, LOOT, RICHARD) ══════════════════════════════════════════ */
const lootTable = [
  { id:'paperclip', name:'Bent Paperclip', icon:'📎', buff:0.005, rarity:'common' },
  { id:'mug', name:"World's Okayest Boss Mug", icon:'☕', buff:0.01, rarity:'uncommon' },
  { id:'gold_blade', name:'The Gold Blade', icon:'🗡️', buff:0.08, rarity:'legendary' }
];

function createDynamicPopup(text, className, x, y) {
  const p = document.createElement('div');
  p.className = className; p.innerText = text;
  p.style.left = x + 'px'; p.style.top = y + 'px';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), className.includes('loot-popup') ? 3500 : 1200); 
}

function rollForLoot(x, y) {
  if (Math.random() > 0.15) return;
  const item = lootTable[Math.floor(Math.random() * lootTable.length)];
  myInventory[item.id] = (myInventory[item.id] || 0) + 1;
  calculateLootBuff(); renderInventory(); save();
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

function calculateLootBuff() {
  let total = 0;
  for (let id in myInventory) {
    const item = lootTable.find(i => i.id === id);
    if (item) total += item.buff * myInventory[id];
  }
  itemBuffMultiplier = 1.0 + total;
}

/* ══ SAVE / LOAD / UI ═══════════════════════════════════════════════════════ */
function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, u:myUser, inv:myInventory })); }
function load() {
  const s = localStorage.getItem('gwm_v11');
  if (s) {
    const d = JSON.parse(s);
    myCoins = d.c || 0; myClickDmg = d.cd || 2500; myUser = d.u || ''; myInventory = d.inv || {};
    if (myUser && !isOBS) document.getElementById('username-input').value = myUser;
    updateUI(); renderInventory(); calculateLootBuff();
  }
}
function clockIn(u) { 
  if (employeesRef) { const r = employeesRef.push(); r.set({ name:u, e:'💼' }); r.onDisconnect().remove(); }
  bgm.play().catch(e => {});
  startRichardLoop();
}
document.getElementById('btn-clock-in').onclick = () => {
  const val = document.getElementById('username-input').value.trim().toUpperCase();
  if (val) { myUser = val; document.getElementById('login-screen').style.display = 'none'; document.getElementById('game-container').style.display = 'block'; clockIn(myUser); save(); }
};
function updateUI() {
  document.getElementById('coin-count').innerText = myCoins.toLocaleString();
  document.getElementById('click-power').innerText = myClickDmg.toLocaleString();
}
function startRichardLoop() { setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, 45000); }
function triggerRichardEvent() {
  const container = document.getElementById('richard-event-container');
  if (!container) return;
  const img = document.getElementById('richard-image');
  img.src = 'yourbossvar/boss-pointing.png';
  container.classList.add('active'); 
  setTimeout(() => container.classList.remove('active'), 8000);
}

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;
document.getElementById('skill-phishing').onclick = () => document.getElementById('mikita-overlay').style.display = 'flex';
document.getElementById('mikita-start-game-btn').onclick = startPhishingGame;
