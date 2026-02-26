const firebaseConfig = {
  apiKey: "AIzaSyBvx5u1OGwS6YAvmVhBF9bstiUn-Vp6TVY",
  authDomain: "corporate-extraction.firebaseapp.com",
  databaseURL: "https://corporate-extraction-default-rtdb.firebaseio.com",
  projectId: "corporate-extraction",
  storageBucket: "corporate-extraction.firebasestorage.app",
  messagingSenderId: "184892788723",
  appId: "1:184892788723:web:93959fe24c883a27088c86"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const bossRef = db.ref('frank_corporate_data'); 
const employeesRef = db.ref('active_employees');

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

// --- INTRO VIDEO LOGIC ---
const introContainer = document.getElementById('intro-container');
const introVideo = document.getElementById('intro-video');
const startIntroBtn = document.getElementById('start-intro-btn');
const skipIntroBtn = document.getElementById('skip-intro-btn');

const endIntro = () => {
    introContainer.style.opacity = '0';
    setTimeout(() => {
        introContainer.remove();
        // Try to load saved game after video ends
        load();
    }, 1000); 
};

if (isOBS) {
    // If running in OBS, skip intro and login screen entirely
    if (introContainer) introContainer.style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('player-stats').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
} else {
    // Standard Player Logic
    if (introContainer) {
        startIntroBtn.onclick = () => {
            startIntroBtn.style.display = 'none';
            introVideo.style.display = 'block';
            skipIntroBtn.style.display = 'block';
            introVideo.play();
        };
        introVideo.onended = endIntro;
        skipIntroBtn.onclick = endIntro;
    }
}

let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = "";
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;

let currentPhase = 1;
let baseFrankImg = "phase1frank.png";
let defMulti = 1.0; 
let lastLevel = 0; 

const bossImg = document.getElementById('boss-image');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');
const corpQuotes = [ "SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!" ];

function save() { if(!isOBS) localStorage.setItem('frank_v9', JSON.stringify({c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser})); }
function load() {
    const s = localStorage.getItem('frank_v9');
    if(s) {
        const d = JSON.parse(s);
        myCoins=d.c; myClickDmg=d.cd; myAutoDmg=d.ad; clickCost=d.cc; autoCost=d.ac; myUser=d.u;
        // Only skip login screen if intro video is gone
        if(myUser && !isOBS && !document.getElementById('intro-container')) { 
            document.getElementById('login-screen').style.display='none'; 
            document.getElementById('game-container').style.display='block'; 
            clockIn(myUser); 
        }
        updateUI();
    }
}

function clockIn(u) { const r = employeesRef.push(); r.set({name:u, e:'💼'}); r.onDisconnect().remove(); }

document.getElementById('btn-clock-in').onclick = () => {
    const val = document.getElementById('username-input').value.trim().toUpperCase();
    if(val) { myUser=val; document.getElementById('login-screen').style.display='none'; document.getElementById('game-container').style.display='block'; clockIn(myUser); save(); }
};

// --- SYNC, PHASE & VICTORY LOGIC ---
bossRef.on('value', (snap) => {
    let b = snap.val();
    if(!b) { b={health:1000000000, level:1}; bossRef.set(b); }
    
    if (lastLevel === 0) {
        lastLevel = b.level; 
    } else if (b.level > lastLevel) {
        triggerVictoryScreen(b.level);
        lastLevel = b.level;
    }

    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    const hpPercent = curHP / maxHP;
    
    let newPhase = 1;
    let newTitle = "FRANK LV." + b.level;

    if (hpPercent <= 0.25) {
        newPhase = 4;
        newTitle = "CEO FRANK (ABSOLUTE MALICE)";
        defMulti = 0.2; 
        baseFrankImg = "phase4frank.png";
    } else if (hpPercent <= 0.50) {
        newPhase = 3;
        newTitle = "VP FRANK (CRIMSON FURY)";
        defMulti = 0.5; 
        baseFrankImg = "phase3frank.png";
    } else if (hpPercent <= 0.75) {
        newPhase = 2;
        newTitle = "MANAGER FRANK (BURSTING)";
        defMulti = 0.8; 
        baseFrankImg = "phase2frank.png";
    } else {
        newPhase = 1;
        newTitle = "FRANK LV." + b.level;
        defMulti = 1.0; 
        baseFrankImg = "phase1frank.png";
    }

    if (currentPhase !== newPhase) {
        currentPhase = newPhase;
        if(bossImg) bossImg.src = baseFrankImg;
    }

    if(b.health < lastHP && b.health > 0) triggerGlobalFX(); 
    
    hpFill.style.width = (curHP/maxHP)*100 + '%';
    hpText.innerText = curHP.toLocaleString() + " / " + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = newTitle;
});

function triggerVictoryScreen(newLevel) {
    const vScreen = document.createElement('div');
    vScreen.style.position = 'fixed';
    vScreen.style.top = '0'; vScreen.style.left = '0';
    vScreen.style.width = '100vw'; vScreen.style.height = '100vh';
    vScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    vScreen.style.display = 'flex'; vScreen.style.flexDirection = 'column';
    vScreen.style.justifyContent = 'center'; vScreen.style.alignItems = 'center';
    vScreen.style.zIndex = '9999'; vScreen.style.fontFamily = 'monospace';
    vScreen.style.textAlign = 'center'; vScreen.style.textShadow = '3px 3px 0px #00ffff';

    vScreen.innerHTML = `
        <h1 style="font-size: 5rem; color: #ff00ff; margin: 0; text-transform: uppercase;">PROMOTED!</h1>
        <h2 style="font-size: 2rem; color: #fff; text-shadow: none;">FRANK RETREATED... FOR NOW.</h2>
        <p style="font-size: 1.5rem; color: #00ffff; text-shadow: none; margin-top: 20px;">PREPARE FOR LEVEL ${newLevel}</p>
    `;
    document.body.appendChild(vScreen);

    if(bossImg) bossImg.style.opacity = '0';

    setTimeout(() => {
        vScreen.style.transition = 'opacity 1s';
        vScreen.style.opacity = '0';
        if(bossImg) bossImg.style.opacity = '1'; 
        setTimeout(() => vScreen.remove(), 1000);
    }, 4000);
}

function triggerGlobalFX() {
    if(!bossImg) return;
    bossImg.classList.add('shake');
    bossImg.style.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)'; 
    setTimeout(() => { 
        bossImg.classList.remove('shake'); 
        bossImg.style.filter = 'none'; 
    }, 150);
    if(Math.random() < 0.15) spawnQuote();
}

