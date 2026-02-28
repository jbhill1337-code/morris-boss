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

/* ══ BULLETPROOF LAYOUT ENGINE (OVERRIDES ALL CSS CONFLICTS) ═══════════════ */
function injectStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    #game-container { 
      max-width: 1400px !important; margin: 0 auto !important; 
      display: flex !important; flex-direction: row !important; 
      justify-content: center !important; gap: 20px !important; 
      padding: 10px !important; align-items: flex-start !important; 
    }
    #boss-area { 
      flex: 1 !important; display: flex !important; justify-content: center !important; 
      align-items: flex-end !important; min-height: 500px !important; gap: 20px !important; 
      position: relative !important;
    }
    .char-wrapper {
      width: 350px !important; height: 450px !important; 
      display: flex !important; justify-content: center !important; align-items: flex-end !important;
    }
    #boss-image, #companion-image { 
      width: 100% !important; height: 100% !important; 
      object-fit: contain !important; object-position: bottom center !important; 
      image-rendering: pixelated !important; transition: transform 0.1s ease-out !important; 
    }
    /* Spectral Richard */
    #richard-event-container { pointer-events: none; opacity: 0; transition: opacity 1s; position: fixed; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; display: flex; align-items: flex-end; }
    #richard-event-container.active { opacity: 1; }
    #richard-image { width: 600px !important; height: auto !important; opacity: 0.4; filter: grayscale(1) brightness(1.5); }
    #richard-dialogue { background: white; border: 4px solid black; border-radius: 15px; padding: 15px; color: black; font-family: monospace; font-weight: bold; font-size: 1.4rem; position: absolute; bottom: 350px; left: 150px; max-width: 350px; box-shadow: 8px 8px 0px rgba(0,0,0,0.5); }
    #richard-dialogue::after { content: ''; position: absolute; bottom: -20px; left: 40px; border-left: 20px solid transparent; border-right: 20px solid transparent; border-top: 20px solid white; }
    
    @media (max-width: 900px) {
      #game-container { flex-direction: column !important; align-items: center !important; }
      #boss-area { min-height: 350px !important; width: 100% !important; }
      .char-wrapper { width: 180px !important; height: 250px !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ══ SYSTEM INIT & YOUTUBE API FIX ═════════════════════════════════════════ */
const introContainer = document.getElementById('intro-container');

function initSystem() {
  injectStyles();
  document.body.style.backgroundImage = "url('background.png')";
  
  const bImg = document.getElementById('boss-image');
  const cImg = document.getElementById('companion-image');
  if (bImg && !bImg.parentElement.classList.contains('char-wrapper')) {
    const wrap = document.createElement('div'); wrap.className = 'char-wrapper';
    bImg.parentNode.insertBefore(wrap, bImg); wrap.appendChild(bImg);
  }
  if (cImg && !cImg.parentElement.classList.contains('char-wrapper')) {
    const wrap = document.createElement('div'); wrap.className = 'char-wrapper';
    cImg.parentNode.insertBefore(wrap, cImg); wrap.appendChild(cImg);
  }

  if (bImg) bImg.src = 'assets/phases/dave/dave_phase1.png';
  if (cImg) cImg.src = 'assets/chars/larry_frame1.png';
  
  startRichardLoop();
  if (myAutoDmg > 0) startAutoTimer();
}

const endIntro = () => { 
  if (introContainer) { introContainer.style.opacity = '0'; setTimeout(() => { introContainer.style.display = 'none'; initSystem(); load(); }, 1000); } 
  else { initSystem(); load(); }
};

window.onYouTubeIframeAPIReady = function() {
  if (isOBS || !introContainer) return;
  const skipBtn = document.getElementById('skip-intro-btn');
  if (skipBtn) skipBtn.style.display = 'block'; 
  
  new YT.Player('yt-player', {
    videoId: 'HeKNgnDyD7I',
    playerVars: { 
      playsinline: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, 
      origin: window.location.origin, 
      host: 'https://www.youtube.com' // Fixes postMessage target origin error
    },
    events: { 
      onReady: (e) => { 
        const btn = document.getElementById('start-intro-btn');
        if (btn) { btn.style.display = 'block'; btn.onclick = () => { btn.style.display = 'none'; document.getElementById('yt-player').style.display = 'block'; e.target.playVideo(); }; }
      },
      onStateChange: (e) => { if(e.data === 0) endIntro(); } 
    }
  });
};

if (introContainer && !isOBS) setTimeout(endIntro, 10000);

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, multi = 1, frenzy = 0, lastLevel = 0;
let clickCost = 10, autoCost = 50, critChance = 0, critCost = 100, myUser = '', lastManualClick = 0;
let myInventory = {}, itemBuffMultiplier = 1.0, isAnimatingHit = false;

const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];
const richardImages = ['assets/yourbossvar/boss-pointing.png', 'assets/yourbossvar/boss-crossing.png'];
const richardQuotes = ["SYNERGY IS KEY.", "LET'S CIRCLE BACK.", "LIVIN' THE DREAM.", "CHECK THE BACK ROOM.", "CORPORATE IS VISITING."];
const companions = { 
  larry: ['assets/chars/larry_frame1.png', 'assets/chars/larry_frame2.png', 'assets/chars/larry_frame3.png', 'assets/chars/larry_frame4.png', 'assets/chars/larry_frame5.png', 'assets/chars/larry_frame6.png'], 
  manny: ['assets/chars/manny_frame1.png', 'assets/chars/manny_frame2.png', 'assets/chars/manny_frame3.png', 'assets/chars/manny_frame4.png', 'assets/chars/manny_frame5.png', 'assets/chars/manny_frame6.png'] 
};
let currentCompanion = companions.larry; let frameIndex = 0;

/* ══ BOSS SYNC & PRESTIGE ══════════════════════════════════════════════════ */
if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val(); if (!b) return;
    if (b.health <= 0) return handleDefeat(b);
    
    const maxHP = 1000000000 * b.level;
    const isDave = (b.level % 2 !== 0);
    
    const cName = document.getElementById('companion-name');
    const bName = document.getElementById('main-boss-name');
    if(cName) cName.innerText = isDave ? 'Security Larry' : 'Intern Manny';
    if(bName) bName.innerText = (isDave ? 'VP Dave' : 'DM Rich') + ' · Lv.' + b.level;
    
    currentCompanion = isDave ? companions.larry : companions.manny;

    const bImg = document.getElementById('boss-image');
    if (bImg && !isAnimatingHit) {
      if (b.health / maxHP <= 0.25) bImg.src = isDave ? 'assets/phases/dave/dave_phase4.png' : 'assets/phases/rich/rich_phase4.png';
      else if (b.health / maxHP <= 0.50) bImg.src = isDave ? 'assets/phases/dave/dave_phase3.png' : 'assets/phases/rich/rich_phase3.png';
      else if (b.health / maxHP <= 0.75) bImg.src = isDave ? 'assets/phases/dave/dave_phase2.png' : 'assets/phases/rich/rich_phase2.png';
      else bImg.src = isDave ? 'assets/phases/dave/dave_phase1.png' : 'assets/phases/rich/rich_phase1.png';
    }
    
    const fill = document.getElementById('health-bar-fill');
    const txt = document.getElementById('health-text');
    if (fill) fill.style.width = (Math.max(0, b.health/maxHP)*100) + '%';
    if (txt) txt.innerText = Math.max(0, b.health).toLocaleString() + ' / ' + maxHP.toLocaleString();
  });
}

