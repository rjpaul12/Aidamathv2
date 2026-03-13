from flask import Blueprint, request, jsonify
import sqlite3

auth_bp = Blueprint('auth', __name__)
DB_PATH = 'database.db'

@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = data.get("username", "").strip().upper()
    pin = data.get("pin", "").strip()
    
    if not user or not pin:
        return jsonify({"status": "error", "message": "Missing Data"})

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (user,))
        record = cursor.fetchone()
        
        if record:
            stored_pin = record[1]
            if stored_pin == pin:
                return jsonify({"status": "success", "user": {
                    "username": record[0], "wins": record[2], "losses": record[3], "total_score": record[5]
                }})
            else:
                return jsonify({"status": "error", "message": "Incorrect PIN"})
        else:
            cursor.execute("INSERT INTO users (username, pin) VALUES (?, ?)", (user, pin))
            conn.commit()
            return jsonify({"status": "success", "message": "Account Created", "user": {
                "username": user, "wins": 0, "losses": 0, "total_score": 0
            }})

@auth_bp.route("/api/update-stats", methods=["POST"])
def update_stats():
    data = request.get_json()
    winner = data.get("winner_name")
    loser = data.get("loser_name") 
    score = data.get("score", 0)
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        if winner and winner != "AI CORE":
            cursor.execute("""
                UPDATE users SET wins = wins + 1, games_played = games_played + 1, total_score = total_score + ?
                WHERE username = ?
            """, (score, winner))
            
        if loser and loser != "AI CORE":
            cursor.execute("""
                UPDATE users SET losses = losses + 1, games_played = games_played + 1
                WHERE username = ?
            """, (loser,))
            
        conn.commit()
    return jsonify({"status": "updated"})