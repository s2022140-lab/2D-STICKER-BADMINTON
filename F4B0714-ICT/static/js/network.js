/**
 * network.js - 數據傳送門
 * 負責在遊戲對局結束時，將本地分數與物理指標戰績傳送回 Flask 後台
 */
"use strict";

window.NetworkSystem = {
    /**
     * 賽後結算 API 通訊
     */
    uploadFinalResult: function(username, p1Score, p2Score, difficulty, isSingle, stats, mode, callback) {
        const payload = {
            username: username,
            player_score: p1Score,
            opponent_score: p2Score,
            difficulty: difficulty,
            is_single_player: isSingle,
            game_mode: mode, // 传递准确的对战模式标识以隔离奖励
            stats: stats
        };

        fetch('/api/save_score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error("API Connection Failed");
            return res.json();
        })
        .then(data => {
            if (callback) callback(data);
        })
        .catch(err => {
            console.error("無法上傳對戰紀錄：", err);
            // 本地擬態結算
            if (callback) {
                callback({
                    status: "offline_fallback",
                    coin_gain: 0,
                    lp_change: 0,
                    new_level: 1,
                    leveled_up: false,
                    unlocked_new: []
                });
            }
        });
    }
};