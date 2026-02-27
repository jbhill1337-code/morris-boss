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

const preloadHit1 = new Image(); preloadHit1.src = 'boss-hit-var-2.png';
const preloadHit2 = new Image(); preloadHit2.src = 'boss-hit-variation-3.png';
const hitImages = ['boss-hit-var-2.png', 'boss-hit-variation-3.png'];
const preloadRichard = new Image(); preloadRichard.src = 'yourbossvar/boss-pointing.png';

const introContainer = document.getElementById('intro-container');
const startIntroBtn = document.getElementById('start-intro-btn');
const skipIntroBtn = document.getElementById('skip-intro-btn');
let ytPlayer;

const endIntro = () => { if (introContainer) { introContainer.style.opacity = '0'; setTimeout(() => { introContainer.remove(); load(); }, 1000); } };

if (isOBS) {
    if (introContainer) introContainer.style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('left-col').style.display = 'none';
    document.getElementById('right-col').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
    document.getElementById('richard-event-container').style.display = 'none'; 
} else {
    window.onYouTubeIframeAPIReady = function() {
        if (!introContainer) return;
        ytPlayer = new YT.Player('yt-player', { videoId: 'HeKNgnDyD7I', playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'modestbranding': 1, 'rel': 0 }, events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange } });
    };
    function onPlayerReady(event) { startIntroBtn.style.display = 'block'; startIntroBtn.onclick = () => { startIntroBtn.style.display = 'none'; document.getElementById('yt-player').style.display = 'block'; skipIntroBtn.style.display = 'block'; event.target.playVideo(); }; }
    function onPlayerStateChange(event) { if (event.data === 0) endIntro(); }
    if (skipIntroBtn) skipIntroBtn.onclick = endIntro;
}

let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = "";
let myInventory = {}; 
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;
let currentPhase = 1;
let baseFrankImg = "phases/phase1frank.png";
let defMulti = 1.0; 
let lastLevel = 0; 
let itemBuffMultiplier = 1.0; 
let isAnimatingHit = false; 

const bossImg = document.getElementById('boss-image');
const bossHitLayer = document.getElementById('boss-hit-layer');
const richardContainer = document.getElementById('richard-event-container');
const richardImage = document.getElementById('richard-image');
const richardDialogue = document.getElementById('richard-dialogue');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');
const corpQuotes = [ "SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!" ];

const lootTable = [
    { id: 'paperclip', name: 'Bent Paperclip', rarity: 'common', icon: '📎', buff: 0.005 },
    { id: 'sticky', name: 'Neon Sticky', rarity: 'common', icon: '📝', buff: 0.005 },
    { id: 'mug', name: 'World\'s Okayest Boss Mug', rarity: 'uncommon', icon: '☕', buff: 0.01 },
    { id: 'stapler', name: 'Red Stapler', rarity: 'rare', icon: '🖍️', buff: 0.025 },
    { id: 'keyboard', name: 'Clacky Keyboard', rarity: 'rare', icon: '⌨️', buff: 0.025 },
    { id: 'golden_pen', name: 'The Golden Pen', rarity: 'legendary', icon: '🖋️', buff: 0.05 },
    { id: 'rolodex', name: 'CEO\'s Rolodex', rarity: 'legendary', icon: '📇', buff: 0.05 },
    { id: 'briefcase', name: 'Nuclear Briefcase', rarity: 'legendary', icon: '💼', buff: 0.05 }
];

function save() { if(!isOBS) localStorage.setItem('frank_v9', JSON.stringify({c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser, inv:myInventory})); }
function load() {
    const s = localStorage.getItem('frank_v9');
    if(s) {
        const d = JSON.parse(s);
        myCoins=d.c; myClickDmg=d.cd; myAutoDmg=d.ad; clickCost=d.cc; autoCost=d.ac; myUser=d.u; myInventory = d.inv || {}; 
        if (myUser && !isOBS) document.getElementById('username-input').value = myUser;
        calculateLootBuff(); updateUI(); renderInventory();
        if(!isOBS) startRichardLoop(); 
    }
}
function clockIn(u) { const r = employeesRef.push(); r.set({name:u, e:'💼'}); r.onDisconnect().remove(); }
document.getElementById('btn-clock-in').onclick = () => {
    const val = document.getElementById('username-input').value.trim().toUpperCase();
    if(val) { myUser=val; document.getElementById('login-screen').style.display='none'; document.getElementById('game-container').style.display='block'; clockIn(myUser); save(); renderInventory(); if(!isOBS) startRichardLoop(); }
};

