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
} catch(e) {
  console.warn('Firebase failed to load; running offline:', e);
}

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

/* ══ AUDIO SYSTEM ══════════════════════════════════════════════════════════ */
// Background Music
const bgm = new Audio('nocturnal-window-lights.mp3');
bgm.loop = true;
bgm.volume = 0.15; // Kept low so it stays in the background

// SFX Pack Selection for Attacks
const clickSfxFiles = [
  'sfx pack/Boss hit 1.wav',
  'sfx pack/Bubble 1.wav',
  'sfx pack/Hit damage 1.wav',
  'sfx pack/Select 1.wav'
];

// Preload the SFX
const attackSounds = clickSfxFiles.map(file => {
  const audio = new Audio(file);
  audio.volume = 0.3; // Clean, audible, but not too loud
  return audio;
});

function playClickSound() {
  if (attackSounds.length === 0) return;
  // Pick random sound for variety
  const randomIdx = Math.floor(Math.random() * attackSounds.length);
  const sound = attackSounds[randomIdx].cloneNode(); // Clone allows overlapping sounds during fast clicking
  sound.volume = 0.3;
  sound.play().catch(e => {}); 
}

/* ══ IMAGE FALLBACKS — use only images that exist in the project as filler ═══ */
const FILLER_IMAGES = [
  'assets/backgrounds/background-server-room.png',
  'assets/phases/dave/dave_phase1.png',
  'assets/phases/dave/dave_phase2.png',
  'assets/phases/dave/dave_phase3.png',
  'assets/phases/dave/dave_phase4.png',
  'assets/phases/rich/rich_phase1.png',
  'assets/phases/rich/rich_phase2.png',
  'assets/phases/rich/rich_phase3.png',
  'assets/phases/rich/rich_phase4.png',
  'assets/phases/rich/rich_hit_a.png',
  'assets/phases/rich/rich_hit_b.png',
  'assets/hit/dave-hit-1.png',
  'assets/hit/dave-hit-2.png',
  'assets/chars/manny_frame1.png',
  'assets/chars/manny_frame2.png',
  'assets/chars/manny_frame3.png',
  'assets/chars/manny_frame4.png',
  'assets/chars/manny_frame5.png',
  'assets/chars/manny_frame6.png',
  'assets/chars/mikita_instructor.png',
  'assets/chars/mikita_terminal.png',
  'assets/chars/mikita_idle.png',
  'assets/chars/larry_frame1.png',
  'assets/chars/larry_frame2.png',
  'assets/chars/larry_frame3.png',
  'assets/chars/larry_frame4.png',
  'assets/chars/larry_frame5.png',
  'assets/chars/larry_frame6.png',
  'assets/minigame/click_frame1.png',
  'assets/minigame/click_frame2.png',
  'assets/minigame/click_frame3.png',
  'assets/richard/boss-pointing.png',
  'assets/richard/boss-crossing.png'
];
let fillerIndex = 0;
function getNextFiller() {
  const src = FILLER_IMAGES[fillerIndex % FILLER_IMAGES.length];
  fillerIndex++;
  return src;
}
function resolveUrl(path) { return path; }
function useFiller(img) {
  if (!img || img.dataset.fillerUsed) return;
  img.dataset.fillerUsed = '1';
  img.src = resolveUrl(getNextFiller());
}
function initImageFallbacks() {
  var els = document.querySelectorAll('#boss-image, #companion-image, #boss-hit-layer, #companion-hit-layer, #mikita-char-img, #manny-char-img, #stress-hand-img, #richard-image');
  els.forEach(function(el) { el.addEventListener('error', function() { useFiller(this); }); });

  function loadWithFallback(img, src) {
    if (!img || img.dataset.fillerUsed) return;
    var url = src || img.getAttribute('data-src');
    if (!url) return;
    img.src = resolveUrl(url);
    var timeout = location.protocol === 'file:' ? 2000 : 1000;
    setTimeout(function() {
      if (img.dataset.fillerUsed) return;
      if (!img.complete || img.naturalWidth === 0) useFiller(img);
    }, timeout);
  }
  var bossImg = document.getElementById('boss-image');
  var compImg = document.getElementById('companion-image');
  if (bossImg) loadWithFallback(bossImg, 'assets/phases/dave/dave_phase1.png');
  if (compImg) loadWithFallback(compImg, 'assets/chars/larry_frame1.png');
  document.body.style.backgroundImage = "url('assets/backgrounds/background-server-room.png')";
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initImageFallbacks);
else initImageFallbacks();

