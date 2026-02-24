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
const bossRef = db.ref('frank_corporate_data'); 

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

    const offsetX = startX + (Math.random() - 0
