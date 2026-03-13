/* --- GLOBAL CONFIGURATION & STATE --- */
const API_BASE = "/api"; 
let p1Name = "PLAYER 1";
let p2Name = "AI CORE";
let selectedCell = null;
let gameActive = false; 
let currentMode = "ai"; 
let currentUser = null; 
let currentPlayerScore = 0;

let settings = {
    firstMove: 'player',
    gameTime: 20,
    turnTime: 60,
    learningMode: true
};

let moveInterval = null;
let gameInterval = null;
let moveTime = 60;
let gameTime = 1200; 

// --- INTEGRATED MENU LOGIC ---
const integratedDifficulties = [
    { label: "Easy (Counting)", category: "Counting", level: "easy" },
    { label: "Medium (Whole)", category: "Whole", level: "medium" },
    { label: "Hard (Integer)", category: "Integers", level: "hard" },
    { label: "Expert (Rational)", category: "Rationals", level: "expert" }
];
let diffIndex = 0;