# data.py
import sqlite3
import os
import config

# 安全讀取資料庫路徑設定
DB_FILE = getattr(config, 'DB_FILE', 'cyber_badminton.db')

def get_db():
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """安全初始化數據庫架構與預設玩家屬性，支持冷熱數據升級"""
    conn = get_db()
    cursor = conn.cursor()
    
    # 使用者帳號與數值表 (增設排位分、XP、Level)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            coins INTEGER DEFAULT 300,
            wins INTEGER DEFAULT 0,
            matches_played INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            current_character TEXT DEFAULT 'neon_runner',
            current_racket TEXT DEFAULT 'standard_carbon'
        )
    ''')
    
    # 進行安全欄位熱升級，防止歷史資料庫欄位不存在報錯
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN score INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass

    # 解鎖角色關聯表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS unlocked_characters (
            username TEXT,
            character_id TEXT,
            PRIMARY KEY (username, character_id)
        )
    ''')
    
    # 解鎖球拍關聯表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS unlocked_rackets (
            username TEXT,
            racket_id TEXT,
            PRIMARY KEY (username, racket_id)
        )
    ''')
    
    # 建立預設測試管理員
    cursor.execute("INSERT OR IGNORE INTO users (username, password, coins, wins, matches_played, score, xp, level) VALUES ('admin', 'admin123', 99999, 128, 150, 1850, 0, 42)")
    
    # 解鎖管理員所有裝備
    all_chars = ['neon_runner', 'shadow_ninja', 'iron_mecha', 'cyber_dog', 'power_apple']
    all_rackets = ['standard_carbon', 'photon_saber', 'vortex_gate', 'revenge_log', 'cyber_bus']
    for c in all_chars:
        cursor.execute("INSERT OR IGNORE INTO unlocked_characters (username, character_id) VALUES ('admin', ?)", (c,))
    for r in all_rackets:
        cursor.execute("INSERT OR IGNORE INTO unlocked_rackets (username, racket_id) VALUES ('admin', ?)", (r,))
        
    conn.commit()
    conn.close()

def register_user(username, password):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password, score) VALUES (?, ?, 0)", (username, password))
        cursor.execute("INSERT INTO unlocked_characters (username, character_id) VALUES (?, 'neon_runner')", (username,))
        cursor.execute("INSERT INTO unlocked_rackets (username, racket_id) VALUES (?, 'standard_carbon')", (username,))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    conn.close()
    return success

def rename_user(old_username, new_username):
    """特工改名字資料庫重構與關聯表級聯更新"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        exist = cursor.execute("SELECT 1 FROM users WHERE username = ?", (new_username,)).fetchone()
        if exist:
            conn.close()
            return False
            
        cursor.execute("UPDATE users SET username = ? WHERE username = ?", (new_username, old_username))
        cursor.execute("UPDATE unlocked_characters SET username = ? WHERE username = ?", (new_username, old_username))
        cursor.execute("UPDATE unlocked_rackets SET username = ? WHERE username = ?", (new_username, old_username))
        conn.commit()
        success = True
    except sqlite3.Error:
        success = False
    conn.close()
    return success

def authenticate_user(username, password):
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password)).fetchone()
    conn.close()
    return user

def get_user_info(username):
    """提取玩家個人戰術資訊存檔"""
    conn = get_db()
    cursor = conn.cursor()
    profile = cursor.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not profile:
        conn.close()
        return None
        
    chars = cursor.execute("SELECT character_id FROM unlocked_characters WHERE username = ?", (username,)).fetchall()
    rackets = cursor.execute("SELECT racket_id FROM unlocked_rackets WHERE username = ?", (username,)).fetchall()
    conn.close()
    
    return {
        "username": profile["username"],
        "coins": profile["coins"],
        "wins": profile["wins"],
        "matches_played": profile["matches_played"],
        "score": profile["score"],
        "xp": profile["xp"],
        "level": profile["level"],
        "current_character": profile["current_character"],
        "current_racket": profile["current_racket"],
        "unlocked_characters": [c["character_id"] for c in chars],
        "unlocked_rackets": [r["racket_id"] for r in rackets]
    }

def update_selected_gear(username, character, racket):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET current_character = ?, current_racket = ? WHERE username = ?",
        (character, racket, username)
    )
    conn.commit()
    conn.close()

def update_player_stats(username, is_win, score_change, coin_gain):
    """更新玩家戰績，包含勝場、場次、LP分數、金幣，支援 1200 LP 首戰排位賽激活"""
    conn = get_db()
    cursor = conn.cursor()
    
    user = cursor.execute("SELECT score, wins, matches_played FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        conn.close()
        return
        
    current_score = user["score"]
    
    # 1200 LP 首戰排位賽激活邏輯：排位分數有實質變動且原先為 0
    if score_change != 0 and current_score == 0:
        current_score = 1200
        
    new_score = current_score + score_change
    
    # 白銀段位 LP 護城河：一旦激活且新的分數小於 1200，則守在 1200 分；若未激活（為 0 且變動為 0）則維持 0
    if current_score >= 1200 and new_score < 1200:
        new_score = 1200
    elif current_score == 0 and score_change == 0:
        new_score = 0
        
    win_inc = 1 if is_win else 0
    
    cursor.execute(
        "UPDATE users SET matches_played = matches_played + 1, wins = wins + ?, score = ?, coins = coins + ? WHERE username = ?",
        (win_inc, new_score, coin_gain, username)
    )
    conn.commit()
    conn.close()

def add_xp_and_level_up(username, xp_gain):
    """累加經驗值並執行階梯式升級檢測：下一級所需 XP = 當前等級 * 200"""
    conn = get_db()
    cursor = conn.cursor()
    
    user = cursor.execute("SELECT xp, level FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        conn.close()
        return 1, 0, False
        
    current_xp = user["xp"]
    current_lvl = user["level"]
    
    new_xp = current_xp + xp_gain
    leveled_up = False
    
    while True:
        xp_required = current_lvl * 200
        if new_xp >= xp_required:
            new_xp -= xp_required
            current_lvl += 1
            leveled_up = True
        else:
            break
            
    cursor.execute(
        "UPDATE users SET xp = ?, level = ? WHERE username = ?",
        (new_xp, current_lvl, username)
    )
    conn.commit()
    conn.close()
    return current_lvl, new_xp, leveled_up

def get_leaderboard_data():
    """獲取天梯段位排行榜：依 LP 分數 (score) 倒序，排除 score <= 0 的 UNRANKED 未定段帳號"""
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT username, wins, matches_played, score FROM users WHERE score > 0 ORDER BY score DESC, wins DESC LIMIT 5"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def unlock_character(username, character_id):
    conn = get_db()
    cursor = cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO unlocked_characters (username, character_id) VALUES (?, ?)", (username, character_id))
        conn.commit()
        unlocked = True
    except sqlite3.IntegrityError:
        unlocked = False
    conn.close()
    return unlocked

def unlock_racket(username, racket_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO unlocked_rackets (username, racket_id) VALUES (?, ?)", (username, racket_id))
        conn.commit()
        unlocked = True
    except sqlite3.IntegrityError:
        unlocked = False
    conn.close()
    return unlocked

def deduct_coins(username, amount):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET coins = coins - ? WHERE username = ?", (amount, username))
    conn.commit()
    conn.close()

def add_coins(username, amount):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET coins = coins + ? WHERE username = ?", (amount, username))
    conn.commit()
    conn.close()