/* ══ PRELOADS ═══════════════════════════════════════════════════════════════ */
const daveHitImages = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];
daveHitImages.forEach(s => { const i = new Image(); i.src = resolveUrl(s); });
const davePhaseImgs = ['assets/phases/dave/dave_phase1.png','assets/phases/dave/dave_phase2.png','assets/phases/dave/dave_phase3.png','assets/phases/dave/dave_phase4.png'];
davePhaseImgs.forEach(s => { const i = new Image(); i.src = resolveUrl(s); });
const richPhaseImgs = ['assets/phases/rich/rich_phase1.png','assets/phases/rich/rich_phase2.png','assets/phases/rich/rich_phase3.png','assets/phases/rich/rich_phase4.png'];
const richHitImgs = ['assets/phases/rich/rich_hit_a.png', 'assets/phases/rich/rich_hit_b.png'];
[...richPhaseImgs, ...richHitImgs].forEach(s => { const i = new Image(); i.src = resolveUrl(s); });
const richardImages = ['assets/richard/boss-pointing.png', 'assets/richard/boss-crossing.png'];
richardImages.forEach(s => { const i = new Image(); i.src = resolveUrl(s); });

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = '';
let myInventory = {};
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;
let currentPhase = 0, baseDaveImg = davePhaseImgs[0];
let defMulti = 1.0, lastLevel = 0, itemBuffMultiplier = 1.0, isAnimatingHit = false;
let critChance = 0, critCost = 100, autoInterval = 1000, overtimeCost = 200, shopMultiplier = 1.0, synergyCost = 150, frenzyGainBonus = 0, rageCost = 75, coinsPerClick = 1, hustleCost = 30, autoTimer = null;

/* ══ DOM REFERENCES ═════════════════════════════════════════════════════════ */
const bossImg = document.getElementById('boss-image');
const bossHitLayer = document.getElementById('boss-hit-layer');
const companionImg = document.getElementById('companion-image');
const mainBossNameEl = document.getElementById('main-boss-name');
const companionNameEl = document.getElementById('companion-name');
const richardContainer = document.getElementById('richard-event-container');
const richardImage = document.getElementById('richard-image');
const richardDialogue = document.getElementById('richard-dialogue');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');
const corpQuotes = ["SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!"];

/* ══ SAVE / LOAD / CLOCK IN ═════════════════════════════════════════════════ */
function save() {
  if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser, inv:myInventory, critChance, critCost, autoInterval, overtimeCost, shopMultiplier, synergyCost, frenzyGainBonus, rageCost, coinsPerClick, hustleCost }));
}
function load() {
  const s = localStorage.getItem('gwm_v11');
  if (s) {
    const d = JSON.parse(s);
    myCoins = d.c; myClickDmg = d.cd; myAutoDmg = d.ad; clickCost = d.cc; autoCost = d.ac; myUser = d.u; myInventory = d.inv || {};
    critChance = d.critChance; critCost = d.critCost; autoInterval = d.autoInterval; overtimeCost = d.overtimeCost; shopMultiplier = d.shopMultiplier; synergyCost = d.synergyCost; frenzyGainBonus = d.frenzyGainBonus; rageCost = d.rageCost; coinsPerClick = d.coinsPerClick; hustleCost = d.hustleCost;
    if (myUser && !isOBS) document.getElementById('username-input').value = myUser;
    calculateLootBuff(); updateUI(); renderInventory();
    if (!isOBS) { startRichardLoop(); startAutoTimer(); scheduleMannyStressTest(); }
  }
}
function clockIn(u) { 
  if (employeesRef) { 
    const r = employeesRef.push(); 
    r.set({ name:u, e:'💼' }); 
    r.onDisconnect().remove(); 
  }
  // --- AUDIO: START BGM ---
  bgm.play().catch(e => console.log("BGM waiting for user interaction."));
}

document.getElementById('btn-clock-in').onclick = () => {
  const val = document.getElementById('username-input').value.trim().toUpperCase();
  if (val) {
    myUser = val;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    clockIn(myUser); save(); renderInventory();
    if (!isOBS) { startRichardLoop(); startAutoTimer(); scheduleMannyStressTest(); }
  }
};

