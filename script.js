const firebaseConfig = {
  apiKey: "AIzaSyAEA1pc8eNG4NhiC_mDpssbFIzdtaSHLkM",
  authDomain: "raid-clicker.firebaseapp.com",
  databaseURL: "https://raid-clicker-default-rtdb.firebaseio.com",
  projectId: "raid-clicker",
  storageBucket: "raid-clicker.firebasestorage.app",
  messagingSenderId: "32296108457",
  appId: "1:32296108457:web:ddeca6185e8821626744b8"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const bossRef = db.ref('frank_raid_v7'); 
const employeesRef = db.ref('active_employees_v7');

// --- AUTOMATIC OBS DETECTION ---
// Detects vertical 1080x1920 source or ?obs=true tag
const isOBS = (window.innerHeight > window.innerWidth) || (new URLSearchParams(window.location.search).get('obs') === 'true');

if (isOBS) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('player-stats').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
}

let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = "";
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;

const bossImg = document.getElementById('boss-image');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');

function save() { if(!isOBS) localStorage.setItem('frank_v7', JSON.stringify({c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser})); }
function load() {
    const s = localStorage.getItem('frank_v7');
    if(s) {
        const d = JSON.parse(s);
        myCoins=d.c; myClickDmg=d.cd; myAutoDmg=d.ad; clickCost=d.cc; autoCost=d.ac; myUser=d.u;
        if(myUser && !isOBS) { document.getElementById('login-screen').style.display='none'; document.getElementById('game-container').style.display='block'; clockIn(myUser); }
        updateUI();
    }
}

function clockIn(u) { const r = employeesRef.push(); r.set({name:u, e:'💼'}); r.onDisconnect().remove(); }

document.getElementById('btn-clock-in').onclick = () => {
    const val = document.getElementById('username-input').value.trim().toUpperCase();
    if(val) { myUser=val; document.getElementById('login-screen').style.display='none'; document.getElementById('game-container').style.display='block'; clockIn(myUser); save(); }
};

// --- SYNC ---
bossRef.on('value', (snap) => {
    let b = snap.val();
    if(!b) { b={health:1000000000, level:1}; bossRef.set(b); }
    if(b.health < lastHP) hitFX();
    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    hpFill.style.width = (curHP/maxHP)*100 + '%';
    hpText.innerText = curHP.toLocaleString() + " / " + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = "FRANK LV." + b.level;
});

// --- UPDATED HIT LOGIC WITH 3 VARIATIONS ---
function hitFX() {
    if(!bossImg) return;
    const rand = Math.random();
    // Randomly pick between standing, hit, hit-var-2, and hit-var-3
    if (rand < 0.33) bossImg.src = 'boss-hit.png';
    else if (rand < 0.66) bossImg.src = 'boss-hit-var-2.png';
    else bossImg.src = 'boss-hit-var-3.png';
    
    bossImg.classList.add('shake');
    setTimeout(() => { bossImg.src = 'boss-standing.png'; bossImg.classList.remove('shake'); }, 150);
}

function attack(e) {
    if(isOBS) return;
    const dmg = myClickDmg * multi;
    bossRef.transaction(b => { if(b) { b.health -= dmg; if(b.health<=0){ b.level++; b.health=1000000000*b.level; } } return b; });
    myCoins += (1 * multi); frenzy = Math.min(100, frenzy+8); updateUI(); save();
    const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    const p = document.createElement('div'); p.className='damage-popup'; p.innerText='+'+dmg.toLocaleString(); p.style.left=x+'px'; p.style.top=y+'px'; document.body.appendChild(p); setTimeout(()=>p.remove(),800);
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

setInterval(() => { if(myAutoDmg>0) bossRef.transaction(b => { if(b) b.health -= myAutoDmg; return b; }); }, 1000);
setInterval(() => { frenzy=Math.max(0, frenzy-2); multi=frenzy>=100?5:frenzy>=75?3:frenzy>=50?2:1; document.getElementById('frenzy-bar-fill').style.width=frenzy+'%'; document.getElementById('frenzy-text').innerText=multi>1?`COMBO ${multi}x` : `CHARGE METER`; }, 100);

if(!isOBS) load();
document.getElementById('btn-attack').onpointerdown = attack;
bossImg.onpointerdown = attack;
