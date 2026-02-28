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

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
const bossRef = db.ref('frank_corporate_data');
const employeesRef = db.ref('active_employees');
const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

// --- UPDATED IMAGE PRELOADERS FOR DAVE & MINIGAME ---
const davePhaseImgs = [
    'morris-boss-v3/phases/dave/dave_phase1.png',
    'morris-boss-v3/phases/dave/dave_phase2.png',
    'morris-boss-v3/phases/dave/dave_phase3.png',
    'morris-boss-v3/phases/dave/dave_phase3.png' // Reusing phase 3 for phase 4 for now
];
const hitImages = ['morris-boss-v3/dave-hit-2.png', 'morris-boss-v3/dave-hit-2.png']; 

[...davePhaseImgs, ...hitImages].forEach(s => { const i = new Image(); i.src = s; });

const miniFrame1 = new Image(); miniFrame1.src = 'morris-boss-v3/minigame/click_frame1.png';
const miniFrame2 = new Image(); miniFrame2.src = 'morris-boss-v3/minigame/click_frame2.png';
const miniFrame3 = new Image(); miniFrame3.src = 'morris-boss-v3/minigame/click_frame3.png';

// Rich phase images
const richPhaseImgs = [
  'assets/phases/rich/rich_phase1.png',
  'assets/phases/rich/rich_phase2.png',
  'assets/phases/rich/rich_phase3.png',
  'assets/phases/rich/rich_phase4.png'
];
const richHitImgs = ['assets/phases/rich/rich_hit_a.png', 'assets/phases/rich/rich_hit_b.png'];
[...richPhaseImgs, ...richHitImgs].forEach(s => { const i = new Image(); i.src = s; });

// Richard side event — yourbossvar
const richardImages = ['yourbossvar/boss-pointing.png', 'yourbossvar/boss-crossing.png'];
richardImages.forEach(s => { const i = new Image(); i.src = s; });

// Manny STRESS TEST
['assets/chars/manny_frame1.png','assets/chars/manny_frame2.png','assets/chars/manny_frame3.png',
 'assets/chars/manny_frame4.png','assets/chars/manny_frame5.png','assets/chars/manny_frame6.png',
 'morris-boss-v3/minigame/click_frame1.png','morris-boss-v3/minigame/click_frame2.png','morris-boss-v3/minigame/click_frame3.png']
  .forEach(s => { const i = new Image(); i.src = s; });
/* ══ INTRO ══════════════════════════════════════════════════════════════════ */
const introContainer = document.getElementById('intro-container');
const startIntroBtn  = document.getElementById('start-intro-btn');
const skipIntroBtn   = document.getElementById('skip-intro-btn');
let ytPlayer;

const endIntro = () => {
  if (introContainer) {
    introContainer.style.opacity = '0';
    setTimeout(() => { introContainer.remove(); load(); }, 1000);
  }
};

// Emergency failsafe — never get stuck on black screen
if (introContainer && !isOBS) {
  setTimeout(() => {
    if (skipIntroBtn && skipIntroBtn.style.display === 'none') {
      skipIntroBtn.style.display = 'block';
      skipIntroBtn.innerText = 'SKIP (EMERGENCY OVERRIDE)';
    }
  }, 4000);
}

if (isOBS) {
  if (introContainer) introContainer.style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  document.getElementById('left-col').style.display = 'none';
  document.getElementById('right-col').style.display = 'none';
  document.querySelector('.action-buttons').style.display = 'none';
  document.getElementById('richard-event-container').style.display = 'none';
  if (document.getElementById('rich-wrapper')) document.getElementById('rich-wrapper').style.display = 'none';
  if (document.getElementById('skill-panel')) document.getElementById('skill-panel').style.display = 'none';
} else {
  window.onYouTubeIframeAPIReady = function () {
    if (!introContainer) return;
    ytPlayer = new YT.Player('yt-player', {
      videoId: 'HeKNgnDyD7I',
      playerVars: { playsinline:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0 },
      events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
    });
  };
  function onPlayerReady(event) {
    startIntroBtn.style.display = 'block';
    startIntroBtn.onclick = () => {
      startIntroBtn.style.display = 'none';
      document.getElementById('yt-player').style.display = 'block';
      skipIntroBtn.style.display = 'block';
      event.target.playVideo();
    };
  }
  function onPlayerStateChange(event) { if (event.data === 0) endIntro(); }
  if (skipIntroBtn) skipIntroBtn.onclick = endIntro;
}

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = '';
let myInventory = {};
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;
let currentPhase = 0;
let baseDaveImg = davePhaseImgs[0];
let defMulti = 1.0, lastLevel = 0, itemBuffMultiplier = 1.0, isAnimatingHit = false;

