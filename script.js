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

/* ══ UI STYLES & LOCKED LAYOUT ═════════════════════════════════════════════ */
function injectStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    #game-container { max-width: 1400px; margin: 0 auto; display: flex; gap: 10px; padding: 10px; overflow: hidden; }
    #boss-area { flex: 1; display: flex; justify-content: center; align-items: flex-end; height: 550px; position: relative; }
    .char-container { width: 500px; height: 500px; display: flex; justify-content: center; align-items: flex-end; }
    #boss-image, #companion-image { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; transition: transform 0.1s; }
    
    /* Spectral Richard */
    #richard-event-container { pointer-events: none; opacity: 0; transition: opacity 1s; position: fixed; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; display: flex; align-items: flex-end; }
    #richard-event-container.active { opacity: 1; }
    #richard-image { width: 900px; transform: scale(2); opacity: 0.25; filter: grayscale(1) brightness(1.5); }
    #richard-dialogue { 
      background: white; border: 4px solid black; border-radius: 15px; padding: 15px; color: black; font-family: monospace; font-weight: bold; font-size: 1.4rem;
      position: absolute; bottom: 350px; left: 250px; max-width: 350px; box-shadow: 8px 8px 0px rgba(0,0,0,0.5);
    }
    #richard-dialogue::after { content: ''; position: absolute; bottom: -20px; left: 40px; border-left: 20px solid transparent; border-right: 20px solid transparent; border-top: 20px solid white; }
  `;
  document.head.appendChild(style);
}

/* ══ GAME STATE ═════════════════════════════════════════════════════════════ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, multi = 1, frenzy = 0;
let clickCost = 10, autoCost = 50, critChance = 0, critCost = 100, myUser = '', lastManualClick = 0;
let myInventory = {}, itemBuffMultiplier = 1.0, isAnimatingHit = false;

const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];
const richardQuotes = ["SYNERGY IS KEY.", "LET'S CIRCLE BACK.", "LIVIN' THE DREAM.", "CHECK THE BACK ROOM."];
const companions = { larry: ['chars/larry_frame1.png', 'chars/larry_frame2.png', 'chars/larry_frame3.png'], manny: ['chars/manny_frame1.png', 'chars/manny_frame2.png', 'chars/manny_frame3.png'] };
let currentCompanion = companions.larry; let frameIndex = 0;

/* ══ SYSTEM INIT & INTRO ═══════════════════════════════════════════════════ */
const introContainer = document.getElementById('intro-container');

function initSystem() {
  injectStyles();
  document.body.style.backgroundImage = "url('background.png')";
  
  // Wrap characters in containers for size locking if not already done
  const bImg = document.getElementById('boss-image');
  const cImg = document.getElementById('companion-image');
  if (bImg && !bImg.parentNode.classList.contains('char-container')) {
    const wrap = document.createElement('div'); wrap.className = 'char-container';
    bImg.parentNode.insertBefore(wrap, bImg); wrap.appendChild(bImg);
  }
  if (cImg && !cImg.parentNode.classList.contains('char-container')) {
    const wrap = document.createElement('div'); wrap.className = 'char-container';
    cImg.parentNode.insertBefore(wrap, cImg); wrap.appendChild(cImg);
  }
  
  if (bImg) bImg.src = 'phases/dave/dave_phase1.png';
  if (cImg) cImg.src = 'chars/larry_frame1.png';
  
  startRichardLoop();
  if (myAutoDmg > 0) startAutoTimer();
}

const endIntro = () => { 
  if (introContainer) { 
    introContainer.style.opacity = '0'; 
    setTimeout(() => { introContainer.style.display = 'none'; initSystem(); load(); }, 1000); 
  } else {
    initSystem(); load();
  }
};

window.onYouTubeIframeAPIReady = function() {
  if (isOBS || !introContainer) return;
  new YT.Player('yt-player', {
    videoId: 'HeKNgnDyD7I',
    playerVars: { playsinline:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0 },
    events: { 
      onReady: (e) => { 
        const btn = document.getElementById('start-intro-btn');
        if (btn) {
          btn.style.display = 'block'; 
          btn.onclick = () => { 
            btn.style.display = 'none'; 
            if(document.getElementById('yt-player')) document.getElementById('yt-player').style.display = 'block'; 
            e.target.playVideo(); 
          };
        }
      },
      onStateChange: (e) => { if(e.data === 0) endIntro(); } 
    }
  });
};

if (introContainer && !isOBS) setTimeout(endIntro, 12000); // Failsafe

/* ══ BOSS & PRESTIGE LOGIC ═════════════════════════════════════════════════ */
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
      if (b.health / maxHP <= 0.25) bImg.src = isDave ? 'phases/dave/dave_phase4.png' : 'phases/rich/rich_phase4.png';
      else if (b.health / maxHP <= 0.50) bImg.src = isDave ? 'phases/dave/dave_phase3.png' : 'phases/rich/rich_phase3.png';
      else if (b.health / maxHP <= 0.75) bImg.src = isDave ? 'phases/dave/dave_phase2.png' : 'phases/rich/rich_phase2.png';
      else bImg.src = isDave ? 'phases/dave/dave_phase1.png' : 'phases/rich/rich_phase1.png';
    }
    
    const fill = document.getElementById('health-bar-fill');
    const txt = document.getElementById('health-text');
    if (fill) fill.style.width = (Math.max(0, b.health/maxHP)*100) + '%';
    if (txt) txt.innerText = b.health.toLocaleString() + ' / ' + maxHP.toLocaleString();
  });
}

function handleDefeat(b) {
  let nextLvl = b.level + 1;
  if (nextLvl > 10) {
    nextLvl = 1;
    const active = (Date.now() - lastManualClick) < 10000;
    myCoins += active ? 1000000 : 250000;
    updateUI();
  }
  bossRef.set({ level: nextLvl, health: 1000000000 * nextLvl });
}

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
  const compImg = document.getElementById('companion-image');
  if (compImg && !isAnimatingHit) {
    frameIndex = (frameIndex + 1) % currentCompanion.length;
    compImg.src = currentCompanion[frameIndex];
  }
}, 150); // Faster idle rumble

/* ══ ACTIONS & COMBAT ══════════════════════════════════════════════════════ */
function attack(e) {
  if (isOBS) return;
  lastManualClick = Date.now();
  playClickSound();
  
  if(isAnimatingHit) return;
  isAnimatingHit = true;

  const bArea = document.getElementById('boss-area');
  if (bArea) { bArea.style.filter = 'drop-shadow(0 0 30px rgba(255, 0, 0, 0.4))'; setTimeout(() => bArea.style.filter = 'none', 300); }

  const bImg = document.getElementById('boss-image');
  const cImg = document.getElementById('companion-image');
  
  if (bImg) {
    const old = bImg.src;
    bImg.src = daveHitFrames[Math.floor(Math.random()*daveHitFrames.length)];
    bImg.style.transform = 'scale(1.05)';
    setTimeout(() => { bImg.src = old; bImg.style.transform = 'scale(1)'; }, 200);
  }
  
  setTimeout(() => {
    if (cImg) {
      cImg.style.transform = 'scale(1.05)';
      setTimeout(() => { cImg.style.transform = 'scale(1)'; isAnimatingHit = false; }, 200);
    }
  }, 100);

  const isCrit = (Math.random()*100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * itemBuffMultiplier * (isCrit ? 10 : 1));
  if(bossRef) bossRef.transaction(b => { if(b) b.health -= dmg; return b; });
  
  myCoins += (1 * multi); frenzy = Math.min(100, frenzy + 8);
  updateUI(); save();
  
  const clickX = e.clientX || window.innerWidth / 2;
  const clickY = e.clientY || window.innerHeight / 2;
  createDynamicPopup('+' + dmg.toLocaleString(), isCrit ? 'damage-popup crit-popup' : 'damage-popup', clickX, clickY);
}

let autoTimer;
function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (myAutoDmg > 0 && bossRef) bossRef.transaction(b => { if(b) b.health -= myAutoDmg; return b; });
  }, 1000);
}

/* ══ PHISHING MINIGAME ═════════════════════════════════════════════════════ */
const emailDatabase = [
  { sender: "IT-Support@corp-extraction.com", body: "Password reset required immediately.", isPhish: true },
  { sender: "HR@corporate-extraction.com", body: "Updated PTO forms attached.", isPhish: false },
  { sender: "boss@gmail.com", body: "Buy 5 gift cards right now.", isPhish: true },
  { sender: "dave.vp@corporate-extraction.com", body: "Meeting moved to 2PM.", isPhish: false }
];
let phishActive = false, phishScore = 0, phishEmailsPlayed = 0, phishTimerInt = null;

function startPhishingGame() {
  const o = document.getElementById('mikita-overlay'); if(o) o.style.display = 'none';
  if (phishActive) return; phishActive = true; phishScore = 0; phishEmailsPlayed = 0;
  const p = document.getElementById('phishing-game-overlay'); if(p) p.style.display = 'flex';
  loadNextEmail();
}

function loadNextEmail() {
  if (phishEmailsPlayed >= 5) return endPhishingGame(true);
  const email = emailDatabase[Math.floor(Math.random() * emailDatabase.length)];
  const s = document.getElementById('phish-sender'); if(s) s.innerText = email.sender;
  const b = document.getElementById('phish-body'); if(b) b.innerText = email.body;
  const sc = document.getElementById('phish-score'); if(sc) sc.innerText = phishScore;
  
  let t = 80; clearInterval(phishTimerInt);
  phishTimerInt = setInterval(() => { 
    t--; 
    const fill = document.getElementById('phish-timer-fill'); if(fill) fill.style.width = (t/80*100)+'%'; 
    if(t<=0) handleChoice(null, email.isPhish); 
  }, 100);
}

function handleChoice(chosePhish, isActuallyPhish) { clearInterval(phishTimerInt); if (chosePhish === isActuallyPhish) { phishScore++; phishEmailsPlayed++; loadNextEmail(); } else { endPhishingGame(false); } }
function endPhishingGame(won) { phishActive = false; clearInterval(phishTimerInt); if (won) { myCoins += 25000 * multi; } const p = document.getElementById('phishing-game-overlay'); if(p) p.style.display = 'none'; updateUI(); save(); }

/* ══ UTILS, UI, & SAVE/LOAD ════════════════════════════════════════════════ */
function createDynamicPopup(t, c, x, y) { const p = document.createElement('div'); p.className = c; p.innerText = t; p.style.left = x + 'px'; p.style.top = y + 'px'; document.body.appendChild(p); setTimeout(() => p.remove(), 1200); }
function updateUI() {
  const c = document.getElementById('coin-count'); if(c) c.innerText = myCoins.toLocaleString();
  const cp = document.getElementById('click-power'); if(cp) cp.innerText = myClickDmg.toLocaleString();
  const ap = document.getElementById('auto-power'); if(ap) ap.innerText = myAutoDmg.toLocaleString();
  const bc = document.getElementById('buy-click'); if(bc) bc.innerHTML = `⚔️ Upgrade Click <br><span>Cost: ${clickCost}</span>`;
  const ba = document.getElementById('buy-auto'); if(ba) ba.innerHTML = `Hire Merc <br><span>Cost: ${autoCost}</span>`;
  const cr = document.getElementById('buy-crit'); if(cr) cr.innerHTML = `🎯 Crit Chance <br><span>Cost: ${critCost}</span>`;
}
function save() { if (!isOBS) localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, ad:myAutoDmg, ac:autoCost, cc:clickCost, critC:critChance, critCost:critCost, u:myUser })); }
function load() { 
  const s = localStorage.getItem('gwm_v11'); 
  if(s) { 
    const d = JSON.parse(s); myCoins = d.c || 0; myClickDmg = d.cd || 2500; myAutoDmg = d.ad || 0; autoCost = d.ac || 50; clickCost = d.cc || 10; critChance = d.critC || 0; critCost = d.critCost || 100; myUser = d.u || '';
    const u = document.getElementById('username-input'); if(u && myUser) u.value = myUser;
    updateUI(); 
  } 
}
function startRichardLoop() {
  setTimeout(() => {
    const c = document.getElementById('richard-event-container');
    const d = document.getElementById('richard-dialogue');
    if(c && d) { d.innerText = richardQuotes[Math.floor(Math.random()*richardQuotes.length)]; c.classList.add('active'); setTimeout(() => { c.classList.remove('active'); startRichardLoop(); }, 8000); }
  }, 45000);
}

/* ══ EVENT BINDING (SAFE ZONE) ═════════════════════════════════════════════ */
// This ensures no events are attached until the HTML actually exists on the page.
window.addEventListener('DOMContentLoaded', () => {
  const safeBind = (id, event, func) => { const el = document.getElementById(id); if (el) el[event] = func; };

  // Clock In
  safeBind('btn-clock-in', 'onclick', () => {
    const v = document.getElementById('username-input').value.trim().toUpperCase();
    if (v) {
      myUser = v;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('game-container').style.display = 'flex'; // Use flex for layout
      if (employeesRef) employeesRef.push({ name: myUser, status: '💼' }).onDisconnect().remove();
      bgm.play().catch(() => {});
      if (myAutoDmg > 0) startAutoTimer();
      save();
    }
  });

  // Combat
  safeBind('btn-attack', 'onpointerdown', attack);
  safeBind('boss-area', 'onpointerdown', attack);

  // Upgrades
  safeBind('buy-click', 'onclick', () => { if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); } });
  safeBind('buy-auto', 'onclick', () => { if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); if (myAutoDmg === 1000) startAutoTimer(); updateUI(); save(); } });
  safeBind('buy-crit', 'onclick', () => { if (myCoins >= critCost) { myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8); updateUI(); save(); } });

  // Minigame
  safeBind('skill-phishing', 'onclick', () => { const o = document.getElementById('mikita-overlay'); if(o) o.style.display = 'flex'; });
  safeBind('mikita-close', 'onclick', () => { const o = document.getElementById('mikita-overlay'); if(o) o.style.display = 'none'; });
  safeBind('phish-close-btn', 'onclick', () => { const o = document.getElementById('phishing-game-overlay'); if(o) o.style.display = 'none'; phishActive = false; clearInterval(phishTimerInt); });
  safeBind('mikita-start-game-btn', 'onclick', startPhishingGame);
  safeBind('btn-legit', 'onclick', () => handleChoice(false, false));
  safeBind('btn-phish', 'onclick', () => handleChoice(true, true));
  
  // OBS Bypass Initialization
  if (isOBS) { initSystem(); load(); }
});
