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

// --- OBS SYNC CHECK ---
const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

if (isOBS) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('player-stats').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
}

// --- GAME VARIABLES ---
const BASE_HEALTH = 1000000000; 
let currentHealth = BASE_HEALTH;
let lastKnownHealth = BASE_HEALTH; // Used to track when he takes damage globally
let currentLevel = 1;
let currentMaxHealth = BASE_HEALTH;

const bossTitles = [ "Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO", "Corp. Frank: Chairman of the Board" ];
const corpQuotes = [ "SYNERGY!", "LET'S CIRCLE BACK!", "THINK OUTSIDE THE BOX!", "WE NEED MORE BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "TOUCH BASE!", "ACTIONABLE ITEMS!" ];
const emojiRoster = ['💼', '👔', '📉', '🗄️', '☕', '📠', '🖥️', '📞', '🗑️', '📎', '🍕', '💸'];

let myCoins = 0; let myClickDamage = 2500; let myAutoDamage = 0;
let clickUpgradeCost = 10; let autoUpgradeCost = 50;
let frenzyLevel = 0; let comboMultiplier = 1;

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

// --- 2. CLOCK IN & FLOATING EMOJI LOGIC ---
if (document.getElementById('btn-clock-in')) {
    document.getElementById('btn-clock-in').addEventListener('click', () => {
        const username = document.getElementById('username-input').value.trim().toUpperCase();
        if (username.length > 0) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            
            const newEmpRef = employeesRef.push();
            const randomEmoji = emojiRoster[Math.floor(Math.random() * emojiRoster.length)];
            newEmpRef.set({ name: username, emoji: randomEmoji });
            newEmpRef.onDisconnect().remove();
        }
    });
}

const empContainer = document.getElementById('employee-container');
let activeEmployees = {};

employeesRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    const key = snapshot.key;
    
    const tag = document.createElement('div');
    tag.className = 'employee-tag';
    tag.id = `emp-${key}`;
    tag.innerHTML = `<div class="employee-emoji">${data.emoji}</div><div class="employee-name">${data.name}</div>`;
    if(empContainer) empContainer.appendChild(tag);
    
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

// --- 3. DATABASE SYNC & GLOBAL HIT DETECTION ---
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (boss === null || isNaN(boss.health)) { boss = { health: BASE_HEALTH, level: 1 }; bossRef.set(boss); }
  
  // GLOBAL HIT DETECTION: If health dropped, trigger the animation on ALL screens (including OBS)
  if (boss.health < lastKnownHealth) {
      triggerGlobalHit();
  }
  
  lastKnownHealth = boss.health;
  currentHealth = boss.health; 
  currentLevel = boss.level; 
  currentMaxHealth = BASE_HEALTH * currentLevel; 
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
  if (!healthFill || !healthText || !bossNameEl) return; 
  const percentage = (currentHealth / currentMaxHealth) * 100;
  healthFill.style.width = percentage + '%';
  healthText.innerText = currentHealth.toLocaleString() + " / " + currentMaxHealth.toLocaleString();
  let titleIndex = (currentLevel - 1) % bossTitles.length;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[titleIndex]}`;
}

// --- 4. VISUAL FX LOGIC ---
function triggerGlobalHit() {
    // This runs on OBS and all player screens when Firebase sees damage
    if (bossImageEl) { 
        bossImageEl.src = 'boss-hit.png';
        bossImageEl.classList.remove('shake'); 
        void bossImageEl.offsetWidth; 
        bossImageEl.classList.add('shake'); 
        
        // Revert to standing frame after 150 milliseconds
        setTimeout(() => { bossImageEl.src = 'boss-standing.png'; }, 150);
    }
    
    if (flashOverlay) { 
        flashOverlay.style.opacity = '0.5'; 
        setTimeout(() => flashOverlay.style.opacity = '0', 30); 
    }
    
    // 10% chance to spawn a quote globally on OBS/Browsers when taking damage
    if (Math.random() < 0.10) spawnQuote();
}

function spawnDamageNumber(startX, startY, amount) {
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-popup';
    damageEl.innerText = `+${amount.toLocaleString()}`;
    document.body.appendChild(damageEl);
    damageEl.style.left = `${startX + (Math.random() * 20 - 10)}px`;
    damageEl.style.top = `${startY - 30}px`;
    damageEl.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
    setTimeout(() => { damageEl.remove(); }, 800);
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

// --- 5. PLAYER LOCAL ATTACK LOGIC ---
function attack(e) {
  if (isOBS) return; 

  let actualDamage = myClickDamage * comboMultiplier;
  dealGlobalDamage(actualDamage);
  myCoins += 1 * comboMultiplier; 
  
  frenzyLevel += 8;
  if (frenzyLevel > 100) frenzyLevel = 100;
  updateFrenzyUI();
  updateStatsUI();

  if (attackBtn) { attackBtn.classList.remove('spark'); void attackBtn.offsetWidth; attackBtn.classList.add('spark'); }

  let clickX = window.innerWidth / 2; let clickY = window.innerHeight - 100;
  if (e) {
      if (e.clientX !== undefined && e.clientY !== undefined) { clickX = e.clientX; clickY = e.clientY; } 
      else if (e.touches && e.touches.length > 0) { clickX = e.touches[0].clientX; clickY = e.touches[0].clientY; }
  }
  
  // Local only: Spawn exact damage numbers where the user clicks
  spawnDamageNumber(clickX, clickY, actualDamage);
}

setInterval(() => {
    if (frenzyLevel > 0) { frenzyLevel -= 3; if (frenzyLevel < 0) frenzyLevel = 0; updateFrenzyUI(); }
}, 100);

function updateFrenzyUI() {
    if (!frenzyFill || !frenzyText) return;
    if (frenzyLevel >= 100) comboMultiplier = 5;
    else if (frenzyLevel >= 75) comboMultiplier = 3;
    else if (frenzyLevel >= 50) comboMultiplier = 2;
    else comboMultiplier = 1;

    frenzyFill.style.width = frenzyLevel + '%';
    if (combo
