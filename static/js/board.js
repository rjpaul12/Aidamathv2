// --- GAME STARTUP LOGIC ---
function confirmSetupAndPlay() {
    const p1In = document.getElementById('setup-p1') ? document.getElementById('setup-p1').value.trim() : "";
    const p2In = document.getElementById('setup-p2') ? document.getElementById('setup-p2').value.trim() : "";
    if(p1In) p1Name = p1In.toUpperCase();
    else if(typeof currentUser !== 'undefined' && currentUser) p1Name = currentUser.username;
    else p1Name = "PLAYER 1";
    p2Name = (currentMode === 'pvp' && p2In) ? p2In.toUpperCase() : (currentMode === 'pvp' ? "PLAYER 2" : "AI CORE");
    
    moveTime = settings.turnTime;
    gameTime = settings.gameTime * 60;
    startGame(currentMode);
}

function startGame(selectedMode) {
    if (typeof closeSetupPopup === "function") closeSetupPopup();
    if (typeof showView === "function") showView('game-view');
    gameActive = true;
    if(selectedMode) currentMode = selectedMode;

    const dP1 = document.getElementById('p1-name-display');
    const dP2 = document.getElementById('p2-name-display');
    if (dP1) dP1.textContent = p1Name;
    if (dP2) dP2.textContent = p2Name;

    if (typeof stopTimers === "function") stopTimers();
    if (settings.gameTime > 0 && typeof startTimers === "function") startTimers();

    const finalCategory = integratedDifficulties[diffIndex].category;
    const finalAILevel = integratedDifficulties[diffIndex].level;

    fetch(`${API_BASE}/reset`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: currentMode, firstMove: settings.firstMove, category: finalCategory, ai_level: finalAILevel })
    })
    .then(r => r.json())
    .then(d => {
        const meta = d.meta || (d.state ? d.state.meta : null);
        renderBoard(d.board, d.operators, meta);
        updateHUD(d.player_score, d.ai_score);
        updateHistory(d.history);
        if (currentMode === 'ai' && d.turn === 'ai') setTimeout(triggerAIMove, 500);
    })
    .catch(err => console.error("Start Game Error:", err));
}

// --- BOARD RENDER & MOVEMENT ---
function renderBoard(board, ops, meta) {
    const boardEl = document.getElementById("board"); 
    if (!boardEl) return;
    boardEl.innerHTML = "";
    board.forEach((row, r) => {
        row.forEach((val, c) => {
            const cell = document.createElement("div");
            cell.className = `cell ${(r+c)%2?'dark':'light'}`;
            cell.id = `cell-${r}-${c}`;
            cell.onclick = () => handleCellClick(r, c, cell);
            if (ops && ops[r][c]) {
                const op = document.createElement("span");
                op.className = "cell-operator";
                op.textContent = ops[r][c];
                cell.appendChild(op);
            }
            if (val !== "") {
                const chip = document.createElement("div");
                let owner = r > 3 ? 'player' : 'ai';
                let isKing = false;
                let label = val;
                if (meta && meta[r][c]) { owner = meta[r][c].owner; isKing = meta[r][c].king; label = meta[r][c].label; }
                chip.className = `chip ${owner} ${isKing?'king':''}`;
                chip.textContent = label;
                if(isKing) {
                    const crown = document.createElement("span");
                    crown.innerHTML = "👑"; crown.style.cssText = "position:absolute; top:-14px; font-size:1.2rem; z-index:20;";
                    chip.appendChild(crown);
                }
                if(selectedCell && selectedCell.r===r && selectedCell.c===c) chip.classList.add('selected');
                cell.appendChild(chip);
            }
            boardEl.appendChild(cell);
        });
    });
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(c => { c.classList.remove('highlight-slide'); c.classList.remove('highlight-capture'); });
}

