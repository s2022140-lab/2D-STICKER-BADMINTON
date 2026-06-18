/**
 * game_physics.js - 核心独立物理法官
 */
"use strict";

window.GamePhysics = {
    // 分离球体与玩家重力，确保物理表现精准
    BALL_GRAVITY: 0.36,
    PLAYER_GRAVITY_RISE: 0.36,  // 玩家上升重力（保持原有跳跃高度不变）
    PLAYER_GRAVITY_FALL: 0.65,  // 玩家下落重力（加快落地速度）
    
    // 【空气阻力调整】微幅调降至 0.987，提供更大的末端减速阻力，以承载更快的球速而不出界
    AIR_RESISTANCE: 0.987,
    BOUNCE_Y: -0.82,
    BOUNCE_X: -0.85,
    
    COURT_WIDTH: 1200,
    COURT_HEIGHT: 600,
    FLOOR_Y: 500,
    NET_X: 600,
    NET_HEIGHT: 110,

    COURT_LEFT: 50,
    COURT_RIGHT: 1150,

    updatePlayer: function(player) {
        // 根据玩家垂直运动方向动态选择重力值，实现快速落地，同时不影响起跳高度
        let currentGravity = player.vy > 0 ? this.PLAYER_GRAVITY_FALL : this.PLAYER_GRAVITY_RISE;
        player.vy += currentGravity;
        player.x += player.vx;
        player.y += player.vy;

        player.vx *= 0.85;

        // 地面限制
        const currentHeight = 80;
        if (player.y > this.FLOOR_Y - currentHeight) {
            player.y = this.FLOOR_Y - currentHeight;
            player.vy = 0;
            player.isJumping = false;
        }

        // 半場邊界限制
        if (player.side === 'p1') {
            if (player.x < 80) player.x = 80;
            if (player.x > 530) player.x = 530; 
        } else {
            if (player.x < 670) player.x = 670; 
            if (player.x > 1120) player.x = 1120;
        }
    },

    updateBall: function(ball) {
        let g = this.BALL_GRAVITY;
        
        if (ball.activeUltimate === 'power_apple') {
            if ((ball.lastHitter === 'p1' && ball.x > this.NET_X) || (ball.lastHitter === 'p2' && ball.x < this.NET_X)) {
                g = this.BALL_GRAVITY * 2.2;
            }
        }
        
        ball.vy += g;
        ball.vx *= this.AIR_RESISTANCE;
        ball.vy *= this.AIR_RESISTANCE;
        
        if (ball.activeUltimate === 'cyber_dog') {
            ball.vx += Math.sin(Date.now() / 35) * 0.72; 
            ball.vy += Math.cos(Date.now() / 35) * 0.52;
        }
        else if (ball.activeUltimate === 'shadow_ninja') {
            ball.vy += Math.sin(Date.now() / 30) * 0.4;
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        this.constrainBall(ball);

        if (ball.phantom && ball.phantom.active) {
            ball.phantom.vy += this.BALL_GRAVITY;
            ball.phantom.vx *= this.AIR_RESISTANCE;
            ball.phantom.vy *= this.AIR_RESISTANCE;
            ball.phantom.x += ball.phantom.vx;
            ball.phantom.y += ball.phantom.vy;

            if ((ball.vx > 0 && ball.phantom.x >= this.NET_X) || (ball.vx < 0 && ball.phantom.x <= this.NET_X)) {
                ball.phantom.active = false;
            }
        }
    },

    constrainBall: function(ball) {
        if (ball.y < 25) {
            ball.y = 25;
            ball.vy = -ball.vy * 0.8;
        }
        if (ball.y > 510) {
            ball.y = 510;
        }
        if (ball.x < 60) {
            ball.x = 60;
            ball.vx = -ball.vx * 0.15; 
        } else if (ball.x > 1140) {
            ball.x = 1140;
            ball.vx = -ball.vx * 0.15; 
        }
    },

    checkNetCollision: function(ball) {
        const netTopY = this.FLOOR_Y - this.NET_HEIGHT; 
        if (ball.y > netTopY && Math.abs(ball.x - this.NET_X) < 12) {
            ball.x = ball.x < this.NET_X ? this.NET_X - 12 : this.NET_X + 12;
            ball.vx = -ball.vx * 0.5;
        }
    },

    applyRecoilKnockback: function(player, ball) {
        const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        
        if (ballSpeed > 15) {
            const direction = player.side === 'p1' ? -1 : 1;
            const defenseFactor = 1.0 - (player.defense || 0.85);
            // 【擊退力道增強】係數由 3.0 提高到 4.5，滑行速度上限提至 20，防守反饋感更真實
            const recoilForce = (ballSpeed - 14) * 4.5 * defenseFactor; 
            player.vx = direction * Math.min(recoilForce, 20); 
            player.recoilTimer = Math.min(Math.floor((ballSpeed - 14) * 4.2 * defenseFactor), 18); 
        } else {
            player.recoilTimer = 0; 
        }
    }
};