bossRef.on('value', (snap) => {
    let b = snap.val();
    if(!b) { b={health:1000000000, level:1}; bossRef.set(b); }
    if (lastLevel === 0) { lastLevel = b.level; } else if (b.level > lastLevel) { triggerVictoryScreen(b.level); lastLevel = b.level; }

    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    const hpPercent = curHP / maxHP;
    
    let newPhase = 1; let newTitle = "FRANK LV." + b.level;

    if (hpPercent <= 0.25) { newPhase = 4; newTitle = "CEO FRANK (ABSOLUTE MALICE)"; defMulti = 0.2; baseFrankImg = "phases/phase4frank.png"; } 
    else if (hpPercent <= 0.50) { newPhase = 3; newTitle = "VP FRANK (CRIMSON FURY)"; defMulti = 0.5; baseFrankImg = "phases/phase3frank.png"; } 
    else if (hpPercent <= 0.75) { newPhase = 2; newTitle = "MANAGER FRANK (BURSTING)"; defMulti = 0.8; baseFrankImg = "phases/phase2frank.png"; } 
    else { newPhase = 1; newTitle = "FRANK LV." + b.level; defMulti = 1.0; baseFrankImg = "phases/phase1frank.png"; }

    if (currentPhase !== newPhase) { 
        currentPhase = newPhase; 
        if(bossImg) {
            bossImg.src = baseFrankImg;
            bossImg.classList.remove('center-phase-1', 'center-phase-2', 'center-phase-3', 'center-phase-4');
            bossImg.classList.add(`center-phase-${newPhase}`);
            bossHitLayer.classList.remove('center-phase-1', 'center-phase-2', 'center-phase-3', 'center-phase-4');
            bossHitLayer.classList.add(`center-phase-${newPhase}`);
        }
    }
    
    hpFill.style.width = (curHP/maxHP)*100 + '%';
    hpText.innerText = curHP.toLocaleString() + " / " + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = newTitle;
});

function triggerVictoryScreen(newLevel) {
    const vScreen = document.createElement('div');
    vScreen.style.position = 'fixed'; vScreen.style.top = '0'; vScreen.style.left = '0'; vScreen.style.width = '100vw'; vScreen.style.height = '100vh';
    vScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; vScreen.style.display = 'flex'; vScreen.style.flexDirection = 'column';
    vScreen.style.justifyContent = 'center'; vScreen.style.alignItems = 'center'; vScreen.style.zIndex = '9999'; vScreen.style.fontFamily = 'monospace';
    vScreen.style.textAlign = 'center'; vScreen.style.textShadow = '3px 3px 0px #00ffff';
    vScreen.innerHTML = `<h1 style="font-size: 5rem; color: #ff00ff; margin: 0; text-transform: uppercase;">PROMOTED!</h1><h2 style="font-size: 2rem; color: #fff; text-shadow: none;">FRANK RETREATED... FOR NOW.</h2><p style="font-size: 1.5rem; color: #00ffff; text-shadow: none; margin-top: 20px;">PREPARE FOR LEVEL ${newLevel}</p>`;
    document.body.appendChild(vScreen);
    if(bossImg) bossImg.style.opacity = '0';
    setTimeout(() => { vScreen.style.transition = 'opacity 1s'; vScreen.style.opacity = '0'; if(bossImg) bossImg.style.opacity = '1'; setTimeout(() => vScreen.remove(), 1000); }, 4000);
}

// ==========================================
// --- NEW BASEBALL THROW POPUP GENERATOR ---
// ==========================================
function createDynamicPopup(text, className, x, y) {
    const p = document.createElement('div');
    p.className = className;
    p.innerText = text;

    // Random Math to calculate the explosive arc
    // Spread X wildly left or right
    const tx = (Math.random() - 0.5) * 600; 
    // Always explode upwards initially
    const ty = -Math.random() * 300 - 200; 
    // Random chaotic spin
    const rot = (Math.random() - 0.5) * 60; 

    // Inject the math into the CSS variables!
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--rot', `${rot}deg`);

    p.style.left = x + 'px';
    p.style.top = y + 'px';

    document.body.appendChild(p);
    // Remove element after the 1.2s animation finishes
    setTimeout(() => p.remove(), 1200); 
}

