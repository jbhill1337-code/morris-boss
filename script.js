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
const bossRef = db.ref('morris_raid_data');

const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentLevel = 1;
let currentMaxHealth = BASE_HEALTH;

const bossTitles = [
  "Morris: Corporate Overlord", "Morris: Elite Manager", "Morris: Regional Director",
  "Morris: VP of Suffering", "Morris: The Final CEO", "Morris: God of Retail"
];

let myCoins = 0;
let myClickDamage = 2500;
let myAutoDamage = 0;
let clickUpgradeCost = 10;
let autoUpgradeCost = 50;

// --- NEW FRENZY VARIABLES ---
let frenzyLevel = 0; // Goes from 0 to 100
let comboMultiplier = 1;

// PASTE YOUR DISCORD SWORD LINK HERE!
const SWORD_IMAGE_URL = "YOUR_DISCORD_SWORD_LINK_HERE";

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

// --- DATABASE SYNC ---
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (boss === null) { boss = { health: BASE_HEALTH, level: 1 }; bossRef.set(boss); }
  currentHealth = boss.health;
  currentLevel = boss.level;
  currentMaxHealth = BASE_HEALTH * currentLevel; 
  updateBossUI();
});

function dealGlobalDamage(amount) {
  if (amount <= 0) return;
  bossRef.transaction((boss) => {
    if (boss === null) return { health: BASE_HEALTH, level: 1 };
    let newHealth = boss.health - amount;
    let newLevel = boss.level;
    if (newHealth <= 0) { newLevel += 1; newHealth = BASE_HEALTH * newLevel; }
    return { health: newHealth, level: newLevel };
  });
}

function updateBossUI() {
  const percentage = (currentHealth / currentMaxHealth) * 100;
  healthFill.style.width = percentage + '%';
  healthText.innerText = currentHealth.toLocaleString() + " / " + currentMaxHealth.toLocaleString();
  let titleIndex = (currentLevel - 1) % bossTitles.length;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[titleIndex]}`;
}

// --- VISUAL PARTICLE SYSTEM ---
function spawnSwords(startX, startY) {
  const bossRect = bossImageEl.getBoundingClientRect();
  const targetX = bossRect.left + bossRect.width / 2;
  const targetY = bossRect.top + bossRect.height / 2;

  for (let i = 0; i < 4; i++) {
    const sword = document.createElement('img');
    sword.src = SWORD_IMAGE_URL;
    sword.className = 'sword-particle';
    document.body.appendChild(sword);

    const offsetX = startX + (Math.random() - 0.5) * 80;
    const offsetY = startY + (Math.random() - 0.5) * 80;
    
    sword.style.left = `${offsetX}px`;
    sword.style.top = `${offsetY}px`;

    const angle = Math.atan2(targetY - offsetY, targetX - offsetX) * (180 / Math.PI);

    sword.animate([
      { transform: `translate(-5
