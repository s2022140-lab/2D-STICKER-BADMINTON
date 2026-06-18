/**
 * game_render.js - 幾何美術畫家 (大框版 + 科幻直線對齊與特工大翻新)
 */
"use strict";

window.GameRender = {
    drawGroundShadow: function(ctx, x, y, baseRadius, maxDistance) {
        const floorY = 500;
        const distance = floorY - y;
        if (distance < 0) return;
        
        const ratio = Math.max(0, 1 - distance / maxDistance);
        const shadowW = baseRadius * (0.3 + 0.7 * ratio);
        const shadowH = baseRadius * 0.2 * (0.3 + 0.7 * ratio);
        const alpha = 0.55 * ratio;

        ctx.save();
        ctx.fillStyle = `rgba(12, 16, 24, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(x, floorY, shadowW, shadowH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawCourt: function(ctx, p1, p2) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 240, 255, 0.05)";
        ctx.lineWidth = 1;
        const gridHeights = [150, 250, 350, 450];
        gridHeights.forEach(h => {
            ctx.beginPath();
            ctx.moveTo(50, h);
            ctx.lineTo(1150, h);
            ctx.stroke();
        });
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "rgba(100, 116, 139, 0.12)";  
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)"; 
        ctx.lineWidth = 3;

        const xLeft = 50;
        const xRight = 1150;
        const yTop = 15; 
        const yBottom = 510; 
        const radius = 12;

        ctx.beginPath();
        ctx.moveTo(xLeft + radius, yTop);
        ctx.arcTo(xRight, yTop, xRight, yTop + radius, radius);
        ctx.arcTo(xRight, yBottom, xRight - radius, yBottom, radius);
        ctx.arcTo(xLeft, yBottom, xLeft, yBottom - radius, radius);
        ctx.arcTo(xLeft, yTop, xLeft + radius, yTop, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (p1) this.drawGroundShadow(ctx, p1.x, p1.y, 40, 400);
        if (p2) this.drawGroundShadow(ctx, p2.x, p2.y, 40, 400);

        ctx.save();
        let floorGrad = ctx.createLinearGradient(xLeft, 500, xRight, 500);
        floorGrad.addColorStop(0, "#ff007f");
        floorGrad.addColorStop(0.3, "#00f0ff");
        floorGrad.addColorStop(0.7, "#ccff00");
        floorGrad.addColorStop(1, "#39ff14");
        
        ctx.strokeStyle = floorGrad;
        ctx.lineWidth = 6;
        ctx.shadowColor = "rgba(0, 240, 255, 0.35)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(xLeft, 500);
        ctx.lineTo(xRight, 500);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "#00f0ff"; 
        ctx.lineWidth = 5;
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 15;
        
        const netTopY = 500 - 110; 
        ctx.beginPath();
        ctx.moveTo(600, 500);
        ctx.lineTo(600, netTopY); 
        ctx.stroke();

        ctx.strokeStyle = "rgba(0, 240, 255, 0.45)";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        for (let y = netTopY + 10; y < 500; y += 15) {
            ctx.beginPath();
            ctx.moveTo(590, y);
            ctx.lineTo(610, y);
            ctx.stroke();
        }
        ctx.restore();

        if ((p1 && p1.currentCharacter === 'iron_mecha' && p1.activeUltimateTimer > 0) ||
            (p2 && p2.currentCharacter === 'iron_mecha' && p2.activeUltimateTimer > 0)) {
            ctx.save();
            const shieldX = 591;
            const shieldY = 200;
            const shieldW = 18;
            const shieldH = 190;
            
            const pulse = 0.5 + 0.45 * Math.sin(Date.now() / 70);
            let shieldGrad = ctx.createLinearGradient(shieldX, shieldY, shieldX + shieldW, shieldY);
            shieldGrad.addColorStop(0, `rgba(0, 240, 255, ${0.1 * pulse})`);
            shieldGrad.addColorStop(0.5, `rgba(0, 240, 255, ${0.5 * pulse})`);
            shieldGrad.addColorStop(1, `rgba(0, 240, 255, ${0.1 * pulse})`);
            
            ctx.fillStyle = shieldGrad;
            ctx.fillRect(shieldX, shieldY, shieldW, shieldH);
            
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.85 + 0.15 * pulse})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 20;
            ctx.strokeRect(shieldX, shieldY, shieldW, shieldH);
            
            ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            for (let sy = shieldY + 6; sy < shieldY + shieldH; sy += 10) {
                ctx.beginPath();
                ctx.moveTo(shieldX, sy);
                ctx.lineTo(shieldX + shieldW, sy - 3);
                ctx.stroke();
            }
            ctx.restore();
        }
    },

    drawPlayer: function(ctx, player) {
        if (player.currentCharacter === 'neon_runner' && player.activeUltimateTimer > 0) {
            for (let i = 1; i <= 3; i++) {
                ctx.save();
                ctx.globalAlpha = 0.25 / i;
                this.drawSingleSkeleton(ctx, player.x - player.vx * i * 1.5, player.y, player, "rgba(0, 240, 255, 0.45)");
                ctx.restore();
            }
        }

        this.drawSingleSkeleton(ctx, player.x, player.y, player);
    },

    drawSingleSkeleton: function(ctx, x, y, player, overrideColor = null) {
        ctx.save();
        const charColor = overrideColor || (player.currentCharacter === 'neon_runner' ? '#ff007f' :
                          (player.currentCharacter === 'shadow_ninja' ? '#bc13fe' :
                          (player.currentCharacter === 'iron_mecha' ? '#ffffff' : 
                          (player.currentCharacter === 'cyber_dog' ? '#ffbc00' : '#ff3333'))));

        ctx.strokeStyle = charColor;
        ctx.fillStyle = charColor;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = charColor;
        ctx.shadowBlur = 12;

        const leanAngle = player.vx * 0.015 + (player.vy * 0.005 * (player.side === 'p1' ? 1 : -1));
        ctx.translate(x, y + 10); 
        ctx.rotate(leanAngle);
        ctx.translate(-x, -(y + 10));

        // 1. 特工頭部
        if (player.currentCharacter === 'cyber_dog') {
            ctx.fillStyle = charColor;
            ctx.beginPath();
            ctx.arc(x, y - 45, 14, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = "rgba(254, 240, 138, 0.95)"; 
            ctx.beginPath();
            ctx.arc(x - 6, y - 39, 5, 0, Math.PI * 2);
            ctx.arc(x + 6, y - 39, 5, 0, Math.PI * 2);
            ctx.fill();

            // 【耳朵優化】高度從 72 降至 64，線條微調圓滑，不再突兀尖銳
            ctx.fillStyle = charColor;
            ctx.beginPath();
            ctx.moveTo(x - 12, y - 54);
            ctx.lineTo(x - 17, y - 64); 
            ctx.lineTo(x - 2, y - 52);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = "#fda4af"; // 粉內耳
            ctx.beginPath();
            ctx.moveTo(x - 10, y - 55);
            ctx.lineTo(x - 14, y - 61);
            ctx.lineTo(x - 4, y - 53);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = charColor;
            ctx.beginPath();
            ctx.moveTo(x + 12, y - 54);
            ctx.lineTo(x + 17, y - 64);
            ctx.lineTo(x + 2, y - 52);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = "#fda4af";
            ctx.beginPath();
            ctx.moveTo(x + 10, y - 55);
            ctx.lineTo(x + 14, y - 61);
            ctx.lineTo(x + 4, y - 53);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(254, 240, 138, 0.95)";
            ctx.beginPath();
            ctx.arc(x - 5, y - 50, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 5, y - 50, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.arc(x, y - 42, 3.5, 0, Math.PI * 2);
            ctx.fill();
            
            // 【修復】徹底砍掉此處以前殘留的舊版靜態尾巴
        } 
        else if (player.currentCharacter === 'iron_mecha') {
            ctx.fillStyle = "#1e293b";
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 4;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x - 16, y - 61, 32, 28, 6);
            } else {
                ctx.rect(x - 16, y - 61, 32, 28);
            }
            ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = "#475569";
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 2.5;
            
            // 耳鰭
            ctx.beginPath();
            ctx.moveTo(x - 16, y - 61);
            ctx.lineTo(x - 24, y - 64);
            ctx.lineTo(x - 22, y - 46);
            ctx.lineTo(x - 16, y - 51);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + 16, y - 61);
            ctx.lineTo(x + 24, y - 64);
            ctx.lineTo(x + 22, y - 46);
            ctx.lineTo(x + 16, y - 51);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = "#334155";
            ctx.fillRect(x - 20, y - 51, 4, 8);
            ctx.fillRect(x + 16, y - 51, 4, 8);
            
            ctx.fillStyle = "#00f0ff";
            ctx.shadowColor = "#00f0ff"; ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x - 6, y - 48, 3.5, 0, Math.PI * 2);
            ctx.arc(x + 6, y - 48, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } 
        else if (player.currentCharacter === 'shadow_ninja') {
            ctx.fillStyle = "#12021c";
            ctx.strokeStyle = "#bc13fe";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y - 45, 14, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            
            ctx.strokeStyle = "#ff0055";
            ctx.fillStyle = "#ff0055";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 14, y - 44);
            ctx.quadraticCurveTo(x - 30, y - 52, x - 36, y - 43);
            ctx.quadraticCurveTo(x - 24, y - 35, x - 12, y - 41);
            ctx.stroke(); ctx.fill();

            ctx.save();
            ctx.strokeStyle = "#ff0055";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#ff0055";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            const ribbonOffset = player.vx * 1.5; 
            ctx.moveTo(x - 12, y - 45);
            ctx.quadraticCurveTo(x - 26 - ribbonOffset, y - 48 + Math.sin(Date.now() / 150) * 4, x - 42 - ribbonOffset, y - 38);
            ctx.moveTo(x - 12, y - 45);
            ctx.quadraticCurveTo(x - 22 - ribbonOffset, y - 42 + Math.cos(Date.now() / 130) * 5, x - 38 - ribbonOffset, y - 30);
            ctx.stroke();
            ctx.restore();
        }
        else if (player.currentCharacter === 'power_apple') {
            ctx.save();
            ctx.fillStyle = "#ef4444"; 
            ctx.strokeStyle = "#b91c1c";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 15;
            
            const ax = x;
            const ay = y - 45; 
            ctx.beginPath();
            ctx.moveTo(ax, ay - 11); 
            ctx.bezierCurveTo(ax + 12, ay - 17, ax + 19, ay - 8, ax + 18, ay + 4);
            ctx.bezierCurveTo(ax + 17, ay + 15, ax + 8, ay + 16, ax, ay + 13);
            ctx.bezierCurveTo(ax - 8, ay + 16, ax - 17, ay + 15, ax - 18, ay + 4);
            ctx.bezierCurveTo(ax - 19, ay - 8, ax - 12, ay - 17, ax, ay - 11);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ax, ay - 11);
            ctx.quadraticCurveTo(ax + 3, ay - 20, ax + 7, ay - 22);
            ctx.stroke();

            ctx.fillStyle = "#22c55e";
            ctx.strokeStyle = "#15803d";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(ax + 4, ay - 18, 6, 3, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        else if (player.currentCharacter === 'neon_runner') {
            ctx.beginPath();
            ctx.arc(x, y - 45, 14, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            ctx.save();
            ctx.strokeStyle = "#00f0ff";
            ctx.fillStyle = "#00f0ff";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y - 45, 14, -Math.PI / 4, Math.PI / 6);
            ctx.stroke();
            ctx.restore();
        }
        else {
            ctx.beginPath();
            ctx.arc(x, y - 45, 14, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        // 2. 軀干
        ctx.strokeStyle = charColor;
        ctx.shadowColor = charColor;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 5;

        ctx.beginPath();
        if (player.currentCharacter === 'iron_mecha') {
            ctx.save();
            ctx.strokeStyle = "#64748b";
            ctx.strokeRect(x - 13, y - 30, 26, 22);
            ctx.restore();
        }
        ctx.moveTo(x, y - 30);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        // 柴犬動態尾巴
        if (player.currentCharacter === 'cyber_dog') {
            ctx.save();
            ctx.strokeStyle = charColor;
            ctx.lineWidth = 5.5;
            ctx.lineCap = "round";
            ctx.shadowColor = charColor;
            ctx.shadowBlur = 10;
            
            const tailWag = Math.sin(Date.now() / 80) * 0.35;
            const tailDir = player.side === 'p1' ? -1 : 1;
            
            ctx.translate(x, y + 10); 
            ctx.rotate(tailWag);
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(tailDir * 18, -12, tailDir * 25, -5);
            ctx.stroke();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo(tailDir * 18, -12);
            ctx.lineTo(tailDir * 25, -5);
            ctx.stroke();
            ctx.restore();
        }

        // 走、跳雙腿骨骼計算
        let leftFootX = x - 16;
        let leftFootY = y + 80;
        let rightFootX = x + 16;
        let rightFootY = y + 80;

        if (player.isJumping) {
            const jumpDir = player.vx > 0 ? -1 : 1;
            leftFootX = x - 8 + jumpDir * 6;
            leftFootY = y + 68;
            rightFootX = x + 8 + jumpDir * 6;
            rightFootY = y + 70;
        } else if (Math.abs(player.vx) > 0.5) {
            const cycle = Math.sin(Date.now() * 0.012);
            leftFootX = x + cycle * 18;
            leftFootY = y + 80 - Math.abs(Math.sin(Date.now() / 80)) * 6; 
            rightFootX = x - cycle * 18;
            rightFootY = y + 80 - Math.abs(Math.cos(Date.now() / 80)) * 6;
        }

        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(leftFootX, leftFootY);
        ctx.moveTo(x, y + 10);
        ctx.lineTo(rightFootX, rightFootY);
        ctx.stroke();

        // 【優化】調用 weapons.js 全局的 getRacketPosition 方法，獲取正手筆直對齊的骨骼手/拍位置
        const racketPose = window.getRacketPosition(player);
        const handX = racketPose.handX;
        const handY = racketPose.handY;

        ctx.beginPath();
        ctx.moveTo(x, y - 20); 
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // 關節點發光同步
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = charColor;
        ctx.shadowBlur = 15;
        const joints = [
            { jx: x, jy: y - 20 }, 
            { jx: x, jy: y + 10 }, 
            { jx: handX, jy: handY }, 
            { jx: leftFootX, jy: leftFootY }, 
            { jx: rightFootX, jy: rightFootY }  
        ];
        joints.forEach(j => {
            ctx.beginPath();
            ctx.arc(j.jx, j.jy, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // 繪製球拍
        this.drawRacket(ctx, player, handX, handY, charColor);

        ctx.restore();
    },

    drawRacket: function(ctx, player, handX, handY, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        // 調用全局骨骼方法，確保拍柄與拍頭對齊夾角一致
        const racketPose = window.getRacketPosition(player);
        const racketX = racketPose.racketX;
        const racketY = racketPose.racketY;
        const angle = racketPose.angle;

        const rType = player.currentRacket;

        // 滾木與巴士無連接把手
        const hasHandle = (rType !== 'revenge_log' && rType !== 'cyber_bus');
        if (hasHandle) {
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(racketX, racketY); 
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(racketX, racketY);
        ctx.rotate(angle);

        if (rType === 'revenge_log') {
            ctx.strokeStyle = "#451a03"; 
            ctx.fillStyle = "#5c2a0c"; 
            ctx.lineWidth = 3;
            ctx.shadowColor = "#e2e8f0"; 
            ctx.shadowBlur = 18;
            
            ctx.fillRect(-26, -12, 52, 24);
            ctx.strokeRect(-26, -12, 52, 24);
            
            ctx.strokeStyle = "#381102";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-15, -12); ctx.lineTo(-15, 12);
            ctx.moveTo(10, -12); ctx.lineTo(10, 12);
            ctx.stroke();

            ctx.strokeStyle = "#ff4400";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-8, -12);
            ctx.lineTo(2, 6);
            ctx.lineTo(-4, 12);
            ctx.stroke();

            ctx.fillStyle = "#cbd5e1"; 
            ctx.strokeStyle = "#94a3b8"; 
            ctx.lineWidth = 1.8;
            
            const spikeXs = [-16, 0, 16];
            spikeXs.forEach(sx => {
                ctx.beginPath();
                ctx.moveTo(sx, -12);
                ctx.lineTo(sx - 3, -20);
                ctx.lineTo(sx + 3, -12);
                ctx.fill(); ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(sx, 12);
                ctx.lineTo(sx - 3, 20);
                ctx.lineTo(sx + 3, 12);
                ctx.fill(); ctx.stroke();
            });
        } 
        else if (rType === 'standard_carbon') {
            ctx.strokeStyle = "#ffffff";
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 12;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, -10); ctx.lineTo(-10, 10);
            ctx.moveTo(0, -14); ctx.lineTo(0, 14);
            ctx.moveTo(10, -10); ctx.lineTo(10, 10);
            ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
            ctx.moveTo(-15, -7); ctx.lineTo(15, -7);
            ctx.moveTo(-15, 7); ctx.lineTo(15, 7);
            ctx.stroke();
        } 
        else if (rType === 'photon_saber') {
            const pulseWidth = 6 + 2.5 * Math.sin(Date.now() / 90);
            
            ctx.strokeStyle = "#ec4899";
            ctx.shadowColor = "#ec4899"; ctx.shadowBlur = 22;
            ctx.lineWidth = pulseWidth;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(44, 0); 
            ctx.stroke();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = pulseWidth * 0.45;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(44, 0);
            ctx.stroke();
        } 
        else if (rType === 'vortex_gate') {
            ctx.rotate(Date.now() / 250); 

            let grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            grad.addColorStop(0.35, "rgba(0, 240, 255, 0.65)");
            grad.addColorStop(0.7, "rgba(168, 85, 247, 0.4)");
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = "#c084fc";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI, false);
            ctx.stroke();
        } 
        else if (rType === 'cyber_bus') {
            ctx.strokeStyle = "#eab308";
            ctx.fillStyle = "#0f172a";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#eab308"; ctx.shadowBlur = 12;
            
            ctx.fillRect(-28, -16, 56, 32);
            ctx.strokeRect(-28, -16, 56, 32);
            
            const headlampPulse = 0.6 + 0.4 * Math.sin(Date.now() / 100);
            ctx.fillStyle = `rgba(234, 179, 8, ${headlampPulse})`;
            ctx.shadowColor = "#eab308";
            ctx.shadowBlur = 15;
            ctx.fillRect(24, -5, 4, 10);
            
            ctx.fillStyle = "rgba(0, 240, 255, 0.75)";
            ctx.shadowBlur = 0;
            ctx.fillRect(-18, -11, 14, 11);
            ctx.fillRect(4, -11, 14, 11);

            ctx.fillStyle = "#ff007f";
            ctx.beginPath();
            ctx.arc(-14, 16, 5, 0, Math.PI * 2);
            ctx.arc(14, 16, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore(); 
        ctx.restore(); 
    },

    drawBall: function(ctx, ball) {
        if (ball) {
            this.drawGroundShadow(ctx, ball.x, ball.y, 18, 500);
            if (ball.phantom && ball.phantom.active) {
                this.drawGroundShadow(ctx, ball.phantom.x, ball.phantom.y, 18, 500);
            }
        }

        ctx.save();
        const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        if (ball.phantom && ball.phantom.active) {
            ctx.save();
            ctx.fillStyle = "#ffffff"; 
            ctx.shadowColor = "#ccff00";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ball.phantom.x, ball.phantom.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (ball.activeUltimate === 'power_apple') {
            ctx.shadowColor = "#ff3333";
            ctx.shadowBlur = 20;
            
            for (let i = 1; i <= 5; i++) {
                ctx.fillStyle = `rgba(255, 51, 51, ${0.7 - i * 0.12})`;
                ctx.beginPath();
                ctx.arc(ball.x - ball.vx * i * 0.6, ball.y - ball.vy * i * 0.6, 10 - i * 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            let radGrad = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 11);
            radGrad.addColorStop(0, "#ffffff");
            radGrad.addColorStop(0.4, "#ffaa00");
            radGrad.addColorStop(1, "#ff3333");
            ctx.fillStyle = radGrad;
        } 
        else if (ball.activeUltimate === 'cyber_dog') {
            ctx.shadowColor = "#ffbc00";
            ctx.shadowBlur = 20;
            
            for (let i = 1; i <= 4; i++) {
                ctx.strokeStyle = `rgba(255, 188, 0, ${0.6 - i * 0.12})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(ball.x - ball.vx * i * 0.4, ball.y - ball.vy * i * 0.4, 8 + i * 3.5, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            let radGrad = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 11);
            radGrad.addColorStop(0, "#ffffff");
            radGrad.addColorStop(0.5, "#ffeeaa");
            radGrad.addColorStop(1, "#ffbc00");
            ctx.fillStyle = radGrad;
        } 
        else if (ball.activeUltimate === 'shadow_ninja') {
            ctx.shadowColor = "#bc13fe";
            ctx.shadowBlur = 22;
            
            for (let i = 1; i <= 6; i++) {
                ctx.fillStyle = `rgba(188, 19, 254, ${0.6 - i * 0.1})`;
                ctx.beginPath();
                ctx.arc(ball.x - ball.vx * i * 0.5, ball.y - ball.vy * i * 0.5 + Math.sin((Date.now() / 30) - i) * 6, 9 - i, 0, Math.PI * 2);
                ctx.fill();
            }
            
            let radGrad = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 11);
            radGrad.addColorStop(0, "#ffffff");
            radGrad.addColorStop(0.6, "#e9d5ff");
            radGrad.addColorStop(1, "#bc13fe");
            ctx.fillStyle = radGrad;
        }
        else if (ballSpeed > 11) {
            ctx.save();
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 18;
            for (let i = 1; i <= 5; i++) {
                ctx.fillStyle = `rgba(0, 240, 255, ${0.6 - i * 0.12})`;
                ctx.beginPath();
                ctx.arc(ball.x - ball.vx * i * 0.45, ball.y - ball.vy * i * 0.45, 10 - i * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            ctx.fillStyle = "#ffffff"; 
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 15;
        }
        else {
            ctx.fillStyle = "#ffffff"; 
            ctx.shadowColor = "#ccff00";
            ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};