/* ══ TAG-TEAM BOSS SYSTEM & ANIMATIONS ═════════════════════════════════════ */
const companions = {
  larry: ['assets/chars/larry_frame1.png', 'assets/chars/larry_frame2.png', 'assets/chars/larry_frame3.png', 'assets/chars/larry_frame4.png', 'assets/chars/larry_frame5.png', 'assets/chars/larry_frame6.png'],
  manny: ['assets/chars/manny_frame1.png', 'assets/chars/manny_frame2.png', 'assets/chars/manny_frame3.png', 'assets/chars/manny_frame4.png', 'assets/chars/manny_frame5.png', 'assets/chars/manny_frame6.png']
};
let currentCompanion = companions.larry; 
let frameIndex = 0;

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

if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val();
    if (!b) { b = { health:1000000000, level:1 }; bossRef.set(b); }
    if (lastLevel === 0) lastLevel = b.level;
    else if (b.level > lastLevel) { triggerVictoryScreen(b.level); lastLevel = b.level; }
    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    const hpPercent = Math.max(0, curHP / maxHP);
    const isDaveEncounter = (b.level % 2 !== 0);
    if (isDaveEncounter) {
      currentCompanion = companions.larry;
      if (companionNameEl) companionNameEl.innerText = 'Security Larry';
      if (mainBossNameEl) mainBossNameEl.innerText = 'VP Dave · Lv.' + b.level;
      if (hpPercent <= 0.25) { baseDaveImg = 'assets/phases/dave/dave_phase4.png'; defMulti = 0.2; currentPhase = 4; }
      else if (hpPercent <= 0.50) { baseDaveImg = 'assets/phases/dave/dave_phase3.png'; defMulti = 0.5; currentPhase = 3; }
      else if (hpPercent <= 0.75) { baseDaveImg = 'assets/phases/dave/dave_phase2.png'; defMulti = 0.8; currentPhase = 2; }
      else { baseDaveImg = 'assets/phases/dave/dave_phase1.png'; defMulti = 1.0; currentPhase = 1; }
      if (bossImg && !isAnimatingHit) bossImg.src = baseDaveImg;
    } else {
      currentCompanion = companions.manny;
      if (companionNameEl) companionNameEl.innerText = 'Intern Manny';
      if (mainBossNameEl) mainBossNameEl.innerText = 'District Manager Rich · Lv.' + b.level;
      if (hpPercent <= 0.25) { baseDaveImg = 'assets/phases/rich/rich_phase4.png'; defMulti = 0.2; currentPhase = 4; }
      else if (hpPercent <= 0.50) { baseDaveImg = 'assets/phases/rich/rich_phase3.png'; defMulti = 0.5; currentPhase = 3; }
      else if (hpPercent <= 0.75) { baseDaveImg = 'assets/phases/rich/rich_phase2.png'; defMulti = 0.8; currentPhase = 2; }
      else { baseDaveImg = 'assets/phases/rich/rich_phase1.png'; defMulti = 1.0; currentPhase = 1; }
      if (bossImg && !isAnimatingHit) bossImg.src = baseDaveImg;
    }
    hpFill.style.width = (hpPercent * 100) + '%';
    hpText.innerText = curHP.toLocaleString() + ' / ' + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = `Level ${b.level} Corporate Takedown`;
  });
}

/* ══ ATTACK ══════════════════════════════════════════════════════════════════ */
function attack(e) {
  if (isOBS) return;
  const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
  const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);

  playHitAnimation(x, y);
  // --- AUDIO: PLAY SFX ---
  playClickSound();

  [bossImg, companionImg].forEach(el => {
    if (el) { el.classList.remove('quick-zoom'); void el.offsetWidth; el.classList.add('quick-zoom'); }
  });

  const isCrit = (Math.random() * 100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * defMulti * itemBuffMultiplier * shopMultiplier * (isCrit ? 10 : 1));

  if (bossRef) bossRef.transaction(b => { if (b) { b.health -= dmg; if (b.health <= 0) { b.level++; b.health = 1000000000 * b.level; } } return b; });
  myCoins += (coinsPerClick * multi);
  frenzy = Math.min(100, frenzy + 8 + frenzyGainBonus);
  updateUI(); save();

  if (isCrit) createDynamicPopup('💥 CRIT! +' + dmg.toLocaleString(), 'damage-popup crit-popup', x, y);
  else createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
  rollForLoot(x, y);
}

// ... Rest of the script (Popups, Shop, Richard loop, Minigames) ...
// (Be sure to keep your full createDynamicPopup, startAutoTimer, Phishing game, etc. here)
