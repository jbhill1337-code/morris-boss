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
const preloadRichard1 = new Image(); preloadRichard1.src = 'yourbossvar/boss-pointing.png';
const preloadRichard2 = new Image(); preloadRichard2.src = 'yourbossvar/boss-crossing.png';
const richardImages = ['yourbossvar/boss-pointing.png', 'yourbossvar/boss-crossing.png'];

const introContainer = document.getElementById('intro-container');
const startIntroBtn = document.getElementById('start-intro-btn');
const skipIntroBtn = document.getElementById('skip-intro-btn');
let ytPlayer;

const endIntro = () => { if (introContainer) { introContainer.style.opacity = '0'; setTimeout(() => { introContainer.remove(); load(); }, 1000); } };

// FIXED: Failsafe so the intro never gets stuck on a black screen!
if(introContainer && !isOBS) {
    setTimeout(() => {
        if(skipIntroBtn && skipIntroBtn.style.display === 'none') {
            skipIntroBtn.style.display = 'block';
            skipIntroBtn.innerText = "SKIP (EMERGENCY OVERRIDE)";
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
let currentPhase = 0; 
let baseFrankImg = "phases/phase1frank.png";
let defMulti = 1.0; 
let lastLevel = 0; 
let itemBuffMultiplier = 1.0; 
let isAnimatingHit = false; 

// --- NEW UPGRADE VARIABLES ---
let critChance = 0;        // % chance per click (0-100)
let critCost = 100;        // Lucky Shot cost
let autoInterval = 1000;   // ms between auto-dps ticks (overtime upgrade)
let overtimeCost = 200;    // Overtime cost
let shopMultiplier = 1.0;  // Global dmg multiplier from Synergy Boost
let synergyCost = 150;     // Synergy Boost cost
let frenzyGainBonus = 0;   // Extra frenzy per click (Rage Fuel)
let rageCost = 75;         // Rage Fuel cost
let coinsPerClick = 1;     // Coins earned per click (Side Hustle)
let hustleCost = 30;       // Side Hustle cost
let autoTimer = null;      // Reference to auto-dps interval

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
    { id: 'energy_drink', name: 'Suspicious Energy Drink', rarity: 'uncommon', icon: '🧪', buff: 0.015 },
    { id: 'stapler', name: 'Red Stapler', rarity: 'rare', icon: '🖍️', buff: 0.025 },
    { id: 'keyboard', name: 'Clacky Keyboard', rarity: 'rare', icon: '⌨️', buff: 0.025 },
    { id: 'power_gem', name: 'Power Gem', rarity: 'rare', icon: '🟠', buff: 0.03 },
    { id: 'crimson_shard', name: 'Crimson Shard', rarity: 'rare', icon: '🔴', buff: 0.03 },
    { id: 'golden_pen', name: 'The Golden Pen', rarity: 'legendary', icon: '🖋️', buff: 0.05 },
    { id: 'rolodex', name: 'CEO\'s Rolodex', rarity: 'legendary', icon: '📇', buff: 0.05 },
    { id: 'briefcase', name: 'Nuclear Briefcase', rarity: 'legendary', icon: '💼', buff: 0.05 },
    { id: 'exec_trophy', name: 'Executive Trophy', rarity: 'legendary', icon: '🏆', buff: 0.07 },
    { id: 'gold_blade', name: 'The Gold Blade', rarity: 'legendary', icon: '🗡️', buff: 0.08 },
    { id: 'golden_paperclip', name: 'Golden Paperclip', rarity: 'legendary', icon: '✨', buff: 0.25, prestigeOnly: true }
];

function save() { if(!isOBS) localStorage.setItem('frank_v9', JSON.stringify({c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser, inv:myInventory, critChance, critCost, autoInterval, overtimeCost, shopMultiplier, synergyCost, frenzyGainBonus, rageCost, coinsPerClick, hustleCost})); }
function load() {
    const s = localStorage.getItem('frank_v9');
    if(s) {
        const d = JSON.parse(s);
        myCoins=d.c; myClickDmg=d.cd; myAutoDmg=d.ad; clickCost=d.cc; autoCost=d.ac; myUser=d.u; myInventory = d.inv || {}; 
        if(d.critChance !== undefined) { critChance=d.critChance; critCost=d.critCost; }
        if(d.autoInterval !== undefined) { autoInterval=d.autoInterval; overtimeCost=d.overtimeCost; }
        if(d.shopMultiplier !== undefined) { shopMultiplier=d.shopMultiplier; synergyCost=d.synergyCost; }
        if(d.frenzyGainBonus !== undefined) { frenzyGainBonus=d.frenzyGainBonus; rageCost=d.rageCost; }
        if(d.coinsPerClick !== undefined) { coinsPerClick=d.coinsPerClick; hustleCost=d.hustleCost; }
        if (myUser && !isOBS) document.getElementById('username-input').value = myUser;
        calculateLootBuff(); updateUI(); renderInventory();
        if(!isOBS) { startRichardLoop(); startAutoTimer(); }
    }
}
function clockIn(u) { const r = employeesRef.push(); r.set({name:u, e:'💼'}); r.onDisconnect().remove(); }
document.getElementById('btn-clock-in').onclick = () => {
    const val = document.getElementById('username-input').value.trim().toUpperCase();
    if(val) { myUser=val; document.getElementById('login-screen').style.display='none'; document.getElementById('game-container').style.display='block'; clockIn(myUser); save(); renderInventory(); if(!isOBS) { startRichardLoop(); startAutoTimer(); } }
};

bossRef.on('value', (snap) => {
    let b = snap.val();
    if(!b) { b={health:1000000000, level:1}; bossRef.set(b); }
    
    if (lastLevel === 0) { 
        lastLevel = b.level; 
    } else if (b.level > lastLevel) { 
        if (lastLevel > 0 && lastLevel % 10 === 0) {
            if(!isOBS) {
                myInventory['golden_paperclip'] = (myInventory['golden_paperclip'] || 0) + 1;
                calculateLootBuff();
                save();
                renderInventory();
                createDynamicPopup('PRESTIGE REWARD: Golden Paperclip!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
            }
        }
        triggerVictoryScreen(b.level); 
        lastLevel = b.level; 
    }

    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    
    // FIXED: Prevent negative health bar widths
    const hpPercent = Math.max(0, curHP / maxHP);
    
    let newPhase = 1; let newTitle = "FRANK LV." + b.level;

    if (hpPercent <= 0.25) { newPhase = 4; newTitle = "CEO FRANK (ABSOLUTE MALICE)"; defMulti = 0.2; baseFrankImg = "phases/phase4frank.png"; } 
    else if (hpPercent <= 0.50) { newPhase = 3; newTitle = "VP FRANK (CRIMSON FURY)"; defMulti = 0.5; baseFrankImg = "phases/phase3frank.png"; } 
    else if (hpPercent <= 0.75) { newPhase = 2; newTitle = "MANAGER FRANK (BURSTING)"; defMulti = 0.8; baseFrankImg = "phases/phase2frank.png"; } 
    else { newPhase = 1; newTitle = "FRANK LV." + b.level; defMulti = 1.0; baseFrankImg = "phases/phase1frank.png"; }

    if (currentPhase !== newPhase) { 
        currentPhase = newPhase; 
        if(bossImg) {
            if(!isAnimatingHit) bossImg.src = baseFrankImg;
            bossImg.classList.remove('center-phase-1', 'center-phase-2', 'center-phase-3', 'center-phase-4');
            bossImg.classList.add(`center-phase-${newPhase}`);
            bossHitLayer.classList.remove('center-phase-1', 'center-phase-2', 'center-phase-3', 'center-phase-4');
            bossHitLayer.classList.add(`center-phase-${newPhase}`);
        }
    }

    
    hpFill.style.width = (hpPercent*100) + '%';
    hpText.innerText = curHP.toLocaleString() + " / " + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = newTitle;
});

// FIXED: Destroys any old victory screens before making a new one to prevent the black screen crash!
function triggerVictoryScreen(newLevel) {
    let oldScreen = document.getElementById('victory-screen-overlay');
    if(oldScreen) oldScreen.remove();

    const vScreen = document.createElement('div');
    vScreen.id = 'victory-screen-overlay';
    vScreen.style.position = 'fixed'; vScreen.style.top = '0'; vScreen.style.left = '0'; vScreen.style.width = '100vw'; vScreen.style.height = '100vh';
    vScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; vScreen.style.display = 'flex'; vScreen.style.flexDirection = 'column';
    vScreen.style.justifyContent = 'center'; vScreen.style.alignItems = 'center'; vScreen.style.zIndex = '9999'; vScreen.style.fontFamily = 'monospace';
    vScreen.style.textAlign = 'center'; vScreen.style.textShadow = '3px 3px 0px #00ffff';
    vScreen.innerHTML = `<h1 style="font-size: 5rem; color: #ff00ff; margin: 0; text-transform: uppercase;">PROMOTED!</h1><h2 style="font-size: 2rem; color: #fff; text-shadow: none;">FRANK RETREATED... FOR NOW.</h2><p style="font-size: 1.5rem; color: #00ffff; text-shadow: none; margin-top: 20px;">PREPARE FOR LEVEL ${newLevel}</p>`;
    document.body.appendChild(vScreen);
    
    if(bossImg) bossImg.style.opacity = '0';
    
    setTimeout(() => { 
        vScreen.style.transition = 'opacity 1s'; 
        vScreen.style.opacity = '0'; 
        if(bossImg) bossImg.style.opacity = '1'; 
        setTimeout(() => vScreen.remove(), 1000); 
    }, 4000);
}

function createDynamicPopup(text, className, x, y) {
    const p = document.createElement('div');
    p.className = className;
    p.innerText = text;
    const tx = (Math.random() - 0.5) * 600; 
    const ty = -Math.random() * 300 - 200; 
    const rot = (Math.random() - 0.5) * 60; 
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--rot', `${rot}deg`);
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200); 
}

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
    bossHitLayer.style.opacity = '1'; // Snaps on instantly (no CSS opacity transition)
    
    setTimeout(() => { bossHitLayer.src = hitImages[1]; }, 800);
    setTimeout(() => { bossHitLayer.src = hitImages[0]; }, 1600);
    
    // Fade the hit layer out with a brief inline transition, then snap base image back
    setTimeout(() => {
        bossHitLayer.style.transition = 'opacity 0.3s ease-out, transform 0.05s ease-out, filter 0.05s ease-out';
        bossHitLayer.style.opacity = '0';
        setTimeout(() => {
            bossImg.style.opacity = '1';
            isAnimatingHit = false;
            // Reset hit layer transition back to no-opacity for next attack
            bossHitLayer.style.transition = 'transform 0.05s ease-out, filter 0.05s ease-out';
        }, 300);
    }, 2400); 
    
    if(Math.random() < 0.15) spawnQuote(x, y);
}

function spawnQuote(x, y) {
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
    const rarityRoll = Math.random(); 
    
    let validLoot = lootTable.filter(i => !i.prestigeOnly);
    let pool = [];
    
    if (rarityRoll < 0.02) { pool = validLoot.filter(i => i.rarity === 'legendary'); } 
    else if (rarityRoll < 0.15) { pool = validLoot.filter(i => i.rarity === 'rare'); } 
    else if (rarityRoll < 0.40) { pool = validLoot.filter(i => i.rarity === 'uncommon'); } 
    else { pool = validLoot.filter(i => i.rarity === 'common'); } 
    
    if (pool.length > 0) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        myInventory[item.id] = (myInventory[item.id] || 0) + 1;
        calculateLootBuff(); save(); renderInventory();
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
    const x = (e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth / 2)); 
    const y = (e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight / 2));
    
    playHitAnimation(x, y); 
    
    if(bossImg && bossHitLayer) {
        bossImg.classList.add('quick-zoom'); bossHitLayer.classList.add('quick-zoom');
        setTimeout(() => { bossImg.classList.remove('quick-zoom'); bossHitLayer.classList.remove('quick-zoom'); }, 50);
    }

    // Critical hit check
    const isCrit = (Math.random() * 100) < critChance;
    const critMult = isCrit ? 10 : 1;

    const dmg = Math.floor(myClickDmg * multi * defMulti * itemBuffMultiplier * shopMultiplier * critMult);
    bossRef.transaction(b => { if(b) { b.health -= dmg; if(b.health<=0){ b.level++; b.health=1000000000*b.level; } } return b; });
    myCoins += (coinsPerClick * multi); frenzy = Math.min(100, frenzy + 8 + frenzyGainBonus); updateUI(); save();

    if (isCrit) {
        createDynamicPopup('💥 CRIT! +' + dmg.toLocaleString(), 'damage-popup crit-popup', x, y);
    } else {
        createDynamicPopup('+' + dmg.toLocaleString(), 'damage-popup', x, y);
    }
    rollForLoot(x, y);
}

