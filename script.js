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
} catch(e) { console.warn('Firebase failed to load:', e); }

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

/* ══ AUDIO SYSTEM ══ */
const bgm = new Audio('nocturnal-window-lights.mp3');
bgm.loop = true;
bgm.volume = 0.15;

const clickSfxFiles = ['sfx pack/Boss hit 1.wav', 'sfx pack/Bubble 1.wav', 'sfx pack/Hit damage 1.wav', 'sfx pack/Select 1.wav'];
const attackSounds = clickSfxFiles.map(file => { const audio = new Audio(encodeURI(file)); audio.volume = 0.3; return audio; });

function playClickSound() {
  try { const randomIdx = Math.floor(Math.random() * attackSounds.length); const sound = attackSounds[randomIdx].cloneNode(); sound.volume = 0.3; sound.play().catch(e => {}); } catch(e) {}
}

/* ══ UI STYLES & SPECTRAL BOSS ══ */
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

/* ══ INTRO & VIDEO FIX ══ */
const introContainer = document.getElementById('intro-container');
const startIntroBtn  = document.getElementById('start-intro-btn');
const endIntro = () => { 
  if (introContainer) { 
    introContainer.style.opacity = '0'; 
    setTimeout(() => { introContainer.remove(); initSystem(); load(); }, 1000); 
  } 
};

window.onYouTubeIframeAPIReady = function() {
  if (isOBS || !introContainer) return;
  new YT.Player('yt-player', {
    videoId: 'HeKNgnDyD7I',
    playerVars: { playsinline:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0 },
    events: { 
      onReady: (e) => { 
        if (startIntroBtn) {
          startIntroBtn.style.display = 'block'; 
          startIntroBtn.onclick = () => { 
            startIntroBtn.style.display = 'none'; 
            document.getElementById('yt-player').style.display = 'block'; 
            e.target.playVideo(); 
          };
        }
      },
      onStateChange: (e) => { if(e.data === 0) endIntro(); } 
    }
  });
};

// Emergency Bypass for "Black Screen"
if (introContainer && !isOBS) setTimeout(endIntro, 12000);

/* ══ GAME STATE ══ */
let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, multi = 1, frenzy = 0;
let clickCost = 10, autoCost = 50, critChance = 0, myUser = '', lastManualClick = 0;
const daveHitFrames = ['assets/hit/dave-hit-1.png', 'assets/hit/dave-hit-2.png'];
const richardQuotes = ["SYNERGY IS KEY.", "LET'S CIRCLE BACK.", "LIVIN' THE DREAM.", "CHECK THE BACK ROOM."];

/* ══ SYSTEM INIT ══ */
function initSystem() {
  injectStyles();
  document.body.style.backgroundImage = "url('background.png')";
  startRichardLoop();
}

/* ══ BOSS & PRESTIGE LOGIC ══ */
if (bossRef) {
  bossRef.on('value', snap => {
    let b = snap.val(); if (!b) return;
    if (b.health <= 0) return handleDefeat(b);
    
    const maxHP = 1000000000 * b.level;
    const isDave = (b.level % 2 !== 0);
    document.getElementById('main-boss-name').innerText = (isDave ? 'VP Dave' : 'DM Rich') + ' · Lv.' + b.level;
    document.getElementById('boss-image').src = isDave ? 'phases/dave/dave_phase1.png' : 'phases/rich/rich_phase1.png';
    document.getElementById('companion-image').src = isDave ? 'chars/larry_frame1.png' : 'chars/manny_frame1.png';
    document.getElementById('health-bar-fill').style.width = (Math.max(0, b.health/maxHP)*100) + '%';
    document.getElementById('health-text').innerText = b.health.toLocaleString() + ' / ' + maxHP.toLocaleString();
  });
}

function handleDefeat(b) {
  let nextLvl = b.level + 1;
  if (nextLvl > 10) {
    nextLvl = 1;
    const active = (Date.now() - lastManualClick) < 10000;
    myCoins += active ? 1000000 : 250000; // Prestige Reward
  }
  bossRef.set({ level: nextLvl, health: 1000000000 * nextLvl });
}

/* ══ ACTIONS ══ */
function attack(e) {
  lastManualClick = Date.now();
  playClickSound();
  const bImg = document.getElementById('boss-image');
  const old = bImg.src;
  bImg.src = daveHitFrames[Math.floor(Math.random()*daveHitFrames.length)];
  setTimeout(() => bImg.src = old, 150);

  const isCrit = (Math.random()*100) < critChance;
  const dmg = Math.floor(myClickDmg * multi * (isCrit ? 10 : 1));
  bossRef.transaction(b => { if(b) b.health -= dmg; return b; });
  
  myCoins += (1 * multi); frenzy = Math.min(100, frenzy + 8);
  updateUI(); save();
}

/* ══ UPGRADES ══ */
document.getElementById('buy-click').onclick = () => { if (myCoins >= clickCost) { myCoins -= clickCost; myClickDmg += 2500; clickCost = Math.floor(clickCost * 1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if (myCoins >= autoCost) { myCoins -= autoCost; myAutoDmg += 1000; autoCost = Math.floor(autoCost * 1.5); startAutoTimer(); updateUI(); save(); } };

let autoTimer;
function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (myAutoDmg > 0 && bossRef) bossRef.transaction(b => { if(b) b.health -= myAutoDmg; return b; });
  }, 1000);
}

/* ══ CLOCK IN FIX ══ */
document.getElementById('btn-clock-in').onclick = () => {
  const val = document.getElementById('username-input').value.trim().toUpperCase();
  if (val) {
    myUser = val;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    if (employeesRef) employeesRef.push({ name: myUser, status: '💼' }).onDisconnect().remove();
    bgm.play().catch(() => {});
    startAutoTimer();
    save();
  }
};

/* ══ UTILS ══ */
function updateUI() {
  document.getElementById('coin-count').innerText = myCoins.toLocaleString();
  document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString();
}
function save() { localStorage.setItem('gwm_v11', JSON.stringify({ c:myCoins, cd:myClickDmg, ad:myAutoDmg, ac:autoCost, u:myUser })); }
function load() { 
  const s = localStorage.getItem('gwm_v11'); 
  if(s) { 
    const d = JSON.parse(s); 
    myCoins = d.c || 0; myClickDmg = d.cd || 2500; myAutoDmg = d.ad || 0; autoCost = d.ac || 50; myUser = d.u || '';
    if (myUser) document.getElementById('username-input').value = myUser;
    updateUI(); 
  } 
}

function startRichardLoop() {
  setTimeout(() => {
    const c = document.getElementById('richard-event-container');
    document.getElementById('richard-dialogue').innerText = richardQuotes[Math.floor(Math.random()*richardQuotes.length)];
    c.classList.add('active');
    setTimeout(() => { c.classList.remove('active'); startRichardLoop(); }, 8000);
  }, 45000);
}

document.getElementById('btn-attack').onpointerdown = attack;