function spawnQuote() {
    const bRect = bossImg.getBoundingClientRect();
    const q = document.createElement('div');
    q.className = 'quote-popup';
    q.innerText = corpQuotes[Math.floor(Math.random()*corpQuotes.length)];
    document.body.appendChild(q);
    q.style.left = (bRect.left + bRect.width/2) + 'px';
    q.style.top = bRect.top + 'px';
    setTimeout(()=>q.remove(), 1000);
}

function attack(e) {
    if(isOBS) return;
    const dmg = Math.floor(myClickDmg * multi * defMulti);
    bossRef.transaction(b => { if(b) { b.health -= dmg; if(b.health<=0){ b.level++; b.health=1000000000*b.level; } } return b; });
    myCoins += (1 * multi); frenzy = Math.min(100, frenzy+8); updateUI(); save();
    const x = (e.clientX || (e.touches ? e.touches[0].clientX : 0));
    const y = (e.clientY || (e.touches ? e.touches[0].clientY : 0));
    const p = document.createElement('div');
    p.className='damage-popup'; p.innerText='+'+dmg.toLocaleString();
    p.style.left=x+'px'; p.style.top=y+'px';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),800);
}

function updateUI() {
    document.getElementById('coin-count').innerText = myCoins.toLocaleString();
    document.getElementById('click-power').innerText = myClickDmg.toLocaleString();
    document.getElementById('auto-power').innerText = myAutoDmg.toLocaleString();
    document.getElementById('buy-click').innerHTML = `Sharpen Blade (+2.5k) <br><span>Cost: ${clickCost}</span>`;
    document.getElementById('buy-auto').innerHTML = `Hire Merc (+1k/s) <br><span>Cost: ${autoCost}</span>`;
}

document.getElementById('buy-click').onclick = () => { if(myCoins>=clickCost){ myCoins-=clickCost; myClickDmg+=2500; clickCost=Math.floor(clickCost*1.5); updateUI(); save(); } };
document.getElementById('buy-auto').onclick = () => { if(myCoins>=autoCost){ myCoins-=autoCost; myAutoDmg+=1000; autoCost=Math.floor(autoCost*1.5); updateUI(); save(); } };

setInterval(() => { 
    if(myAutoDmg>0) {
        bossRef.transaction(b => { if(b) b.health -= Math.floor(myAutoDmg * defMulti); return b; }); 
    }
}, 1000);
setInterval(() => { frenzy=Math.max(0, frenzy-2); multi=frenzy>=100?5:frenzy>=75?3:frenzy>=50?2:1; document.getElementById('frenzy-bar-fill').style.width=frenzy+'%'; document.getElementById('frenzy-text').innerText=multi>1?`COMBO ${multi}x` : `CHARGE METER`; }, 100);

document.getElementById('btn-attack').onpointerdown = attack;
bossImg.onpointerdown = attack;

const tipBtn = document.getElementById('btn-tip');
if (tipBtn) {
    tipBtn.onpointerdown = (e) => {
        e.preventDefault(); 
        window.open("https://your-tip-link-here.com", "_blank"); 
    };
}
