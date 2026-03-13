document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.style.display = 'none'; // Force hide on load
    });
    
    const loginView = document.getElementById('login-view');
    if (loginView) {
        loginView.classList.remove('hidden');
        loginView.style.display = ''; 
    }
    
    // Hide the hamburger menu immediately when the app starts
    const menuBtn = document.querySelector('.menu-toggle');
    if (menuBtn) menuBtn.style.display = 'none';
});

// Use ONLY THIS ONE showView function
function showView(viewId) {
    // 1. Hide every view completely
    document.querySelectorAll('.view').forEach(v => {
        v.classList.add('hidden');
        v.style.display = 'none'; 
    });
    
    // 2. Explicitly hide stubborn full-screen views (Game & Leaderboard)
    const gameView = document.getElementById('game-view');
    if (gameView) {
        gameView.classList.add('hidden');
        gameView.style.display = 'none'; 
    }
    
    // FORCE HIDE THE LEADERBOARD
    const lbView = document.getElementById('leaderboard-view');
    if (lbView) {
        lbView.classList.add('hidden');
        lbView.style.display = 'none'; 
    }

    // 3. Show the requested view and force Flexbox centering
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        
        // Flexbox list 
        if (viewId === 'game-view' || viewId === 'main-menu' || viewId === 'login-view' || viewId === 'signup-view' || viewId === 'leaderboard-view') {
            target.style.display = 'flex';
        } else {
            target.style.display = ''; 
        }
    }

    // 4. Hide any open popups
    if (document.getElementById('mode-select-popup')) {
        document.getElementById('mode-select-popup').classList.add('hidden');
    }
    if (document.getElementById('setup-popup')) {
        document.getElementById('setup-popup').classList.add('hidden');
    }
    
    // 5. Hide the hamburger button on login/signup, but show it everywhere else!
    const menuBtn = document.querySelector('.menu-toggle');
    if (menuBtn) {
        if (viewId === 'login-view' || viewId === 'signup-view') {
            menuBtn.style.display = 'none';
        } else {
            menuBtn.style.display = 'flex';
        }
    }
}
function toggleSideMenu() { 
    const menu = document.getElementById('side-menu');
    if (!menu) return;
    menu.style.right = (menu.style.right === '0px') ? '-300px' : '0px';    
}

function openModePopup() { document.getElementById('mode-select-popup').classList.remove('hidden'); }
function closeSetupPopup() { document.getElementById('setup-popup').classList.add('hidden'); }
function toggleSound() { const s = document.getElementById('sound-status'); if(s) s.textContent = s.textContent === "ON" ? "OFF" : "ON"; }

function openSetup(mode) {
    currentMode = mode;
    document.getElementById('mode-select-popup').classList.add('hidden');
    document.getElementById('setup-popup').classList.remove('hidden');
    document.getElementById('setup-title').textContent = (mode === 'ai') ? "VS COMPUTER" : "VS PLAYER";
    
    const p2Input = document.getElementById('setup-p2');
    const firstMoveRow = document.getElementById('row-first-move');
    if(mode === 'pvp') {
        if(p2Input) p2Input.classList.remove('hidden');
        if(firstMoveRow) { firstMoveRow.style.opacity = "0.5"; firstMoveRow.style.pointerEvents = "none"; }
    } else {
        if(p2Input) p2Input.classList.add('hidden');
        if(firstMoveRow) { firstMoveRow.style.opacity = "1"; firstMoveRow.style.pointerEvents = "all"; }
    }
}

function cycleSetting(settingType, direction) {
    if (settingType === 'difficulty') {
        diffIndex += direction;
        if (diffIndex < 0) diffIndex = integratedDifficulties.length - 1;
        if (diffIndex >= integratedDifficulties.length) diffIndex = 0;
        const displayElement = document.getElementById('display-difficulty');
        if (displayElement) displayElement.textContent = integratedDifficulties[diffIndex].label;
    }
}

