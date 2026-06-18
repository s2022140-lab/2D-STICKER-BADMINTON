# config.py
import os

# ==================== 數據庫與基本規則配置 ====================
DB_FILE = 'cyber_badminton.db'

# 廿一分制規則 (排位賽決勝比分)
WIN_SCORE = 21

# ==================== 🏆 賽季 S1 金幣經濟收益常數 ====================
PVP_COIN_GAIN = 150            # 排位賽/多人對戰：單場固定發放 150 金幣
PVE_BASE_COIN_GAIN = 50        # 人機對戰/訓練營：單場基礎 50 金幣
PVE_MULTIPLIERS = {            # 人機對戰/訓練營：各難度金幣乘數
    "easy": 1.0,
    "medium": 1.5,
    "hard": 2.0
}

# ==================== 賽博霓虹視覺配色 Hex 碼 ====================
COLOR_P1_NEON = "#00f0ff"       # P1 賽博藍
COLOR_P2_NEON = "#ff007f"       # P2 霓虹粉
COLOR_BALL = "#ccff00"          # 螢光黃羽毛球
COLOR_NET = "#ffffff"           # 經典白球網
COLOR_COURT_LINE = "#39ff14"    # 極光綠邊界線

# ==================== 2D 物理引擎基礎常數 (用於 game_physics.js) ====================
PHYSICS = {
    "GRAVITY": 0.24,            # 重力加速度
    "AIR_RESISTANCE": 0.992,    # 空氣阻力係數
    "BOUNCE_Y": -0.82,          # 地面垂直反彈
    "BOUNCE_X": -0.85,          # 牆壁水平反彈
    "MAX_BALL_SPEED": 18,       # 羽毛球最大速度限制
    "PLAYER_SPEED": 6,          # 玩家水平移動速度
    "PLAYER_JUMP": -8.8         # 玩家跳躍初速度
}

# ==================== Flask 專用系統配置類 (供 app.py 載入) ====================
class Config:
    # 設置強加密密鑰，確保客戶端 cookie-session 無法被篡改
    SECRET_KEY = os.environ.get('SECRET_KEY', 'cyber_badminton_secret_key_1337_jwt')
    DB_FILE = DB_FILE
    WIN_SCORE = WIN_SCORE