const BASE_HEALTH = 1000000000;
let currentMaxHealth = BASE_HEALTH;
let previousHealth = BASE_HEALTH;

const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];

const bossImageEl = document.getElementById('boss-image');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const bossNameEl = document.getElementById('boss-name');
const widgetContainer = document.getElementById('widget-container');

const frankBaseImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475923508126027859/Gemini_Generated_Image_ko01sxko01sxko01-removebg-preview.png?ex=699f4061&is=699deee1&hm=4b906dc663568cd151e4ad0552f8f1e570af1c61f04fb48d2b38972abd341b5d&";
const frankDamagedImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475947203385364631/unnamed__2_-removebg-preview.png?ex=699f5673&is=699e04f3&hm=b4bf446ecd920676bc8d776ad99251d2a70fbefa464ee3209e1b0d8945e55425&";

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
const activeEmployeesRef = db.ref('active_employees');

let flashTimeout;

// 1. UPDATE BOSS HEALTH
bossRef.on('value', (snapshot) => {
  let boss = snapshot.val();
  if (!boss) return;

  const currentLevel = boss.level;
  const currentHealth = boss.health;
  currentMaxHealth = BASE_HEALTH * currentLevel;

  const percentage = Math.max(0, (currentHealth / currentMaxHealth) * 100);
  healthFill.style.width = percentage + '%';
  healthText.innerText = `${Math.floor(currentHealth).toLocaleString()} / ${currentMaxHealth.toLocaleString()}`;
  bossNameEl.innerText = `[Lv. ${currentLevel}] ${bossTitles[(currentLevel - 1) % bossTitles.length]}`;

  if (currentHealth < previousHealth && previousHealth <= currentMaxHealth) {
    triggerHitAnimation();
  }
  previousHealth = currentHealth;
});

// 2. LISTEN FOR VIEWER CLICKS (Spawns Emojis)
activeEmployeesRef.on('child_changed', (snapshot) => { handleViewerAttack(snapshot.val()); });
activeEmployeesRef.on('child_added', (snapshot) => { handleViewerAttack(snapshot.val()); });

function handleViewerAttack(data) {
  if (!data) return;
  // Check if click happened in the last 4 seconds to avoid repeating old clicks
  if (Date.now() - data.timestamp < 4000) {
    spawnEmojiPopUp(data.emoji, data.name, data.damage);
  }
}

// 3. ANIMATIONS
function triggerHitAnimation() {
  if (!bossImageEl) return;
  clearTimeout(flashTimeout);
  
  bossImageEl.src = frankDamagedImage;
  bossImageEl.classList.remove('boss-shake'); 
  void bossImageEl.offsetWidth; 
  bossImageEl.classList.add('boss-shake');
  
  flashTimeout = setTimeout(() => {
      bossImageEl.src = frankBaseImage;
  }, 150);
}

function spawnEmojiPopUp(emoji, name, damage) {
  const el = document.createElement('div');
  
  // Combines the viewer's Emoji, Name, and Damage
  el.innerHTML = `<span style="font-size: 1.5em;">${emoji}</span> <span style="color: #ff3333;">${name}</span>: -${Math.floor(damage).toLocaleString()}`;
  el.className = `floating-emote animate-float`;
  
  if (bossImageEl) {
    const rect = bossImageEl.getBoundingClientRect();
    // Randomize where the emoji pops out of Frank
    const randomX = rect.left + (Math.random() * rect.width) - 50; 
    const randomY = rect.top + (Math.random() * (rect.height / 2));
    const randomRot = (Math.random() - 0.5) * 30; 
    
    el.style.left = randomX + 'px'; 
    el.style.top = randomY + 'px';
    el.style.setProperty('--rot', `${randomRot}deg`);
  }
  
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
