const BASE_HEALTH = 1000000000;
let currentMaxHealth = BASE_HEALTH;
let previousHealth = BASE_HEALTH;

const bossTitles = ["Corp. Frank: The Suit", "Corp. Frank: Middle Manager", "Corp. Frank: Regional Director", "Corp. Frank: VP of Downsizing", "Corp. Frank: The CEO"];

const bossImageEl = document.getElementById('boss-image');
const healthFill = document.getElementById('health-bar-fill');
const healthText = document.getElementById('health-text');
const bossNameEl = document.getElementById('boss-name');

const frankBaseImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475923508126027859/Gemini_Generated_Image_ko01sxko01sxko01-removebg-preview.png?ex=699f4061&is=699deee1&hm=4b906dc663568cd151e4ad0552f8f1e570af1c61f04fb48d2b38972abd341b5d&";
const frankDamagedImage = "https://cdn.discordapp.com/attachments/479148520935522315/1475947203385364631/unnamed__2_-removebg-preview.png?ex=699f5673&is=699e04f3&hm=b4bf446ecd920676bc8d776ad99251d2a70fbefa464ee3209e1b0d8945e55425&";

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

// 2. LISTEN FOR VIEWER CLICKS
// child_changed fires EVERY time someone who is already logged in clicks. No time limits here.
activeEmployeesRef.on('child_changed', (snapshot) => { 
  const data = snapshot.val();
  if (data) spawnEmojiPopUp(data.emoji, data.name, data.damage);
});

// child_added fires when a brand new user clicks for the very first time. 
activeEmployeesRef.on('child_added', (snapshot) => { 
  const data = snapshot.val();
  // We keep a loose 30-second limit here ONLY so OBS doesn't spit out attacks from yesterday when you boot up the stream
  if (data && (Date.now() - data.timestamp < 30000)) {
    spawnEmojiPopUp(data.emoji, data.name, data.damage);
  }
});

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