function handleDefeat(b) {
  let nextLvl = b.level + 1;
  if (nextLvl > 10) {
    nextLvl = 1;
    const active = (Date.now() - lastManualClick) < 10000;
    myCoins += active ? 1000000 : 250000;
    createDynamicPopup(active ? "ACTIVE PRESTIGE! +1M COINS" : "PRESTIGE! +250K COINS", 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    updateUI();
  }
  bossRef.set({ level: nextLvl, health: 1000000000 * nextLvl });
}

/* ══ LOOPS (CHARGE & IDLE) ═════════════════════════════════════════════════ */
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
}, 300); 

/* ══ COMBAT & ANIMATIONS ═══════════════════════════════════════════════════ */
function attack(e) {
  if (isOBS) return;
  lastManualClick = Date.now();
  playClickSound();
  
  if(!isAnimatingHit) {
    isAnimatingHit = true;
    const bArea = document.getElementById('boss-area');
    if (bArea) { bArea.style.filter = 'drop-shadow(0 0 30px rgba(255, 0, 0, 0.4))'; setTimeout(() => bArea.style.filter = 'none', 300); }

    const bImg = document.getElementById('boss-image');
    if (bImg) {
      const originalSrc = bImg.src;
      bImg.src = daveHitFrames[0]; 
      bImg.style.transform = 'scale(1.05) rotate(-2deg)';
      setTimeout(() => { 
        bImg.src = daveHitFrames[1] || originalSrc; 
        bImg.style.transform = 'scale(0.95) rotate(2deg)';
        setTimeout(() => { bImg.src = originalSrc; bImg.style.transform = 'scale(1) rotate(0deg)'; }, 150); 
      }, 100);
    }
    
    setTimeout(() => {
      const cImg = document.getElementById('companion-image');
      if (cImg) { cImg.style.transform = 'scale(1.05)'; setTimeout(() => { cImg.style.transform = 'scale(1)'; isAnimatingHit = false; }, 200); }
    }, 100);
  }

  const isCrit = (Math.random()*100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * itemBuffMultiplier * (isCrit ? 5 : 1)); 
  if(bossRef) bossRef.transaction(b => { if(b) b.health -= dmg; return b; });
  
  myCoins += (1 * multi); frenzy = Math.min(100, frenzy + 8);
  updateUI(); save();
  
  const clickX = e.clientX || window.innerWidth / 2;
  const clickY = e.clientY || window.innerHeight / 2;
  createDynamicPopup('+' + dmg.toLocaleString(), isCrit ? 'damage-popup crit-popup' : 'damage-popup', clickX, clickY);
  rollForLoot(clickX, clickY);
}

