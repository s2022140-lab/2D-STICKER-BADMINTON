# logic.py
import random
import data
import config

def get_lobby_info(username):
    return data.get_user_info(username)

def select_gear(username, character, racket):
    data.update_selected_gear(username, character, racket)

def rename_user(old_username, new_username):
    return data.rename_user(old_username, new_username)

def get_rank_tier_by_score(score):
    """根據排位分數 LP 動態劃分段位名稱"""
    if score <= 0:
        return "UNRANKED"
    if score >= 2600:
        return "SUPREME"
    if score >= 2200:
        return "DIAMOND"
    if score >= 1800:
        return "PLATINUM"
    if score >= 1400:
        return "GOLD"
    return "SILVER"

def calculate_match_lp(score, is_win, stats):
    """
    黃金中庸天梯算法核心
    - 將「個人物理操作表現分」與「戰局結算加成分」分流計算。
    - 敗局最終點數加算上限絕對不可為正數。
    """
    tier = get_rank_tier_by_score(score)
    
    # 1. 讀取段位對應基礎加減分與物理表現上限 (中庸調和版)
    if tier == "UNRANKED" or tier == "SILVER":
        base_win, base_loss = 35, -12
        perf_cap = 15
    elif tier == "GOLD":
        base_win, base_loss = 30, -15
        perf_cap = 12
    elif tier == "PLATINUM":
        base_win, base_loss = 25, -18
        perf_cap = 10
    elif tier == "DIAMOND":
        base_win, base_loss = 20, -20
        perf_cap = 8
    else:  # SUPREME
        base_win, base_loss = 18, -22
        perf_cap = 6
        
    base_lp = base_win if is_win else base_loss
    
    # 2. 個人物理操作表現分 (救球、扣殺、拉鋸) - 受到段位上限壓制
    clutch_saves = stats.get("clutch_saves", 0)
    smash_points = stats.get("smash_points", 0)
    high_rallies_won = stats.get("high_rallies_won", 0)
    
    raw_perf_lp = (clutch_saves * 2) + (smash_points * 2) + (high_rallies_won * 3)
    perf_lp = min(raw_perf_lp, perf_cap)
    
    # 3. 戰局結算加成分 (獨立發放，完全不計入物理上限！)
    special_lp = 0
    is_deuce = stats.get("is_deuce", False)
    is_domination = stats.get("is_domination", False)
    is_comeback = stats.get("is_comeback", False)
    player_score = stats.get("player_score", 0)
    opponent_score = stats.get("opponent_score", 0)
    
    if is_win:
        if is_deuce:
            special_lp += 12      # Deuce 絕殺大師
        if is_domination:
            special_lp += 6       # 完美碾壓
        if is_comeback:
            special_lp += 5       # 落後逆轉反超
    else:
        # 失敗補償 (Close Loss Mitigation)：比分差 <= 2 
        score_diff = abs(player_score - opponent_score)
        if score_diff <= 2:
            special_lp += 8
            
    # 4. 加算總和
    lp_change = base_lp + perf_lp + special_lp
    
    # 鐵律：落敗時最終 LP 結算變動上限絕對不能為正數 (最高為 0 LP)
    if not is_win and lp_change > 0:
        lp_change = 0
        
    return lp_change

