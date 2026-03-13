import sqlite3
import logging
from flask import Flask
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_PATH = 'database.db'

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # 1. LEADERBOARD TABLE 
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                score INTEGER,
                mode TEXT DEFAULT 'ai'
            )
        """)
        cursor.execute("PRAGMA table_info(leaderboard)")
        cols = [c[1] for c in cursor.fetchall()]
        if 'mode' not in cols: 
            cursor.execute("ALTER TABLE leaderboard ADD COLUMN mode TEXT DEFAULT 'ai'")

        # 2. USERS TABLE 
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                pin TEXT,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0
            )
        """)
        conn.commit()

def create_app():
    # Point Flask to the correct template and static folders in the new layout
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    
    # Initialize DB before handling requests
    init_db()

    # Import and register blueprints
    from .routes_pages import pages_bp
    from .routes_auth import auth_bp
    from .routes_game import game_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(game_bp)

    return app