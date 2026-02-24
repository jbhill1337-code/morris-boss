// --- 1. FIREBASE SETUP ---
// Using your exact keys
const firebaseConfig = {
  apiKey: "AIzaSyAEA1pc8eNG4NhiC_mDpssbFIzdtaSHLkM",
  authDomain: "raid-clicker.firebaseapp.com",
  databaseURL: "https://raid-clicker-default-rtdb.firebaseio.com",
  projectId: "raid-clicker",
  storageBucket: "raid-clicker.firebasestorage.app",
  messagingSenderId: "32296108457",
  appId: "1:32296108457:web:ddeca6185e8821626744b8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const bossRef = db.ref('morris/health');

// --- 2. GAME VARIABLES ---
const MAX_HEALTH = 1000000000;
let currentHealth = MAX_HEALTH;

// Local Player Stats
let myCoins = 0;
let myClickDamage = 2500;
let myAutoDamage = 0;

// Upgrade Costs
let clickUpgradeCost = 10;
let autoUpgradeCost = 50;

// UI Elements
const bossImage = document.getElementById('boss-image');
const flashOverlay = document.getElementById('flash-overlay');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const coinDisplay = document.getElementById('coin-count');
const clickDisplay = document.getElementById('click-power');
const autoDisplay = document.getElementById('auto-power');

// --- 3. DATABASE SYNCING ---
// If the database is completely empty (first time running), set it to 1 Billion
bossRef.transaction((health) => {
  if (health === null) return MAX_HEALTH;
  return health;
});

// Listen constantly for anyone in the world dealing damage
bossRef.on('value', (snapshot) => {
  let val = snapshot.val();
  if (val === null) val = MAX_HEALTH;
  currentHealth = val;
  updateHealthBarUI();
});

// Safe transaction to subtract health globally without overlapping clicks
function dealGlobalDamage(amount) {
  if (amount <= 0) return;
  
  bossRef.transaction((health) => {
    if (health === null) return MAX_HEALTH - amount;
    let newHealth = health - amount;
    return newHealth < 0 ? 0 : newHealth; // Prevent negative health
  });
}

function updateHealthBarUI() {
  const percentage = (currentHealth / MAX_HEALTH) * 100;
  healthFill.style.width = percentage + '%';
  healthText.innerText = currentHealth.toLocaleString() + " / " + MAX_HEALTH.toLocaleString();
}

// --- 4. PLAYER ACTIONS ---
function attack() {
  if (currentHealth <= 0) return; // Boss is dead!
  
  // Deal damage to the global database
  dealGlobalDamage(myClickDamage);
  
  // Reward the player with 1 Vapor Coin per click
  myCoins += 1;
  updateStatsUI();

  // Visual effects
  bossImage.classList.add('shake');
  flashOverlay.style.opacity = '1';
  setTimeout(() => flashOverlay.style.opacity = '0', 50);
  setTimeout(() => bossImage.classList.remove('shake'), 150);
}

// Update the text showing coins and damage
function updateStatsUI() {
  coinDisplay.innerText = myCoins.toLocaleString();
  clickDisplay.innerText = myClickDamage.toLocaleString();
  autoDisplay.innerText = myAutoDamage.toLocaleString();
  
  // Update button text to reflect rising costs
  document.getElementById('buy-click').innerHTML = `Sharpen Blade (+2.5k Dmg) <br><span>Cost: ${clickUpgradeCost} Coins</span>`;
  document.getElementById('buy-auto').innerHTML = `Hire Mercenary (+1k Auto/sec) <br><span>Cost: ${autoUpgradeCost} Coins</span>`;
}

// --- 5. SHOP LOGIC ---
document.getElementById('buy-click').addEventListener('click', () => {
  if (myCoins >= clickUpgradeCost) {
    myCoins -= clickUpgradeCost;
    myClickDamage += 2500;
    clickUpgradeCost = Math.floor(clickUpgradeCost * 1.5); // Price goes up each time
    updateStatsUI();
  }
});

document.getElementById('buy-auto').addEventListener('click', () => {
  if (myCoins >= autoUpgradeCost) {
    myCoins -= autoUpgradeCost;
    myAutoDamage += 1000;
    autoUpgradeCost = Math.floor(autoUpgradeCost * 1.5); // Price goes up each time
    updateStatsUI();
  }
});

// --- 6. EVENT LISTENERS & TIMERS ---
document.getElementById('btn-attack').addEventListener('click', attack);
bossImage.addEventListener('click', attack); // Let them click the image directly too!

// Auto-Damage Loop (runs every 1 second if they bought the upgrade)
setInterval(() => {
  if (myAutoDamage > 0 && currentHealth > 0) {
    dealGlobalDamage(myAutoDamage);
    // Optional: Give a small trickle of coins for auto damage?
    // myCoins += Math.floor(myAutoDamage / 1000); 
    // updateStatsUI();
  }
}, 1000);
