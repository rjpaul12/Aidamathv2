function attemptLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    const msgBox = document.getElementById('login-msg');
    
    if(!user || !pin) {
        if (msgBox) msgBox.textContent = "PLEASE ENTER USERNAME & PIN";
        return;
    }

    // Show a loading message so you know the button clicked successfully
    if (msgBox) msgBox.textContent = "LOGGING IN...";

    fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, pin: pin })
    })
    .then(r => r.json())
    .then(data => {
        if(data.status === "success") {
            currentUser = data.user;
            updateProfileUI();
            
            // Safely grab the username and transition to the main menu
            p1Name = (currentUser && currentUser.username) ? currentUser.username : user.toUpperCase();
            if (msgBox) msgBox.textContent = "";
            showView('main-menu');
        } else {
            // Show the error message from Python if the PIN is wrong
            if (msgBox) msgBox.textContent = data.message || "LOGIN FAILED";
        }
    })
    .catch(err => {
        if (msgBox) msgBox.textContent = "SERVER ERROR";
        console.error("Login Error:", err);
    });
}

function attemptSignup() {
    const user = document.getElementById('signup-username').value.trim();
    const pin = document.getElementById('signup-pin').value.trim();
    const msgBox = document.getElementById('signup-msg');
    
    if(!user || !pin) {
        if (msgBox) msgBox.textContent = "PLEASE ENTER USERNAME & PIN";
        return;
    }

    if (msgBox) msgBox.textContent = "CREATING ACCOUNT...";

    // We send this to the exact same python route. 
    // (If your Python backend has a specific '/register' route, change '/login' to '/register' below!)
    fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, pin: pin })
    })
    .then(r => r.json())
    .then(data => {
        if(data.status === "success") {
            currentUser = data.user;
            updateProfileUI();
            p1Name = (currentUser && currentUser.username) ? currentUser.username : user.toUpperCase();
            if (msgBox) msgBox.textContent = "";
            showView('main-menu');
        } else {
            if (msgBox) msgBox.textContent = data.message || "SIGNUP FAILED";
        }
    })
    .catch(err => {
        if (msgBox) msgBox.textContent = "SERVER ERROR";
        console.error("Signup Error:", err);
    });
}

function updateProfileUI() {
    if (!currentUser) return;
    const badgeName = document.getElementById('profile-name');
    const badgeWins = document.getElementById('profile-wins');
    const badgeLoss = document.getElementById('profile-losses');
    const badge = document.getElementById('user-profile-badge');

    if (badgeName) badgeName.textContent = currentUser.username || currentUser;
    if (badgeWins) badgeWins.textContent = currentUser.wins || 0;
    if (badgeLoss) badgeLoss.textContent = currentUser.losses || 0;
    
    // Show the badge in the top left corner of the main menu
    if (badge) badge.style.display = "block";
}

function updateProfileStats(winner, loser, score) {
    if(!currentUser) return;
    
    const username = currentUser.username || currentUser;
    if (winner === username) currentUser.wins = (currentUser.wins || 0) + 1;
    else if (loser === username) currentUser.losses = (currentUser.losses || 0) + 1;
    
    updateProfileUI();

    fetch(`${API_BASE}/update-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_name: winner, loser_name: loser, score: score })
    }).catch(err => console.error("Stats Update Error:", err));
}

function logout() {
    if (typeof gameActive !== 'undefined') gameActive = false; 
    if (typeof stopTimers === 'function') stopTimers();
    currentUser = null;
    if (typeof p1Name !== 'undefined') p1Name = "PLAYER 1";
    
    // Hide the sidebar
    const sideMenu = document.getElementById('side-menu');
    if (sideMenu) sideMenu.style.right = '-300px'; 
    
    // Hide the profile badge
    const badge = document.getElementById('user-profile-badge');
    if (badge) badge.style.display = "none";
    
    // Clear the input fields so the next person doesn't see your password
    if(document.getElementById('login-username')) document.getElementById('login-username').value = "";
    if(document.getElementById('login-pin')) document.getElementById('login-pin').value = "";
    if(document.getElementById('login-msg')) document.getElementById('login-msg').textContent = "";
    if(document.getElementById('signup-username')) document.getElementById('signup-username').value = "";
    if(document.getElementById('signup-pin')) document.getElementById('signup-pin').value = "";
    if(document.getElementById('signup-msg')) document.getElementById('signup-msg').textContent = "";
    
    showView('login-view');
}