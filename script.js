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
  const audio = new Audio(file);
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

/* ══ IMAGE FALLBACKS ═══ */
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
  'assets/chars/larry_frame6.png'
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
    img.src = resolveUrl(src || img.getAttribute('data-src'));
    setTimeout(() => { if (!img.complete || img.naturalWidth === 0) useFiller(img); }, 1000);
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
  bgm.play().catch(e => {});
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

/* ══ VICTORY SCREEN ═════════════════════════════════════════════════════════ */
function triggerVictoryScreen(newLevel) {
  let old = document.getElementById('victory-screen-overlay');
  if (old) old.remove();
  const v = document.createElement('div');
  v.id = 'victory-screen-overlay';
  Object.assign(v.style, { position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh', backgroundColor:'rgba(0,0,0,0.85)', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', zIndex:'9999', fontFamily:'monospace', textAlign:'center', textShadow:'3px 3px 0px #00ffff' });
  v.innerHTML = `<h1 style="font-size:5rem;color:#ff00ff;margin:0;text-transform:uppercase;">PROMOTED!</h1><h2 style="font-size:2rem;color:#fff;text-shadow:none;">Dave & Rich retreated... for now.</h2><p style="font-size:1.5rem;color:#00ffff;text-shadow:none;margin-top:20px;">PREPARE FOR LEVEL ${newLevel}</p>`;
  document.body.appendChild(v);
  if (bossImg) bossImg.style.opacity = '0';
  setTimeout(() => { v.style.transition = 'opacity 1s'; v.style.opacity = '0'; if (bossImg) bossImg.style.opacity = '1'; setTimeout(() => v.remove(), 1000); }, 4000);
}

/* ══ POPUPS ═════════════════════════════════════════════════════════════════ */
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
  const isLoot = className.includes('loot-popup');
  setTimeout(() => p.remove(), isLoot ? 3500 : 1200); 
}

/* ══ HIT ANIMATION ═════════════════════════════════════════════════════════ */
function getBossHitOptions() {
  const fallback = baseDaveImg;
  return [...daveHitImages, ...richHitImgs, fallback];
}

function playHitAnimation(x, y) {
  if (isAnimatingHit) return;
  isAnimatingHit = true;
  const options = getBossHitOptions();
  const pick = options[Math.floor(Math.random() * options.length)];
  const useFallback = pick === baseDaveImg;
  let phaseFilter = 'none';
  if (currentPhase === 4) phaseFilter = 'hue-rotate(250deg) saturate(3) brightness(0.7)';
  else if (currentPhase === 3) phaseFilter = 'sepia(1) hue-rotate(-30deg) saturate(5) brightness(0.8)';
  else if (currentPhase === 2) phaseFilter = 'saturate(2) brightness(1.2)';

  if (bossImg && bossHitLayer) {
    bossImg.style.opacity = '0';
    bossHitLayer.style.filter = phaseFilter;
    bossHitLayer.src = pick;
    bossHitLayer.classList.toggle('hit-active', !useFallback);
    bossHitLayer.classList.toggle('hit-using-fallback', useFallback);
    bossHitLayer.style.opacity = '1';
    if (!useFallback) {
      setTimeout(() => { bossHitLayer.src = options[Math.floor(Math.random() * options.length)]; }, 800);
      setTimeout(() => { bossHitLayer.src = pick; }, 1600);
    }
  }

  if (Math.random() < 0.45) spawnFloatingHitPopup(x, y);
  setTimeout(() => {
    if (bossHitLayer) { bossHitLayer.style.transition = 'opacity 0.3s ease-out'; bossHitLayer.style.opacity = '0'; bossHitLayer.classList.remove('hit-using-fallback'); }
    setTimeout(() => { if (bossImg) { bossImg.style.opacity = '1'; if (bossHitLayer) bossHitLayer.classList.remove('hit-active'); bossHitLayer.style.transition = ''; } isAnimatingHit = false; }, 300);
  }, 2400);
  if (Math.random() < 0.15) spawnQuote(x, y);
}

function spawnFloatingHitPopup(clickX, clickY) {
  const options = getBossHitOptions();
  const src = options[Math.floor(Math.random() * options.length)];
  const wrap = document.createElement('div');
  wrap.className = 'hit-floating-popup';
  const offsetX = (Math.random() - 0.5) * 180;
  const offsetY = (Math.random() - 0.5) * 120 - 80;
  wrap.style.left = (clickX + offsetX) + 'px'; wrap.style.top = (clickY + offsetY) + 'px';
  wrap.style.setProperty('--hit-rot', (Math.random() - 0.5) * 24 + 'deg');
  const img = document.createElement('img'); img.src = src; wrap.appendChild(img);
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('hit-floating-visible'));
  setTimeout(() => { wrap.classList.remove('hit-floating-visible'); setTimeout(() => wrap.remove(), 400); }, 650);
}

