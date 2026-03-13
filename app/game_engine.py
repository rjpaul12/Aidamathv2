import random
import math

class DamathGame:
    def __init__(self):
        self.reset()

    def reset(self, mode="ai", first_move="player", category="Counting", ai_level="easy"):
        self.mode = mode
        self.category = category
        self.ai_level = ai_level  # <-- The AI remembers its difficulty!
        # Board now stores OBJECTS: {'v': value, 'o': owner, 'k': is_king}
        # This prevents the game from confusing AI chips with Player chips
        self.board = [[None for _ in range(8)] for _ in range(8)]
        self.player_score = 0
        self.ai_score = 0
        self.history = []
        
        # --- TURN LOGIC ---
        if first_move == "ai":
            self.turn = "ai"
        elif first_move == "random":
            self.turn = random.choice(["player", "ai"])
        else:
            self.turn = "player"
            
        self.winner = None 
        self.forced_jumper = None 

        # --- CATEGORY SETUP ---
        if category == "Integers":
            self.ai_vals = [-9, 6, -1, 4, 0, -3, 10, -7, -11, 8, -5, 2]
            self.p_vals  = [2, -5, 8, -11, -7, 10, -3, 0, 4, -1, 6, -9]
        elif category == "Radicals":
            self.ai_vals = [1, 4, 9, 16, 25, 36, 1, 4, 9, 16, 25, 36]
            self.p_vals  = [49, 64, 81, 100, 121, 144, 49, 64, 81, 100, 121, 144]
        elif category == "Polynomials":
            self.ai_vals = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]
            self.p_vals  = [7, 8, 9, 10, 11, 12, 7, 8, 9, 10, 11, 12]
        elif category == "Rationals":
            self.ai_vals = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
            self.p_vals  = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2]
        else:
            # Default: Counting (Overlap Warning: Both sides have 1-12)
            self.ai_vals = [10, 7, 2, 5, 1, 4, 11, 8, 12, 9, 6, 3] 
            self.p_vals  = [3, 6, 9, 12, 8, 11, 4, 1, 5, 2, 7, 10]

        ai_i = 0
        p_i = 0

        # --- FIX 1: PLACE CHIPS WITH OWNERSHIP TAGS ---
        for r in range(8):
            for c in range(8):
                if (r + c) % 2 == 0:  # Even squares only
                    if r < 3:
                        if ai_i < len(self.ai_vals):
                            # Store dictionary instead of just number
                            self.board[r][c] = {'v': self.ai_vals[ai_i], 'o': 'ai', 'k': False}
                            ai_i += 1
                    elif r > 4:
                        if p_i < len(self.p_vals):
                            self.board[r][c] = {'v': self.p_vals[p_i], 'o': 'player', 'k': False}
                            p_i += 1

        self.operators = [
            ["×", "", "÷", "", "-", "", "+", ""],
            ["", "÷", "", "×", "", "+", "", "-"],
            ["-", "", "+", "", "×", "", "÷", ""],
            ["", "+", "", "-", "", "÷", "", "×"],
            ["×", "", "÷", "", "-", "", "+", ""],
            ["", "÷", "", "×", "", "+", "", "-"],
            ["-", "", "+", "", "×", "", "÷", ""],
            ["", "+", "", "-", "", "÷", "", "×"]
        ]
        print(f"--- GAME RESET: Turn={self.turn}, Mode={mode} ---")

    def get_state(self):
        # --- CONVERT INTERNAL OBJECTS FOR FRONTEND ---
        display_board = [["" for _ in range(8)] for _ in range(8)]
        meta = [[None for _ in range(8)] for _ in range(8)]
        
        for r in range(8):
            for c in range(8):
                piece = self.board[r][c]
                if piece:
                    display_board[r][c] = piece['v']
                    label = str(piece['v'])
                    meta[r][c] = {"owner": piece['o'], "king": piece['k'], "label": label}

        return {
            "board": display_board, 
            "meta": meta,           
            "player_score": self.player_score,
            "ai_score": self.ai_score,
            "turn": self.turn,
            "mode": self.mode,
            "operators": self.operators,
            "forced_jumper": self.forced_jumper,
            "winner": self.winner,
            "history": self.history
        }

    def is_ai_piece(self, piece):
        return piece is not None and piece['o'] == 'ai'

    def is_player_piece(self, piece):
        return piece is not None and piece['o'] == 'player'

    def check_winner(self):
        ai_count = 0
        player_count = 0
        
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if p:
                    if p['o'] == 'ai': ai_count += 1
                    elif p['o'] == 'player': player_count += 1
        
        game_over = False
        if ai_count == 0 or player_count == 0:
            game_over = True
        
        if not game_over:
            # Check Stalemate
            player_has_moves = False
            ai_has_moves = False
            for r in range(8):
                for c in range(8):
                    p = self.board[r][c]
                    if p:
                        moves = self.get_moves_for_piece(r, c, p)
                        if moves:
                            if p['o'] == 'player': player_has_moves = True
                            else: ai_has_moves = True
            
            if self.turn == "player" and not player_has_moves: game_over = True
            elif self.turn == "ai" and not ai_has_moves: game_over = True

        if game_over:
            self.calculate_final_scores()
            if self.player_score > self.ai_score:
                self.winner = "player"
            elif self.ai_score > self.player_score:
                self.winner = "ai"
            else:
                self.winner = "draw"

    def calculate_final_scores(self):
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if p:
                    score_val = p['v']
                    if self.category == "Radicals" and isinstance(score_val, (int, float)):
                         score_val = math.isqrt(int(score_val))
                    
                    if p['o'] == 'player': self.player_score += score_val
                    else: self.ai_score += score_val

    def compute_math(self, piece_val, captured_val, op):
        a = piece_val
        b = captured_val
        if self.category == "Radicals":
            a = math.isqrt(int(a))
            b = math.isqrt(int(b))
        score = 0
        if op == "+": score = a + b
        elif op == "-": score = abs(a - b)
        elif op == "×": score = a * b
        elif op == "÷": score = a // b if b != 0 else 0
        return score

    def get_moves_for_piece(self, r, c, piece):
        moves = []
        is_player = (piece['o'] == 'player')
        is_king = piece['k']
        
        directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
        for dr, dc in directions:
            dist = 1
            found_enemy = None 
            while True:
                nr, nc = r + (dr * dist), c + (dc * dist)
                if not (0 <= nr < 8 and 0 <= nc < 8): break
                target = self.board[nr][nc]
                
                if target is None:
                    if found_enemy:
                        moves.append({
                            "type": "capture",
                            "dst": (nr, nc),
                            "eaten_pos": found_enemy,
                            "eaten_val": self.board[found_enemy[0]][found_enemy[1]]['v']
                        })
                        if not is_king: break 
                    else:
                        if not is_king:
                            forward = -1 if is_player else 1
                            if dr == forward and dist == 1:
                                moves.append({"type": "slide", "dst": (nr, nc)})
                            break 
                        else:
                            moves.append({"type": "slide", "dst": (nr, nc)})
                else: 
                    if found_enemy: break 
                    if piece['o'] == target['o']: break
                    else:
                        found_enemy = (nr, nc) 
                        if not is_king: pass
                dist += 1
                if not is_king and dist > 2: break 
        return moves

    def make_move(self, src, dst):
        if self.winner: return {"status": "game_over"}
        r, c = src
        piece = self.board[r][c]
        
        if piece is None: return {"status": "invalid"}
        
        valid_moves = self.get_moves_for_piece(r, c, piece)
        chosen_move = None
        for m in valid_moves:
            if m["dst"] == dst:
                chosen_move = m
                break
        if not chosen_move: return {"status": "invalid"}

        move_log = f"{'PLAYER' if self.turn == 'player' else 'AI'} moved ({src[0]},{src[1]}) to ({dst[0]},{dst[1]})"
        
        captured_something = False
        if chosen_move["type"] == "capture":
            er, ec = chosen_move["eaten_pos"]
            eval_val = chosen_move["eaten_val"]
            op = self.operators[er][ec]
            score = self.compute_math(piece['v'], eval_val, op)
            
            if piece['o'] == 'player': self.player_score += score
            else: self.ai_score += score
            
            self.board[er][ec] = None 
            captured_something = True
            move_log += f" [CAPTURED {eval_val}]"

        self.history.append(move_log)

        r2, c2 = dst
        self.board[r2][c2] = piece
        self.board[r][c] = None
        
        # Promotion Logic
        if not piece['k']:
            if piece['o'] == 'player' and r2 == 0: piece['k'] = True
            elif piece['o'] == 'ai' and r2 == 7: piece['k'] = True

        self.check_winner()
        if self.winner: return {"status": "win", "winner": self.winner}

        if captured_something:
            next_moves = self.get_moves_for_piece(r2, c2, piece)
            can_capture_again = any(m["type"] == "capture" for m in next_moves)
            if can_capture_again:
                self.forced_jumper = (r2, c2)
                return {"status": "continue"}

        self.forced_jumper = None
        self.turn = "ai" if self.turn == "player" else "player"
        self.check_winner() 
        return {"status": "success"}

    def get_smart_ai_move(self):
        all_moves = []
        for r in range(8):
            for c in range(8):
                piece = self.board[r][c]
                if piece and piece['o'] == 'ai':
                    if self.forced_jumper and self.forced_jumper != (r, c): continue
                    moves = self.get_moves_for_piece(r, c, piece)
                    for m in moves:
                        # Copy the move and attach the source coordinates so we know who is moving
                        m_copy = dict(m)
                        m_copy["src"] = (r, c)
                        all_moves.append(m_copy)

        if not all_moves:
            return None, None

        captures = [m for m in all_moves if m["type"] == "capture"]
        level = getattr(self, 'ai_level', 'medium')

        # ---------------------------------------------------------
        # DIFFICULTY 1: EASY (Completely random, forgiving)
        # ---------------------------------------------------------
        if level == "easy":
            chosen = random.choice(all_moves)
            return chosen["src"], chosen["dst"]

        # ---------------------------------------------------------
        # DIFFICULTY 2: MEDIUM (Takes captures blindly)
        # ---------------------------------------------------------
        if level == "medium":
            chosen = random.choice(captures) if captures else random.choice(all_moves)
            return chosen["src"], chosen["dst"]

        # ---------------------------------------------------------
        # DIFFICULTY 3 & 4: HARD / EXPERT (Calculates the Math!)
        # ---------------------------------------------------------
        if captures:
            best_capture = None
            max_score = -float('inf')
            
            for cap in captures:
                er, ec = cap["eaten_pos"]
                eval_val = cap["eaten_val"]
                op = self.operators[er][ec]
                piece_val = self.board[cap["src"][0]][cap["src"][1]]['v']
                
                # The AI looks at the operator square and does the math in its head!
                score = self.compute_math(piece_val, eval_val, op)
                
                # If this jump gives a better score than the others, remember it
                if score > max_score:
                    max_score = score
                    best_capture = cap
                    
            return best_capture["src"], best_capture["dst"]
        
        # If no captures are available, prioritize moving forward to get Kings
        forward_moves = [m for m in all_moves if m["dst"][0] > m["src"][0]]
        
        if level == "expert" and forward_moves:
            chosen = random.choice(forward_moves)
        else:
            chosen = random.choice(forward_moves) if forward_moves else random.choice(all_moves)
            
        return chosen["src"], chosen["dst"]

    def run_ai_turn(self):
        moves_made = 0
        while self.turn == "ai" and not self.winner and moves_made < 10:
            src, dst = self.get_smart_ai_move()
            if not src: 
                self.turn = "player" 
                break 
            result = self.make_move(src, dst)
            moves_made += 1
            if result.get("winner"): break
            if result.get("status") == "success": break

    def force_random_move(self):
        if self.winner: return {"status": "game_over"}
        all_moves = []
        for r in range(8):
            for c in range(8):
                p = self.board[r][c]
                if p is None: continue
                
                is_p = (p['o'] == 'player')
                if self.turn == "player" and not is_p: continue
                if self.turn == "ai" and is_p: continue
                if self.forced_jumper and self.forced_jumper != (r,c): continue
                
                moves = self.get_moves_for_piece(r, c, p)
                for m in moves:
                    all_moves.append({"src": (r,c), "dst": m["dst"]})
        
        if not all_moves:
            self.check_winner()
            return {"status": "no_moves", "winner": self.winner}
        chosen = random.choice(all_moves)
        return self.make_move(chosen["src"], chosen["dst"])