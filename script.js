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

// Added back the Corporate Lingo
const corpQuotes = [
  "SYNERGY!", "LET'S CIRCLE BACK!", "THINK OUTSIDE THE BOX!", 
  "WE NEED MORE BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", 
  "TOUCH BASE!", "ACTIONABLE ITEMS!", "LOW HANGING FRUIT!", "PARADIGM SHIFT!"
];

let myCoins = 0;
let myClickDamage = 2500;
const SWORD_IMAGE_URL = "https://cdn.discordapp.com/attachments/479148520935522315/1475889414352801924/d56pg7g-4bca25f8-2cd0-4ac1-86fb-2d6fb41def78.png?ex=699f20a1&is=699dcf21&hm=ac5b6ff711c0e58af775dd56159f3534aa46ed9d01137b840e24cf827907e7dd&";

const bossNameEl = document.getElementById('boss-name');
const bossImageEl = document.getElementById('boss-image');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const coinDisplay = document.getElementById('coin-count');
const attackBtn = document.getElementById('btn-attack');
const loader = document.getElementById('loading-screen');

// --- DATABASE SYNC ---
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
  if(loader) { loader.style.display = 'none'; }
});

function dealGlobalDamage(amount) {
  if (amount <= 0 || isNaN(amount)) return;
  bossRef.transaction((boss) => {
    if (boss === null) return { health: BASE_HEALTH, level: 1 };
    let newHealth = boss.health - amount;
    let newLevel = boss.level;
    if (newHealth <= 0) { newLevel += 1; newHealth = BASE_HEALTH * newLevel; }
    return { health: newHealth, level: newLevel };
  });
}

function updateBossUI() {
  if (!healthFill || !healthText || !bossNameEl) return; 
  const percentage = Math.max(0, (currentHealth / currentMaxHealth) * 100);
  healthFill.style.width = percentage + '%';
  healthText.innerText = `${currentHealth.toLocaleString()} / ${currentMaxHealth.toLocaleString()}`;
  let titleIndex = (currentLevel - 1) % bossTitles.length;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[titleIndex]}`;
}

// --- NEW: FLOATING TEXT LOGIC ---
function spawnFloatingText(x, y, text, type) {
  const el = document.createElement('div');
  el.innerText = text;
  el.className = `floating-text ${type}`; // 'damage' or 'quote'
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  
  // Remove after animation ends
  setTimeout(() => el.remove(), 2000);
}

function spawnSwords(startX, startY) {
  if (!bossImageEl) return;
  const bossRect = bossImageEl.getBoundingClientRect();
  const targetX = bossRect.left + bossRect.width / 2;
  const targetY = bossRect.top + bossRect.height / 2;

  for (let i = 0; i < 4; i++) {
    const sword = document.createElement('img');
    sword.src = SWORD_IMAGE_URL;
    sword.className = 'sword-particle';
    document.body.appendChild(sword);
    const startLeft = startX + (Math.random() - 0.5) * 60;
    const startTop = startY + (Math.random() - 0.5) * 60;
    sword.style.left = startLeft + 'px';
    sword.style.top = startTop + 'px';
    setTimeout(() => {
      sword.style.transform = `translate(${targetX - startLeft}px, ${targetY - startTop}px) rotate(45deg)`;
      sword.style.opacity = '0';
    }, 50);
    setTimeout(() => sword.remove(), 1000);
  }
}

// --- CLICK EVENT ---
if (attackBtn) {
  attackBtn.addEventListener('click', (e) => {
    dealGlobalDamage(myClickDamage);
    
    // Update Coins
    myCoins += 1;
    if (coinDisplay) coinDisplay.innerText = myCoins.toLocaleString();
    
    // 1. Spawn Swords
    spawnSwords(e.clientX, e.clientY);
    
    // 2. Spawn +Damage indicator at mouse
    spawnFloatingText(e.clientX, e.clientY, `+${myClickDamage.toLocaleString()}`, 'damage');
    
    // 3. Random chance to spawn Corporate Jargon from the Boss's head
    if (Math.random() > 0.7 && bossImageEl) {
      const rect = bossImageEl.getBoundingClientRect();
      const randomQuote = corpQuotes[Math.floor(Math.random() * corpQuotes.length)];
      // Position it near the top of the image (his head)
      spawnFloatingText(rect.left + rect.width / 2, rect.top, randomQuote, 'quote');
    }
  });
}
