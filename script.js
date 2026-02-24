// --- 1. PLAYER IDENTITY SETUP ---
let myPlayerId = localStorage.getItem('employeeId');
let myPlayerName = localStorage.getItem('employeeName');
let myEmoji = localStorage.getItem('employeeEmoji');
const employeeEmojis = ["💼", "☕", "📈", "🖨️", "📎", "💻", "🗑️"];

// --- 2. THE INTRO & POP-UP SEQUENCE (FIXED) ---
// This now runs strictly on a 3-second timer, ignoring slow image downloads.
setTimeout(() => {
  const loader = document.getElementById('loading-screen');
  const gameUI = document.getElementById('game-container');
  const nameModal = document.getElementById('name-modal');
  
  if (loader) loader.style.display = 'none';
  
  // Check if they need to "Clock In"
  if (!myPlayerId || !myPlayerName) {
    if (nameModal) nameModal.style.display = 'flex';
  } else {
    if (gameUI) gameUI.style.display = 'block'; 
  }
}, 3000); 

// Handle the "Clock In" Button
const joinBtn = document.getElementById('btn-join-raid');
if (joinBtn) {
  joinBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('player-name-input');
    const enteredName = nameInput.value.trim();
    
    if (enteredName.length > 0) {
      myPlayerId = 'emp_' + Math.random().toString(36).substr(2, 9);
      myPlayerName = enteredName;
      myEmoji = employeeEmojis[Math.floor(Math.random() * employeeEmojis.length)];
      
      localStorage.setItem('employeeId', myPlayerId);
      localStorage.setItem('employeeName', myPlayerName);
      localStorage.setItem('employeeEmoji', myEmoji);
      
      document.getElementById('name-modal').style.display = 'none';
      document.getElementById('game-container').style.display = 'block';
    } else {
      alert("Corporate requires a valid name!");
    }
  });
}

// --- 3. GAME DATA SETUP ---
const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let currentMaxHealth = BASE_HEALTH;
let currentLevel = 1;

function getSavedNum(key, defaultVal) {
  try {
    let val = localStorage.getItem(key);
    if (!val) return defaultVal;
    let parsed = parseFloat(val);
    return isNaN(parsed) ? defaultVal : parsed;
  } catch (e) { return defaultVal; }
}

let myCoins = getSavedNum('vaperCoins_v2', 0);
let myClickDamage = getSavedNum('clickDamage_v2', 2500);
let myAutoDamage = getSavedNum('autoDamage_v2', 0);
let multiplier = getSavedNum('multiplier_v2', 1);

let defaultCosts = { interns: 50, management: 500, synergy: 2000, aiBot: 10000, parachute: 50000 };
let upgradeCosts = { ...defaultCosts }; 
try {
  let savedCosts = JSON.parse(localStorage.getItem('upgradeCosts_v2'));
  if (savedCosts && typeof savedCosts === 'object') {
    upgradeCosts = { ...defaultCosts, ...savedCosts };
  }
} catch (e) {}

const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];
const corpQuotes = ["SYNERGY!", "PIVOT!", "BANDWIDTH!", "TOUCH BASE!", "ACTIONABLE ITEMS!", "CIRCLE BACK!"];

const coinDisplay = document.getElementById('coin-count');
const autoDisplay = document.getElementById('auto-power');
const bossImageEl = document.getElementById('boss-image'); 

const frankBaseImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475923508126027859/Gemini_Generated_Image_ko01sxko01sxko01-removebg-preview.png?ex=699f4061&is=699deee1&hm=4b906dc663568cd151e4ad0552f8f1e570af1c61f04fb48d2b38972abd341b5d&";
const frankDamagedImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475947203385364631/unnamed__2_-removebg-preview.png?ex=699f5673&is=699e04f3&hm=b4bf446ecd920676bc8d776ad99251d2a70fbefa464ee3209e1b0d8945e55425&";

// --- 4. FIREBASE SYNC (SAFE MODE) ---
let bossRef = null;
let activeEmployeesRef = null;

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
    activeEmployeesRef = firebase.database().ref('active_employees');
    
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
  } catch (err) { console.error("Firebase sync failed.", err); }
}

// --- 5. CORE MECHANICS ---
function saveGame() {
  try {
    localStorage.setItem('vaperCoins_v2', myCoins);
    localStorage.setItem('clickDamage_v2', myClickDamage);
    localStorage.setItem('autoDamage_v2', myAutoDamage);
    localStorage.setItem('multiplier_v2', multiplier);
    localStorage.setItem('upgradeCosts_v2', JSON.stringify(upgradeCosts));
  } catch (e) {}
}

function processDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return false;
  let didDie = false;
  
  if (bossRef) {
    bossRef.transaction((boss) => {
      if (!boss) return { health: BASE_HEALTH, level: 1 };
      let nH = boss.health - amount;
      let nL = boss.level;
      if (nH <= 0) { nL++; nH = BASE_HEALTH * nL; didDie = true; }
      return { health: nH, level: nL };
    });
  } else {
    currentHealth -= amount;
    if (currentHealth <= 0) {
      currentLevel++; currentHealth = BASE_HEALTH * currentLevel;
      currentMaxHealth = BASE_HEALTH * currentLevel; didDie = true;
    }
    updateBossUI();
  }
  return didDie;
}

window.buyUpgrade = function(type) {
  if (myCoins >= upgradeCosts[type]) {
    myCoins -= upgradeCosts[type];
    if (type === 'interns') myAutoDamage += 500;
    if (type === 'management') myClickDamage += 1000;
    if (type === 'synergy') multiplier += 0.2;
    if (type === 'aiBot') myAutoDamage += 5000;
    if (type === 'parachute') { myClickDamage *= 1.5; myAutoDamage *= 1.5; }

    upgradeCosts[type] = Math.ceil(upgradeCosts[type] * 1.15);
    updateUI(); saveGame();
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

// --- 6. CLICK FRANK TO ATTACK & BROADCAST ---
let flashTimeout;
if (bossImageEl) {
  bossImageEl.addEventListener('click', (e) => {
    const totalDmg = myClickDamage * multiplier;
    let frankDied = processDamage(totalDmg);
    myCoins += (1 * multiplier);
    
    // BROADCAST TO OBS WIDGET
    if (activeEmployeesRef && myPlayerId && myPlayerName) {
      activeEmployeesRef.child(myPlayerId).set({
        name: myPlayerName,
        emoji: myEmoji,
        damage: Math.floor(totalDmg),
        timestamp: Date.now()
      });
    }

    clearTimeout(flashTimeout);
    boss

