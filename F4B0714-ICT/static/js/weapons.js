/**
 * weapons.js - 武器/球拍大師
 */
"use strict";

window.WeaponSystem = {
    rackets: {
        "standard_carbon": {
            name: "標準碳素拍",
            icon: "🏸",
            hitRadius: 96,           
            smashMultiplier: 1.16,   
            color: "#ffffff"
        },
        "photon_saber": {
            name: "光子光劍",
            icon: "⚡",
            hitRadius: 101,          
            smashMultiplier: 1.28,   
            color: "#ff007f"
        },
        "vortex_gate": {
            name: "漩渦重力拍",
            icon: "🌀",
            hitRadius: 118,          
            smashMultiplier: 1.10,   
            color: "#ccff00"
        },
        "revenge_log": {
            name: "復仇滾木",
            icon: "🌲", // 遵照指示，使用滾木專屬 🌲 圖標
            hitRadius: 81,           
            smashMultiplier: 1.52,   
            color: "#e5e2e1"
        },
        "cyber_bus": {
            name: "賽博瘋狂巴士",
            icon: "🚌",
            hitRadius: 132,          
            smashMultiplier: 1.19,   
            color: "#39ff14"
        }
    },

    getGear: function(racketId) {
        return this.rackets[racketId] || this.rackets["standard_carbon"];
    }
};

/**
 * 全局骨骼姿態輔助器
 */
window.getRacketPosition = function(player) {
    let swingAngle = player.side === 'p1' ? -Math.PI / 4 : -Math.PI * 3 / 4;
    
    if (player.isSwinging) {
        const progress = (12 - player.swingTimer) / 12;
        if (player.side === 'p1') {
            swingAngle = -Math.PI * 0.8 + progress * Math.PI * 1.25; 
        } else {
            swingAngle = -Math.PI * 0.2 - progress * Math.PI * 1.25;
        }
    } else if (player.isJumping) {
        swingAngle = player.side === 'p1' ? -Math.PI / 2 - 0.2 : -Math.PI / 2 + 0.2;
    } else if (Math.abs(player.vx) > 0.5) {
        const armCycle = Math.cos(Date.now() * 0.012) * 0.4;
        swingAngle = player.side === 'p1' ? -Math.PI / 4 + armCycle : -Math.PI * 3 / 4 + armCycle;
    }

    const armLen = 40;
    const handX = player.x + Math.cos(swingAngle) * armLen;
    const handY = player.y - 20 + Math.sin(swingAngle) * armLen;

    const racketLen = 42;
    const racketX = handX + Math.cos(swingAngle) * racketLen;
    const racketY = handY + Math.sin(swingAngle) * racketLen;

    return { handX, handY, racketX, racketY, angle: swingAngle };
};