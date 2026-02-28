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

const clickSfxFiles = ['sfx pack/Boss hit 1.wav', 'sfx pack/Bubble 1.wav', 'sfx pack/Hit damage 1.wav', 'sfx pack/Select 1.wav'];
const attackSounds = clickSfxFiles.map(file => { const audio = new Audio(encodeURI(file)); audio.volume = 0.3; return audio; });

function playClickSound() {
  try { const randomIdx = Math.floor(Math.random() * attackSounds.length); const sound = attackSounds[randomIdx].cloneNode(); sound.volume = 0.3; sound.play().catch(e => {}); } catch(e) {}
}

/* ══ COMPACT & MASSIVE LAYOUT ENGINE ════════════════════════════════════════ */
function injectCompactStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    #game-container { max-width: 1300px; margin: 0 auto; display: flex; gap: 10px; padding: 5px; align-items: flex-start; }
    #boss-area { display: flex; justify-content: center; align-items: flex-end; min-height: 500px; gap: 0px; margin-top: 20px; flex: 1; }
    #boss-image, #companion-image { height: auto; image-rendering: pixelated; transition: transform 0.1s ease-out; }
    #left-col, #right-col { width: 260px; flex-shrink: 0; z-index: 10; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; }
    @media (min-width: 769px) { 
        #boss-image, #companion-image { width: 500px; } /* Dave is now massive like Larry */
        #boss-area { margin-left: -50px; margin-right: -50px; } /* Squeezing UI tighter */
    }
    @media (max-width: 768px) { 
        #game-container { flex-direction: column; align-items: center; } 
        #boss-image, #companion-image { width: 180px; } 
        #boss-area { min-height: 300px; width: 100%; }
    }
  `;
  document.head.appendChild(style);
}

function initSystem() {
  injectCompactStyles();
  document.body.style.backgroundImage = "url('background.png')";
  document.body.style.backgroundColor = "#050510"; 
  const bImg = document.getElementById('boss-image');
  const cImg = document.getElementById('companion-image');
  if (bImg) bImg.src = 'phases/dave/dave_phase1.png';
  if (cImg) cImg.src = 'chars/larry_frame1.png';
}

/* ══ INTRO CONTROLLER ══════════════════════════════════════════════════════ */
const introContainer = document.getElementById('intro-container');
const endIntro = () => { if (introContainer) { introContainer.style.opacity = '0'; setTimeout(() => { introContainer.remove(); initSystem(); load(); }, 1000); } };
window.onPlayerReady = function(event) { const btn = document.getElementById('start-intro-btn'); if (btn) { btn.style.display = 'block'; btn.onclick = () => { btn.style.display = 'none'; document.getElementById('yt-player').style.display = 'block'; document.getElementById('skip-intro-btn').style.display = 'block'; event.target.playVideo(); }; } };
window.onPlayerStateChange = function(event) { if (event.data === 0) endIntro(); };
window.onYouTubeIframeAPIReady = function () { if (!introContainer || isOBS) return; new YT.Player('yt-player', { videoId: 'HeKNgnDyD7I', playerVars: { playsinline:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0 }, events: { onReady: window.onPlayerReady, onStateChange: window.onPlayerStateChange } }); };
if (document.getElementById('skip-intro-btn')) document.getElementById('skip-intro-btn').onclick = endIntro;
if (introContainer && !isOBS) setTimeout(() => { if(document.body.contains(introContainer)) endIntro(); }, 12000);

/* ══ GAME STATE & SHOP ═════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, multi = 1, frenzy = 0;
let clickCost = 10, autoCost = 50, critChance = 0, critCost = 100, autoInterval = 1000, overtimeCost = 200, shopMultiplier = 1.0, synergyCost = 150, frenzyGainBonus = 0, rageCost = 75, coinsPerClick = 1, hustleCost = 30;
let myInventory = {}, itemBuffMultiplier = 1.0, baseDaveImg = 'phases/dave/dave_phase1.png', lastLevel = 0, isAnimatingHit = false;

const companions = { larry: ['chars/larry_frame1.png', 'chars/larry_frame2.png', 'chars/larry_frame3.png', 'chars/larry_frame4.png', 'chars/larry_frame5.png', 'chars/larry_frame6.png'], manny: ['chars/manny_frame1.png', 'chars/manny_frame2.png', 'chars/manny_frame3.png', 'chars/manny_frame4.png', 'chars/manny_frame5.png', 'chars/manny_frame6.png'] };
let currentCompanion = companions.larry; let frameIndex = 0;
const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];

/* ══ LOOPS ══════════════════════════════════════════════════════════════════ */
setInterval(() => { frenzy = Math.max(0, frenzy - 2); multi = frenzy >= 100 ? 5 : frenzy >= 75 ? 3 : frenzy >= 50 ? 2 : 1; const fill = document.getElementById('frenzy-bar-fill'); const txt = document.getElementById('frenzy-text'); if (fill) fill.style.width = frenzy + '%'; if (txt) txt.innerText = multi > 1 ? `COMBO ${multi}x` : 'CHARGE METER'; }, 100);
setInterval(() => { const cImg = document.getElementById('companion-image'); if (cImg && !isAnimatingHit) { frameIndex = (frameIndex + 1) % currentCompanion.length; cImg.src = currentCompanion[frameIndex]; } }, 2500);

/* ══ BOSS SYNC ══════════════════════════════════════════════════════════════ */
if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val(); if (!b) return; if (lastLevel === 0) lastLevel = b.level;
    const hpPercent = Math.max(0, b.health / (1000000000 * b.level));
    const isDave = (b.level % 2 !== 0);
    currentCompanion = isDave ? companions.larry : companions.manny;
    document.getElementById('companion-name').innerText = isDave ? 'Security Larry' : 'Intern Manny';
    document.getElementById('main-boss-name').innerText = (isDave ? 'VP Dave' : 'DM Rich') + ' · Lv.' + b.level;
    if (hpPercent <= 0.25) baseDaveImg = isDave ? 'phases/dave/dave_phase4.png' : 'phases/rich/rich_phase4.png';
    else if (hpPercent <= 0.50) baseDaveImg = isDave ? 'phases/dave/dave_phase3.png' : 'phases/rich/rich_phase3.png';
    else if (hpPercent <= 0.75) baseDaveImg = isDave ? 'phases/dave/dave_phase2.png' : 'phases/rich/rich_phase2.png';
    else baseDaveImg = isDave ? 'phases/dave/dave_phase1.png' : 'phases/rich/rich_phase1.png';
    const bImg = document.getElementById('boss-image'); if (bImg && !isAnimatingHit) bImg.src = baseDaveImg;
    document.getElementById('health-bar-fill').style.width = (hpPercent * 100) + '%';
    document.getElementById('health-text').innerText = b.health.toLocaleString() + ' / ' + (1000000000 * b.level).toLocaleString();
  });
}

/* ══ ATTACK LOGIC ═══════════════════════════════════════════════════════════ */
function playHitAnimation() {
  if (isAnimatingHit) return; isAnimatingHit = true;
  const bArea = document.getElementById('boss-area'); if (bArea) { bArea.style.filter = 'drop-shadow(0 0 40px rgba(255, 0, 0, 0.4))'; setTimeout(() => bArea.style.filter = 'none', 300); }
  const bImg = document.getElementById('boss-image'); if (bImg) { const old = bImg.src; bImg.src = daveHitFrames[Math.floor(Math.random() * daveHitFrames.length)]; bImg.style.transform = 'scale(1.1)'; setTimeout(() => { bImg.src = old; bImg.style.transform = 'scale(1)'; }, 200); }
  setTimeout(() => { const cImg = document.getElementById('companion-image'); if (cImg) { cImg.style.transform = 'scale(1.1)'; setTimeout(() => { cImg.style.transform = 'scale(1)'; isAnimatingHit = false; }, 200); } }, 100);
}

function attack(e) {
  if (isOBS) return; playClickSound(); playHitAnimation();
  const dmg = Math.floor(myClickDmg * multi * itemBuffMultiplier * shopMultiplier);
  const isCrit = (Math.random() * 100) < critChance; const finalDmg = isCrit ? dmg * 5 : dmg;
  if (bossRef) bossRef.transaction(b => { if (b) b.health -= finalDmg; return b; });
  myCoins += (coinsPerClick * multi); frenzy = Math.min(100, frenzy + 8 + frenzyGainBonus);
  updateUI(); save(); createDynamicPopup('+' + finalDmg.toLocaleString(), isCrit ? 'damage-popup crit-popup' : 'damage-popup', e.clientX, e.clientY); rollForLoot(e.clientX, e.clientY);
}

/* ══ PHISHING MINIGAME (FIXED "STUCK" BUG) ══════════════════════════════════ */
const emailDatabase = [
  { sender: "IT-Support@corp-extraction.com", body: "Reset password required.", isPhish: true },
  { sender: "HR@corporate-extraction.com", body: "New PTO policy attached.", isPhish: false },
  { sender: "rich.dm@gmail.com", body: "Buy 5 Apple Gift Cards now.", isPhish: true },
  { sender: "Mikita.Supply@corporate-extraction.com", body: "Shipment arrived.", isPhish: false }
];
let phishActive = false, phishScore = 0, phishEmailsPlayed = 0, phishTimerInt = null;

function closeMikitaPopup() { document.getElementById('mikita-overlay').style.display = 'none'; }
function startPhishingGame() { closeMikitaPopup(); if (phishActive) return; phishActive = true; phishScore = 0; phishEmailsPlayed = 0; document.getElementById('phishing-game-overlay').style.display = 'flex'; loadNextEmail(); }

function loadNextEmail() {
  if (phishEmailsPlayed >= 5) return endPhishingGame(true);
  const email = emailDatabase[Math.floor(Math.random() * emailDatabase.length)];
  document.getElementById('phish-sender').innerText = email.sender;
  document.getElementById('phish-body').innerText = email.body;
  document.getElementById('phish-score').innerText = phishScore;
  let t = 80; clearInterval(phishTimerInt);
  phishTimerInt = setInterval(() => { t--; document.getElementById('phish-timer-fill').style.width = (t/80*100)+'%'; if(t<=0) handleChoice(null, email.isPhish); }, 100);
}

function handleChoice(chosePhish, isActuallyPhish) { clearInterval(phishTimerInt); if (chosePhish === isActuallyPhish) { phishScore++; phishEmailsPlayed++; loadNextEmail(); } else { endPhishingGame(false); } }
function endPhishingGame(won) { phishActive = false; clearInterval(phishTimerInt); if (won) { myCoins += 25000 * multi; createDynamicPopup("CLEANUP BONUS!", 'loot-popup', window.innerWidth/2, window.innerHeight/2); } document.getElementById('phishing-game-overlay').style.display = 'none'; updateUI(); save(); }

/* ══ UPGRADE SHOP LISTENERS ═════════════════════════════════════════════════ */
document.getElementById('buy-click').onclick = () => { if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); updateUI(); save(); } };
document.getElementById('buy-crit').onclick = () => { if (myCoins >= critCost) { myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8); updateUI(); save(); } };
document.getElementById('buy-overtime').onclick = () => { if (myCoins >= overtimeCost && autoInterval > 200) { myCoins -= overtimeCost; autoInterval = Math.max(200, autoInterval - 100); overtimeCost = Math.floor(overtimeCost * 2); startAutoTimer(); updateUI(); save(); } };
document.getElementById('buy-synergy').onclick = () => { if (myCoins >= synergyCost) { myCoins -= synergyCost; shopMultiplier = parseFloat((shopMultiplier + 0.10).toFixed(2)); synergyCost = Math.floor(synergyCost * 2); updateUI(); save(); } };
document.getElementById('buy-rage').onclick = () => { if (myCoins >= rageCost) { myCoins -= rageCost; frenzyGainBonus += 4; rageCost = Math.floor(rageCost * 1.6); updateUI(); save(); } };
document.getElementById('buy-hustle').onclick = () => { if (myCoins >= hustleCost) { myCoins -= hustleCost; coinsPerClick += 2; hustleCost = Math.floor(hustleCost * 1.5); updateUI(); save(); } };

/* ══ UTILS & SAVE/LOAD ══════════════════════════════════════════════════════ */
const lootTable = [{ id:'paperclip', name:'Bent Paperclip', icon:'📎', buff:0.005, rarity:'common' }, { id:'mug', name:"World's Okayest Boss Mug", icon:'☕', buff:0.01, rarity:'uncommon' }, { id:'stapler', name:'Red Stapler', icon:'🖍️', buff:0.025, rarity:'rare' }, { id:'gold_blade', name:'The Gold Blade', icon:'🗡️', buff:0.08, rarity:'legendary' }];
function createDynamicPopup(t, c, x, y) { const p = document.createElement('div'); p.className = c; p.innerText = t; p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1200); }
function rollForLoot(x, y) { if (Math.random() > 0.15) return; const i = lootTable[Math.floor(Math.random() * lootTable.length)]; myInventory[i.id] = (myInventory[i.id] || 0) + 1; calculateLootBuff(); renderInventory(); save(); createDynamicPopup(`Loot: ${i.name}!`, 'loot-popup', x, y); }
function renderInventory() { const g = document.getElementById('inventory-grid'); if (!g) return; g.innerHTML = ''; for (let id in myInventory) { const i = lootTable.find(x => x.id === id); if (i && myInventory[id] > 0) { const s = document.createElement('div'); s.className = `inv-item rarity-${i.rarity}`; s.innerHTML = `${item.icon}<span class="inv-count">${myInventory[id]}</span>`; g.appendChild(s); } } }
function calculateLootBuff() { let t = 0; for (let id in myInventory) { const i = lootTable.find(x => x.id === id); if (i) t += i.buff * myInventory[id]; } itemBuffMultiplier = 1.0 + t; }
function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser, inv:myInventory, critChance, critCost, autoInterval, overtimeCost, shopMultiplier, synergyCost, frenzyGainBonus, rageCost, coinsPerClick, hustleCost })); }
function load() { const s = localStorage.getItem('gwm_v11'); if (s) { const d = JSON.parse(s); myCoins = d.c || 0; myClickDmg = d.cd || 2500; myAutoDmg = d.ad || 0; clickCost = d.cc || 10; autoCost = d.ac || 50; myUser = d.u || ''; myInventory = d.inv || {}; critChance = d.critChance || 0; critCost = d.critCost || 100; autoInterval = d.autoInterval || 1000; overtimeCost = d.overtimeCost || 200; shopMultiplier = d.shopMultiplier || 1.0; synergyCost = d.synergyCost || 150; frenzyGainBonus = d.frenzyGainBonus || 0; rageCost = d.rageCost || 75; coinsPerClick = d.coinsPerClick || 1; hustleCost = d.hustleCost || 30; if (myUser && !isOBS) document.getElementById('username-input').value = myUser; updateUI(); renderInventory(); calculateLootBuff(); if (!isOBS) { startRichardLoop(); startAutoTimer(); } } }
function clockIn(u) { if (employeesRef) { const r = employeesRef.push(); r.set({ name:u, e:'💼' }); r.onDisconnect().remove(); } bgm.play().catch(e => {}); startRichardLoop(); startAutoTimer(); }
document.getElementById('btn-clock-in').onclick = () => { const v = document.getElementById('username-input').value.trim().toUpperCase(); if (v) { myUser = v; document.getElementById('login-screen').style.display = 'none'; document.getElementById('game-container').style.display = 'block'; clockIn(myUser); save(); } };
function updateUI() { document.getElementById('coin-count').innerText = myCoins.toLocaleString(); document.getElementById('click-power').innerText = myClickDmg.toLocaleString(); document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString(); document.getElementById('buy-click').innerHTML = `⚔️ Sharpen (+2.5k) <br><span>Cost: ${clickCost}</span>`; document.getElementById('buy-auto').innerHTML = `Hire Merc (+1k/s) <br><span>Cost: ${autoCost}</span>`; document.getElementById('buy-crit').innerHTML = `🎯 Lucky Shot (+5%) <br><span>Cost: ${critCost}</span>`; document.getElementById('buy-overtime').innerHTML = `⏱️ Overtime <br><span>Cost: ${overtimeCost}</span>`; document.getElementById('buy-synergy').innerHTML = `⚡ Synergy (+10%) <br><span>Cost: ${synergyCost}</span>`; document.getElementById('buy-rage').innerHTML = `🔥 Rage Fuel <br><span>Cost: ${rageCost}</span>`; document.getElementById('buy-hustle').innerHTML = `💰 Side Hustle <br><span>Cost: ${hustleCost}</span>`; }
function startRichardLoop() { setTimeout(() => { const c = document.getElementById('richard-event-container'); if(c){ c.classList.add('active'); setTimeout(() => c.classList.remove('active'), 8000); } startRichardLoop(); }, 45000); }
function startAutoTimer() { if (autoTimer) clearInterval(autoTimer); autoTimer = setInterval(() => { if (myAutoDmg > 0 && bossRef) bossRef.transaction(b => { if (b) b.health -= Math.floor(myAutoDmg * itemBuffMultiplier * shopMultiplier); return b; }); }, autoInterval); }

document.getElementById('btn-attack').onpointerdown = attack;
document.getElementById('boss-area').onpointerdown = attack;
document.getElementById('skill-phishing').onclick = () => document.getElementById('mikita-overlay').style.display = 'flex';
document.getElementById('mikita-close').onclick = closeMikitaPopup;
document.getElementById('phish-close-btn').onclick = () => document.getElementById('phishing-game-overlay').style.display = 'none';
document.getElementById('mikita-start-game-btn').onclick = startPhishingGame;
document.getElementById('btn-legit').onclick = () => handleChoice(false, false);
document.getElementById('btn-phish').onclick = () => handleChoice(true, true);