let autoTimer;
function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => { if (myAutoDmg > 0 && bossRef) bossRef.transaction(b => { if(b) b.health -= myAutoDmg; return b; }); }, 1000);
}

/* ══ PHISHING MINIGAME ═════════════════════════════════════════════════════ */
const emailDatabase = [
  { sender: "IT-Helpdesk@corp-extraction.com", body: "Action Required: Update Microsoft 365 to avoid lockout. Click here.", isPhish: true },
  { sender: "payroll@corporate-extraction.com", body: "Your recent direct deposit failed. Verify bank details.", isPhish: true },
  { sender: "dave.vp@corporate-extraction.com", body: "Need those Q3 synergy reports by EOD. Don't be late.", isPhish: false },
  { sender: "HR-Updates@corporate-extraction-benefits.com", body: "Open Enrollment Deadline! Submit your forms today.", isPhish: true },
  { sender: "Mikita.Supply@corporate-extraction.com", body: "Manifest for Friday's hardware delivery is attached. Verify counts.", isPhish: false },
  { sender: "security-alert@google-mail.com", body: "Unusual sign-in activity detected in Russia. Secure account.", isPhish: true },
  { sender: "rich.dm@corporate-extraction.com", body: "Who is closing the store tonight? The alarm was left off.", isPhish: false }
];
let phishActive = false, phishScore = 0, phishEmailsPlayed = 0, phishTimerInt = null, currentPhishState = false;