function spawnQuote(x, y) {
  if (!x || !y) { x = window.innerWidth / 2; y = window.innerHeight / 2; }
  createDynamicPopup(corpQuotes[Math.floor(Math.random() * corpQuotes.length)], 'quote-popup', x, y);
}

/* ══ LOOT SYSTEM ═════════════════════════════════════════════════════════════ */
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
  const r = Math.random();
  const valid = lootTable.filter(i => !i.prestigeOnly);
  let pool;
  if (r < 0.02) pool = valid.filter(i => i.rarity === 'legendary');
  else if (r < 0.15) pool = valid.filter(i => i.rarity === 'rare');
  else if (r < 0.40) pool = valid.filter(i => i.rarity === 'uncommon');
  else pool = valid.filter(i => i.rarity === 'common');
  if (pool.length > 0) {
    const item = pool[Math.floor(Math.random() * pool.length)];
    myInventory[item.id] = (myInventory[item.id] || 0) + 1;
    calculateLootBuff(); save(); renderInventory();
    createDynamicPopup(`Loot: ${item.name}!`, 'loot-popup', x, y);
  }
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  let has = false;
  lootTable.forEach(item => {
    if (myInventory[item.id] > 0) {
      has = true;
      const slot = document.createElement('div');
      slot.className = `inv-item rarity-${item.rarity}`;
      slot.innerHTML = `${item.icon}<span class="inv-count">${myInventory[item.id]}</span><span class="inv-tooltip">${item.name} (+${item.buff*100}%)</span>`;
      grid.appendChild(slot);
    }
  });
  if (!has) grid.innerHTML = '<p style="color:#777;font-size:12px;width:100%;text-align:center;">Drawer is empty. Attack!</p>';
}

/* ══ ATTACK ══════════════════════════════════════════════════════════════════ */
function attack(e) {
  if (isOBS) return;
  const x = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2);
  const y = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2);

  playHitAnimation(x, y);
  playClickSound();

  [bossImg, companionImg].forEach(el => {
    if (el) { el.classList.remove('quick-zoom'); void el.offsetWidth; el.classList.add('quick-zoom'); }
  });

  const isCrit = (Math.random() * 100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * defMulti * itemBuffMultiplier * shopMultiplier * (isCrit ? 10 : 1));

  if (bossRef) {
    bossRef.transaction(b => { if (b) { b.health -= dmg; if (b.health <= 0) { b.level++; b.health = 1000000000 * b.level; } } return b; });
  } else {
    curHP -= dmg;
    if (curHP <= 0) { currentPhase++; if (currentPhase > 4) currentPhase = 4; curHP = maxHP; }
  }

  myCoins += (coinsPerClick * multi);
  frenzy = Math.min(100, frenzy + 8 + frenzyGainBonus);
  updateUI(); save();

  if (isCrit) createDynamicPopup('💥 CRIT! +' + dmg.toLocaleString(), 'damage-popup crit-popup', x, y);
  else createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
  rollForLoot(x, y);
}

/* ══ UI UPDATE ═══════════════════════════════════════════════════════════════ */
function updateUI() {
  const ids = { 'coin-count':myCoins.toLocaleString(), 'click-power':myClickDmg.toLocaleString(), 'auto-power':myAutoDmg.toLocaleString(), 'crit-chance-display':critChance, 'shop-multi-display':shopMultiplier.toFixed(2) };
  for (let id in ids) { const el = document.getElementById(id); if (el) el.innerText = ids[id]; }
  
  const buttons = { 'buy-click': `⚔️ Sharpen Blade (+2.5k) <br><span>Cost: ${clickCost}</span>`, 'buy-auto': `Hire Merc (+1k/s) <br><span>Cost: ${autoCost}</span>`, 'buy-crit': `🎯 Lucky Shot (+5% crit) <br><span class="cost-tag">Cost: ${critCost}</span>`, 'buy-overtime': `⏱️ Overtime (faster auto) <br><span class="cost-tag">Cost: ${overtimeCost}</span>`, 'buy-synergy': `⚡ Synergy Boost (+10% dmg) <br><span class="cost-tag">Cost: ${synergyCost}</span>`, 'buy-rage': `🔥 Rage Fuel (+frenzy/click) <br><span class="cost-tag">Cost: ${rageCost}</span>`, 'buy-hustle': `💰 Side Hustle (+2 coins) <br><span class="cost-tag">Cost: ${hustleCost}</span>` };
  for (let id in buttons) { const el = document.getElementById(id); if (el) el.innerHTML = buttons[id]; }
}