// Ensure playHitAnimation accepts X and Y from the cursor to pass to the quotes
function playHitAnimation(x, y) {
    if(!bossHitLayer || isAnimatingHit) return;
    isAnimatingHit = true;
    
    let phaseFilter = "none";
    if (currentPhase === 4) phaseFilter = "hue-rotate(250deg) saturate(3) brightness(0.7)"; 
    else if (currentPhase === 3) phaseFilter = "sepia(1) hue-rotate(-30deg) saturate(5) brightness(0.8)"; 
    else if (currentPhase === 2) phaseFilter = "saturate(2) brightness(1.2)"; 
    
    bossImg.style.opacity = '0'; 
    bossHitLayer.style.filter = phaseFilter; 
    bossHitLayer.src = hitImages[0]; 
    bossHitLayer.style.opacity = '1'; 
    
    setTimeout(() => { bossHitLayer.src = hitImages[1]; }, 800);
    setTimeout(() => { bossHitLayer.src = hitImages[0]; }, 1600);
    
    setTimeout(() => { 
        bossHitLayer.style.opacity = '0'; 
        setTimeout(() => { 
            bossImg.style.opacity = '1'; 
            isAnimatingHit = false; 
        }, 400); 
    }, 2400); 
    
    // Spawns quotes exploding from the cursor 15% of the time
    if(Math.random() < 0.15) spawnQuote(x, y);
}

function spawnQuote(x, y) {
    // If auto-merc triggers this, there is no cursor X/Y, so we center it on the boss
    if(!x || !y) {
        if(bossImg) {
            const bRect = bossImg.getBoundingClientRect();
            x = bRect.left + bRect.width / 2;
            y = bRect.top + bRect.height / 2;
        } else {
            x = window.innerWidth / 2; y = window.innerHeight / 2;
        }
    }
    const quote = corpQuotes[Math.floor(Math.random() * corpQuotes.length)];
    createDynamicPopup(quote, 'quote-popup', x, y);
}

function calculateLootBuff() {
    let buffTotal = 0;
    for (let id in myInventory) { let item = lootTable.find(i => i.id === id); if (item) buffTotal += (item.buff * myInventory[id]); }
    itemBuffMultiplier = 1.0 + buffTotal; document.getElementById('loot-buff').innerText = Math.floor(buffTotal * 100);
}

function rollForLoot(x, y) {
    if(Math.random() > 0.15) return; 
    const rarityRoll = Math.random(); let pool = [];
    if (rarityRoll < 0.02) { pool = lootTable.filter(i => i.rarity === 'legendary'); } else if (rarityRoll < 0.15) { pool = lootTable.filter(i => i.rarity === 'rare'); } else if (rarityRoll < 0.40) { pool = lootTable.filter(i => i.rarity === 'uncommon'); } else { pool = lootTable.filter(i => i.rarity === 'common'); } 
    if (pool.length > 0) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        myInventory[item.id] = (myInventory[item.id] || 0) + 1;
        calculateLootBuff(); save(); renderInventory();
        
        // Dynamic Explosion Loot
        createDynamicPopup(`Loot: ${item.name}!`, 'loot-popup', x, y);
    }
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid'); if (!grid) return; grid.innerHTML = ''; let hasItems = false;
    lootTable.forEach(item => { if (myInventory[item.id] && myInventory[item.id] > 0) { hasItems = true; const slot = document.createElement('div'); slot.className = `inv-item rarity-${item.rarity}`; slot.innerHTML = `${item.icon}<span class="inv-count">${myInventory[item.id]}</span><span class="inv-tooltip">${item.name} (+${item.buff * 100}%)</span>`; grid.appendChild(slot); } });
    if(!hasItems) { grid.innerHTML = '<p style="color:#777; font-size:12px; width:100%; text-align:center;">Drawer is empty. Attack Frank!</p>'; }
}

