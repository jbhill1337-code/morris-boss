// --- 1. EMERGENCY FAIL-SAFE ---
setTimeout(() => {
  const loader = document.getElementById('loading-screen');
  if (loader && loader.style.display !== 'none') {
    console.warn("Forcing UI display.");
    loader.style.display = 'none';
  }
}, 3000);

// Ensure Firebase loaded
if (typeof firebase === 'undefined') {
  console.error("Firebase missing! Check your index.html scripts.");
} else {
  initGame();
}

function initGame() {
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

  // 1 Billion Health per request
  const BASE_HEALTH = 1000000000; 
  let currentHealth = BASE_HEALTH;
  let currentMaxHealth = BASE_HEALTH;
  let currentLevel = 1;

  // --- 2. PERSISTENCE ---
  let myCoins = parseFloat(localStorage.getItem('vaperCoins')) || 0;
  let myClickDamage = parseFloat(localStorage.getItem('clickDamage')) || 2500;
  let myAutoDamage = parseFloat(localStorage.getItem('autoDamage')) || 0;
  let multiplier = parseFloat(localStorage.getItem('multiplier')) || 1;

  let upgradeCosts = JSON.parse(localStorage.getItem('upgradeCosts')) || {
    interns: 50, management: 500, synergy: 2000, aiBot: 10000, parachute: 50000
  };

  const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];
  const corpQuotes = ["SYNERGY!", "PIVOT!", "BANDWIDTH!", "TOUCH BASE!", "ACTIONABLE ITEMS!"];

  // UI Elements
  const coinDisplay = document.getElementById('coin-count');
  const autoDisplay = document.getElementById('auto-power');
  const bossImageEl = document.getElementById('boss-image');
  const attackBtn = document.getElementById('btn-attack');
  const loader = document.getElementById('loading-screen');

  // --- 3. SHOP LOGIC ---
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
      spawnFloatingText(window.innerWidth/2, window.innerHeight/2, "INSUFFICIENT FUNDS", "damage");
    }
  };

  function saveGame() {
    localStorage.setItem('vaperCoins', myCoins);
    localStorage.setItem('clickDamage', myClickDamage);
    localStorage.setItem('autoDamage', myAutoDamage);
    localStorage.setItem('multiplier', multiplier);
    localStorage.setItem('upgradeCosts', JSON.stringify(upgradeCosts));
  }

  // --- 4. FIREBASE SYNC & UI UPDATES ---
  bossRef.on('value', (snapshot) => {
    let boss = snapshot.val();
    if (!boss) { 
      boss = { health: BASE_HEALTH, level: 1 }; 
      bossRef.set(boss); 
    }
    currentHealth = boss.health;
    currentLevel = boss.level;
    currentMaxHealth = BASE_HEALTH * currentLevel; 
    
    updateBossUI();
    if(loader) loader.style.display = 'none'; // Clear loader on successful fetch
  });

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
    healthText.innerText = `${currentHealth.toLocaleString()} / ${currentMaxHealth.toLocaleString()}`;
    bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[(currentLevel - 1) % bossTitles.length]