/* ══ SHOP ════════════════════════════════════════════════════════════════════ */
document.getElementById('buy-click').onclick = () => { if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); updateUI(); save(); } };
document.getElementById('buy-crit').onclick = () => { if (myCoins >= critCost) { myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8); updateUI(); save(); } };
document.getElementById('buy-overtime').onclick = () => { if (myCoins >= overtimeCost && autoInterval > 200) { myCoins -= overtimeCost; autoInterval = Math.max(200, autoInterval - 100); overtimeCost = Math.floor(overtimeCost * 2); startAutoTimer(); updateUI(); save(); } };
document.getElementById('buy-synergy').onclick = () => { if (myCoins >= synergyCost) { myCoins -= synergyCost; shopMultiplier = parseFloat((shopMultiplier + 0.10).toFixed(2)); synergyCost = Math.floor(synergyCost * 2); updateUI(); save(); } };
document.getElementById('buy-rage').onclick = () => { if (myCoins >= rageCost) { myCoins -= rageCost; frenzyGainBonus += 4; rageCost = Math.floor(rageCost * 1.6); updateUI(); save(); } };
document.getElementById('buy-hustle').onclick = () => { if (myCoins >= hustleCost) { myCoins -= hustleCost; coinsPerClick += 2; hustleCost = Math.floor(hustleCost * 1.5); updateUI(); save(); } };

/* ══ AUTO DPS ════════════════════════════════════════════════════════════════ */
function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (myAutoDmg > 0 && bossRef) {
      const dmg = Math.floor(myAutoDmg * defMulti * itemBuffMultiplier * shopMultiplier);
      bossRef.transaction(b => { if (b) b.health -= dmg; return b; });
    }
  }, autoInterval);
}

/* ══ FRENZY METER ════════════════════════════════════════════════════════════ */
setInterval(() => { frenzy = Math.max(0, frenzy - 2); multi = frenzy >= 100 ? 5 : frenzy >= 75 ? 3 : frenzy >= 50 ? 2 : 1; const fill = document.getElementById('frenzy-bar-fill'); if (fill) fill.style.width = frenzy + '%'; const txt = document.getElementById('frenzy-text'); if (txt) txt.innerText = multi > 1 ? `COMBO ${multi}x` : 'CHARGE METER'; }, 100);

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;

/* ══ RICHARD SIDE EVENT ══════════════════════════════════════════════════════ */
const richardQuotes = ["Livin' the dream!", "Another day, another dollar.", "Working hard or hardly working?", "Can someone check the back room?", "Corporate is visiting, look busy."];
function startRichardLoop() { setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, Math.random() * (90000 - 45000) + 45000); }
function triggerRichardEvent() {
  if (!richardContainer || !richardImage || !richardDialogue) return;
  richardImage.src = resolveUrl(richardImages[Math.floor(Math.random() * richardImages.length)]);
  richardDialogue.innerText = richardQuotes[Math.floor(Math.random() * richardQuotes.length)];
  richardContainer.classList.add('active'); setTimeout(() => richardContainer.classList.remove('active'), 8000);
}

/* ══ PHISHING MINIGAME ══════════════════════════════════════════════════════ */
const mikitaOverlay = document.getElementById('mikita-overlay');
const mikitaStartGameBtn = document.getElementById('mikita-start-game-btn'); 
const phishOverlay = document.getElementById('phishing-game-overlay');
const emailDatabase = [
  { sender: "IT-Admin@corp-extracion.com", subject: "URGENT: Password Expiry", body: "Your corporate password expires in 2 hours. \n\nPlease click the link below to verify your credentials immediately.\n\nhttp://login-verify-corporate.net", isPhish: true },
  { sender: "HR@corporate-extraction.com", subject: "Updated PTO Policy", body: "Team,\n\nPlease review the attached PDF regarding the updated Paid Time Off (PTO) policy for Q3.\n\nLet HR know if you have questions.", isPhish: false },
  { sender: "rich.district.mgr@gmail.com", subject: "Are you at your desk?", body: "I am in a meeting with a client and need you to buy 5 Apple Gift Cards ($100 each) right now. I will reimburse you later.\n\nDo not call me, just reply with the codes.", isPhish: true }
];
let phishActive = false, currentEmail = null, phishScore = 0, phishEmailsPlayed = 0, phishTimeLeft = 80, phishTimerInt = null;

