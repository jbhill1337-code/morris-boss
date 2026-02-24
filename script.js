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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
// Syncs health AND level globally
const bossRef = db.ref('morris_raid_data');

// --- 2. GAME VARIABLES & BOSS LEVELS ---
const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentLevel = 1;
let currentMaxHealth = BASE_HEALTH;

const bossTitles = [
  "Morris: Corporate Overlord",
  "Morris: Elite Manager",
  "Morris: Regional Director",
  "Morris: VP of Suffering",
  "Morris: The Final CEO",
  "Morris: God of Retail"
];

let myCoins = 0;
let myClickDamage = 2500;
let myAutoDamage = 0;

let clickUpgradeCost = 10;
let autoUpgradeCost = 50;

const bossNameEl = document.getElementById('boss-name');
const bossImageEl = document.getElementById('boss-image');
const flashOverlay = document.getElementById('flash-overlay');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const coinDisplay = document.getElementById('coin-count');
const clickDisplay = document.getElementById('click-power');
const autoDisplay = document.getElementById('auto-power');

// --- 3. DATABASE SYNCING ---
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  
  if (boss === null) {
      boss = { health: BASE_HEALTH, level: 1 };
      bossRef.set(boss); 
  }
  
  currentHealth = boss.health;
  currentLevel = boss.level;
  currentMaxHealth = BASE_HEALTH * currentLevel; // Health multiplies every level
  
  updateBossUI();
});

function dealGlobalDamage(amount) {
  if (amount <= 0) return;
  
  bossRef.transaction((boss) => {
    if (boss === null) return { health: BASE_HEALTH, level: 1 };
    
    let newHealth = boss.health - amount;
    let newLevel = boss.level;
    
    // Level Up: Health restores fully and increases maximum capacity
    if (newHealth <= 0) {
        newLevel += 1;
        newHealth = BASE_HEALTH * newLevel; 
    }
    
    return { health: newHealth, level: newLevel };
  });
}

function updateBossUI() {
  const percentage = (currentHealth / currentMaxHealth) * 100;
  healthFill.style.width = percentage + '%';
  healthText.innerText = currentHealth.toLocaleString() + " / " + currentMaxHealth.toLocaleString();
  
  let titleIndex = (currentLevel - 1) % bossTitles.length;
  let newTitle = bossTitles[titleIndex];
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${newTitle}`;
}

// --- 4. PLAYER ACTIONS ---
function attack() {
  dealGlobalDamage(myClickDamage);
  myCoins += 1;
  updateStatsUI();

  bossImageEl.classList.add('shake');
  flashOverlay.style.opacity = '1';
  setTimeout(() => flashOverlay.style.opacity = '0', 50);
  setTimeout(() => bossImageEl.classList.remove('shake'), 150);
}

function updateStatsUI() {
  coinDisplay.innerText = myCoins.toLocaleString();
  clickDisplay.innerText = myClickDamage.toLocaleString();
  autoDisplay.innerText = myAutoDamage.toLocaleString();
  
  document.getElementById('buy-click').innerHTML = `Sharpen Blade (+2.5k Dmg) <br><span>Cost: ${clickUpgradeCost} Coins</span>`;
  document.getElementById('buy-auto').innerHTML = `Hire Mercenary (+1k Auto/sec) <br><span>Cost: ${autoUpgradeCost} Coins</span>`;
}

// --- 5. SHOP & TIP LOGIC ---
document.getElementById('buy-click').addEventListener('click', () => {
  if (myCoins >= clickUpgradeCost) {
    myCoins -= clickUpgradeCost;
    myClickDamage += 2500;
    clickUpgradeCost = Math.floor(clickUpgradeCost * 1.5); 
    updateStatsUI();
  }
});

document.getElementById('buy-auto').addEventListener('click', () => {
  if (myCoins >= autoUpgradeCost) {
    myCoins -= autoUpgradeCost;
    myAutoDamage += 1000;
    autoUpgradeCost = Math.floor(autoUpgradeCost * 1.5); 
    updateStatsUI();
  }
});

// Update the placeholder URL with your actual Streamlabs tip page URL
if(document.getElementById('btn-tip')) {
    document.getElementById('btn-tip').addEventListener('click', () => {
      window.open("https://streamlabs.com/YOUR_USERNAME_HERE/tip", '_blank');
    });
}

// --- 6. EVENT LISTENERS & TIMERS ---
document.getElementById('btn-attack').addEventListener('click', attack);
bossImageEl.addEventListener('click', attack); 

setInterval(() => {
  if (myAutoDamage > 0) {
    dealGlobalDamage(myAutoDamage);
  }
}, 1000);
