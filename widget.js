const BASE_HEALTH = 1000000000;
let currentMaxHealth = BASE_HEALTH;
let previousHealth = BASE_HEALTH;

// --- NEW PHASE SYSTEM VARIABLES ---
let currentPhase = 1;
let baseFrankImg = "phase1frank.png";

const bossImageEl = document.getElementById('boss-image');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const bossNameEl = document.getElementById('boss-name');

const firebaseConfig = {
  apiKey: "AIzaSyBvx5u1OGwS6YAvmVhBF9bstiUn-Vp6TVY",
  authDomain: "corporate-extraction.firebaseapp.com",
  databaseURL: "https://corporate-extraction-default-rtdb.firebaseio.com",
  projectId: "corporate-extraction",
  storageBucket: "corporate-extraction.firebasestorage.app",
  messagingSenderId: "184892788723",
  appId: "1:184892788723:web:93959fe24c883a27088c86"
};

if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.database();
// I added these two lines below so the widget actually knows where to look!
const bossRef = db.ref('frank_corporate_data');
const activeEmployeesRef = db.ref('active_employees');

let flashTimeout;

// 1. UPDATE BOSS HEALTH & PHASES
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (!boss) return;

  const currentLevel = boss.level;
  const currentHealth = boss.health;
  currentMaxHealth = BASE_HEALTH * currentLevel;
  
  const hpPercent = currentHealth / currentMaxHealth;
  let newPhase = 1;
  let newTitle = "FRANK LV." + currentLevel;

  if (hpPercent <= 0.25) {
      newPhase = 4;
      newTitle = "CEO FRANK (ABSOLUTE MALICE)";
      baseFrankImg = "phase4frank.png";
  } else if (hpPercent <= 0.50) {
      newPhase = 3;
      newTitle = "VP FRANK (CRIMSON FURY)";
      baseFrankImg = "phase3frank.png";
  } else if (hpPercent <= 0.75) {
      newPhase = 2;
      newTitle = "MANAGER FRANK (BURSTING)";
      baseFrankImg = "phase2frank.png";
  } else {
      newPhase = 1;
      newTitle = "FRANK LV." + currentLevel;
      baseFrankImg = "phase1frank.png";
  }

  // Trigger image update only if the phase actually changed
  if (currentPhase !== newPhase) {
      currentPhase = newPhase;
      if (bossImageEl) bossImageEl.src = baseFrankImg;
  }

  const percentage = Math.max(0, (currentHealth / currentMaxHealth) * 100);
  healthFill.style.width = percentage + '%';
  healthText.innerText = `${Math.floor(currentHealth).toLocaleString()} / ${currentMaxHealth.toLocaleString()}`;
  bossNameEl.innerText = newTitle;

  if (currentHealth < previousHealth && previousHealth <= currentMaxHealth) {
    triggerHitAnimation();
  }
  previousHealth = currentHealth;
});

// 2. LISTEN FOR VIEWER CLICKS
activeEmployeesRef.on('child_changed', (snapshot) => { 
  const data = snapshot.val();
  if (data) spawnEmojiPopUp(data.emoji, data.name, data.damage);
});

activeEmployeesRef.on('child_added', (snapshot) => { 
  const data = snapshot.val();
  if (data && (Date.now() - data.timestamp < 30000)) {
    spawnEmojiPopUp(data.emoji, data.name, data.damage);
  }
});

// 3. ANIMATIONS
function triggerHitAnimation() {
  if (!bossImageEl) return;
  clearTimeout(flashTimeout);
  
  bossImageEl.classList.add('boss-shake'); 
  // Flashes the boss red without changing the image source
  bossImageEl.style.filter = 'brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)'; 
  
  flashTimeout = setTimeout(() => {
      bossImageEl.classList.remove('boss-shake');
      bossImageEl.style.filter = 'none'; // Reverts to normal
  }, 150);
}

function spawnEmojiPopUp(emoji, name, damage) {
  const el = document.createElement('div');
  // ---> Paste the rest of your original emoji popup logic right here! <---
}
