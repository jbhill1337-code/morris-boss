// --- 1. KILL LOADING SCREEN IMMEDIATELY ---
const loader = document.getElementById('loading-screen');
if (loader) loader.style.display = 'none';

// --- 2. GAME DATA SETUP ---
const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentMaxHealth = BASE_HEALTH;
let currentLevel = 1;

// Anti-Corruption Filter: Prevents "NaN" bugs from breaking the buttons
function getSavedNum(key, defaultVal) {
  let val = localStorage.getItem(key);
  if (!val) return defaultVal;
  let parsed = parseFloat(val);
  return isNaN(parsed) ? defaultVal : parsed;
}

// Load Progress
let myCoins = getSavedNum('vaperCoins', 0);
let myClickDamage = getSavedNum('clickDamage', 2500);
let myAutoDamage = getSavedNum('autoDamage', 0);
let multiplier = getSavedNum('multiplier', 1);

let defaultCosts = { interns: 50, management: 500, synergy: 2000, aiBot: 10000, parachute: 50000 };
let upgradeCosts = JSON.parse(localStorage.getItem('upgradeCosts'));
if (!upgradeCosts || typeof upgradeCosts !== 'object') upgradeCosts = defaultCosts;

const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];
const corpQuotes = ["SYNERGY!", "PIVOT!", "BANDWIDTH!", "TOUCH BASE!", "ACTIONABLE ITEMS!"];

// UI Elements
const coinDisplay = document.getElementById('coin-count');
const autoDisplay = document.getElementById('auto-power');
const bossImageEl = document.getElementById('boss-image');
const attackBtn = document.getElementById('btn-attack');

// --- 3. FIREBASE SYNC (OPTIONAL/SAFE) ---
let bossRef = null;
if (typeof firebase !== 'undefined' && firebase.apps) {
  try {
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
    bossRef = firebase.database().ref('frank_corporate_data');
    
    // Listen for database changes
    bossRef.on('value', (snapshot) => {
      let boss = snapshot.val();
      if (!boss || isNaN(boss.health)) {
        bossRef.set({ health: BASE_HEALTH, level: 1 });
      } else {
        currentHealth = boss.health;
        currentLevel = boss.level;
        currentMaxHealth = BASE_HEALTH * currentLevel;
        updateBossUI();
      }
    });
  } catch (err) {
    console.error("Firebase sync failed, running locally.", err);
  }
}

// --- 4. CORE MECHANICS ---
function saveGame() {
  localStorage.setItem('vaperCoins', myCoins);
  localStorage.setItem('clickDamage', myClickDamage);
  localStorage.setItem('autoDamage', myAutoDamage);
  localStorage.setItem('multiplier', multiplier);
  localStorage.setItem('upgradeCosts', JSON.stringify(upgradeCosts));
}

function processDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return;
  
  if (bossRef) {
    // Send to database if connected
    bossRef.transaction((boss) => {
      if (!boss) return { health: BASE_HEALTH, level: 1 };
      let nH = boss.health - amount;
      let nL = boss.level;
      if (nH <= 0) { nL++; nH = BASE_HEALTH * nL; }
      return { health: nH, level: nL };
    });
  } else {
    // Local fallback if offline
    currentHealth -= amount;
    if (currentHealth <= 0) {
      currentLevel++;
      currentHealth = BASE_HEALTH * currentLevel;
      currentMaxHealth = BASE_HEALTH * currentLevel;
    }
    updateBossUI();
  }
}

// Global Shop Purchase Function
window.buyUpgrade = function(type) {
  if (myCoins >= upgradeCosts[type]) {
    myCoins -= upgradeCosts[type];
    
    if (type === 'interns') myAutoDamage += 500;
    if (type === 'management') myClickDamage += 1000;
    if (type === 'synergy') multiplier += 0.2;
    if (type === 'aiBot') myAutoDamage += 5000;
    if (type === 'parachute') { myClickDamage *= 1.5; myAutoDamage *= 1.5; }

    upgradeCosts[type] = Math.floor(upgradeCosts[type] * 1.6);
    
    updateUI();
    saveGame();
    spawnFloatingText(window.innerWidth/2, window.innerHeight/2, "UPGRADED!", "quote");
  } else {
    spawnFloatingText(window.innerWidth/2, window.innerHeight/2, "NEED COINS!", "damage");
  }
};

// --- 5. UI UPDATES ---
function updateUI() {
  if (coinDisplay) coinDisplay.innerText = Math.floor(myCoins).toLocaleString();
  if (autoDisplay) autoDisplay.innerText = Math.floor(myAutoDamage * multiplier).toLocaleString();
  
  for (let key in upgradeCosts) {
    const btn = document.getElementById(`buy-${key}`);
    if (btn) {
      let label = key.charAt(0).toUpperCase() + key.slice(1);
      btn.innerText = `${label}: ${upgradeCosts[key].toLocaleString()} Coins`;
    }
  }
}

function updateBossUI() {
  const healthFill = document.getElementById('health-bar-fill');
  const healthText = document.getElementById('health-text');
  const bossNameEl = document.getElementById('boss-name');
  if (!healthFill) return;
  
  const percentage = Math.max(0, (currentHealth / currentMaxHealth) * 100);
  healthFill.style.width = percentage + '%';
  healthText.innerText = `${Math.floor(currentHealth).toLocaleString()} / ${currentMaxHealth.toLocaleString()}`;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[(currentLevel - 1) % bossTitles.length]}`;
}

// --- 6. ANIMATIONS & EVENTS ---
function spawnFloatingText(x, y, text, type) {
  const el = document.createElement('div');
  el.innerText = text;
  el.className = `floating-text ${type} animate-float`;
  const randomRot = (Math.random() - 0.5) * 60;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.setProperty('--rot', `${randomRot}deg`);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// The Main Click Event
if (attackBtn) {
  attackBtn.addEventListener('click', (e) => {
    const totalDmg = myClickDamage * multiplier;
    processDamage(totalDmg);
    myCoins += (1 * multiplier);
    
    if (bossImageEl) {
      bossImageEl.classList.add('boss-shake');
      setTimeout(() => bossImageEl.classList.remove('boss-shake'), 100);
    }
    
    spawnFloatingText(e.clientX, e.clientY, `+${Math.floor(totalDmg).toLocaleString()}`, 'damage');
    
    if (Math.random() > 0.8) {
      const rect = bossImageEl.getBoundingClientRect();
      spawnFloatingText(rect.left + rect.width/2, rect.top, corpQuotes[Math.floor(Math.random()*corpQuotes.length)], 'quote');
    }
    updateUI();
    saveGame();
  });
}

// Passive Auto-Damage Loop
setInterval(() => {
  if (myAutoDamage > 0) {
    const totalAuto = myAutoDamage * multiplier;
    processDamage(totalAuto);
    myCoins += (totalAuto * 0.01);
    updateUI();
    saveGame();
  }
}, 1000);

// Set initial screen numbers
updateUI();
