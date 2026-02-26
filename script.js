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

// Unified database paths so your game and widget actually talk to each other!
const bossRef = db.ref('frank_corporate_data'); 
const employeesRef = db.ref('active_employees');

// Detect OBS ONLY via explicit URL tag so phones work correctly
const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

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
const corpQuotes = [ "SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!" ];

function save() { if(!isOBS) localStorage.setItem('frank_v9', JSON.stringify({c:myCoins, cd:myClickDmg, ad:myAutoDmg, cc:clickCost, ac:autoCost, u:myUser})); }
function load() {
    const s = localStorage.getItem('frank_v9');
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
    if(b.health < lastHP) triggerGlobalFX();
    lastHP = b.health; curHP = b.health; maxHP = 1000000000 * b.level;
    hpFill.style.width = (curHP/maxHP)*100 + '%';
    hpText.innerText = curHP.toLocaleString() + " / " + maxHP.toLocaleString();
    document.getElementById('boss-name').innerText = "FRANK LV." + b.level;
});

function triggerGlobalFX() {
    if(!bossImg) return;
    const r = Math.random();
    // Random hit frame variations
    if (r < 0.33) bossImg.src = 'boss-hit.png';
    else if (r < 0.66) bossImg.src = 'boss-hit-var-2.png';
    else bossImg.src = 'boss-hit-variation-3.png';
    
    bossImg.classList.add('shake');
    setTimeout(() => { bossImg.src = 'boss-standing.png'; bossImg.classList.remove('shake'); }, 150);
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
    const dmg = myClickDmg * multi;
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

setInterval(() => { if(myAutoDmg>0) bossRef.transaction(b => { if(b) b.health -= myAutoDmg; return b; }); }, 1000);
setInterval(() => { frenzy=Math.max(0, frenzy-2); multi=frenzy>=100?5:frenzy>=75?3:frenzy>=50?2:1; document.getElementById('frenzy-bar-fill').style.width=frenzy+'%'; document.getElementById('frenzy-text').innerText=multi>1?`COMBO ${multi}x` : `CHARGE METER`; }, 100);

if(!isOBS) load();
document.getElementById('btn-attack').onpointerdown = attack;
bossImg.onpointerdown = attack;
// Add functionality to the Tip Button
const tipBtn = document.getElementById('btn-tip');
if (tipBtn) {
    tipBtn.onpointerdown = (e) => {
        e.preventDefault(); // Prevents zooming on mobile
        // Replace this URL with your actual tipping link (Ko-fi, Streamlabs, etc.)
        window.open("https://your-tip-link-here.com", "_blank"); 
    };
}




