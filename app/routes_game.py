from flask import Blueprint, request, jsonify
import sqlite3
from .game_engine import DamathGame

game_bp = Blueprint('game', __name__)
DB_PATH = 'database.db'

# Dictionary to hold multiple games. 'default' keeps old JS working.
active_games = {
    'default': DamathGame()
}

def get_game():
    return active_games['default']

@game_bp.route("/api/reset", methods=["POST"])
def reset_game():
    data = request.get_json()
    game = get_game()
    
    # Notice we added data.get("ai_level") at the end!
    game.reset(
        data.get("mode", "ai"), 
        data.get("firstMove", "player"), 
        data.get("category", "Counting"),
        data.get("ai_level", "easy") 
    )
    return jsonify(game.get_state())

@game_bp.route("/api/move", methods=["POST"])
def move():
    data = request.get_json()
    game = get_game()
    src = tuple(data["src"])
    dst = tuple(data["dst"])
    return jsonify({"status": game.make_move(src, dst)["status"], "state": game.get_state()})

@game_bp.route("/api/ai-move", methods=["POST"])
def ai_move():
    game = get_game()
    if game.turn == "ai": 
        game.run_ai_turn()
    return jsonify({"state": game.get_state()})

@game_bp.route("/api/get-moves", methods=["POST"])
def get_moves():
    d = request.get_json()
    game = get_game()
    r = d["r"]
    c = d["c"]
    
    # Grab the actual piece object from the board
    piece = game.board[r][c]
    
    # If the square is empty, return an empty list of moves safely
    if piece is None:
        return jsonify([])
        
    # Send the r, c, AND the piece to the engine!
    return jsonify(game.get_moves_for_piece(r, c, piece))

@game_bp.route("/api/state", methods=["GET"])
def get_state(): 
    return jsonify(get_game().get_state())

@game_bp.route("/api/timeout-move", methods=["POST"])
def timeout_move():
    game = get_game()
    return jsonify({"status": "timeout_executed", "result": game.force_random_move(), "state": game.get_state()})

@game_bp.route("/api/leaderboard", methods=["GET", "POST"])
def leaderboard_handler():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        if request.method == "GET":
            mode = request.args.get('mode', 'ai')
            cursor.execute("SELECT name, score FROM leaderboard WHERE mode = ? ORDER BY score DESC LIMIT 10", (mode,))
            return jsonify([{"name": n, "score": s} for n, s in cursor.fetchall()])
        elif request.method == "POST":
            d = request.get_json()
            cursor.execute("INSERT INTO leaderboard (name, score, mode) VALUES (?, ?, ?)", (d["name"], d["score"], d.get("mode", "ai")))
            conn.commit()
            return jsonify({"status": "success"})
        
