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

const BASE_HEALTH = 1000000000; // 1 Billion
let currentHealth = BASE_HEALTH;
let currentMaxHealth = BASE_HEALTH;
let currentLevel = 1;

// --- 2. PERSISTENCE & STATS ---
// Load saved data or use defaults
let myCoins = parseFloat(localStorage.getItem('vaperCoins')) || 0;
let myClickDamage = parseFloat(localStorage.getItem('clickDamage')) || 2500;
let myAutoDamage = parseFloat(localStorage.getItem('autoDamage')) || 0;
let multiplier = parseFloat(localStorage.getItem('multiplier')) || 1;

const bossTitles = [
  "Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director",
  "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO", "Corp. Frank: Chairman of the Board"
];

const corpQuotes = ["SYNERGY!", "PIVOT!", "LOW HANGING FRUIT!", "BANDWIDTH!"];

// UI Elements
const coinDisplay = document.getElementById('coin-count');
const autoDisplay = document.getElementById('auto-power');
const bossImageEl = document.getElementById('boss-image');
const attackBtn = document.getElementById('btn-attack');
const loader = document.getElementById('loading-screen');

// --- 3. CORE LOGIC ---
function saveGame() {
  localStorage.setItem('vaperCoins', myCoins);
  localStorage.setItem('clickDamage', myClickDamage);
  localStorage.setItem('autoDamage', myAutoDamage);
  localStorage.setItem('multiplier', multiplier);
}

// Global Sync
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (boss === null || isNaN(boss.health)) { 
     boss = { health: BASE_HEALTH, level: 1 }; 
     bossRef.set(boss); 
  }
  currentHealth = boss.health;
  currentLevel = boss.level;
  currentMaxHealth = BASE_HEALTH * currentLevel; 
  updateBossUI();
  if(loader) loader.style.display = 'none'; // Fix loading hang
});

function dealGlobalDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return;
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

// --- 4. ANIMATIONS (The "Cool Effects") ---
function spawnFloatingText(x, y, text, type) {
  const el = document.createElement('div');
  el.innerText = text;
  // Use 'rotating-out' for better readability
  el.className = `floating-text ${type} animate-float`;
  
  // Random rotation for that "indie clicker" feel
  const randomRot = (Math.random() - 0.5) * 40;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.setProperty('--rot', `${randomRot}deg`);
  
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function triggerBossHit() {
  if (!bossImageEl) return;
  bossImageEl.classList.add('boss-shake');
  setTimeout(() => bossImageEl.classList.remove('boss-shake'), 100);
}

// --- 5. INTERACTION ---
if (attackBtn) {
  attackBtn.addEventListener('click', (e) => {
    const totalDmg = myClickDamage * multiplier;
    dealGlobalDamage(totalDmg);
    myCoins += (1 * multiplier);
    
    triggerBossHit();
    spawnFloatingText(e.clientX, e.clientY, `+${Math.floor(totalDmg).toLocaleString()}`, 'damage');
    
    if (Math.random() > 0.8) {
      const rect = bossImageEl.getBoundingClientRect();
      spawnFloatingText(rect.left + rect.width/2, rect.top, corpQuotes[Math.floor(Math.random()*corpQuotes.length)], 'quote');
    }
    updateUI();
  });
}

// Auto-Damage Tick
setInterval(() => {
  if (myAutoDamage > 0) {
    dealGlobalDamage(myAutoDamage * multiplier);
    myCoins += (myAutoDamage * 0.01); // Small coin gain from auto
    updateUI();
  }
}, 1000);

function updateUI() {
  if (coinDisplay) coinDisplay.innerText = Math.floor(myCoins).toLocaleString();
  if (autoDisplay) autoDisplay.innerText = (myAutoDamage * multiplier).toLocaleString();
  saveGame();
}

function updateBossUI() {
  const healthFill = document.getElementById('health-bar-fill');
  const healthText = document.getElementById('health-text');
  const bossNameEl = document.getElementById('boss-name');
  if (!healthFill) return;

  const percentage = Math.max(0, (currentHealth / currentMaxHealth) * 100);
  healthFill.style.width = percentage + '%';
  healthText.innerText = `${currentHealth.toLocaleString()} / ${currentMaxHealth.toLocaleString()}`;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[(currentLevel - 1) % bossTitles.length]}`;
}