// Upgrades
let critChance = 0, critCost = 100;
let autoInterval = 1000, overtimeCost = 200;
let shopMultiplier = 1.0, synergyCost = 150;
let frenzyGainBonus = 0, rageCost = 75;
let coinsPerClick = 1, hustleCost = 30;
let autoTimer = null;

/* ══ DOM REFERENCES ═════════════════════════════════════════════════════════ */
const bossImg      = document.getElementById('boss-image');
const bossHitLayer = document.getElementById('boss-hit-layer');
const richImg      = document.getElementById('rich-image');
const richHitLayer = document.getElementById('rich-hit-layer');
const richardContainer = document.getElementById('richard-event-container');
const richardImage     = document.getElementById('richard-image');
const richardDialogue  = document.getElementById('richard-dialogue');
const hpFill  = document.getElementById('health-bar-fill');
const hpText  = document.getElementById('health-text');

const corpQuotes = ["SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!"];

/* ══ LOOT TABLE ═════════════════════════════════════════════════════════════ */
const lootTable = [
  { id:'paperclip',       name:'Bent Paperclip',             rarity:'common',    icon:'📎', buff:0.005 },
  { id:'sticky',          name:'Neon Sticky',                rarity:'common',    icon:'📝', buff:0.005 },
  { id:'mug',             name:"World's Okayest Boss Mug",   rarity:'uncommon',  icon:'☕', buff:0.01 },
  { id:'energy_drink',    name:'Suspicious Energy Drink',    rarity:'uncommon',  icon:'🧪', buff:0.015 },
  { id:'stapler',         name:'Red Stapler',                rarity:'rare',      icon:'🖍️', buff:0.025 },
  { id:'keyboard',        name:'Clacky Keyboard',            rarity:'rare',      icon:'⌨️', buff:0.025 },
  { id:'power_gem',       name:'Power Gem',                  rarity:'rare',      icon:'🟠', buff:0.03 },
  { id:'crimson_shard',   name:'Crimson Shard',              rarity:'rare',      icon:'🔴', buff:0.03 },
  { id:'golden_pen',      name:'The Golden Pen',             rarity:'legendary', icon:'🖋️', buff:0.05 },
  { id:'rolodex',         name:"CEO's Rolodex",              rarity:'legendary', icon:'📇', buff:0.05 },
  { id:'briefcase',       name:'Nuclear Briefcase',          rarity:'legendary', icon:'💼', buff:0.05 },
  { id:'exec_trophy',     name:'Executive Trophy',           rarity:'legendary', icon:'🏆', buff:0.07 },
  { id:'gold_blade',      name:'The Gold Blade',             rarity:'legendary', icon:'🗡️', buff:0.08 },
  { id:'golden_paperclip',name:'Golden Paperclip',           rarity:'legendary', icon:'✨', buff:0.25, prestigeOnly:true }
];

/* ══ SAVE / LOAD ════════════════════════════════════════════════════════════ */
function save() {
  if (!isOBS) localStorage.setItem('gwm_v10', JSON.stringify({
    c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost,
    u:myUser, inv:myInventory, critChance, critCost, autoInterval, overtimeCost,
    shopMultiplier, synergyCost, frenzyGainBonus, rageCost, coinsPerClick, hustleCost
  }));
}

function load() {
  const s = localStorage.getItem('gwm_v10');
  if (s) {
    const d = JSON.parse(s);
    myCoins = d.c; myClickDmg = d.cd; myAutoDmg = d.ad;
    clickCost = d.cc; autoCost = d.ac; myUser = d.u;
    myInventory = d.inv || {};
    if (d.critChance !== undefined)    { critChance = d.critChance; critCost = d.critCost; }
    if (d.autoInterval !== undefined)  { autoInterval = d.autoInterval; overtimeCost = d.overtimeCost; }
    if (d.shopMultiplier !== undefined){ shopMultiplier = d.shopMultiplier; synergyCost = d.synergyCost; }
    if (d.frenzyGainBonus !== undefined){ frenzyGainBonus = d.frenzyGainBonus; rageCost = d.rageCost; }
    if (d.coinsPerClick !== undefined) { coinsPerClick = d.coinsPerClick; hustleCost = d.hustleCost; }
    if (myUser && !isOBS) document.getElementById('username-input').value = myUser;
    calculateLootBuff(); updateUI(); renderInventory();
    if (!isOBS) { startRichardLoop(); startAutoTimer(); scheduleMannyStressTest(); }
  }
}