function startPhishingGame() {
  const o = document.getElementById('mikita-overlay'); if(o) o.style.display = 'none';
  if (phishActive) return; phishActive = true; phishScore = 0; phishEmailsPlayed = 0;
  const p = document.getElementById('phishing-game-overlay'); if(p) p.style.display = 'flex';
  loadNextEmail();
}

function loadNextEmail() {
  if (phishEmailsPlayed >= 5) return endPhishingGame(true);
  const email = emailDatabase[Math.floor(Math.random() * emailDatabase.length)];
  currentPhishState = email.isPhish;
  
  const s = document.getElementById('phish-sender'); if(s) s.innerText = email.sender;
  const b = document.getElementById('phish-body'); if(b) b.innerText = email.body;
  const sc = document.getElementById('phish-score'); if(sc) sc.innerText = phishScore;
  
  let t = 80; clearInterval(phishTimerInt);
  phishTimerInt = setInterval(() => { 
    t--; 
    const fill = document.getElementById('phish-timer-fill'); if(fill) fill.style.width = (t/80*100)+'%'; 
    if(t<=0) handleChoice(null, currentPhishState); 
  }, 100);
}

function handleChoice(chosePhish, isActuallyPhish) { clearInterval(phishTimerInt); if (chosePhish === isActuallyPhish) { phishScore++; phishEmailsPlayed++; loadNextEmail(); } else { endPhishingGame(false); } }
function endPhishingGame(won) { phishActive = false; clearInterval(phishTimerInt); if (won) { myCoins += 25000 * multi; } const p = document.getElementById('phishing-game-overlay'); if(p) p.style.display = 'none'; updateUI(); save(); }

/* ══ UTILS, UI, & SAVE/LOAD ════════════════════════════════════════════════ */
const lootTable = [{ id:'paperclip', name:'Bent Paperclip', icon:'📎', buff:0.005, rarity:'common' }, { id:'mug', name:"World's Okayest Boss Mug", icon:'☕', buff:0.01, rarity:'uncommon' }, { id:'stapler', name:'Red Stapler', icon:'🖍️', buff:0.025, rarity:'rare' }, { id:'gold_blade', name:'The Gold Blade', icon:'🗡️', buff:0.08, rarity:'legendary' }];
function createDynamicPopup(t, c, x, y) { const p = document.createElement('div'); p.className = c; p.innerText = t; p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1200); }

function rollForLoot(x, y) { 
  if (Math.random() > 0.35) return; 
  const i = lootTable[Math.floor(Math.random() * lootTable.length)]; 
  myInventory[i.id] = (myInventory[i.id] || 0) + 1; 
  calculateLootBuff(); renderInventory(); save(); 
  createDynamicPopup(`Loot: ${i.name}!`, 'loot-popup', x, y); 
}

function renderInventory() { const g = document.getElementById('inventory-grid'); if (!g) return; g.innerHTML = ''; for (let id in myInventory) { const i = lootTable.find(x => x.id === id); if (i && myInventory[id] > 0) { const s = document.createElement('div'); s.className = `inv-item rarity-${i.rarity}`; s.innerHTML = `${i.icon}<span class="inv-count">${myInventory[id]}</span>`; g.appendChild(s); } } }
function calculateLootBuff() { let t = 0; for (let id in myInventory) { const i = lootTable.find(x => x.id === id); if (i) t += i.buff * myInventory[id]; } itemBuffMultiplier = 1.0 + t; }

function updateUI() {
  const c = document.getElementById('coin-count'); if(c) c.innerText = myCoins.toLocaleString();
  const cp = document.getElementById('click-power'); if(cp) cp.innerText = myClickDmg.toLocaleString();
  const ap = document.getElementById('auto-power'); if(ap) ap.innerText = myAutoDmg.toLocaleString();
  const bc = document.getElementById('buy-click'); if(bc) bc.innerHTML = `⚔️ Upgrade Click <br><span>Cost: ${clickCost}</span>`;
  const ba = document.getElementById('buy-auto'); if(ba) ba.innerHTML = `Hire Merc <br><span>Cost: ${autoCost}</span>`;
  const cr = document.getElementById('buy-crit'); if(cr) cr.innerHTML = `🎯 Crit Chance <br><span>Cost: ${critCost}</span>`;
}

