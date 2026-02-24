// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyAEA1pc8eNG4NhiC_mDpssbFIzdtaSHLkM",
  authDomain: "raid-clicker.firebaseapp.com",
  databaseURL: "https://raid-clicker-default-rtdb.firebaseio.com",
  projectId: "raid-clicker",
  storageBucket: "raid-clicker.firebasestorage.app",
  messagingSenderId: "32296108457",
  appId: "1:32296108457:web:ddeca6185e8821626744b8"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();
// Brand new, uncorrupted save file
const bossRef = db.ref('frank_corporate_data_v4'); 

const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentLevel = 1;
let currentMaxHealth = BASE_HEALTH;

const bossTitles = [
  "Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director",
  "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO", "Corp. Frank: Chairman of the Board"
];

const corpQuotes = [
  "SYNERGY!", "LET'S CIRCLE BACK!", "THINK OUTSIDE THE BOX!", 
  "WE NEED MORE BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", 
  "TOUCH BASE!", "ACTIONABLE ITEMS!", "LOW HANGING FRUIT!", "PARADIGM SHIFT!"
];

let myCoins = 0;
let myClickDamage = 2500;
let myAutoDamage = 0;
let clickUpgradeCost = 10;
let autoUpgradeCost = 50;
let frenzyLevel = 0;
let comboMultiplier = 1;

const SWORD_IMAGE_URL = "https://cdn.discordapp.com/attachments/479148520935522315/1475889414352801924/d56pg7g-4bca25f8-2cd0-4ac1-86fb-2d6fb41def78.png?ex=699f20a1&is=699dcf21&hm=ac5b6ff711c0e58af775dd56159f3534aa46ed9d01137b840e24cf827907e7dd&";

const bossNameEl = document.getElementById('boss-name');
const bossImageEl = document.getElementById('boss-image');
const flashOverlay = document.getElementById('flash-overlay');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const coinDisplay = document.getElementById('coin-count');
const clickDisplay = document.getElementById('click-power');
const autoDisplay = document.getElementById('auto-power');
const frenzyFill = document.getElementById('frenzy-bar-fill');
const frenzyText = document.getElementById('frenzy-text');
const attackBtn = document.getElementById('btn-attack');

// --- DATABASE SYNC ---
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (boss === null || isNaN(boss.health) || isNaN(boss.level)) { 
     boss = { health: BASE_HEALTH, level: 1 }; 
     bossRef.set(boss); 
  }
  currentHealth = boss.health;
  currentLevel = boss.level;
  currentMaxHealth = BASE_HEALTH * currentLevel; 
  updateBossUI();
});

function dealGlobalDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return;
  bossRef.transaction((boss) => {
    if (boss === null || isNaN(boss.health)) return { health: BASE_HEALTH, level: 1 };
    let newHealth = boss.health - amount;
    let newLevel = boss.level;
    if (newHealth <= 0) { newLevel += 1; newHealth = BASE_HEALTH * newLevel; }
    return { health: newHealth, level: newLevel };
  });
}

