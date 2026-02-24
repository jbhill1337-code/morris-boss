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

// PASTE YOUR SWORD IMAGE LINK HERE!
const SWORD_IMAGE_URL = "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/89610245-731c-4afa-8a5b-0d8174875890/d56pg7g-4bca25f8-2cd0-4ac1-86fb-2d6fb41def78.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi84OTYxMDI0NS03MzFjLTRhZmEtOGE1Yi0wZDgxNzQ4NzU4OTAvZDU2cGc3Zy00YmNhMjVmOC0yY2QwLTRhYzEtODZmYi0yZDZmYjQxZGVmNzgucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.oMXwqFIvdUbMDgyf-RKAlc3d6bOY-z1Tv21dAbmtYys";

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
  currentMaxHealth = BASE_HEALTH * currentLevel; 
  
  updateBossUI();
});

function dealGlobalDamage(amount) {
  if (amount <= 0) return;
  
  bossRef.transaction((boss) => {
    if (boss === null) return { health: BASE_HEALTH, level: 1 };
    
    let newHealth = boss.health - amount;
    let newLevel = boss.level;
    
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

// --- 4. PLAYER ACTIONS & PARTICLE SYSTEM ---

// Spawns swords at the click location and flies them at Morris
function spawnSwords(startX, startY) {
  // Find where Morris is on the screen right now
  const bossRect = bossImageEl.getBoundingClientRect();
  const targetX = bossRect.left + bossRect.width / 2;
  const targetY = bossRect.top + bossRect.height / 2;

  // Spawn 4 swords per click
  for (let i = 0; i < 4; i++) {
    const sword = document.createElement('img');
    sword.src = SWORD_IMAGE_URL;
    sword.className = 'sword-particle';
    document.body.appendChild(sword);

    // Spread them out slightly around the finger/mouse
    const offsetX = startX + (Math.random() - 0.5) * 80;
    const offsetY = startY + (Math.random() - 0.5) * 80;
    
    sword.style.left = `${offsetX}px`;
    sword.style.top = `${offsetY}px`;

    // Calculate the angle to point the sword directly at Morris
    const angle = Math.atan2(targetY - offsetY, targetX - offsetX) * (180 / Math.PI);

    // Use Web Animations API to fly them over
    sword.animate([
      { transform: `translate(-50%, -50%) rotate(${angle + 45}deg) scale(0.5)`, opacity: 1 },
      { transform: `translate(${targetX - offsetX}px, ${targetY - offsetY}px) rotate(${angle + 45}deg) scale(1.2)`, opacity: 0 }
    ], {
      duration: 300 + Math.random() * 200, // Slightly randomized speed for a shotgun effect
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }).onfinish = () => sword.remove(); // Delete the image after it hits so the phone doesn't lag
  }
}

function attack(e) {
  dealGlobalDamage(myClickDamage);
  myCoins += 1;
  updateStatsUI();

  bossImageEl.classList.add('shake');
  flashOverlay.style.opacity = '1';
  setTimeout(() => flashOverlay.style.opacity = '0', 50);
  setTimeout(() => bossImageEl.classList.remove('shake'), 150);

  // Grab coordinates from mouse click or mobile touch
  let clickX = window.innerWidth / 2; // Default to center if something fails
  let clickY = window.innerHeight;

  if (e) {
      if (e.type.includes('touch')) {
          clickX = e.touches[0].clientX;
          clickY = e.touches[0].clientY;
      } else {
          clickX = e.clientX;
          clickY = e.clientY;
      }
      spawnSwords(clickX, clickY);
  }
}

function updateStatsUI() {
  coinDisplay.innerText = myCoins.toLocaleString();
  clickDisplay.innerText = myClickDamage.toLocaleString();
  autoDisplay.innerText = myAutoDamage.toLocaleString();
  
  // Explicitly state the exact damage amounts here
  document.getElementById('buy-click').innerHTML = `Sharpen Blade (+2,500 Click Dmg) <br><span>Cost: ${clickUpgradeCost} Coins</span>`;
  document.getElementById('buy-auto').innerHTML = `Hire Mercenary (+1,000 Auto Dmg/sec) <br><span>Cost: ${autoUpgradeCost} Coins</span>`;
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

if(document.getElementById('btn-tip')) {
    document.getElementById('btn-tip').addEventListener('click', () => {
      window.open("https://streamlabs.com/sl_id_9660e12d-ebbd-3a30-8e86-46081327a6a4/tip", '_blank');
    });
}

// --- 6. EVENT LISTENERS & TIMERS ---
// Using pointerdown instead of click so it feels instantly responsive on mobile touchscreens
document.getElementById('btn-attack').addEventListener('pointerdown', (e) => attack(e));
bossImageEl.addEventListener('pointerdown', (e) => attack(e)); 

setInterval(() => {
  if (myAutoDamage > 0) {
    dealGlobalDamage(myAutoDamage);
  }
}, 1000);