function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, ad:myAutoDmg, ac:autoCost, cc:clickCost, critC:critChance, critCost:critCost, u:myUser, inv:myInventory })); }
function load() { 
  const s = localStorage.getItem('gwm_v11'); 
  if(s) { 
    const d = JSON.parse(s); myCoins = d.c || 0; myClickDmg = d.cd || 2500; myAutoDmg = d.ad || 0; autoCost = d.ac || 50; clickCost = d.cc || 10; critChance = d.critC || 0; critCost = d.critCost || 100; myUser = d.u || ''; myInventory = d.inv || {};
    const u = document.getElementById('username-input'); if(u && myUser) u.value = myUser;
    updateUI(); renderInventory(); calculateLootBuff();
  } 
}

function startRichardLoop() {
  setTimeout(() => {
    const c = document.getElementById('richard-event-container');
    const d = document.getElementById('richard-dialogue');
    const img = document.getElementById('richard-image');
    if(c && d && img) { 
        img.src = richardImages[Math.floor(Math.random()*richardImages.length)];
        d.innerText = richardQuotes[Math.floor(Math.random()*richardQuotes.length)]; 
        c.classList.add('active'); 
        setTimeout(() => { c.classList.remove('active'); startRichardLoop(); }, 8000); 
    } else {
        startRichardLoop(); 
    }
  }, 35000);
}

/* ══ EVENT DELEGATION (GUARANTEED BUTTON BINDING) ══════════════════════════ */
// Define function globally so it never gets lost
function bindInteractions() {
  document.addEventListener('click', (e) => {
    // Intro
    if (e.target.id === 'skip-intro-btn') endIntro();

    // Clock In
    const clockBtn = e.target.closest('#btn-clock-in');
    if (clockBtn) {
      const v = document.getElementById('username-input');
      if (v && v.value.trim()) {
        myUser = v.value.trim().toUpperCase();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex'; 
        if (employeesRef) employeesRef.push({ name: myUser, status: '💼' }).onDisconnect().remove();
        bgm.play().catch(() => {});
        if (myAutoDmg > 0) startAutoTimer();
        save();
      }
    }

    // Upgrades
    if (e.target.closest('#buy-click')) { if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); } }
    if (e.target.closest('#buy-auto')) { if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); if (myAutoDmg === 1000) startAutoTimer(); updateUI(); save(); } }
    if (e.target.closest('#buy-crit')) { if (myCoins >= critCost) { myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8); updateUI(); save(); } }

    // Minigame
    if (e.target.closest('#skill-phishing') || e.target.id === 'skill-phishing') { const o = document.getElementById('mikita-overlay'); if(o) o.style.display = 'flex'; }
    if (e.target.id === 'mikita-close') { const o = document.getElementById('mikita-overlay'); if(o) o.style.display = 'none'; }
    if (e.target.id === 'phish-close-btn') { const o = document.getElementById('phishing-game-overlay'); if(o) o.style.display = 'none'; phishActive = false; clearInterval(phishTimerInt); }
    if (e.target.id === 'mikita-start-game-btn') startPhishingGame();
    if (e.target.id === 'btn-legit') handleChoice(false, currentPhishState);
    if (e.target.id === 'btn-phish') handleChoice(true, currentPhishState);
  });

  // Pointerdown for faster attack response
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#btn-attack') || e.target.closest('#boss-area')) {
      attack(e);
    }
  });

  if (isOBS) { initSystem(); load(); }
}

// Execute safely regardless of load state
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bindInteractions); } 
else { bindInteractions(); }
