# app.py
from flask import Flask, render_template, redirect, url_for, request, jsonify, session
from config import Config
import data
import logic

app = Flask(__name__)
app.config.from_object(Config)

# 系統冷啟動：安全初始化 SQLite 數據庫與級聯更新
data.init_db()

# ==================== 🛡️ 輔助安全校驗機制 ====================
def is_session_invalid(username):
    """
    驗證加密 Session 與當前操作特工的一致性，防止 IDOR 身分偽造。
    """
    return session.get('user_id') != username

@app.route('/')
def index():
    """根路由預設引導至登入畫面"""
    return redirect(url_for('login'))

@app.route('/login')
def login():
    """1. 登入/註冊門戶頁面"""
    return render_template('login.html')

@app.route('/lobby')
def lobby():
    """2. 賽博大廳 + 排行榜 (鎖死身分驗證)"""
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return redirect(url_for('login'))
    return render_template('lobby.html')

@app.route('/gacha')
def gacha():
    """3. 抽卡中心頁面 (鎖死身分驗證)"""
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return redirect(url_for('login'))
    return render_template('gacha.html')

@app.route('/prep')
def prep():
    """4. 戰備整備選角室 (鎖死身分驗證)"""
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return redirect(url_for('login'))
    return render_template('prep.html')

@app.route('/training')
def training():
    """人機對戰難度選擇中轉站 (鎖死身分驗證)"""
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return redirect(url_for('login'))
    return render_template('training.html')

@app.route('/local_pvp')
def local_pvp():
    """本地雙人選角中轉站 (鎖死身分驗證)"""
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return redirect(url_for('login'))
    return render_template('local_pvp.html')

@app.route('/game')
def game():
    """5. 遊戲球場 Canvas (鎖死身分驗證)"""
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return redirect(url_for('login'))
    mode = request.args.get('mode', 'single')
    return render_template('game.html', mode=mode)

# ==================== 🛠️ RESTful API 數據對接與密碼驗證路由 ====================

@app.route('/api/login', methods=['POST'])
def api_login():
    """
    安全加密登入/自動開戶 API
    """
    payload = request.get_json() or {}
    username = payload.get('username', '').strip()
    password = payload.get('password', '').strip()
    
    if not username:
        return jsonify({"status": "error", "message": "特工代號不能為空"}), 400
        
    if not password:
        password = "cyber_default_pass"
        
    user = data.authenticate_user(username, password)
    if not user:
        existing_profile = data.get_user_info(username)
        if existing_profile:
            return jsonify({"status": "error", "message": "密碼比對失敗，無法進入終端"}), 403
        data.register_user(username, password)
        
    session['user_id'] = username
    return jsonify({"status": "success", "username": username})

@app.route('/api/user_info', methods=['GET'])
def api_user_info():
    """
    獲取特工資料保險箱 API (強制 Session 驗證)
    """
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return jsonify({"status": "error", "message": "終端身分校驗失敗"}), 403
        
    info = data.get_user_info(username)
    return jsonify(info)

@app.route('/api/leaderboard', methods=['GET'])
def api_leaderboard():
    """
    獲取排位天梯排行榜 API
    """
    leaderboard_list = data.get_leaderboard_data()
    return jsonify({"status": "success", "data": leaderboard_list})

@app.route('/api/gear_data', methods=['GET'])
def api_gear_data():
    """
    發放全網統一的特工與武器屬性元數據
    - 💡 補齊伺服器端 ultimate_name 欄位，徹底解決前端 undefined 裂解漏洞。
    - 💡 已將原本容易混淆的「STAMINA / 能量」屬性重構為極其直觀的「DEFENSE / 防守」。
    """
    gear_data = {
        "characters": {
            "neon_runner": {
                "name": "賽博跑手",
                "icon": "🏃",
                "ultimate_name": "⚡ 時空瞬返 (消耗 3 格)",
                "desc": "持續 4.5 秒，跑手速度 +40% 並產生幾何殘影。若球在身邊即將落地，會自動發動滑步瞬移救援擊球，拉扯性極佳。",
                "stats": { "speed": 10, "jump": 14, "defense": 85 }
            },
            "shadow_ninja": {
                "name": "影子忍者",
                "icon": "🐱‍👤",
                "ultimate_name": "⚔️ 影流瞬切 (消耗 4 格)",
                "desc": "擊球時分裂出 1 真 1 假雙重重疊殘影球。過網瞬間，假球會立刻化為煙霧消失，具有極強的網前戰術欺騙性。",
                "stats": { "speed": 9, "jump": 18, "defense": 75 }
            },
            "iron_mecha": {
                "name": "鋼鐵機甲",
                "icon": "🤖",
                "ultimate_name": "🛡️ 泰坦鐵壁 (消耗 6 格)",
                "desc": "持續 3.0 秒。身前生成一個亮藍色的電磁防禦盾牌，自動將碰觸到的對手羽毛球反射回網前，防守性能極致強悍。",
                "stats": { "speed": 6, "jump": 12, "defense": 99 }
            },
            "cyber_dog": {
                "name": "柴犬汪星人",
                "icon": "🐶",
                "ultimate_name": "🔊 神犬狂吠 (消耗 5 格)",
                "desc": "聲波圓圈擴散且畫面抖動 1 秒。球體飛行時帶有 S 形波浪震顫擾動軌跡，同時對手在 2.5 秒內被小幅減速 20%。",
                "stats": { "speed": 11, "jump": 13, "defense": 80 }
            },
            "power_apple": {
                "name": "爆能蘋果",
                "icon": "🍎",
                "ultimate_name": "☄️ 流星重殺 (消耗 8 格)",
                "desc": "僅限下一擊。擊球初速度提升 35%。球過網後重力瞬間翻倍，呈一條筆直的紅色流光雷射彈道陡峭下墜重擊地板。",
                "stats": { "speed": 8, "jump": 17, "defense": 90 }
            }
        },
        "rackets": {
            "standard_carbon": {
                "name": "標準碳素拍",
                "icon": "🏸",
                "ultimate_name": "🏸 萬能碳素",
                "desc": "標準碳素纖維材質，彈性與手感極其均衡，萬能通用。",
                "hitRadius": 100,
                "smashMultiplier": 1.2
            },
            "photon_saber": {
                "name": "光子光劍",
                "icon": "🗡️",
                "ultimate_name": "🗡️ 高熱光刃",
                "desc": "高熱光子切割能量武器，揮擊時自帶雷射斬擊，擊球威力小幅提升。",
                "hitRadius": 105,
                "smashMultiplier": 1.35
            },
            "vortex_gate": {
                "name": "漩渦重力拍",
                "icon": "🌀",
                "ultimate_name": "🌀 漩渦引力",
                "desc": "拍面內置漩渦引力常數，擊球範圍將大範圍扭曲擴大，極限救球神裝。",
                "hitRadius": 125,
                "smashMultiplier": 1.15
            },
            "revenge_log": {
                "name": "復仇滾木",
                "icon": "🌲",
                "ultimate_name": "🌲 毀滅重擊",
                "desc": "粗重原始滾木，揮動與位移緩慢，但殺球威力獲得毀滅性大爆發。",
                "hitRadius": 85,
                "smashMultiplier": 1.65
            },
            "cyber_bus": {
                "name": "賽博瘋狂巴士",
                "icon": "🚌",
                "ultimate_name": "🚌 超級範圍",
                "desc": "將赛博巴士作為球拍揮擊！擁有最極致的擊球範圍，超高惡搞快感。",
                "hitRadius": 140,
                "smashMultiplier": 1.25
            }
        }
    }
    return jsonify(gear_data)

@app.route('/api/select_gear', methods=['POST'])
def api_select_gear():
    """
    特工戰備整裝部署接口
    """
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return jsonify({"status": "error", "message": "身分驗證失敗"}), 403
        
    payload = request.get_json() or {}
    character = payload.get('character', 'neon_runner')
    racket = payload.get('racket', 'standard_carbon')
    
    logic.select_gear(username, character, racket)
    return jsonify({"status": "success", "message": "裝備部署成功"})

@app.route('/api/gacha', methods=['POST'])
def api_gacha():
    """
    超能扭蛋單抽空投接口
    """
    username = request.args.get('user')
    if not username or is_session_invalid(username):
        return jsonify({"status": "error", "message": "身分驗證失敗"}), 403
        
    result = logic.roll_gacha(username)
    return jsonify(result)

@app.route('/api/rename', methods=['POST'])
def api_rename():
    """
    特工代號重構改名接口
    """
    old_username = request.args.get('user')
    if not old_username or is_session_invalid(old_username):
        return jsonify({"status": "error", "message": "身分驗證失敗"}), 403
        
    payload = request.get_json() or {}
    new_username = payload.get('new_name', '').strip()
    
    if not new_username:
        return jsonify({"status": "error", "message": "改名參數不齊全"}), 400
        
    success = logic.rename_user(old_username, new_username)
    if success:
        session['user_id'] = new_username
        return jsonify({"status": "success", "new_name": new_username})
    else:
        return jsonify({"status": "error", "message": "此特工代號已被佔用"})

@app.route('/api/save_score', methods=['POST'])
def api_save_score():
    """
    排位賽 / 人機對局 / 本地雙人完結大結算
    """
    payload = request.get_json() or {}
    username = payload.get('username')
    
    if not username or is_session_invalid(username):
        return jsonify({"status": "error", "message": "身分驗證失敗"}), 403
        
    player_score = int(payload.get('player_score', 0))
    opponent_score = int(payload.get('opponent_score', 0))
    difficulty = payload.get('difficulty', 'medium')
    
    # 💡 核心相容：
    # 讀取前端發送的欄位，同時相容以 'game_mode' 或 'mode' 傳遞模式識別碼的設計
    game_mode = payload.get('game_mode') or payload.get('mode')
    is_single_player = payload.get('is_single_player', None)
    
    stats = payload.get('stats', {
        "clutch_saves": int(payload.get('clutch_saves', 0)),
        "smash_points": int(payload.get('smash_points', 0)),
        "high_rallies_won": int(payload.get('high_rallies_won', 0)),
        "is_deuce": player_score >= 20 and opponent_score >= 20,
        "is_domination": player_score >= 21 and opponent_score <= 8,
        "is_comeback": payload.get('is_comeback', False)
    })
    
    result = logic.process_match_end(
        username=username,
        p1_score=player_score,
        p2_score=opponent_score,
        difficulty=difficulty,
        is_single_player=is_single_player,
        game_mode=game_mode,
        stats=stats
    )
    return jsonify(result)

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """
    特工登出/安全清除終端 Session 接口
    """
    session.clear()
    return jsonify({"status": "success", "message": "特工已安全退出終端"})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)