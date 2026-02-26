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

const bossRef = db.ref('frank_corporate_data'); 
const employeesRef = db.ref('active_employees');

const isOBS = new URLSearchParams(window.location.search).get('obs') === 'true';

if (isOBS) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('player-stats').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
}

let myCoins = 0, myClickDmg = 2500, myAutoDmg = 0, clickCost = 10, autoCost = 50, myUser = "";
let curHP = 1000000000, maxHP = 1000000000, lastHP = 1000000000, frenzy = 0, multi = 1;

let currentPhase = 1;
let baseFrankImg = "phase1frank.png";
let defMulti = 1.0; 
let lastLevel = 0; // Tracks level to trigger victory screen

const bossImg = document.getElementById('boss-image');
const hpFill = document.getElementById('health-bar-fill');
const hpText = document.getElementById('health-text');
const corpQuotes = [ "SYNERGY!", "LET'S CIRCLE BACK!", "BANDWIDTH!", "RETURN TO OFFICE!", "PIVOT!", "ACTION ITEMS!"
