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

const clickSfxFiles = ['sfx pack/Boss hit 1.wav', 'sfx pack/Bubble 1.wav', 'sfx pack/Hit damage 1.wav', 'sfx pack/Select 1.wav'];
const attackSounds = clickSfxFiles.map(file => { const audio = new Audio(encodeURI(file)); audio.volume = 0.3; return audio; });

function playClickSound() {
  try { const randomIdx = Math.floor(Math.random() * attackSounds.length); const sound = attackSounds[randomIdx].cloneNode(); sound.volume = 0.3; sound.play().catch(e => {}); } catch(e) {}
}

/* ══ SPECTRAL BOSS & CHAT UI ENGINE ═════════════════════════════════════════ */
function injectBugFixStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    #game-container { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 10px; overflow: hidden; }
    #boss-area { flex: 1; display: flex; justify-content: center; align-items: flex-end; height: 550px; gap: 0px; position: relative; }
    .char-container { width: 450px; height: 500px; display: flex; justify-content: center; align-items: flex-end; }
    #boss-image, #companion-image { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; transition: transform 0.1s ease-out; }
    
    /* Spectral Richard Style */
    #richard-event-container { pointer-events: none; opacity: 0; transition: opacity 1s ease; position: fixed; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; display: flex; align-items: flex-end; }
    #richard-event-container.active { opacity: 1; }
    #richard-image { width: 800px; height: auto; transform: scale(2); opacity: 0.25; filter: grayscale(1) brightness(2); }
    #richard-dialogue { 
      background: white; border: 4px solid black; border-radius: 20px; padding: 20px; 
      color: black; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 1.5rem;
      position: absolute; bottom: 300px; left: 200px; max-width: 400px;
      box-shadow: 10px 10px 0px rgba(0,0,0,0.5);
    }
    #richard-dialogue::after { content: ''; position: absolute; bottom: -20px; left: 50px; width: 0; height: 0; border-left: 20px solid transparent; border-right: 20px solid transparent; border-top: 20px solid white; }
  `;
  document.head.appendChild(style);
}

function initSystem() {
  injectBugFixStyles();
  document.body.style.backgroundImage = "url('background.png')";
  const bImg = document.getElementById('boss-image');
  const cImg = document.getElementById('companion-image');
  if (bImg) bImg.src = 'phases/dave/dave_phase1.png';
  if (cImg) cImg.src = 'chars/larry_frame1.png';
}

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, multi = 1, frenzy = 0;
let clickCost = 10, autoCost = 50, critChance = 0, critCost = 100, autoInterval = 1000;
let shopMultiplier = 1.0, itemBuffMultiplier = 1.0, myUser = '', isAnimatingHit = false;
let lastManualClick = 0;

const companions = { larry: ['chars/larry_frame1.png', 'chars/larry_frame2.png', 'chars/larry_frame3.png'], manny: ['chars/manny_frame1.png', 'chars/manny_frame2.png', 'chars/manny_frame3.png'] };
let currentCompanion = companions.larry;
const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];

/* ══ FIREBASE SERVER-WIDE LOGIC (LEVELS & PRESTIGE) ═════════════════════════ */
if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val(); if (!b) return;
    const maxHP = 1000000000 * b.level;
    const hpPercent = Math.max(0, b.health / maxHP);
    const isDave = (b.level % 2 !== 0);

    document.getElementById('companion-name').innerText = isDave ? 'Security Larry' : 'Intern Manny';
    document.getElementById('main-boss-name').innerText = (isDave ? 'VP Dave' : 'DM Rich') + ' · Lv.' + b.level;
    
    // Auto-Leveling Logic
    if (b.health <= 0) {
      handleBossDefeat(b);
      return;
    }

    const bImg = document.getElementById('boss-image'); if (bImg && !isAnimatingHit) {
      if (hpPercent <= 0.25) bImg.src = isDave ? 'phases/dave/dave_phase4.png' : 'phases/rich/rich_phase4.png';
      else bImg.src = isDave ? 'phases/dave/dave_phase1.png' : 'phases/rich/rich_phase1.png';
    }
    document.getElementById('health-bar-fill').style.width = (hpPercent * 100) + '%';
    document.getElementById('health-text').innerText = b.health.toLocaleString() + ' / ' + maxHP.toLocaleString();
  });
}

function handleBossDefeat(data) {
  let nextLevel = data.level + 1;
  let nextHealth = 1000000000 * nextLevel;
  
  // Prestige Loop: After Level 10, back to 1
  if (nextLevel > 10) {
    nextLevel = 1;
    nextHealth = 1000000000;
    triggerPrestigeReward();
  }

  bossRef.set({ health: nextHealth, level: nextLevel });
}

function triggerPrestigeReward() {
  const isActive = (Date.now() - lastManualClick) < 10000;
  const reward = isActive ? 1000000 : 250000; // Active players get 4x
  myCoins += reward;
  updateUI();
  createDynamicPopup(isActive ? "ACTIVE PRESTIGE! +1M COINS" : "PRESTIGE! +250K COINS", 'loot-popup', window.innerWidth/2, window.innerHeight/2);
}

/* ══ ATTACK ENGINE (CRIT SYNCED TO SERVER) ══════════════════════════════════ */
function attack(e) {
  if (isOBS) return;
  lastManualClick = Date.now();
  playClickSound();

  // Dave Hit Sequence
  const bImg = document.getElementById('boss-image');
  if (bImg) {
    const old = bImg.src; 
    bImg.src = daveHitFrames[Math.floor(Math.random() * daveHitFrames.length)];
    setTimeout(() => { bImg.src = old; }, 200);
  }

  const isCrit = (Math.random() * 100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * itemBuffMultiplier * shopMultiplier * (isCrit ? 10 : 1));

  // Syncing Crit Dmg to Server
  if (bossRef) bossRef.transaction(b => { if (b) b.health -= dmg; return b; });

  myCoins += (1 * multi);
  frenzy = Math.min(100, frenzy + 8);
  updateUI(); save();
  createDynamicPopup('+' + dmg.toLocaleString(), isCrit ? 'damage-popup crit-popup' : 'damage-popup', e.clientX, e.clientY);
}

/* ══ MERCENARY SYSTEM (AUTO DAMAGE) ═════════════════════════════════════════ */
function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (myAutoDmg > 0 && bossRef) {
      const dmg = Math.floor(myAutoDmg * itemBuffMultiplier * shopMultiplier);
      bossRef.transaction(b => { if (b) b.health -= dmg; return b; }); // Fixed merc damage bug
    }
  }, autoInterval);
}

/* ══ UPGRADE SHOP ════════════════════════════════════════════════════════════ */
document.getElementById('buy-click').onclick = () => { if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); updateUI(); save(); startAutoTimer(); } };
document.getElementById('buy-crit').onclick = () => { if (myCoins >= critCost) { myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8); updateUI(); save(); } };

/* ══ INTRO & UTILS ═══════════════════════════════════════════════════════════ */
function updateUI() {
  document.getElementById('coin-count').innerText = myCoins.toLocaleString();
  document.getElementById('click-power').innerText = myClickDmg.toLocaleString();
  document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString();
  document.getElementById('buy-click').innerHTML = `⚔️ Upgrade Click <br><span>Cost: ${clickCost}</span>`;
  document.getElementById('buy-auto').innerHTML = `Hire Merc <br><span>Cost: ${autoCost}</span>`;
  document.getElementById('buy-crit').innerHTML = `🎯 Crit Chance <br><span>Cost: ${critCost}</span>`;
}

function startRichardLoop() { 
  setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, 45000); 
}
function triggerRichardEvent() {
  const container = document.getElementById('richard-event-container');
  const diag = document.getElementById('richard-dialogue');
  if (!container || !diag) return;
  diag.innerText = richardQuotes[Math.floor(Math.random() * richardQuotes.length)];
  container.classList.add('active'); 
  setTimeout(() => container.classList.remove('active'), 8000);
}

function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser, critChance, critCost })); }
function load() { const s = localStorage.getItem('gwm_v11'); if (s) { const d = JSON.parse(s); myCoins = d.c || 0; myClickDmg = d.cd || 2500; myAutoDmg = d.ad || 0; clickCost = d.cc || 10; autoCost = d.ac || 50; critChance = d.critChance || 0; critCost = d.critCost || 100; updateUI(); if (myAutoDmg > 0) startAutoTimer(); } }

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;
window.onload = () => { if(isOBS) { initSystem(); load(); } };
