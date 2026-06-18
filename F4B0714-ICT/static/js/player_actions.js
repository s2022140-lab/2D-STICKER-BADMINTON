/**
 * player_actions.js - P1 玩家鍵盤神經中樞
 */
"use strict";

window.PlayerActions = {
    keys: {
        moveLeft: false,
        moveRight: false,
        jump: false,
        swing: false,
        ultimate: false,
        kill: false
    },

    init: function() {
        window.PlayerActions.keys = {
            moveLeft: false,
            moveRight: false,
            jump: false,
            swing: false,
            ultimate: false,
            kill: false
        };

        window.addEventListener("keydown", (e) => {
            if (e.repeat) return; // 【防長按核心】忽略系統自動重複按鍵事件
            
            const k = e.key.toLowerCase();
            if (k === 'a') window.PlayerActions.keys.moveLeft = true;
            if (k === 'd') window.PlayerActions.keys.moveRight = true;
            if (k === 'w') window.PlayerActions.keys.jump = true;
            if (k === 's') window.PlayerActions.keys.swing = true; // 觸發一次單擊
            if (k === 'e') window.PlayerActions.keys.ultimate = true;
            if (k === 'f') window.PlayerActions.keys.kill = true; 
        });

        window.addEventListener("keyup", (e) => {
            const k = e.key.toLowerCase();
            if (k === 'a') window.PlayerActions.keys.moveLeft = false;
            if (k === 'd') window.PlayerActions.keys.moveRight = false;
            if (k === 'w') window.PlayerActions.keys.jump = false;
            if (k === 's') window.PlayerActions.keys.swing = false;
            if (k === 'e') window.PlayerActions.keys.ultimate = false;
            if (k === 'f') window.PlayerActions.keys.kill = false;
        });
    }
};