function clockIn(u) { const r = employeesRef.push(); r.set({ name:u, e:'💼' }); r.onDisconnect().remove(); }

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

/* ══ BOSS FIREBASE LISTENER ════════════════════════════════════════════════ */
bossRef.on('value', snap => {
  let b = snap.val();
  if (!b) { b = { health:1000000000, level:1 }; bossRef.set(b); }

  if (lastLevel === 0) {
    lastLevel = b.level;
  } else if (b.level > lastLevel) {
    if (lastLevel > 0 && lastLevel % 10 === 0 && !isOBS) {
      myInventory['golden_paperclip'] = (myInventory['golden_paperclip'] || 0) + 1;
      calculateLootBuff(); save(); renderInventory();
      createDynamicPopup('PRESTIGE REWARD: Golden Paperclip!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    }
    triggerVictoryScreen(b.level);
    lastLevel = b.level;
  }

  lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
  const hpPercent = Math.max(0, curHP / maxHP);

  let newPhase = 1;
  let newTitle = 'VP Dave & District Manager Rich · Lv.' + b.level;

  if (hpPercent <= 0.25) {
    newPhase = 4;
    newTitle = '⚡ CORPORATE DEVIL DAVE · RICH GOES NUCLEAR (Lv.' + b.level + ')';
    defMulti = 0.2; baseDaveImg = davePhaseImgs[3];
  } else if (hpPercent <= 0.50) {
    newPhase = 3;
    newTitle = '🔥 VP Dave: FURIOUS · Rich: CRIMSON FURY (Lv.' + b.level + ')';
    defMulti = 0.5; baseDaveImg = davePhaseImgs[2];
  } else if (hpPercent <= 0.75) {
    newPhase = 2;
    newTitle = 'VP Dave: GETTING SERIOUS · Rich: BURSTING (Lv.' + b.level + ')';
    defMulti = 0.8; baseDaveImg = davePhaseImgs[1];
  } else {
    newPhase = 1;
    newTitle = 'VP Dave & District Manager Rich · Lv.' + b.level;
    defMulti = 1.0; baseDaveImg = davePhaseImgs[0];
  }

  if (currentPhase !== newPhase) {
    currentPhase = newPhase;
    if (bossImg && !isAnimatingHit) bossImg.src = baseDaveImg;
    if (richImg  && !isAnimatingHit) richImg.src = richPhaseImgs[newPhase - 1];
  }

  hpFill.style.width = (hpPercent * 100) + '%';
  hpText.innerText = curHP.toLocaleString() + ' / ' + maxHP.toLocaleString();
  document.getElementById('boss-name').innerText = newTitle;
});

/* ══ VICTORY SCREEN ═════════════════════════════════════════════════════════ */
function triggerVictoryScreen(newLevel) {
  let old = document.getElementById('victory-screen-overlay');
  if (old) old.remove();

  const v = document.createElement('div');
  v.id = 'victory-screen-overlay';
  Object.assign(v.style, {
    position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh',
    backgroundColor:'rgba(0,0,0,0.85)', display:'flex', flexDirection:'column',
    justifyContent:'center', alignItems:'center', zIndex:'9999',
    fontFamily:'monospace', textAlign:'center', textShadow:'3px 3px 0px #00ffff'
  });
  v.innerHTML = `<h1 style="font-size:5rem;color:#ff00ff;margin:0;text-transform:uppercase;">PROMOTED!</h1>
    <h2 style="font-size:2rem;color:#fff;text-shadow:none;">Dave & Rich retreated... for now.</h2>
    <p style="font-size:1.5rem;color:#00ffff;text-shadow:none;margin-top:20px;">PREPARE FOR LEVEL ${newLevel}</p>`;
  document.body.appendChild(v);
  if (bossImg) bossImg.style.opacity = '0';
  setTimeout(() => {
    v.style.transition = 'opacity 1s'; v.style.opacity = '0';
    if (bossImg) bossImg.style.opacity = '1';
    setTimeout(() => v.remove(), 1000);
  }, 4000);
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
  setTimeout(() => p.remove(), 1200);
}

/* ══ HIT ANIMATION (both bosses always react — dedicated hit or standing variation) ══ */
// Each character: use dedicated hit sprites when available, else standing/phase with hit effect
function getDaveHitOptions() {
  const fallback = baseDaveImg;
  return [...daveHitImages, fallback];
}
function getRichHitOptions() {
  const fallback = richPhaseImgs[Math.max(0, currentPhase - 1)];
  return [...richHitImgs, fallback];
}

function pickRandomHitOption(options, isFallbackIndex) {
  const idx = Math.floor(Math.random() * options.length);
  return { src: options[idx], useFallbackStyle: isFallbackIndex ? idx === options.length - 1 : idx >= 2 };
}

function playHitAnimation(x, y) {
  if (isAnimatingHit) return;
  isAnimatingHit = true;

  const daveOptions = getDaveHitOptions();
  const richOptions = getRichHitOptions();
  const davePick = daveOptions[Math.floor(Math.random() * daveOptions.length)];
  const richPick = richOptions[Math.floor(Math.random() * richOptions.length)];
  const daveUseFallback = davePick === baseDaveImg;
  const richUseFallback = richPick === richPhaseImgs[Math.max(0, currentPhase - 1)];

  let phaseFilter = 'none';
  if (currentPhase === 4) phaseFilter = 'hue-rotate(250deg) saturate(3) brightness(0.7)';
  else if (currentPhase === 3) phaseFilter = 'sepia(1) hue-rotate(-30deg) saturate(5) brightness(0.8)';
  else if (currentPhase === 2) phaseFilter = 'saturate(2) brightness(1.2)';

  // Dave — always show hit: dedicated face-punch or standing/phase with zoom+opacity hit effect
  if (bossImg && bossHitLayer) {
    bossImg.style.opacity = '0';
    bossHitLayer.style.filter = phaseFilter;
    bossHitLayer.src = davePick;
    bossHitLayer.classList.toggle('hit-active', !daveUseFallback);
    bossHitLayer.classList.toggle('hit-using-fallback', daveUseFallback);
    bossHitLayer.style.opacity = '1';
    if (!daveUseFallback) {
      setTimeout(() => { bossHitLayer.src = daveOptions[Math.floor(Math.random() * daveOptions.length)]; }, 800);
      setTimeout(() => { bossHitLayer.src = davePick; }, 1600);
    }
  }

  // Rich — always show hit: dedicated screaming/knocked or standing/phase with hit effect
  if (richImg && richHitLayer) {
    richImg.style.opacity = '0.15';
    richHitLayer.src = richPick;
    richHitLayer.classList.toggle('hit-using-fallback', richUseFallback);
    richHitLayer.style.opacity = '0.9';
    if (!richUseFallback && Math.random() < 0.40) {
      const other = richHitImgs[Math.floor(Math.random() * richHitImgs.length)];
      setTimeout(() => { richHitLayer.src = other; richHitLayer.style.opacity = '0.6'; }, 900);
      setTimeout(() => { richHitLayer.src = richPick; richHitLayer.style.opacity = '0.9'; }, 1700);
    }
  }

  // Random floating "character getting hit" pop-ups (zoom + lower opacity) — any variation
  if (Math.random() < 0.45) spawnFloatingHitPopup(x, y);
  if (Math.random() < 0.35) spawnFloatingHitPopup(x, y);

  setTimeout(() => {
    if (bossHitLayer) { bossHitLayer.style.transition = 'opacity 0.3s ease-out'; bossHitLayer.style.opacity = '0'; bossHitLayer.classList.remove('hit-using-fallback'); }
    if (richHitLayer) { richHitLayer.style.transition = 'opacity 0.3s ease-out'; richHitLayer.style.opacity = '0'; richHitLayer.classList.remove('hit-using-fallback'); }
    setTimeout(() => {
      if (bossImg) { bossImg.style.opacity = '1'; if (bossHitLayer) bossHitLayer.classList.remove('hit-active'); bossHitLayer.style.transition = ''; }
      if (richImg) { richImg.style.opacity = '1'; richHitLayer.style.transition = ''; }
      isAnimatingHit = false;
    }, 300);
  }, 2400);

  if (Math.random() < 0.15) spawnQuote(x, y);
}

// Zoomed, lower-opacity character pop-up — "getting hit" or "in combat" using any available sprite
function spawnFloatingHitPopup(clickX, clickY) {
  const useDave = Math.random() < 0.5;
  const options = useDave ? getDaveHitOptions() : getRichHitOptions();
  const src = options[Math.floor(Math.random() * options.length)];

  const wrap = document.createElement('div');
  wrap.className = 'hit-floating-popup';
  const offsetX = (Math.random() - 0.5) * 180;
  const offsetY = (Math.random() - 0.5) * 120 - 80;
  wrap.style.left = (clickX + offsetX) + 'px';
  wrap.style.top = (clickY + offsetY) + 'px';
  wrap.style.setProperty('--hit-rot', (Math.random() - 0.5) * 24 + 'deg');

  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.setAttribute('draggable', 'false');
  wrap.appendChild(img);
  document.body.appendChild(wrap);

  requestAnimationFrame(() => wrap.classList.add('hit-floating-visible'));
  setTimeout(() => {
    wrap.classList.remove('hit-floating-visible');
    setTimeout(() => wrap.remove(), 400);
  }, 650);
}

function spawnQuote(x, y) {
  if (!x || !y) {
    x = window.innerWidth / 2; y = window.innerHeight / 2;
  }
  createDynamicPopup(corpQuotes[Math.floor(Math.random() * corpQuotes.length)], 'quote-popup', x, y);
}

/* ══ LOOT ════════════════════════════════════════════════════════════════════ */
function calculateLootBuff() {
  let total = 0;
  for (let id in myInventory) {
    const item = lootTable.find(i => i.id === id);
    if (item) total += item.buff * myInventory[id];
  }
  itemBuffMultiplier = 1.0 + total;
  document.getElementById('loot-buff').innerText = Math.floor(total * 100);
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

  // Quick-zoom both characters
  [bossImg, richImg].forEach(el => {
    if (el) { el.classList.add('quick-zoom'); setTimeout(() => el.classList.remove('quick-zoom'), 120); }
  });

  const isCrit = (Math.random() * 100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * defMulti * itemBuffMultiplier * shopMultiplier * (isCrit ? 10 : 1));

  bossRef.transaction(b => {
    if (b) {
      b.health -= dmg;
      if (b.health <= 0) { b.level++; b.health = 1000000000 * b.level; }
    }
    return b;
  });

  myCoins += (coinsPerClick * multi);
  frenzy = Math.min(100, frenzy + 8 + frenzyGainBonus);
  updateUI(); save();

  if (isCrit) createDynamicPopup('💥 CRIT! +' + dmg.toLocaleString(), 'damage-popup crit-popup', x, y);
  else createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
  rollForLoot(x, y);
}

/* ══ UI UPDATE ═══════════════════════════════════════════════════════════════ */
function updateUI() {
  document.getElementById('coin-count').innerText   = myCoins.toLocaleString();
  document.getElementById('click-power').innerText  = myClickDmg.toLocaleString();
  document.getElementById('auto-power').innerText   = myAutoDmg.toLocaleString();
  document.getElementById('buy-click').innerHTML    = `⚔️ Sharpen Blade (+2.5k) <br><span>Cost: ${clickCost}</span>`;
  document.getElementById('buy-auto').innerHTML     = `Hire Merc (+1k/s) <br><span>Cost: ${autoCost}</span>`;
  document.getElementById('buy-crit').innerHTML     = `🎯 Lucky Shot (+5% crit) <br><span class="cost-tag">Cost: ${critCost}</span>`;
  document.getElementById('buy-overtime').innerHTML = `⏱️ Overtime (faster auto) <br><span class="cost-tag">Cost: ${overtimeCost}</span>`;
  document.getElementById('buy-synergy').innerHTML  = `⚡ Synergy Boost (+10% dmg) <br><span class="cost-tag">Cost: ${synergyCost}</span>`;
  document.getElementById('buy-rage').innerHTML     = `🔥 Rage Fuel (+frenzy/click) <br><span class="cost-tag">Cost: ${rageCost}</span>`;
  document.getElementById('buy-hustle').innerHTML   = `💰 Side Hustle (+2 coins) <br><span class="cost-tag">Cost: ${hustleCost}</span>`;
  document.getElementById('crit-chance-display').innerText = critChance;
  document.getElementById('shop-multi-display').innerText  = shopMultiplier.toFixed(2);
}

/* ══ SHOP ════════════════════════════════════════════════════════════════════ */
document.getElementById('buy-click').onclick = () => {
  if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); }
};
document.getElementById('buy-auto').onclick = () => {
  if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); updateUI(); save(); }
};
document.getElementById('buy-crit').onclick = () => {
  if (myCoins >= critCost) {
    myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8);
    updateUI(); save();
    createDynamicPopup('🎯 CRIT CHANCE UP!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
  }
};
document.getElementById('buy-overtime').onclick = () => {
  if (myCoins >= overtimeCost && autoInterval > 200) {
    myCoins -= overtimeCost; autoInterval = Math.max(200, autoInterval - 100); overtimeCost = Math.floor(overtimeCost * 2);
    startAutoTimer(); updateUI(); save();
    createDynamicPopup('⏱️ AUTO SPEED UP!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
  }
};
document.getElementById('buy-synergy').onclick = () => {
  if (myCoins >= synergyCost) {
    myCoins -= synergyCost; shopMultiplier = parseFloat((shopMultiplier + 0.10).toFixed(2)); synergyCost = Math.floor(synergyCost * 2);
    updateUI(); save();
    createDynamicPopup('⚡ SYNERGY!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
  }
};
document.getElementById('buy-rage').onclick = () => {
  if (myCoins >= rageCost) {
    myCoins -= rageCost; frenzyGainBonus += 4; rageCost = Math.floor(rageCost * 1.6);
    updateUI(); save();
    createDynamicPopup('🔥 RAGE FUEL!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
  }
};
document.getElementById('buy-hustle').onclick = () => {
  if (myCoins >= hustleCost) {
    myCoins -= hustleCost; coinsPerClick += 2; hustleCost = Math.floor(hustleCost * 1.5);
    updateUI(); save();
    createDynamicPopup('💰 COIN HUSTLE!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
  }
};

/* ══ AUTO DPS ════════════════════════════════════════════════════════════════ */
function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (myAutoDmg > 0) {
      const dmg = Math.floor(myAutoDmg * defMulti * itemBuffMultiplier * shopMultiplier);
      bossRef.transaction(b => { if (b) b.health -= dmg; return b; });
      if (bossImg && !isOBS) {
        const rect = bossImg.getBoundingClientRect();
        const slash = document.createElement('div');
        slash.className = 'merc-strike'; slash.innerText = '💥';
        slash.style.left = (rect.left + Math.random() * (rect.width - 50)) + 'px';
        slash.style.top  = (rect.top  + Math.random() * (rect.height - 50)) + 'px';
        document.body.appendChild(slash); setTimeout(() => slash.remove(), 500);
      }
    }
  }, autoInterval);
}

/* ══ FRENZY METER ════════════════════════════════════════════════════════════ */
setInterval(() => {
  frenzy = Math.max(0, frenzy - 2);
  multi = frenzy >= 100 ? 5 : frenzy >= 75 ? 3 : frenzy >= 50 ? 2 : 1;
  document.getElementById('frenzy-bar-fill').style.width = frenzy + '%';
  document.getElementById('frenzy-text').innerText = multi > 1 ? `COMBO ${multi}x` : 'CHARGE METER';
}, 100);

/* ══ ATTACK HANDLERS ═════════════════════════════════════════════════════════ */
document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;

/* ══ RICHARD SIDE EVENT ══════════════════════════════════════════════════════ */
const richardQuotes = [
  "Livin' the dream!", "Another day, another dollar.", "Working hard or hardly working?",
  "Can someone check the back room?", "Is it Friday yet?", "Did you try restarting it?",
  "We're basically a family here.", "If there's no barcode, it must be free!",
  "Who closed last night?", "Corporate is visiting, look busy."
];

function startRichardLoop() {
  setTimeout(() => { triggerRichardEvent(); startRichardLoop(); },
    Math.random() * (90000 - 45000) + 45000);
}

function triggerRichardEvent() {
  if (!richardContainer || !richardImage || !richardDialogue) return;
  richardImage.src = richardImages[Math.floor(Math.random() * richardImages.length)];
  richardDialogue.innerText = richardQuotes[Math.floor(Math.random() * richardQuotes.length)];
  const fromLeft = window.innerWidth < 950 ? Math.random() < 0.5 : true;
  richardImage.className = ''; richardDialogue.className = '';
  if (fromLeft) { richardImage.classList.add('richard-left'); richardDialogue.classList.add('richard-left-text'); }
  else           { richardImage.classList.add('richard-right'); richardDialogue.classList.add('richard-right-text'); }
  setTimeout(() => richardContainer.classList.add('active'), 100);
  setTimeout(() => richardContainer.classList.remove('active'), 8000);
}

/* ══════════════════════════════════════════════════════════════════════════
   SKILL PANEL — Supply-Chain Mgr Mikita (Phishing instructor)
═══════════════════════════════════════════════════════════════════════════ */
const mikitaOverlay    = document.getElementById('mikita-overlay');
const mikitaCloseBtn   = document.getElementById('mikita-close');
const mikitaCloseBtnOk = document.getElementById('mikita-close-btn');

function openMikitaPopup() {
  if (!mikitaOverlay) return;
  mikitaOverlay.style.display = 'flex';
  // Animate Mikita character — cycle through instructor frames
  const frames = ['assets/chars/mikita_instructor.png', 'assets/chars/mikita_terminal.png', 'assets/chars/mikita_idle.png'];
  let fi = 0;
  const img = document.getElementById('mikita-char-img');
  if (img) {
    img.src = frames[0];
    const cycleTimer = setInterval(() => {
      fi = (fi + 1) % frames.length;
      img.src = frames[fi];
    }, 1800);
    // Store timer on element to clear on close
    img._cycleTimer = cycleTimer;
  }
}

function closeMikitaPopup() {
  if (!mikitaOverlay) return;
  mikitaOverlay.style.display = 'none';
  const img = document.getElementById('mikita-char-img');
  if (img && img._cycleTimer) { clearInterval(img._cycleTimer); img._cycleTimer = null; }
}

if (document.getElementById('skill-phishing')) {
  document.getElementById('skill-phishing').onclick = openMikitaPopup;
}
if (mikitaCloseBtn)   mikitaCloseBtn.onclick   = closeMikitaPopup;
if (mikitaCloseBtnOk) mikitaCloseBtnOk.onclick = closeMikitaPopup;
// Close on overlay backdrop click
if (mikitaOverlay) {
  mikitaOverlay.onclick = (e) => { if (e.target === mikitaOverlay) closeMikitaPopup(); };
}

/* ══════════════════════════════════════════════════════════════════════════
   MANNY STRESS TEST — Click Quota Minigame (100% client-side)
═══════════════════════════════════════════════════════════════════════════ */
const stressOverlay   = document.getElementById('stress-test-overlay');
const stressClickBtn  = document.getElementById('stress-click-btn');
const stressHandImg   = document.getElementById('stress-hand-img');
const mannyCharImg    = document.getElementById('manny-char-img');
const stressResult    = document.getElementById('stress-result');
const stressCloseBtn  = document.getElementById('stress-close-btn');
const stressFill      = document.getElementById('stress-progress-fill');
const stressCount     = document.getElementById('stress-click-count');

// Manny animation frames during stress test
const mannyFrames = [
  'assets/chars/manny_frame1.png','assets/chars/manny_frame2.png','assets/chars/manny_frame3.png',
  'assets/chars/manny_frame4.png','assets/chars/manny_frame5.png','assets/chars/manny_frame6.png'
];
const handFrames = ['assets/minigame/click_frame1.png','assets/minigame/click_frame2.png','assets/minigame/click_frame3.png'];

let stressActive = false;
let stressClickCount = 0;
let stressTimeLeft = 15;
let stressQuota = 50;
let stressTimerInterval = null;
let stressMannyInterval = null;
let stressHandTimeout = null;

function getStressQuota() {
  // Quota scales slightly with player progress
  return Math.min(80, 40 + Math.floor(myClickDmg / 5000) * 5);
}

function openStressTest() {
  if (stressActive || isOBS) return;
  stressActive = true;
  stressClickCount = 0;
  stressTimeLeft = 15;
  stressQuota = getStressQuota();
  stressResult.style.display = 'none';
  stressCloseBtn.style.display = 'none';
  if (stressClickBtn) stressClickBtn.disabled = false;

  // Update quota display
  const qNum = document.getElementById('stress-quota-num');
  const qLbl = document.getElementById('stress-quota-label');
  const tDisp = document.getElementById('stress-time-display');
  if (qNum) qNum.innerText = stressQuota;
  if (qLbl) qLbl.innerText = stressQuota;
  if (tDisp) tDisp.innerText = stressTimeLeft;

  if (stressFill) stressFill.style.width = '0%';
  if (stressCount) stressCount.innerHTML = `0 / <span id="stress-quota-label">${stressQuota}</span>`;
  if (stressHandImg) stressHandImg.src = handFrames[0];

  stressOverlay.style.display = 'flex';

  // Animate Manny's excitement — cycle through his frames
  let mi = 0;
  stressMannyInterval = setInterval(() => {
    mi = (mi + 1) % mannyFrames.length;
    if (mannyCharImg) mannyCharImg.src = mannyFrames[mi];
  }, 300);

  // Countdown timer
  stressTimerInterval = setInterval(() => {
    stressTimeLeft--;
    if (tDisp) tDisp.innerText = stressTimeLeft;
    if (stressTimeLeft <= 0) endStressTest();
  }, 1000);
}

function handleStressClick() {
  if (!stressActive || stressTimeLeft <= 0) return;
  stressClickCount++;

  // Hand animation: briefly show frame 2 (clicking sparks), back to 1
  if (stressHandImg) {
    stressHandImg.src = handFrames[1];
    if (stressHandTimeout) clearTimeout(stressHandTimeout);
    stressHandTimeout = setTimeout(() => {
      if (stressHandImg) stressHandImg.src = handFrames[0];
    }, 80);
  }

  // Update progress bar
  const pct = Math.min(100, (stressClickCount / stressQuota) * 100);
  if (stressFill) stressFill.style.width = pct + '%';
  if (stressCount) stressCount.innerHTML = `${stressClickCount} / <span id="stress-quota-label">${stressQuota}</span>`;

  // Auto-end if quota hit early
  if (stressClickCount >= stressQuota) endStressTest();
}

function endStressTest() {
  if (!stressActive) return;
  stressActive = false;
  clearInterval(stressTimerInterval);
  clearInterval(stressMannyInterval);

  if (stressClickBtn) stressClickBtn.disabled = true;
  if (stressHandImg) {
    // Show destroyed mouse if quota was smashed, else normal
    stressHandImg.src = stressClickCount >= stressQuota ? handFrames[2] : handFrames[0];
  }
  if (mannyCharImg) {
    mannyCharImg.src = stressClickCount >= stressQuota ? mannyFrames[1] : mannyFrames[3];
  }

  const passed = stressClickCount >= stressQuota;
  const bonus = passed ? Math.floor(stressClickCount * 2 * multi) : 0;

  if (passed) {
    myCoins += bonus; save(); updateUI();
    stressResult.className = 'stress-result pass';
    stressResult.innerHTML = `✅ QUOTA MET! ${stressClickCount} clicks<br>+${bonus} VAPOR COINS BONUS!`;
  } else {
    stressResult.className = 'stress-result fail';
    stressResult.innerHTML = `❌ QUOTA MISSED! ${stressClickCount}/${stressQuota} clicks<br>No bonus this time...`;
  }

  stressResult.style.display = 'block';
  stressCloseBtn.style.display = 'inline-block';
}

function closeStressTest() {
  stressOverlay.style.display = 'none';
  stressActive = false;
  clearInterval(stressTimerInterval);
  clearInterval(stressMannyInterval);
  // Schedule the next one
  scheduleMannyStressTest();
}

function scheduleMannyStressTest() {
  if (isOBS) return;
  // Random interval: 3–8 minutes (180k–480k ms)
  const delay = Math.random() * (480000 - 180000) + 180000;
  setTimeout(() => { openStressTest(); }, delay);
}

if (stressClickBtn) stressClickBtn.onpointerdown = handleStressClick;
if (stressCloseBtn) stressCloseBtn.onclick = closeStressTest;
// Prevent clicks on the stress test area from triggering boss attack
if (stressOverlay) {
  stressOverlay.onpointerdown = e => e.stopPropagation();
}
if (mikitaOverlay) {
  mikitaOverlay.onpointerdown = e => e.stopPropagation();
}
