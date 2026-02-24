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
const bossRef = db.ref('frank_raid_v5'); 
const employeesRef = db.ref('active_employees_v5');

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

// --- 2. PLAYER DATA & PERSISTENCE ---
let myCoins = 0;
let myClickDamage = 2500;
let myAutoDamage = 0;
let clickUpgradeCost = 10;
let autoUpgradeCost = 50;
let myUsername = "";

function savePlayerData() {
    if (isOBS) return; // OBS doesn't need to save data
    const playerData = {
        coins: myCoins,
        clickDamage: myClickDamage,
        autoDamage: myAutoDamage,
        clickCost: clickUpgradeCost,
        autoCost: autoUpgradeCost,
        username: myUsername
    };
    localStorage.setItem('frank_raid_save', JSON.stringify(playerData));
}

function loadPlayerData() {
    const saved = localStorage.getItem('frank_raid_save');
    if (saved) {
        const data = JSON.parse(saved);
        myCoins = data.coins || 0;
        myClickDamage = data.clickDamage || 2500;
        myAutoDamage = data.autoDamage || 0;
        clickUpgradeCost = data.clickCost || 10;
        autoUpgradeCost = data.autoCost || 50;
        myUsername = data.username || "";
        
        // If they have a username, skip login and go to game
        if (myUsername && !isOBS) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            clockIn(myUsername);
        }
        updateStatsUI();
    }
}

// --- 3. OBS & GAME UI SETUP ---
if (isOBS) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('player-stats').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
} else {
    loadPlayerData();
}

// --- 4. GAME VARIABLES ---
const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let lastKnownHealth = BASE_HEALTH; 
let currentLevel = 1;
let currentMaxHealth = BASE_HEALTH;

const bossTitles = [ "Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO", "Corp. Frank: Chairman of the Board" ];
const corpQuotes = [ "SYNERGY!", "LET'S CIRCLE BACK!", "THINK OUTSIDE THE BOX!", "WE NEED MORE BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "TOUCH BASE!", "ACTIONABLE ITEMS!" ];
const emojiRoster = ['💼', '👔', '📉', '🗄️', '☕', '📠', '🖥️', '📞', '🗑️', '📎', '🍕', '💸'];

let frenzyLevel = 0; let comboMultiplier = 1;

const bossNameEl = document.getElementById('boss-name');
const bossImageEl = document.getElementById('boss-image');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const coinDisplay = document.getElementById('coin-count');
const clickDisplay = document.getElementById('click-power');
const autoDisplay = document.getElementById('auto-power');
const frenzyFill = document.getElementById('frenzy-bar-fill');
const frenzyText = document.getElementById('frenzy-text');
const attackBtn = document.getElementById('btn-attack');

// --- 5. CLOCK IN & EMPLOYEES ---
function clockIn(username) {
    const newEmpRef = employeesRef.push();
    const randomEmoji = emojiRoster[Math.floor(Math.random() * emojiRoster.length)];
    newEmpRef.set({ name: username, emoji: randomEmoji });
    newEmpRef.onDisconnect().remove();
}

document.getElementById('btn-clock-in').addEventListener('click', () => {
    const inputName = document.getElementById('username-input').value.trim().toUpperCase();
    if (inputName.length > 0) {
        myUsername = inputName;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        clockIn(myUsername);
        savePlayerData();
    }
});

const empContainer = document.getElementById('employee-container');
let activeEmployees = {};

employeesRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    const key = snapshot.key;
    const tag = document.createElement('div');
    tag.className = 'employee-tag';
    tag.id = `emp-${key}`;
    tag.innerHTML = `<div class="employee-emoji">${data.emoji}</div><div class="employee-name">${data.name}</div>`;
    empContainer.appendChild(tag);
    activeEmployees[key] = {
        element: tag,
        x: Math.random() * (window.innerWidth - 50),
        y: Math.random() * (window.innerHeight - 50)
    };
    moveEmployee(key);
});

employeesRef.on('child_removed', (snapshot) => {
    const key = snapshot.key;
    const el = document.getElementById(`emp-${key}`);
    if (el) el.remove();
    delete activeEmployees[key];
});

function moveEmployee(key) {
    if (!activeEmployees[key]) return;
    const emp = activeEmployees[key];
    emp.x = Math.random() * (window.innerWidth - 80);
    emp.y = Math.random() * (window.innerHeight - 80);
    emp.element.style.transform = `translate(${emp.x}px, ${emp.y}px)`;
    setTimeout(() => moveEmployee(key), 2500); 
}

// --- 6. GLOBAL SYNC & BOSS ---
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (boss === null || isNaN(boss.health)) { boss = { health: BASE_HEALTH, level: 1 }; bossRef.set(boss); }
  if (boss.health < lastKnownHealth) triggerGlobalHit();
  lastKnownHealth = boss.health; currentHealth = boss.health; currentLevel = boss.level; currentMaxHealth = BASE_HEALTH * currentLevel; 
  updateBossUI();
});

function dealGlobalDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return;
  bossRef.transaction((boss) => {
    if (boss === null || isNaN(boss.health)) return { health: BASE_HEALTH, level: 1 };
    let newHealth = boss.health - amount; let newLevel = boss.level;
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

// --- 7. VISUAL FX ---
function triggerGlobalHit() {
    if (bossImageEl) { 
        const hitFrame = Math.random() > 0.5 ? 'boss-hit.png' : 'boss-hit-var-2.png';
        bossImageEl.src = hitFrame;
        bossImageEl.classList.remove('shake'); 
        void bossImageEl.offsetWidth; 
        bossImageEl.classList.add('shake'); 
        setTimeout(() => { bossImageEl.src = 'boss-standing.png'; }, 150);
    }
}

function spawnDamageNumber(startX, startY, amount) {
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-popup';
    damageEl.innerText = `+${amount.toLocaleString()}`;
    document.body.appendChild(damageEl);
    damageEl.style.left = `${startX}px`; damageEl.style.top = `${startY}px`;
    setTimeout(() => damageEl.remove(), 800);
}

function spawnQuote() {
    if (!bossImageEl) return;
    const bossRect = bossImageEl.getBoundingClientRect();
    const headX = bossRect.left + bossRect.width / 2;
    const headY = bossRect.top + (bossRect.height * 0.2); 
    const quoteEl = document.createElement('div');
    quoteEl.className = 'quote-popup';
    quoteEl.innerText = corpQuotes[Math.floor(Math.random() * corpQuotes.length)];
    document.body.appendChild(quoteEl);
    quoteEl.style.left = `${headX + (Math.random() * 60 - 30)}px`;
    quoteEl.style.top = `${headY}px`;
    const floatDir = Math.random() > 0.5 ? 60 : -60;
    quoteEl.animate([
      { opacity: 1, transform: `translate(0, 0) scale(0.8)` },
      { opacity: 0, transform: `translate(${floatDir}px, -40px) scale(1.1)` }
    ], { duration: 1000, easing: 'ease-out' }).onfinish = () => quoteEl.remove();
}

// --- 8. ATTACK & SHOP ---
function attack(e) {
  if (isOBS) return; 
  let actualDamage = myClickDamage * comboMultiplier;
  dealGlobalDamage(actualDamage);
  myCoins += 1 * comboMultiplier; 
  frenzyLevel = Math.min(100, frenzyLevel + 8);
  updateFrenzyUI(); updateStatsUI();
  let clickX = e.clientX || (e.touches ? e.touches[0].clientX : window.innerWidth/2);
  let clickY = e.clientY || (e.touches ? e.touches[0].clientY : window.innerHeight/2);
  spawnDamageNumber(clickX, clickY, actualDamage);
  savePlayerData(); // Save coins every click
}

setInterval(() => { if (myAutoDamage > 0) dealGlobalDamage(myAutoDamage); }, 1000);

const buyAutoBtn = document.getElementById('buy-auto');
if (buyAutoBtn) {
    buyAutoBtn.addEventListener('click', () => {
      if (myCoins >= autoUpgradeCost) { 
          myCoins -= autoUpgradeCost; myAutoDamage += 1000;
          autoUpgradeCost = Math.floor(autoUpgradeCost * 1.5); 
          updateStatsUI(); 
          savePlayerData(); 
      }
    });
}

const buyClickBtn = document.getElementById('buy-click');
if (buyClickBtn) {
    buyClickBtn.addEventListener('click', () => {
      if (myCoins >= clickUpgradeCost) { 
          myCoins -= clickUpgradeCost; myClickDamage += 2500; 
          clickUpgradeCost = Math.floor(clickUpgradeCost * 1.5); 
          updateStatsUI(); 
          savePlayerData(); 
      }
    });
}

function updateFrenzyUI() {
    comboMultiplier = frenzyLevel >= 100 ? 5 : frenzyLevel >= 75 ? 3 : frenzyLevel >= 50 ? 2 : 1;
    frenzyFill.style.width = frenzyLevel + '%';
    frenzyText.innerText = comboMultiplier > 1 ? `COMBO: ${comboMultiplier}x!` : `CHARGE METER`;
}

setInterval(() => { frenzyLevel = Math.max(0, frenzyLevel - 3); updateFrenzyUI(); }, 100);

function updateStatsUI() {
  coinDisplay.innerText = myCoins.toLocaleString();
  clickDisplay.innerText = myClickDamage.toLocaleString();
  autoDisplay.innerText = myAutoDamage.toLocaleString();
  document.getElementById('buy-click').innerHTML = `Sharpen Blade (+2.5k) <br><span>Cost: ${clickUpgradeCost}</span>`;
  document.getElementById('buy-auto').innerHTML = `Hire Merc (+1k/s) <br><span>Cost: ${autoUpgradeCost}</span>`;
}

document.getElementById('btn-attack').addEventListener('pointerdown', attack);
bossImageEl.addEventListener('pointerdown', attack);