function updateUI() {
    document.getElementById('coin-count').innerText = myCoins.toLocaleString(); document.getElementById('click-power').innerText = myClickDmg.toLocaleString(); document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString();
    document.getElementById('buy-click').innerHTML = `⚔️ Sharpen Blade (+2.5k) <br><span>Cost: ${clickCost}</span>`; 
    document.getElementById('buy-auto').innerHTML = `Hire Merc (+1k/s) <br><span>Cost: ${autoCost}</span>`;
    document.getElementById('buy-crit').innerHTML = `🎯 Lucky Shot (+5% crit) <br><span class="cost-tag">Cost: ${critCost}</span>`;
    document.getElementById('buy-overtime').innerHTML = `⏱️ Overtime (faster auto) <br><span class="cost-tag">Cost: ${overtimeCost}</span>`;
    document.getElementById('buy-synergy').innerHTML = `⚡ Synergy Boost (+10% dmg) <br><span class="cost-tag">Cost: ${synergyCost}</span>`;
    document.getElementById('buy-rage').innerHTML = `🔥 Rage Fuel (+frenzy/click) <br><span class="cost-tag">Cost: ${rageCost}</span>`;
    document.getElementById('buy-hustle').innerHTML = `💰 Side Hustle (+2 coins) <br><span class="cost-tag">Cost: ${hustleCost}</span>`;
    document.getElementById('crit-chance-display').innerText = critChance;
    document.getElementById('shop-multi-display').innerText = shopMultiplier.toFixed(2);
}