function attack(e) {
    if(isOBS) return;
    
    // Grab the exact mouse coordinates
    const x = (e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2)); 
    const y = (e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2));
    
    playHitAnimation(x, y); 
    
    if(bossImg && bossHitLayer) {
        bossImg.classList.add('quick-zoom'); bossHitLayer.classList.add('quick-zoom');
        setTimeout(() => { bossImg.classList.remove('quick-zoom'); bossHitLayer.classList.remove('quick-zoom'); }, 50);
    }

    const dmg = Math.floor(myClickDmg * multi * defMulti * itemBuffMultiplier);
    bossRef.transaction(b => { if(b) { b.health -= dmg; if(b.health<=0){ b.level++; b.health=1000000000*b.level; } } return b; });
    myCoins += (1 * multi); frenzy = Math.min(100, frenzy+8); updateUI(); save();
    
    // Dynamic Explosion Damage Number
    createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);

    rollForLoot(x, y);
}

function updateUI() {
    document.getElementById('coin-count').innerText = myCoins.toLocaleString(); document.getElementById('click-power').innerText = myClickDmg.toLocaleString(); document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString();
    document.getElementById('buy-click').innerHTML = `Sharpen Blade (+2.5k) <br><span>Cost: ${clickCost}</span>`; document.getElementById('buy-auto').innerHTML = `Hire Merc (+1k/s) <br><span>Cost: ${autoCost}</span>`;
}

document.getElementById('buy-click').onclick = () => { if(myCoins>=clickCost){ myCoins-=clickCost; myClickDmg+=2500; clickCost=Math.floor(clickCost*1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if(myCoins>=autoCost){ myCoins-=autoCost; myAutoDmg+=1000; autoCost=Math.floor(autoCost*1.5); updateUI(); save(); } };

setInterval(() => { 
    if(myAutoDmg>0) { 
        const autoDmgCalculated = Math.floor(myAutoDmg * defMulti * itemBuffMultiplier);
        bossRef.transaction(b => { if(b) b.health -= autoDmgCalculated; return b; }); 
        if (bossImg && !isOBS) {
            const rect = bossImg.getBoundingClientRect();
            const slash = document.createElement('div'); slash.className = 'merc-strike'; slash.innerText = '💥'; slash.style.left = (rect.left + (Math.random() * (rect.width - 50))) + 'px'; slash.style.top = (rect.top + (Math.random() * (rect.height - 50))) + 'px'; document.body.appendChild(slash); setTimeout(() => slash.remove(), 500);
        }
    }
}, 1000);

setInterval(() => { frenzy=Math.max(0, frenzy-2); multi=frenzy>=100?5:frenzy>=75?3:frenzy>=50?2:1; document.getElementById('frenzy-bar-fill').style.width=frenzy+'%'; document.getElementById('frenzy-text').innerText=multi>1?`COMBO ${multi}x` : `CHARGE METER`; }, 100);

document.getElementById('btn-attack').onpointerdown = attack;
if(bossImg) bossImg.onpointerdown = attack;

// --- RICHARD INTIMIDATION SYSTEM ---
const richardQuotes = [
    "I'm not seeing enough 'Synergy' in your clicks.",
    "Pack your action items. You're being 'Rightsized'.",
    "Your 'Bandwidth' is insufficient for this company.",
    "Let's 'Circle Back' to your termination clause.",
    "Rethink your loyalty, Employee.",
    "Severance? We call it 'Asset Reclaim'.",
    "PIP incoming. Start updating your resume.",
    "Return to office... PERMANENTLY.",
    "Your redundancy has been noted.",
    "I have automated your 'Actionable Deliverables'."
];

function startRichardLoop() {
    const nextSpawnTime = (Math.random() * (90000 - 45000) + 45000);
    setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, nextSpawnTime);
}

function triggerRichardEvent() {
    if (!richardContainer || !richardImage || !richardDialogue) return;
    const quote = richardQuotes[Math.floor(Math.random() * richardQuotes.length)];
    richardDialogue.innerText = quote;
    const fromLeft = Math.random() < 0.5;
    richardImage.className = ''; 
    richardImage.classList.add(fromLeft ? 'richard-from-left' : 'richard-from-right');
    richardContainer.style.display = 'flex';
    setTimeout(() => { richardContainer.classList.add('active'); }, 100);
    setTimeout(() => {
        richardContainer.classList.remove('active');
        setTimeout(() => { richardContainer.style.display = 'none'; }, 1500);
    }, 8000); 
}