def process_match_end(username, p1_score, p2_score, difficulty, is_single_player=None, game_mode=None, stats=None):
    """
    結算單局遊戲戰績與數據存檔：
    - 支援三種模式控制獎勵： "single" (人機), "local" (本地雙人), "ranked" (天梯排位)
    - 本地雙人模式："local" / "local_pvp" 實施安全攔截，不對資料庫執行寫入，資源獲取完全為 0。
    - 人機對戰模式："single" 提供金幣與經驗，但排位分數（LP）變動為 0。
    - 排位賽模式："ranked" 提供金幣、經驗，並計算 LP 變動。
    """
    # 核心映射：处理并规范化双人对战模式字符串
    if game_mode == "local_pvp":
        game_mode = "local"

    if game_mode is None:
        if is_single_player is False or str(is_single_player).lower() == 'false':
            game_mode = "local"
        elif is_single_player is True or str(is_single_player).lower() == 'true':
            game_mode = "single"
        else:
            game_mode = "single"

    # 1. 本地雙人對戰模式安全阻斷 (在此直接中斷，完全不對資料庫執行寫入，資源變動皆為 0)
    if game_mode == "local":
        user_info = data.get_user_info(username)
        current_lvl = user_info["level"] if user_info else 1
        return {
            "coin_gain": 0,
            "lp_change": 0,
            "xp_gain": 0,
            "new_level": current_lvl,
            "leveled_up": False,
            "unlocked_new": []
        }

    # 2. 其他合法數據處理
    if stats is None:
        stats = {
            "clutch_saves": 0,
            "smash_points": 0,
            "high_rallies_won": 0,
            "is_deuce": p1_score >= 20 and p2_score >= 20,
            "is_domination": p1_score >= 21 and p2_score <= 8,
            "is_comeback": False,
        }
        
    stats["player_score"] = p1_score
    stats["opponent_score"] = p2_score
    
    is_win = p1_score >= config.WIN_SCORE and p1_score > p2_score
    
    user_info = data.get_user_info(username)
    current_lvl = user_info["level"] if user_info else 1
    current_score = user_info["score"] if user_info else 0

    coin_gain = 0
    lp_change = 0
    xp_gain = 0

    if game_mode == "single":
        # 人機對戰模式：可獲得金幣、經驗，但排位分不變動 (強制為 0)
        mult = config.PVE_MULTIPLIERS.get(difficulty, 1.5)
        coin_gain = int(config.PVE_BASE_COIN_GAIN * mult)
        lp_change = 0
        
        # 人機模式前 10 級限制：等級 >= 11 時人機獲得 0 XP
        if current_lvl < 11:
            base_xp = 100 if is_win else 40
            perf_xp = min(p1_score * 5, 25)
            xp_gain = base_xp + perf_xp
        else:
            xp_gain = 0

    elif game_mode == "ranked":
        # 排位賽模式：獲得全額 PVP 金幣、LP 變動與經驗值
        coin_gain = config.PVP_COIN_GAIN
        lp_change = calculate_match_lp(current_score, is_win, stats)
        
        base_xp = 100 if is_win else 40
        perf_xp = min(p1_score * 5, 25)
        xp_gain = base_xp + perf_xp
        
    # 3. 寫入資料庫
    data.update_player_stats(username, is_win, lp_change, coin_gain)
    
    # 4. 寫入經驗值與升級機制
    if xp_gain > 0:
        new_lvl, new_xp, leveled_up = data.add_xp_and_level_up(username, xp_gain)
    else:
        new_lvl = current_lvl
        leveled_up = False
    
    # 5. 生涯場次里程碑解鎖進度
    unlocked_new = []
    played = (user_info["matches_played"] if user_info else 0) + 1
    if played >= 3:
        if data.unlock_character(username, 'shadow_ninja'):
            unlocked_new.append("shadow_ninja")
    if played >= 5:
        if data.unlock_racket(username, 'photon_saber'):
            unlocked_new.append("photon_saber")
            
    return {
        "coin_gain": coin_gain,
        "lp_change": lp_change,
        "xp_gain": xp_gain,
        "new_level": new_lvl,
        "leveled_up": leveled_up,
        "unlocked_new": unlocked_new
    }

def roll_gacha(username):
    """扭蛋隨機抽樣，重複件自動折算並返還 80 金幣"""
    user_info = data.get_user_info(username)
    if not user_info or user_info["coins"] < 150:
        return {"status": "insufficient_coins"}
        
    data.deduct_coins(username, 150)
    
    gacha_pool = [
        {"type": "character", "id": "iron_mecha", "name": "🤖 鋼鐵機甲", "weight": 10},
        {"type": "character", "id": "cyber_dog", "name": "🐶 柴犬汪星人", "weight": 10},
        {"type": "character", "id": "power_apple", "name": "🍎 爆能蘋果", "weight": 10},
        {"type": "racket", "id": "vortex_gate", "name": "🔵 漩渦重力拍", "weight": 10},
        {"type": "racket", "id": "revenge_log", "name": "🌲 復仇滾木", "weight": 10},
        {"type": "racket", "id": "cyber_bus", "name": "🚌 賽博瘋狂巴士", "weight": 10},
        {"type": "duplicate", "id": "standard_carbon", "name": "80金幣 複製補貼", "weight": 40}
    ]
    
    choices = []
    for item in gacha_pool:
        choices.extend([item] * item["weight"])
    selected_item = random.choice(choices)
    
    reward_type = selected_item["type"]
    reward_id = selected_item["id"]
    refund = False
    
    if reward_type == "character":
        if reward_id in user_info["unlocked_characters"]:
            refund = True
        else:
            data.unlock_character(username, reward_id)
    elif reward_type == "racket":
        if reward_id in user_info["unlocked_rackets"]:
            refund = True
        else:
            data.unlock_racket(username, reward_id)
    else:
        refund = True
        
    if refund:
        data.add_coins(username, 80)
        
    return {
        "status": "success",
        "reward_type": reward_type,
        "reward_id": reward_id,
        "reward_name": selected_item["name"],
        "refund": refund
    }