// --- 1. CONFIG & DATA ---
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
const bossRef = db.ref('frank_corporate_data'); 

const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentMaxHealth = BASE_HEALTH;
let currentLevel = 1;

// --- 2. PERSISTENCE & STATS ---
let myCoins = parseFloat(localStorage.getItem('vaperCoins')) || 0;
let myClickDamage = parseFloat(localStorage.getItem('clickDamage')) || 2500;
let myAutoDamage = parseFloat(localStorage.getItem('autoDamage')) || 0;
let multiplier = parseFloat(localStorage.getItem('multiplier')) || 1;

// Save/Load Costs so prices don't reset on refresh
let upgradeCosts = JSON.parse(localStorage.getItem('upgradeCosts')) || {
  interns: 50,
  management: 500,
  synergy: 2000,
  aiBot: 10000,
  parachute: 50000
};

const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];
const corpQuotes = ["SYNERGY!", "PIVOT!", "LOW HANGING FRUIT!", "BANDWIDTH!", "ACTIONABLE ITEMS!"];

// UI Elements
const coinDisplay = document.getElementById('coin-count');
const autoDisplay = document.getElementById('auto-power');
const bossImageEl = document.getElementById('boss-image');
const attackBtn = document.getElementById('btn-attack');
const loader = document.getElementById('loading-screen');

// --- 3. THE SHOP LOGIC (FIXED) ---
window.buyUpgrade = function(type) {
  if (myCoins >= upgradeCosts[type]) {
    myCoins -= upgradeCosts[type];
    
    // Apply Corporate Effects
    if (type === 'interns') myAutoDamage += 500;
    if (type === 'management') myClickDamage += 1000;
    if (type === 'synergy') multiplier += 0.2;
    if (type === 'aiBot') myAutoDamage += 5000;
    if (type === 'parachute') { myClickDamage *= 1.5; myAutoDamage *= 1.5; }

    // Progressive Scaling
    upgradeCosts[type] = Math.floor(upgradeCosts[type] * 1.6);
    
    updateUI();
    saveGame();
    
    // Visual Feedback
    spawnFloatingText(window.innerWidth/2, window.innerHeight/2, "UPGRADED!", "quote");
  } else {
    spawnFloatingText(window.innerWidth/2, window.innerHeight/2, "INSUFFICIENT FUNDS", "damage");
  }
};

// --- 4. CORE ENGINE ---
function saveGame() {
  localStorage.setItem('vaperCoins', myCoins);
  localStorage.setItem('clickDamage', myClickDamage);
  localStorage.setItem('autoDamage', myAutoDamage);
  localStorage.setItem('multiplier', multiplier);
  localStorage.setItem('upgradeCosts', JSON.stringify(upgradeCosts));
}

bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (
