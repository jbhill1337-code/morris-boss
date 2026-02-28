const firebaseConfig = {
  apiKey: "AIzaSyBvx5u1OGwS6YAvmVhBF9bstiUn-Vp6TVY",
  authDomain: "corporate-extraction.firebaseapp.com",
  databaseURL: "https://corporate-extraction-default-rtdb.firebaseio.com",
  projectId: "corporate-extraction",
  storageBucket: "corporate-extraction.firebasestorage.app",
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
const bossRef = db.ref('frank_corporate_data'); 
const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

// ASSETS FROM morris-boss-v3.rar
const davePhaseImgs = [
    'morris-boss-v3/phases/dave/dave_phase1.png',
    'morris-boss-v3/phases/dave/dave_phase2.png',
    'morris-boss-v3/phases/dave/dave_phase3.png',
    'morris-boss-v3/phases/dave/dave_phase3.png'
];
const hitImages = ['morris-boss-v3/dave-hit-2.png', 'morris-boss-v3/dave-hit-2.png'];

let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50;
let currentPhase = 0, lastLevel = 0, itemBuffMultiplier = 1.0, isAnimatingHit = false;

const bossImg = document.getElementById('boss-image');
const bossHitLayer = document.getElementById('boss-hit-layer');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');

// Failsafe for black screen - triggers load sequence even if video fails
const endIntro = () => {
    const intro = document.getElementById('intro-container');
    if (intro) { intro.style.opacity = '0'; setTimeout(() => { intro.remove(); load(); }, 1000); }
};

if (!isOBS) {
    document.getElementById('skip-intro-btn').onclick = endIntro;
    setTimeout(() => { if(document.getElementById('intro-container')) endIntro(); }, 6000);
} else {
    endIntro();
}

function load() {
    const s = localStorage.getItem('frank_v9');
    if(s) {
        const d = JSON.parse(s);
        myCoins=d.c; myClickDmg=d.cd; myAutoDmg=d.ad; clickCost=d.cc; autoCost=d.ac;
        updateUI();
    }
    document.getElementById('login-screen').style.display='flex';
}

document.getElementById('btn-clock-in').onclick = () => {
    document.getElementById('login-screen').style.display='none'; 
    document.getElementById('game-container').style.display='block'; 
    save();
};

bossRef.on('value', (snap) => {
    let b = snap.val();
    if(!b) return;
    
    let curHP = b.health; let maxHP = 1000000000 * b.level;
    const hpPercent = Math.max(0, curHP / maxHP);
    
    let newPhase = hpPercent <= 0.25 ? 4 : hpPercent <= 0.50 ? 3 : hpPercent <= 0.75 ? 2 : 1;

    if (currentPhase !== newPhase) { 
        currentPhase = newPhase; 
        if(bossImg) {
            if(!isAnimatingHit) bossImg.src = davePhaseImgs[newPhase-1];
            bossImg.className = `center-phase-${newPhase}`;
        }
    }
    
    hpFill.style.width = (hpPercent*100) + '%';
    hpText.innerText = curHP.toLocaleString() + " / " + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = "CORPORATE DAVE LV." + b.level;
});

function createDynamicPopup(text, className, x, y) {
    const p = document.createElement('div');
    p.className = className; p.innerText = text;
    p.style.setProperty('--tx', `${(Math.random() - 0.5) * 400}px`);
    p.style.setProperty('--ty', `${-Math.random() * 200 - 100}px`);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    document.body.appendChild(p); setTimeout(() => p.remove(), 1200); 
}

function attack(e) {
    if(isAnimatingHit) return;
    const x = e.clientX || window.innerWidth / 2;
    const y = e.clientY || window.innerHeight / 2;
    
    isAnimatingHit = true;
    bossImg.style.opacity = '0'; 
    bossHitLayer.src = hitImages[0]; bossHitLayer.style.opacity = '1';
    
    setTimeout(() => { 
        bossHitLayer.style.opacity = '0'; bossImg.style.opacity = '1'; isAnimatingHit = false; 
    }, 400);

    const dmg = Math.floor(myClickDmg * itemBuffMultiplier);
    bossRef.transaction(b => { if(b) { b.health -= dmg; if(b.health<=0){ b.level++; b.health=1000000000*b.level; } } return b; });
    myCoins += 1; updateUI(); save();
    createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
}

function updateUI() {
    document.getElementById('coin-count').innerText = myCoins.toLocaleString();
    document.getElementById('click-power').innerText = myClickDmg.toLocaleString();
    document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString();
    document.getElementById('cost-click').innerText = clickCost;
    document.getElementById('cost-auto').innerText = autoCost;
}

function save() { localStorage.setItem('frank_v9', JSON.stringify({c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost})); }

document.getElementById('btn-attack').onpointerdown = attack;
if(bossImg) bossImg.onpointerdown = attack;

// PHISHING LOGIC
const phishingMinigame = document.getElementById('phishing-minigame');
const phishingCursor = document.getElementById('phishing-cursor');
const minigameHand = document.getElementById('minigame-hand');
let isPhishing = false; let cursorPos = 0; let cursorDir = 1;

document.getElementById('btn-access-mainframe').onclick = () => {
    phishingMinigame.style.display = 'flex';
    isPhishing = true; animateCursor();
};

document.getElementById('btn-close-terminal').onclick = () => {
    phishingMinigame.style.display = 'none'; isPhishing = false;
};

function animateCursor() {
    if (!isPhishing) return;
    cursorPos += 2 * cursorDir;
    if (cursorPos >= 98 || cursorPos <= 0) cursorDir *= -1;
    phishingCursor.style.left = cursorPos + '%';
    requestAnimationFrame(animateCursor);
}

document.getElementById('btn-phish').onclick = () => {
    if (!isPhishing) return;
    minigameHand.src = 'morris-boss-v3/minigame/click_frame3.png';
    setTimeout(() => { minigameHand.src = 'morris-boss-v3/minigame/click_frame1.png'; }, 200);

    if (cursorPos >= 40 && cursorPos <= 60) {
        const payout = Math.floor(Math.random() * 20000) + 5000;
        myCoins += payout; updateUI(); save();
        document.getElementById('phishing-status').innerText = "SUCCESS! +" + payout;
    } else {
        document.getElementById('phishing-status').innerText = "HACK FAILED!";
    }
};
