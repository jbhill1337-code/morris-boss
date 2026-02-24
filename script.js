// --- 1. THE 3-SECOND INTRO SEQUENCE ---
// This guarantees the game will show after exactly 3 seconds.
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    const gameUI = document.getElementById('game-container');
    if (loader) loader.style.display = 'none';
    if (gameUI) gameUI.style.display = 'block'; // Reveals the game
  }, 3000); 
});

// --- 2. GAME DATA SETUP ---
const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentMaxHealth = BASE_HEALTH;
let currentLevel = 1;

// Anti-crash wrapper for saving data
function getSavedNum(key, defaultVal) {
  try {
    let val = localStorage.getItem(key);
    if (!val) return defaultVal;
    let parsed = parseFloat(val);
    return isNaN(parsed) ? defaultVal : parsed;
  } catch (e) {
    return defaultVal;
  }
}

let myCoins = getSavedNum('vaperCoins', 0);
let myClickDamage = getSavedNum('clickDamage', 2500);
let myAutoDamage = getSavedNum('autoDamage', 0);
let multiplier = getSavedNum('multiplier', 1);

let defaultCosts = { interns: 50, management: 500, synergy: 2000, aiBot: 10000, parachute: 50000 };
let upgradeCosts = defaultCosts;
try {
  let savedCosts = JSON.parse(localStorage.getItem('upgradeCosts'));
  if (savedCosts && typeof savedCosts === 'object') {
    upgradeCosts = savedCosts;
  }
} catch (e) {}

const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];
const corpQuotes = ["SYNERGY!", "PIVOT!", "BANDWIDTH!", "TOUCH BASE!", "ACTIONABLE ITEMS!", "CIRCLE BACK!"];

const coinDisplay = document.getElementById('coin-count');
const autoDisplay = document.getElementById('auto-power');
const bossImageEl = document.getElementById('boss-image'); 

// --- 3. FIREBASE SYNC (SAFE MODE) ---
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
  try {
    localStorage.setItem('vaperCoins', myCoins);
    localStorage.setItem('clickDamage', myClickDamage);
    localStorage.setItem('autoDamage', myAutoDamage);
    localStorage.setItem('multiplier', multiplier);
    localStorage.setItem('upgradeCosts', JSON.stringify(upgradeCosts));
  } catch (e) {}
}

function processDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return;
  
  if (bossRef) {
    bossRef.transaction((boss) => {
      if (!boss) return { health: BASE_HEALTH, level: 1 };
      let nH = boss.health - amount;
      let nL = boss.level;
      if (nH <= 0) { nL++; nH = BASE_HEALTH * nL; }
      return { health: nH, level: nL };
    });
  } else {
    currentHealth -= amount;
    if (currentHealth <= 0) {
      currentLevel++;
      currentHealth = BASE_HEALTH * currentLevel;
      currentMaxHealth = BASE_HEALTH * currentLevel;
    }
    updateBossUI();
  }
}

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
  }
};

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

function spawnFloatingText(x, y, text, type) {
  const el = document.createElement('div');
  el.innerText = text;
  el.className = `floating-text ${type} animate-float`;
  const randomRot = (Math.random() - 0.5) * 40; 
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.setProperty('--rot', `${randomRot}deg`);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// --- CLICK FRANK TO ATTACK ---
if (bossImageEl) {
  bossImageEl.addEventListener('click', (e) => {
    const totalDmg = myClickDamage * multiplier;
    processDamage(totalDmg);
    myCoins += (1 * multiplier);
    
    bossImageEl.classList.remove('boss-shake'); 
    void bossImageEl.offsetWidth; 
    bossImageEl.classList.add('boss-shake');
    
    spawnFloatingText(e.clientX, e.clientY, `+${Math.floor(totalDmg).toLocaleString()}`, 'damage');
    
    if (Math.random() > 0.5) {
      const randomQuote = corpQuotes[Math.floor(Math.random() * corpQuotes.length)];
      spawnFloatingText(e.clientX, e.clientY - 40, randomQuote, 'quote');
    }
    updateUI();
    saveGame();
  });
}

setInterval(() => {
  if (myAutoDamage > 0) {
    const totalAuto = myAutoDamage * multiplier;
    processDamage(totalAuto);
    myCoins += (totalAuto * 0.01);
    updateUI();
    saveGame();
  }
}, 1000);

updateUI();
