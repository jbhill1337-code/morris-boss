// --- 1. THE 3-SECOND INTRO SEQUENCE ---
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    const gameUI = document.getElementById('game-container');
    if (loader) loader.style.display = 'none';
    if (gameUI) gameUI.style.display = 'block'; 
  }, 3000); 
});

// --- 2. GAME DATA SETUP ---
// --- PLAYER IDENTITY SETUP ---
let myPlayerId = localStorage.getItem('employeeId');
let myPlayerName = localStorage.getItem('employeeName');
let myEmoji = localStorage.getItem('employeeEmoji');

const nameModal = document.getElementById('name-modal');
const nameInput = document.getElementById('player-name-input');
const joinBtn = document.getElementById('btn-join-raid');

// Array of random corporate/office emojis for the users
const employeeEmojis = ["💼", "☕", "📈", "🖨️", "📎", "💻", "🗑️"];

if (!myPlayerId || !myPlayerName) {
  // Show the modal if they are a new visitor
  if (nameModal) nameModal.style.display = 'flex';
}

if (joinBtn) {
  joinBtn.addEventListener('click', () => {
    const enteredName = nameInput.value.trim();
    if (enteredName.length > 0) {
      // Generate a random ID and assign a random emoji
      myPlayerId = 'emp_' + Math.random().toString(36).substr(2, 9);
      myPlayerName = enteredName;
      myEmoji = employeeEmojis[Math.floor(Math.random() * employeeEmojis.length)];
      
      // Save to their browser
      localStorage.setItem('employeeId', myPlayerId);
      localStorage.setItem('employeeName', myPlayerName);
      localStorage.setItem('employeeEmoji', myEmoji);
      
      nameModal.style.display = 'none';
    } else {
      alert("Corporate requires a valid name!");
    }
  });
}
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
  } catch (e) {
    return defaultVal;
  }
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

// Image sources for swapping
const frankBaseImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475923508126027859/Gemini_Generated_Image_ko01sxko01sxko01-removebg-preview.png?ex=699f4061&is=699deee1&hm=4b906dc663568cd151e4ad0552f8f1e570af1c61f04fb48d2b38972abd341b5d&";
const frankDamagedImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475947203385364631/unnamed__2_-removebg-preview.png?ex=699f5673&is=699e04f3&hm=b4bf446ecd920676bc8d776ad99251d2a70fbefa464ee3209e1b0d8945e55425&";

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
      if (nH <= 0) { 
        nL++; 
        nH = BASE_HEALTH * nL; 
        didDie = true; 
      }
      return { health: nH, level: nL };
    });
  } else {
    currentHealth -= amount;
    if (currentHealth <= 0) {
      currentLevel++;
      currentHealth = BASE_HEALTH * currentLevel;
      currentMaxHealth = BASE_HEALTH * currentLevel;
      didDie = true;
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

// --- CLICK FRANK TO ATTACK & SPRITE SWAP ---
let flashTimeout;
if (bossImageEl) {
  bossImageEl.addEventListener('click', (e) => {
    const totalDmg = myClickDamage * multiplier;
    let frankDied = processDamage(totalDmg);
    myCoins += (1 * multiplier);
    
    // Clear any existing timer so rapid clicking doesn't mess up the animation
    clearTimeout(flashTimeout);
    
    // Swap to Damaged Sprite
    bossImageEl.src = frankDamagedImage;
    bossImageEl.classList.remove('boss-shake'); 
    void bossImageEl.offsetWidth; 
    bossImageEl.classList.add('boss-shake');
    
    // If he died, stay damaged longer. Otherwise, quick flash.
    const flashDuration = frankDied ? 800 : 150;
    
    flashTimeout = setTimeout(() => {
        bossImageEl.src = frankBaseImage;
    }, flashDuration);
    
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