document.getElementById('buy-click').onclick = () => { if(myCoins>=clickCost){ myCoins-=clickCost; myClickDmg+=2500; clickCost=Math.floor(clickCost*1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if(myCoins>=autoCost){ myCoins-=autoCost; myAutoDmg+=1000; autoCost=Math.floor(autoCost*1.5); updateUI(); save(); } };

// --- NEW UPGRADE HANDLERS ---
document.getElementById('buy-crit').onclick = () => {
    if(myCoins >= critCost) {
        myCoins -= critCost; critChance = Math.min(95, critChance + 5); critCost = Math.floor(critCost * 1.8);
        updateUI(); save();
        createDynamicPopup('🎯 CRIT CHANCE UP!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    }
};

document.getElementById('buy-overtime').onclick = () => {
    if(myCoins >= overtimeCost && autoInterval > 200) {
        myCoins -= overtimeCost; autoInterval = Math.max(200, autoInterval - 100); overtimeCost = Math.floor(overtimeCost * 2);
        startAutoTimer(); updateUI(); save();
        createDynamicPopup('⏱️ AUTO SPEED UP!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    }
};

document.getElementById('buy-synergy').onclick = () => {
    if(myCoins >= synergyCost) {
        myCoins -= synergyCost; shopMultiplier = parseFloat((shopMultiplier + 0.10).toFixed(2)); synergyCost = Math.floor(synergyCost * 2);
        updateUI(); save();
        createDynamicPopup('⚡ SYNERGY!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    }
};

document.getElementById('buy-rage').onclick = () => {
    if(myCoins >= rageCost) {
        myCoins -= rageCost; frenzyGainBonus += 4; rageCost = Math.floor(rageCost * 1.6);
        updateUI(); save();
        createDynamicPopup('🔥 RAGE FUEL!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    }
};

document.getElementById('buy-hustle').onclick = () => {
    if(myCoins >= hustleCost) {
        myCoins -= hustleCost; coinsPerClick += 2; hustleCost = Math.floor(hustleCost * 1.5);
        updateUI(); save();
        createDynamicPopup('💰 COIN HUSTLE!', 'loot-popup', window.innerWidth/2, window.innerHeight/2);
    }
};

// --- AUTO DPS TIMER (restartable for Overtime upgrade) ---
function startAutoTimer() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => { 
        if(myAutoDmg>0) { 
            const autoDmgCalculated = Math.floor(myAutoDmg * defMulti * itemBuffMultiplier * shopMultiplier);
            bossRef.transaction(b => { if(b) b.health -= autoDmgCalculated; return b; }); 
            if (bossImg && !isOBS) {
                const rect = bossImg.getBoundingClientRect();
                const slash = document.createElement('div'); slash.className = 'merc-strike'; slash.innerText = '💥'; slash.style.left = (rect.left + (Math.random() * (rect.width - 50))) + 'px'; slash.style.top = (rect.top + (Math.random() * (rect.height - 50))) + 'px'; document.body.appendChild(slash); setTimeout(() => slash.remove(), 500);
            }
        }
    }, autoInterval);
}

setInterval(() => { frenzy=Math.max(0, frenzy-2); multi=frenzy>=100?5:frenzy>=75?3:frenzy>=50?2:1; document.getElementById('frenzy-bar-fill').style.width=frenzy+'%'; document.getElementById('frenzy-text').innerText=multi>1?`COMBO ${multi}x` : `CHARGE METER`; }, 100);

document.getElementById('btn-attack').onpointerdown = attack;
// Attack on click anywhere in the boss area (not bossImg directly — at scale 2.0
// the image overflows into the side columns and would intercept shop button clicks)
document.getElementById('boss-area').onpointerdown = attack;

// --- STRICTLY RETAIL / OFFICE SMALL TALK ---
const richardQuotes = [
    "Livin' the dream!",
    "Another day, another dollar.",
    "Working hard or hardly working?",
    "Can someone check the back room?",
    "Is it Friday yet?",
    "Did you try restarting it?",
    "We're basically a family here.",
    "If there's no barcode, it must be free!",
    "Who closed last night?",
    "Corporate is visiting, look busy."
];

function startRichardLoop() {
    const nextSpawnTime = (Math.random() * (90000 - 45000) + 45000);
    setTimeout(() => { triggerRichardEvent(); startRichardLoop(); }, nextSpawnTime);
}

function triggerRichardEvent() {
    if (!richardContainer || !richardImage || !richardDialogue) return;
    
    const randomImg = richardImages[Math.floor(Math.random() * richardImages.length)];
    richardImage.src = randomImg;
    
    const quote = richardQuotes[Math.floor(Math.random() * richardQuotes.length)];
    richardDialogue.innerText = quote;
    
    let fromLeft = true;
    if (window.innerWidth < 950) { fromLeft = Math.random() < 0.5; }
    
    richardImage.className = ''; 
    richardDialogue.className = '';
    
    if(fromLeft) {
        richardImage.classList.add('richard-left');
        richardDialogue.classList.add('richard-left-text');
    } else {
        richardImage.classList.add('richard-right');
        richardDialogue.classList.add('richard-right-text');
    }
    
    setTimeout(() => { richardContainer.classList.add('active'); }, 100);
    setTimeout(() => { richardContainer.classList.remove('active'); }, 8000); 
}