async function handleCellClick(r, c, cell) {
    if (!gameActive) return;
    const chip = cell.querySelector('.chip');
    if (chip && (!selectedCell || cell.querySelector('.chip'))) {
        clearHighlights();
        selectedCell = { r, c };
        document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('selected'));
        chip.classList.add('selected');
        if (settings.learningMode) {
            fetch(`${API_BASE}/get-moves`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ r: r, c: c }) })
            .then(res => res.json())
            .then(moves => {
                moves.forEach(m => {
                    const [tr, tc] = m.dst;
                    const targetCell = document.getElementById(`cell-${tr}-${tc}`);
                    if(targetCell) { if (m.type === 'capture') targetCell.classList.add('highlight-capture'); else targetCell.classList.add('highlight-slide'); }
                });
            });
        }
        return;
    }
    if (selectedCell && !chip) {
        try {
            const res = await fetch(`${API_BASE}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src: [selectedCell.r, selectedCell.c], dst: [r, c] }) });
            const data = await res.json();
            if (checkWinner(data.state.winner)) return;
            if (data.status === "success" || data.status === "continue") {
                clearHighlights(); 
                if (typeof resetMoveTimer === "function") resetMoveTimer();
                renderBoard(data.state.board, data.state.operators, data.state.meta);
                updateHUD(data.state.player_score, data.state.ai_score);
                updateHistory(data.state.history);
                if (data.status === "success") {
                    selectedCell = null;
                    if (data.state.turn === 'ai') setTimeout(triggerAIMove, 500);
                } else {
                    selectedCell = { r, c };
                    setTimeout(() => {
                        const nextChip = document.getElementById(`cell-${r}-${c}`).querySelector('.chip');
                        if(nextChip) { nextChip.classList.add('selected'); if(settings.learningMode) handleCellClick(r, c, document.getElementById(`cell-${r}-${c}`)); }
                    }, 50);
                }
            } else {
                selectedCell = null; clearHighlights(); renderBoard(data.state.board, data.state.operators, data.state.meta);
            }
        } catch (e) { console.error("Move Error:", e); }
    }
}

async function triggerAIMove() {
    if (!gameActive) return;
    try {
        const res = await fetch(`${API_BASE}/ai-move`, { method: 'POST' });
        const data = await res.json();
        if(data.error) return;
        if (typeof resetMoveTimer === "function") resetMoveTimer();
        renderBoard(data.state.board, data.state.operators, data.state.meta);
        updateHUD(data.state.player_score, data.state.ai_score);
        updateHistory(data.state.history);
        checkWinner(data.state.winner);
        if (data.state.turn === 'ai' && !data.state.winner) setTimeout(triggerAIMove, 1000);
    } catch (e) { console.error("AI Error:", e); }
}

function updateHUD(pScore, aScore) {
    currentPlayerScore = pScore;
    const playerHuge = document.getElementById('p-score-huge');
    const aiHuge = document.getElementById('ai-score-huge');
    if (playerHuge) playerHuge.textContent = pScore;
    if (aiHuge) aiHuge.textContent = aScore;
    const pLabel = document.getElementById('p-score');
    const aLabel = document.getElementById('ai-score');
    if (pLabel) pLabel.textContent = pScore + " pts";
    if (aLabel) aLabel.textContent = aScore + " pts";
}

function updateHistory(historyList) {
    const list = document.getElementById('history-list');
    if (!list || !historyList) return;
    list.innerHTML = "";
    historyList.forEach(log => {
        const item = document.createElement("div");
        item.textContent = "> " + log;
        item.style.color = log.includes("PLAYER") ? "#00d2ff" : "#ff4b2b";
        item.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
        list.appendChild(item);
    });
    const panel = document.getElementById('history-panel');
    if(panel) panel.scrollTop = panel.scrollHeight;
}

function checkWinner(winner) {
    if (winner && gameActive) {
        gameActive = false; 
        if (typeof stopTimers === "function") stopTimers();
        const popup = document.getElementById('game-over-popup');
        if (popup) popup.classList.remove('hidden');
        const title = document.getElementById('winner-title');
        const msg = document.getElementById('winner-message');
        let winName, loseName;
        if (winner === "player") {
            winName = p1Name; loseName = p2Name;
            if(title) { title.textContent = "VICTORY"; title.className = "win"; }
            if(msg) msg.textContent = `OPERATOR ${p1Name} WINS!`;
            if (currentMode === 'ai') saveScoreToDB(p1Name, currentPlayerScore, currentMode);
        } else {
            winName = p2Name; loseName = p1Name;
            if(title) { title.textContent = "DEFEAT"; title.className = "lose"; }
            if(msg) msg.textContent = `${p2Name} WINS!`;
        }
        if (typeof updateProfileStats === "function") updateProfileStats(winName, loseName, currentPlayerScore);
        return true;
    }
    return false;
}

function saveScoreToDB(name, score, mode) {
    fetch(`${API_BASE}/leaderboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, score: score, mode: mode }) });
}

function restartGame() { const popup = document.getElementById('game-over-popup'); if (popup) popup.classList.add('hidden'); startGame(currentMode); }
function quitGame() { const popup = document.getElementById('game-over-popup'); if (popup) popup.classList.add('hidden'); if (typeof stopTimers === "function") stopTimers(); if (typeof showView === "function") showView('main-menu'); }

let lastHistoryCount = -1;
let isFirstLoad = true;
function startDualScreenSync() {
    setInterval(() => {
        fetch('/api/state').then(res => res.json()).then(data => {
            if (data.error) return;
            if (isFirstLoad || (data.history && data.history.length !== lastHistoryCount)) {
                lastHistoryCount = data.history ? data.history.length : 0;
                isFirstLoad = false;
                if (typeof renderBoard === 'function') renderBoard(data.board, data.operators, data.meta);
                if (document.getElementById('p-score-huge')) { updateHUD(data.player_score, data.ai_score); updateHistory(data.history); }
            }
        }).catch(err => console.error("Sync Error:", err));
    }, 500); 
}
document.addEventListener('DOMContentLoaded', () => { startDualScreenSync(); });