function openMikitaPopup() { if (mikitaOverlay) mikitaOverlay.style.display = 'flex'; }
function closeMikitaPopup() { if (mikitaOverlay) mikitaOverlay.style.display = 'none'; }
function startPhishingGame() { closeMikitaPopup(); if (phishActive || isOBS) return; phishActive = true; phishScore = 0; phishEmailsPlayed = 0; document.getElementById('phish-buttons').style.display = 'flex'; document.getElementById('phish-result-screen').style.display = 'none'; document.querySelector('.email-client').style.display = 'block'; phishOverlay.style.display = 'flex'; loadNextEmail(); }
function loadNextEmail() { if (phishEmailsPlayed >= 5) { return endPhishingGame(true); } currentEmail = emailDatabase[Math.floor(Math.random() * emailDatabase.length)]; document.getElementById('phish-sender').innerText = currentEmail.sender; document.getElementById('phish-subject').innerText = currentEmail.subject; document.getElementById('phish-body').innerText = currentEmail.body; document.getElementById('phish-score').innerText = phishScore; phishTimeLeft = 80; const fillBar = document.getElementById('phish-timer-fill'); fillBar.style.width = '100%'; clearInterval(phishTimerInt); phishTimerInt = setInterval(() => { phishTimeLeft--; fillBar.style.width = (phishTimeLeft / 80 * 100) + '%'; if (phishTimeLeft <= 0) { clearInterval(phishTimerInt); handleChoice(null); } }, 100); }
function handleChoice(playerChosePhish) { if (!phishActive) return; clearInterval(phishTimerInt); if (playerChosePhish === null) { endPhishingGame(false, "TIME RAN OUT!"); return; } else if (playerChosePhish === currentEmail.isPhish) { phishScore++; phishEmailsPlayed++; loadNextEmail(); } else { endPhishingGame(false, currentEmail.isPhish ? "PHISHING LINK CLICKED!" : "LEGIT EMAIL DELETED!"); } }
function endPhishingGame(won, failReason = "") { phishActive = false; clearInterval(phishTimerInt); document.getElementById('phish-buttons').style.display = 'none'; document.querySelector('.email-client').style.display = 'none'; const resultScreen = document.getElementById('phish-result-screen'); const msgEl = document.getElementById('phish-final-msg'); if (won) { const bonus = 25000 * multi; myCoins += bonus; save(); updateUI(); msgEl.innerHTML = `SYSTEM SECURED! +${bonus.toLocaleString()}`; } else { msgEl.innerHTML = `BREACH! ${failReason}`; } resultScreen.style.display = 'block'; }

if (document.getElementById('skill-phishing')) document.getElementById('skill-phishing').onclick = openMikitaPopup;
if (document.getElementById('mikita-close')) document.getElementById('mikita-close').onclick = closeMikitaPopup;
if (mikitaStartGameBtn) mikitaStartGameBtn.onclick = startPhishingGame;
if (document.getElementById('btn-legit')) document.getElementById('btn-legit').onclick = () => handleChoice(false);
if (document.getElementById('btn-phish')) document.getElementById('btn-phish').onclick = () => handleChoice(true);
if (document.getElementById('phish-close-btn')) document.getElementById('phish-close-btn').onclick = () => phishOverlay.style.display = 'none';

/* ══ MANNY STRESS TEST ══════════════════════════════════════════════════════ */
const stressOverlay = document.getElementById('stress-test-overlay');
let stressActive = false, stressClickCount = 0, stressTimeLeft = 15, stressQuota = 50, stressTimerInterval = null;
function openStressTest() { if (stressActive || isOBS) return; stressActive = true; stressClickCount = 0; stressTimeLeft = 15; stressOverlay.style.display = 'flex'; stressTimerInterval = setInterval(() => { stressTimeLeft--; if (stressTimeLeft <= 0) endStressTest(); }, 1000); }
function handleStressClick() { if (!stressActive) return; stressClickCount++; if (stressClickCount >= stressQuota) endStressTest(); }
function endStressTest() { stressActive = false; clearInterval(stressTimerInterval); stressOverlay.style.display = 'none'; scheduleMannyStressTest(); }
function scheduleMannyStressTest() { if (isOBS) return; setTimeout(() => openStressTest(), Math.random() * (480000 - 180000) + 180000); }
if (document.getElementById('stress-click-btn')) document.getElementById('stress-click-btn').onpointerdown = handleStressClick;
if (stressOverlay) stressOverlay.onpointerdown = e => e.stopPropagation();

load();
