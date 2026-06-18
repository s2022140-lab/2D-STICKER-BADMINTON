/**
 * enemy.js - P2 對手大腦
 */
"use strict";

window.EnemyActions = {
    keys: {
        moveLeft: false,
        moveRight: false,
        jump: false,
        swing: false,
        ultimate: false,
        kill: false
    },
    aiReactionTimer: 0,

    init: function() {
        window.EnemyActions.keys = {
            moveLeft: false,
            moveRight: false,
            jump: false,
            swing: false,
            ultimate: false,
            kill: false
        };

        window.addEventListener("keydown", (e) => {
            if (e.repeat) return; // 【防長按核心】手動控制 P2 時同樣封鎖連擊
            
            if (e.key === "ArrowLeft") window.EnemyActions.keys.moveLeft = true;
            if (e.key === "ArrowRight") window.EnemyActions.keys.moveRight = true;
            if (e.key === "ArrowUp") window.EnemyActions.keys.jump = true;
            if (e.key === "ArrowDown") window.EnemyActions.keys.swing = true;
            if (e.key === "Shift") window.EnemyActions.keys.kill = true; 
            if (e.key === "Enter") window.EnemyActions.keys.ultimate = true;
        });

        window.addEventListener("keyup", (e) => {
            if (e.key === "ArrowLeft") window.EnemyActions.keys.moveLeft = false;
            if (e.key === "ArrowRight") window.EnemyActions.keys.moveRight = false;
            if (e.key === "ArrowUp") window.EnemyActions.keys.jump = false;
            if (e.key === "ArrowDown") window.EnemyActions.keys.swing = false;
            if (e.key === "Shift") window.EnemyActions.keys.kill = false;
            if (e.key === "Enter") window.EnemyActions.keys.ultimate = false;
        });
    },

    updateAI: function(player, ball, difficulty) {
        window.EnemyActions.aiReactionTimer++;
        
        let delay = difficulty === "easy" ? 18 : (difficulty === "hard" ? 4 : 11);
        if (window.EnemyActions.aiReactionTimer % delay !== 0) return;

        if (player.energyBlocks >= (player.currentCharacter === 'iron_mecha' ? 6 : 5)) {
            if (Math.random() < 0.15) {
                window.EnemyActions.keys.ultimate = true;
            }
        } else {
            window.EnemyActions.keys.ultimate = false;
        }

        if (ball.x > 500) {
            if (player.x < ball.x - 15) {
                window.EnemyActions.keys.moveLeft = false;
                window.EnemyActions.keys.moveRight = true;
            } else if (player.x > ball.x + 15) {
                window.EnemyActions.keys.moveRight = false;
                window.EnemyActions.keys.moveLeft = true;
            } else {
                window.EnemyActions.keys.moveLeft = false;
                window.EnemyActions.keys.moveRight = false;
            }

            if (ball.y < 300 && Math.abs(player.x - ball.x) < 80 && !player.isJumping) {
                window.EnemyActions.keys.jump = true;
            } else {
                window.EnemyActions.keys.jump = false;
            }

            // 【修復 AI Double Touch 違規】
            // 阻斷重複擊球判定：如果最後一個擊球者已經是 P2 本身，在對方接球或落地前，AI 絕對不重複揮拍
            if (ball.lastHitter === player.side) {
                window.EnemyActions.keys.swing = false;
            } else {
                const dist = Math.sqrt((player.x - ball.x) * (player.x - ball.x) + ((player.y - 40) - ball.y) * (player.y - 40 - ball.y));
                if (dist < (player.weaponRadius + 20)) {
                    window.EnemyActions.keys.swing = true;
                } else {
                    window.EnemyActions.keys.swing = false;
                }
            }
        } else {
            if (player.x < 850) {
                window.EnemyActions.keys.moveLeft = false;
                window.EnemyActions.keys.moveRight = true;
            } else if (player.x > 950) {
                window.EnemyActions.keys.moveRight = false;
                window.EnemyActions.keys.moveLeft = true;
            } else {
                window.EnemyActions.keys.moveLeft = false;
                window.EnemyActions.keys.moveRight = false;
            }
            window.EnemyActions.keys.swing = false;
            window.EnemyActions.keys.jump = false;
        }
    }
};