function setFirstMove(val) {
    settings.firstMove = val;
    document.querySelectorAll('#move-player, #move-ai, #move-random').forEach(b => b.classList.remove('active'));
    if(document.getElementById('move-' + val)) document.getElementById('move-' + val).classList.add('active');
}

function setGameTime(val) {
    settings.gameTime = val;
    document.querySelectorAll('#gt-0, #gt-10, #gt-20').forEach(b => b.classList.remove('active'));
    if(document.getElementById('gt-' + val)) document.getElementById('gt-' + val).classList.add('active');
}

function setTurnTime(val) {
    settings.turnTime = val;
    document.querySelectorAll('#tt-30, #tt-45, #tt-60').forEach(b => b.classList.remove('active'));
    if(document.getElementById('tt-' + val)) document.getElementById('tt-' + val).classList.add('active');
}

function setLearningMode(val) {
    settings.learningMode = val;
    if(document.getElementById('learn-on')) document.getElementById('learn-on').classList.toggle('active', val);
    if(document.getElementById('learn-off')) document.getElementById('learn-off').classList.toggle('active', !val);
}

// Timers
function startTimers() {
    updateTimerUI();
    moveInterval = setInterval(() => { if(gameActive) { moveTime--; if(moveTime<=0) handleMoveTimeout(); updateTimerUI(); }}, 1000);
    if(settings.gameTime > 0) gameInterval = setInterval(() => { if(gameActive) { gameTime--; if(gameTime<=0) handleGameTimeout(); updateTimerUI(); }}, 1000);
}
function stopTimers() { clearInterval(moveInterval); clearInterval(gameInterval); }
function resetMoveTimer() { moveTime = settings.turnTime; updateTimerUI(); }
function updateTimerUI() {
    const mt = document.getElementById('move-timer');
    if(mt) mt.textContent = moveTime;
    const gt = document.getElementById('game-timer');
    if(gt) { const m = Math.floor(gameTime/60); const s = gameTime%60; gt.textContent = `${m}:${s.toString().padStart(2,'0')}`; }
}
function handleMoveTimeout() {
    fetch(`${API_BASE}/timeout-move`, { method: 'POST' }).then(r=>r.json()).then(d=>{
        if (typeof renderBoard === 'function') renderBoard(d.state.board, d.state.operators, d.state.meta);
        updateHUD(d.state.player_score, d.state.ai_score);
        updateHistory(d.state.history);
        if(checkWinner(d.state.winner)) return;
        resetMoveTimer();
        if(currentMode==='ai' && d.state.turn==='ai') setTimeout(triggerAIMove, 500);
    });
}
function handleGameTimeout() { gameActive = false; stopTimers(); alert("TIME LIMIT."); showView('main-menu'); }

// Leaderboards
function switchLeaderboardTab(mode) {
    const btnAI = document.getElementById('lb-tab-ai');
    const btnPvP = document.getElementById('lb-tab-pvp');
    if(btnAI && btnPvP) {
        btnAI.className = mode === 'ai' ? 'btn active' : 'btn btn-outline';
        btnPvP.className = mode === 'pvp' ? 'btn active' : 'btn btn-outline';
    }
    const tbody = document.getElementById('leaderboard-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="padding:20px;">LOADING...</td></tr>';
    fetch(`${API_BASE}/leaderboard?mode=${mode}`).then(r => r.json()).then(data => {
        tbody.innerHTML = ""; 
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="padding:20px; color:#555;">NO RECORDS</td></tr>'; return; }
        data.forEach((entry, i) => {
            const rankColor = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? '#cd7f32' : '#333'));
            tbody.innerHTML += `<tr style="border-bottom:1px solid #eee;"><td style="padding:15px;color:${rankColor};font-weight:bold;">#${i+1}</td><td style="padding:15px;">${entry.name}</td><td style="padding:15px;color:#d130eb;font-weight:900;">${entry.score}</td></tr>`;
        });
    });
}
function loadLeaderboard() { showView('leaderboard-view'); switchLeaderboardTab('ai'); }