function updateBossUI() {
  if (!healthFill || !healthText || !bossNameEl) return; 
  const percentage = (currentHealth / currentMaxHealth) * 100;
  healthFill.style.width = percentage + '%';
  healthText.innerText = currentHealth.toLocaleString() + " / " + currentMaxHealth.toLocaleString();
  let titleIndex = (currentLevel - 1) % bossTitles.length;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[titleIndex]}`;
}

// --- VISUAL FX ---
function spawnSwords(startX, startY) {
  if (!bossImageEl) return;
  const bossRect = bossImageEl.getBoundingClientRect();
  const targetX = bossRect.left + bossRect.width / 2;
  const targetY = bossRect.top + bossRect.height / 2;

  for (let i = 0; i < 4; i++) {
    const sword = document.createElement('img');
    sword.src = SWORD_IMAGE_URL;
    sword.className = 'sword-particle';
    sword.style.left = '0px'; sword.style.top = '0px';
    document.body.appendChild(sword);

    const offsetX = startX + (Math.random() - 0.5) * 60;
    const offsetY = startY + (Math.random() - 0.5) * 60;
    const deltaX = targetX - offsetX;
    const deltaY = targetY - offsetY;
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    sword.animate([
      { transform: `translate(${offsetX - 20}px, ${offsetY - 20}px) rotate(${angle + 45}deg) scale(0.5)`, opacity: 1 },
      { transform: `translate(${targetX - 20}px, ${targetY - 20}px) rotate(${angle + 45}deg) scale(1.2)`, opacity: 0 }
    ], { duration: 250 + Math.random() * 150, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }).onfinish = () => sword.remove(); 
  }
}

function spawnDamageNumber(startX, startY, amount) {
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-popup';
    damageEl.innerText = `+${amount.toLocaleString()}`;
    document.body.appendChild(damageEl);
    damageEl.style.left = `${startX + (Math.random() * 20 - 10)}px`;
    damageEl.style.top = `${startY - 30}px`;
    
    // Dynamically assign slight random rotation so it doesn't break CSS
    damageEl.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
    setTimeout(() => { damageEl.remove(); }, 800);
}

function spawnQuote() {
    if (!bossImageEl) return;
    const bossRect = bossImageEl.getBoundingClientRect();
    const headX = bossRect.left + bossRect.width / 2;
    const headY = bossRect.top + (bossRect.height * 0.2); 

    const quoteEl = document.createElement('div');
    quoteEl.className = 'quote-popup';
    quoteEl.innerText = corpQuotes[Math.floor(Math.random() * corpQuotes.length)];
    document.body.appendChild(quoteEl);
    
    quoteEl.style.left = `${headX + (Math.random() * 60 - 30)}px`;
    quoteEl.style.top = `${headY}px`;
    
    // Determine float direction dynamically
    const floatDir = Math.random() > 0.5 ? 60 : -60;
    quoteEl.animate([
      { opacity: 1, transform: `translate(0, 0) scale(0.8)` },
      { opacity: 0, transform: `translate(${floatDir}px, -40px) scale(1.1)` }
    ], { duration: 1000, easing: 'ease-out' }).onfinish = () => quoteEl.remove();
}

// --- PLAYER ATTACK LOGIC ---
function attack(e) {
  let actualDamage = myClickDamage * comboMultiplier;
  dealGlobalDamage(actualDamage);
  myCoins += 1 * comboMultiplier; 
  
  frenzyLevel += 8;
  if (frenzyLevel > 100) frenzyLevel = 100;
  updateFrenzyUI();
  updateStatsUI();

  if (bossImageEl) { bossImageEl.classList.remove('shake'); void bossImageEl.offsetWidth; bossImageEl.classList.add('shake'); }
  if (attackBtn) { attackBtn.classList.remove('spark'); void attackBtn.offsetWidth; attackBtn.classList.add('spark'); }
  if (flashOverlay) { flashOverlay.style.opacity = '0.5'; setTimeout(() => flashOverlay.style.opacity = '0', 30); }

  let clickX = window.innerWidth / 2; let clickY = window.innerHeight - 100;
  if (e) {
      if (e.clientX !== undefined && e.clientY !== undefined) { clickX = e.clientX; clickY = e.clientY; } 
      else if (e.touches && e.touches.length > 0) { clickX = e.touches[0].clientX; clickY = e.touches[0].clientY; }
  }
  
  spawnSwords(clickX, clickY);
  spawnDamageNumber(clickX, clickY, actualDamage);
  
  if (Math.random() < 0.30) {
      spawnQuote();
  }
}

setInterval(() => {
    if (frenzyLevel > 0) { frenzyLevel -= 3; if (frenzyLevel < 0) frenzyLevel = 0; updateFrenzyUI(); }
}, 100);

function updateFrenzyUI() {
    if (!frenzyFill || !frenzyText) return;
    if (frenzyLevel >= 100) comboMultiplier = 5;
    else if (frenzyLevel >= 75) comboMultiplier = 3;
    else if (frenzyLevel >= 50) comboMultiplier = 2;
    else comboMultiplier = 1;

    frenzyFill.style.width = frenzyLevel + '%';
    if (comboMultiplier > 1) { frenzyText.innerText = `COMBO: ${comboMultiplier}x DAMAGE!`; frenzyFill.style.backgroundColor = '#ff0055'; } 
    else { frenzyText.innerText = `CHARGE METER`; frenzyFill.style.backgroundColor = '#ffeb3b'; }
}

function updateStatsUI() {
  if (!coinDisplay || !clickDisplay || !autoDisplay) return; 
  coinDisplay.innerText = myCoins.toLocaleString();
  clickDisplay.innerText = myClickDamage.toLocaleString();
  autoDisplay.innerText = myAutoDamage.toLocaleString();
  const buyClickEl = document.getElementById('buy-click');
  const buyAutoEl = document.getElementById('buy-auto');
  if (buyClickEl) buyClickEl.innerHTML = `Sharpen Blade (+2,500 Click Dmg) <br><span>Cost: ${clickUpgradeCost} Coins</span>`;
  if (buyAutoEl) buyAutoEl.innerHTML = `Hire Mercenary (+1,000 Auto Dmg/sec) <br><span>Cost: ${autoUpgradeCost} Coins</span>`;
}

// --- SHOP & TIP LOGIC ---
const buyClickBtn = document.getElementById('buy-click');
if (buyClickBtn) {
    buyClickBtn.addEventListener('click', () => {
      if (myCoins >= clickUpgradeCost) { myCoins -= clickUpgradeCost; myClickDamage += 2500; clickUpgradeCost = Math.floor(clickUpgradeCost * 1.5); updateStatsUI(); }
    });
}
const buyAutoBtn = document.getElementById('buy-auto');
if (buyAutoBtn) {
    buyAutoBtn.addEventListener('click', () => {
      if (myCoins >= autoUpgradeCost) { myCoins -= autoUpgradeCost; myAutoDamage += 1000; autoUpgradeCost = Math.floor(autoUpgradeCost * 1.5); updateStatsUI(); }
    });
}
const tipBtn = document.getElementById('btn-tip');
if(tipBtn) {
    tipBtn.addEventListener('click', () => { window.open("https://streamlabs.com/sl_id_9660e12d-ebbd-3a30-8e86-46081327a6a4/tip", '_blank'); });
}

// --- EVENT LISTENERS ---
if (attackBtn) attackBtn.addEventListener('pointerdown', (e) => attack(e));
if (bossImageEl) bossImageEl.addEventListener('pointerdown', (e) => attack(e)); 
setInterval(() => { if (myAutoDamage > 0) { dealGlobalDamage(myAutoDamage); } }, 1000);
