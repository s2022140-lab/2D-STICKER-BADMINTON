/**
 * game_ui.js - 計分板與文字特效大師
 */
"use strict";

window.GameUI = {
    effectText: "",
    effectTimer: 0,
    effectColor: "#00f0ff",

    triggerText: function(text, color) {
        this.effectText = text;
        this.effectTimer = 60; // 持续 1 秒
        this.effectColor = color || "#00f0ff";
    },

    syncHTMLGrid: function(p1, p2) {
        const p1Grid = document.getElementById("p1EnergyGrid");
        const p2Grid = document.getElementById("p2EnergyGrid");
        
        if (p1Grid) {
            const spans = p1Grid.querySelectorAll("span");
            spans.forEach((span, idx) => {
                if (idx < p1.energyBlocks) {
                    span.className = "w-3.5 h-4.5 bg-primary border border-primary rounded-sm shadow-[0_0_8px_#00f0ff]";
                } else {
                    span.className = "w-3.5 h-4.5 border border-primary/20 bg-black/40 rounded-sm";
                }
            });
        }

        if (p2Grid) {
            const spans = p2Grid.querySelectorAll("span");
            spans.forEach((span, idx) => {
                if (idx < p2.energyBlocks) {
                    span.className = "w-3.5 h-4.5 bg-secondary border border-secondary rounded-sm shadow-[0_0_8px_#ff007f]";
                } else {
                    span.className = "w-3.5 h-4.5 border border-secondary/20 bg-black/40 rounded-sm";
                }
            });
        }
    },

    drawCanvasUI: function(ctx) {
        if (this.effectTimer > 0) {
            ctx.save();
            // 💡 视觉升级：将游戏内重击、得分、犯规全息字体设置为半透明 (0.75) 效果，科技感拉满
            ctx.globalAlpha = 0.75; 
            ctx.font = "italic 700 48px 'Space Grotesk'";
            ctx.fillStyle = this.effectColor;
            ctx.textAlign = "center";
            ctx.shadowColor = this.effectColor;
            ctx.shadowBlur = 15;
            
            const yOffset = Math.sin(this.effectTimer / 10) * 10;
            ctx.fillText(this.effectText, 600, 200 - yOffset);
            
            ctx.restore();
            this.effectTimer--;
        }
    }
};