/**
 * game_core.js - 遊戲大腦與心臟總指揮 (主客機權威同步與後台防死鎖挂起版)
 */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const activeUser = getUrlParam('user') || "CyberPlayer";
    const mode = getUrlParam('mode') || "training"; 
    const difficulty = getUrlParam('difficulty') || "medium";

    // 聯機專屬：從 URL 讀取房間號及分配的絕對身分角色 (p1=Host, p2=Guest)
    const roomCode = getUrlParam('room') || "";
    const networkSide = getUrlParam('side') || "p1"; 

    const p1_char = getUrlParam('p1_char') || "neon_runner";
    const p1_rack = getUrlParam('p1_racket') || "standard_carbon";
    const p2_char = getUrlParam('p2_char') || (mode === 'training' ? "iron_mecha" : "shadow_ninja");
    const p2_rack = getUrlParam('p2_racket') || "standard_carbon";

    const CHAR_STATS = {
        "neon_runner": { speed: 10.8, jump: 12.6, defense: 0.86 },
        "shadow_ninja": { speed: 10.4, jump: 13.6, defense: 0.80 },
        "iron_mecha": { speed: 9.4, jump: 11.6, defense: 0.92 },
        "cyber_dog": { speed: 11.2, jump: 12.1, defense: 0.83 },
        "power_apple": { speed: 10.0, jump: 13.1, defense: 0.88 }
    };

    // P1 角色初始化 (絕對左場)
    let p1 = {
        side: 'p1', x: 250, y: 420, vx: 0, vy: 0,
        isJumping: false, isSwinging: false, swingTimer: 0,
        currentCharacter: p1_char, currentRacket: p1_rack,
        energyBlocks: 0, energyPoints: 0,
        weaponRadius: 100, smashMult: 1.2, stats: { defense: 85 },
        activeUltimateTimer: 0,
        hitCooldown: 0,
        recoilTimer: 0,
        slowTimer: 0,
        powerAppleUltimateActive: false,
        shadowNinjaUltimateActive: false
    };

    // P2 角色初始化 (絕對右場)
    let p2 = {
        side: 'p2', x: 950, y: 420, vx: 0, vy: 0,
        isJumping: false, isSwinging: false, swingTimer: 0,
        currentCharacter: p2_char, currentRacket: p2_rack,
        energyBlocks: 0, energyPoints: 0,
        weaponRadius: 100, smashMult: 1.2, stats: { defense: 85 },
        activeUltimateTimer: 0,
        hitCooldown: 0,
        recoilTimer: 0,
        slowTimer: 0,
        powerAppleUltimateActive: false,
        shadowNinjaUltimateActive: false
    };

    let ball = { x: 280, y: 350, vx: 0, vy: 0, activeUltimate: null, lastHitter: null, canScore: false, phantom: null };

    let p1Score = 0;
    let p2Score = 0;
    
    let gameState = 'COUNTDOWN'; 
    let serverPlayer = p1; 
    let countdownTimer = 120; 

    // Deuce 平分核心計時器
    let isDeuce = false;
    let deuceTimer = 3600;       
    let activeServeTimer = 300;  

    let statsTracker = {
        clutch_saves: 0,
        smash_points: 0,
        high_rallies_won: 0,
        is_deuce: false,
        is_domination: false,
        is_comeback: false
    };

    let rallyHits = 0;
    let rallyTime = 0;

    window.screenShakeTimer = 0;
    window.visualEffects = [];

    // 【音效載入】預載擊球音效
    window.hitSound = new Audio('/static/assets/sounds/hit.mp3');
    window.playHitSound = function() {
        if (window.hitSound) {
            window.hitSound.currentTime = 0;
            window.hitSound.play().catch(e => {
                console.log("Audio play blocked: ", e);
            });
        }
    };

    const FALLBACK_GEAR = {
        "characters": {
            "neon_runner": { "name": "賽博跑手", "icon": "🏃", "defense": 85 },
            "shadow_ninja": { "name": "影子忍者", "icon": "🐱‍👤", "defense": 75 },
            "iron_mecha": { "name": "鋼鐵機甲", "icon": "🤖", "defense": 99 },
            "cyber_dog": { "name": "柴犬汪星人", "icon": "🐶", "defense": 80 },
            "power_apple": { "name": "爆能蘋果", "icon": "🍎", "defense": 90 }
        }
    };

    const UI_Aegis = window.GameUI || { 
        syncHTMLGrid: () => {}, 
        drawCanvasUI: () => {}, 
        triggerText: () => {} 
    };
    
    const Physics_Aegis = window.GamePhysics;
    const Render_Aegis = window.GameRender;

    // 📡 線上 WebSocket 聯機幀同步引擎
    let socket = null;
    if (mode === 'online_pvp' && typeof io === 'function') {
        socket = io();
        
        socket.on('connect', () => {
            socket.emit('join_game_socket', {
                room: roomCode,
                side: networkSide,
                username: activeUser
            });
        });

        // 1P 主機接收 2P 鍵盤發送過來的鏡面映射操作
        if (networkSide === 'p1') {
            socket.on('p2_input_receive', (data) => {
                window.EnemyActions.keys = data.keys;
            });
        }

        // 2P 客機接收 1P 廣播過來的權威絕對狀態，並進行「鏡面翻轉投影」
        if (networkSide === 'p2') {
            socket.on('sync_state_receive', (state) => {
                p1Score = state.scores.p1;
                p2Score = state.scores.p2;
                deuceTimer = state.timers.deuce;
                activeServeTimer = state.timers.serve;
                isDeuce = state.timers.isDeuce;
                gameState = state.gameState;

                // 💡 鏡面投影：2P 屏幕上左側為自己，右側為對方
                // 1P 絕對在左側(0->600)，被 2P 渲染至右側 (1200 - state.p1.x)
                p1.x = 1200 - state.p1.x;
                p1.y = state.p1.y;
                p1.isSwinging = state.p1.isSwinging;
                p1.swingTimer = state.p1.swingTimer;
                p1.currentCharacter = state.p1.currentCharacter;
                p1.currentRacket = state.p1.currentRacket;
                p1.energyBlocks = state.p1.energyBlocks;

                // 2P 絕對在右側(600->1200)，被 2P 渲染至左側 (1200 - state.p2.x)
                p2.x = 1200 - state.p2.x;
                p2.y = state.p2.y;
                p2.isSwinging = state.p2.isSwinging;
                p2.swingTimer = state.p2.swingTimer;
                p2.currentCharacter = state.p2.currentCharacter;
                p2.currentRacket = state.p2.currentRacket;
                p2.energyBlocks = state.p2.energyBlocks;

                // 球體鏡面投影
                ball.x = 1200 - state.ball.x;
                ball.y = state.ball.y;
                ball.vx = -state.ball.vx;
                ball.vy = state.ball.vy;
                ball.activeUltimate = state.ball.activeUltimate;
                ball.lastHitter = state.ball.lastHitter === 'p1' ? 'p2' : 'p1'; // 擊球者身分鏡面化
                ball.canScore = state.ball.canScore;

                // 💡 核心同步修復：強制調用本地更新與 HUD、大招渲染，防止 2P 數據面卡死！
                updateScoreHUD();
                UI_Aegis.syncHTMLGrid(p1, p2);

                // 💡 核心同步修復 2：同步中間全息文字 prompt 提示 (DEUCE! / POINT! / DOUBLE TOUCH!)
                if (state.effectText && state.effectTimer > 0) {
                    window.GameUI.effectText = state.effectText;
                    window.GameUI.effectTimer = state.effectTimer;
                    window.GameUI.effectColor = state.effectColor || "#00f0ff";
                }
            });
        }
    }

    function syncUIHeader() {
        const p1W = window.WeaponSystem ? window.WeaponSystem.getGear(p1.currentRacket) : { icon: "🏸", name: "標準碳素拍" };
        const p2W = window.WeaponSystem ? window.WeaponSystem.getGear(p2.currentRacket) : { icon: "🏸", name: "標準碳素拍" };

        const r1Avatar = document.getElementById("p1RacketAvatar");
        const r1Name = document.getElementById("p1RacketName");
        const r2Avatar = document.getElementById("p2RacketAvatar");
        const r2Name = document.getElementById("p2RacketName");

        // 💡 鏡面同步：2P 視角下 HUD 欄位左右調換，使 2P 自己顯示在左側
        if (mode === 'online_pvp' && networkSide === 'p2') {
            if (r1Avatar) r1Avatar.innerText = p2W.icon || "🏸";
            if (r1Name) r1Name.innerText = p2W.name || "標準碳素拍";
            if (r2Avatar) r2Avatar.innerText = p1W.icon || "🏸";
            if (r2Name) r2Name.innerText = p1W.name || "標準碳素拍";

            const p1CharData = FALLBACK_GEAR.characters[p1.currentCharacter] || { name: "賽博跑手", icon: "🏃" };
            const p2CharData = FALLBACK_GEAR.characters[p2.currentCharacter] || { name: "鋼鐵機甲", icon: "🤖" };

            const p1NameEl = document.getElementById("p1Name");
            const p1AvatarEl = document.getElementById("p1Avatar");
            const p2NameEl = document.getElementById("p2Name");
            const p2AvatarEl = document.getElementById("p2Avatar");

            if (p1NameEl) p1NameEl.innerText = p2CharData.name;
            if (p1AvatarEl) p1AvatarEl.innerText = p2CharData.icon;
            if (p2NameEl) p2NameEl.innerText = p1CharData.name;
            if (p2AvatarEl) p2AvatarEl.innerText = p1CharData.icon;
        } else {
            // 常規對戰 (1P / AI / 本地)
            if (r1Avatar) r1Avatar.innerText = p1W.icon || "🏸";
            if (r1Name) r1Name.innerText = p1W.name || "標準碳素拍";
            if (r2Avatar) r2Avatar.innerText = p2W.icon || "🏸";
            if (r2Name) r2Name.innerText = p2W.name || "標準碳素拍";

            const p1CharData = FALLBACK_GEAR.characters[p1.currentCharacter] || { name: "賽博跑手", icon: "🏃" };
            const p2CharData = FALLBACK_GEAR.characters[p2.currentCharacter] || { name: "鋼鐵機甲", icon: "🤖" };

            const p1NameEl = document.getElementById("p1Name");
            const p1AvatarEl = document.getElementById("p1Avatar");
            const p2NameEl = document.getElementById("p2Name");
            const p2AvatarEl = document.getElementById("p2Avatar");

            if (p1NameEl) p1NameEl.innerText = p1CharData.name;
            if (p1AvatarEl) p1AvatarEl.innerText = p1CharData.icon;
            if (p2NameEl) p2NameEl.innerText = p2CharData.name;
            if (p2AvatarEl) p2AvatarEl.innerText = p2CharData.icon;
        }
    }

    function initGame() {
        window.PlayerActions.init();
        window.EnemyActions.init();

        const p1W = window.WeaponSystem ? window.WeaponSystem.getGear(p1_rack) : { icon: "🏸", name: "標準碳素拍", hitRadius: 100, smashMultiplier: 1.2 };
        p1.weaponRadius = p1W.hitRadius;
        p1.smashMult = p1W.smashMultiplier;

        const p2W = window.WeaponSystem ? window.WeaponSystem.getGear(p2_rack) : { icon: "🏸", name: "標準碳素拍", hitRadius: 100, smashMultiplier: 1.2 };
        p2.weaponRadius = p2W.hitRadius;
        p2.smashMult = p2W.smashMultiplier;

        const p1Cfg = CHAR_STATS[p1_char] || CHAR_STATS["neon_runner"];
        p1.speed = p1Cfg.speed;
        p1.jumpHeight = p1Cfg.jump * 1.27; 
        p1.defense = p1Cfg.defense;
        p1.stats.defense = p1Cfg.defense * 100;

        const p2Cfg = CHAR_STATS[p2_char] || CHAR_STATS["iron_mecha"];
        p2.speed = p2Cfg.speed;
        p2.jumpHeight = p2Cfg.jump * 1.27; 
        p2.defense = p2Cfg.defense;
        p2.stats.defense = p2Cfg.defense * 100;

        syncUIHeader();
        
        document.getElementById("gameModeLabel").innerText = mode === "training" ? "AI TRAINING CAMP" : (mode === 'online_pvp' ? "ONLINE REALTIME CLASH" : "LOCAL 1V1 MATCH");

        // 啟動雙循環機制
        requestAnimationFrame(renderLoop);
        setInterval(physicsStep, 1000 / 60); // 60Hz 獨立定時器跑物理與同步，徹底解決後台挂起死鎖問題！
    }

    // 1. Canvas 渲染循環 (只有在標籤頁可見時才工作，最大程度節省 GPU 算力)
    function renderLoop() {
        ctx.clearRect(0, 0, 1200, 600);

        ctx.save();
        if (window.screenShakeTimer > 0) {
            const dx = (Math.random() - 0.5) * 15; 
            const dy = (Math.random() - 0.5) * 15;
            ctx.translate(dx, dy);
            window.screenShakeTimer--;
        }

        Render_Aegis.drawCourt(ctx, p1, p2);
        Render_Aegis.drawPlayer(ctx, p1);
        Render_Aegis.drawPlayer(ctx, p2);
        Render_Aegis.drawBall(ctx, ball);

        if (gameState === 'COUNTDOWN') {
            window.drawCountdown();
        } else if (gameState === 'SERVING' || gameState === 'PLAYING') {
            UI_Aegis.drawCanvasUI(ctx);
        } else if (gameState === 'OVER' || gameState === 'SAVED') {
            drawGameOver();
        }

        drawVisualEffects();
        ctx.restore();

        requestAnimationFrame(renderLoop);
    }

    // 2. 絕對權威物理與通訊發送循環 (在後台依然被定時執行，維持同步)
    function physicsStep() {
        if (gameState === 'COUNTDOWN') {
            countdownTimer--;
            if (countdownTimer <= 0) {
                gameState = 'SERVING'; 
            }
        } else if (gameState === 'SERVING') {
            // 客機 2P 在發球準備中同樣向 P1 發送發球信號，允許 P2 進行發球操作
            if (mode === 'online_pvp' && networkSide === 'p2') {
                let p2MirroredKeys = {
                    moveLeft: window.PlayerActions.keys.moveRight,
                    moveRight: window.PlayerActions.keys.moveLeft,
                    jump: window.PlayerActions.keys.jump,
                    swing: window.PlayerActions.keys.swing,
                    ultimate: window.PlayerActions.keys.ultimate
                };
                socket.emit('p2_input', {
                    room: roomCode,
                    keys: p2MirroredKeys
                });
            }
            // 只有 P1 主機運行發球物理運算
            if (mode !== 'online_pvp' || networkSide === 'p1') {
                updateServingPhysics();
            }
        } else if (gameState === 'PLAYING') {
            if (mode !== 'online_pvp' || networkSide === 'p1') {
                updatePhysics();
            } else if (mode === 'online_pvp' && networkSide === 'p2') {
                // 2P 客機：將本機 A/D/W/S 進行「鏡面翻轉」後，高頻打包發送至 1P 電腦中轉
                let p2MirroredKeys = {
                    moveLeft: window.PlayerActions.keys.moveRight, // A (鏡面左) -> 絕對右 (遠離網網)
                    moveRight: window.PlayerActions.keys.moveLeft, // D (鏡面右) -> 絕對左 (逼近網)
                    jump: window.PlayerActions.keys.jump,
                    swing: window.PlayerActions.keys.swing,
                    ultimate: window.PlayerActions.keys.ultimate
                };
                socket.emit('p2_input', {
                    room: roomCode,
                    keys: p2MirroredKeys
                });
            }
        }

        // 🛰️ 全局大同步：房主（1P）將絕對球場中的所有坐標、分數、大招格子每幀強製同步給客機 2P
        if (mode === 'online_pvp' && networkSide === 'p1' && socket) {
            socket.emit('sync_state', {
                room: roomCode,
                p1: { x: p1.x, y: p1.y, isSwinging: p1.isSwinging, swingTimer: p1.swingTimer, currentCharacter: p1.currentCharacter, currentRacket: p1.currentRacket, energyBlocks: p1.energyBlocks },
                p2: { x: p2.x, y: p2.y, isSwinging: p2.isSwinging, swingTimer: p2.swingTimer, currentCharacter: p2.currentCharacter, currentRacket: p2.currentRacket, energyBlocks: p2.energyBlocks },
                ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, activeUltimate: ball.activeUltimate, lastHitter: ball.lastHitter, canScore: ball.canScore },
                scores: { p1: p1Score, p2: p2Score },
                timers: { deuce: deuceTimer, serve: activeServeTimer, isDeuce: isDeuce },
                gameState: gameState,
                // 同步中央全息文字提示數據
                effectText: window.GameUI.effectText,
                effectTimer: window.GameUI.effectTimer,
                effectColor: window.GameUI.effectColor
            });
        }
    }

    function drawVisualEffects() {
        for (let i = window.visualEffects.length - 1; i >= 0; i--) {
            const fx = window.visualEffects[i];
            if (fx.type === 'ripple') {
                ctx.save();
                ctx.strokeStyle = fx.color;
                ctx.lineWidth = 3.5;
                ctx.shadowColor = fx.color;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                fx.radius += (fx.maxRadius - fx.radius) * 0.1;
                fx.timer--;
                if (fx.timer <= 0) {
                    window.visualEffects.splice(i, 1);
                }
            }
        }
    }

    function updateServingPhysics() {
        window.PlayerActions.keys.jump = false; 
        window.EnemyActions.keys.jump = false; 

        p1.vx = 0;
        p2.vx = 0;

        if (p1.recoilTimer > 0) p1.recoilTimer--;
        if (p2.recoilTimer > 0) p2.recoilTimer--;
        
        Physics_Aegis.updatePlayer(p1);
        Physics_Aegis.updatePlayer(p2);

        p1.hitCooldown = 0;
        p2.hitCooldown = 0;

        if (serverPlayer === p1) {
            if (p1.x > 280) p1.x = 280;
        } else {
            if (p2.x < 920) p2.x = 920;
        }

        updateScoreHUD();

        if (serverPlayer === p1) {
            // 只有在非人機模式下，才啟用 P1 5秒發球倒計時
            if (mode !== 'training') {
                activeServeTimer--;
            } else {
                activeServeTimer = 300; 
            }
            
            ball.x = p1.x + 30;
            ball.y = p1.y - 30;
            
            if (window.PlayerActions.keys.swing || (mode !== 'training' && activeServeTimer <= 0)) {
                p1.isSwinging = true;
                p1.swingTimer = 10;
                ball.vx = 11.5;    
                ball.vy = -13.2;  
                ball.lastHitter = 'p1';
                p1.hitCooldown = 30; 
                ball.canScore = true; 
                gameState = 'PLAYING';
                window.PlayerActions.keys.swing = false;
                window.playHitSound(); 
                activeServeTimer = 300; 
            }
        } else {
            ball.x = p2.x - 30;
            ball.y = p2.y - 30; 
            
            if (mode === 'training') {
                p2.aiServeTimer = (p2.aiServeTimer || 0) + 1;
                if (p2.aiServeTimer > 90) {
                    p2.isSwinging = true;
                    p2.swingTimer = 10;
                    ball.vx = -11.5;   
                    ball.vy = -13.2;  
                    ball.lastHitter = 'p2';
                    p2.hitCooldown = 30; 
                    ball.canScore = true; 
                    gameState = 'PLAYING';
                    p2.aiServeTimer = 0;
                    window.playHitSound(); 
                }
            } else {
                // 本地 1v1 或 聯機對戰：P2 同樣啟用 5 秒倒計時
                activeServeTimer--;
                
                // 1P 電腦在聯機對戰中接收 2P 鍵盤傳送發球動作
                let p2WantsSwing = window.EnemyActions.keys.swing;
                
                if (p2WantsSwing || activeServeTimer <= 0) {
                    p2.isSwinging = true;
                    p2.swingTimer = 10;
                    ball.vx = -11.5;   
                    ball.vy = -13.2;  
                    ball.lastHitter = 'p2';
                    p2.hitCooldown = 30; 
                    ball.canScore = true; 
                    gameState = 'PLAYING';
                    window.EnemyActions.keys.swing = false;
                    window.playHitSound(); 
                    activeServeTimer = 300; 
                }
            }
        }
    }

    function updatePhysics() {
        rallyTime++;

        if (isDeuce) {
            deuceTimer--;
            if (deuceTimer <= 0) {
                if (p1Score !== p2Score) {
                    gameState = 'OVER';
                } else {
                    UI_Aegis.triggerText("SUDDEN DEATH!", "#ff0000");
                }
            }
        }

        if (p1.hitCooldown > 0) p1.hitCooldown--;
        if (p2.hitCooldown > 0) p2.hitCooldown--;
        if (p1.slowTimer > 0) p1.slowTimer--;
        if (p2.slowTimer > 0) p2.slowTimer--;

        // P1 移動控制
        if (p1.recoilTimer > 0) {
            p1.recoilTimer--;
        } else {
            let p1Speed = p1.speed;
            if (p1.currentCharacter === 'neon_runner' && p1.activeUltimateTimer > 0) {
                p1Speed = p1.speed * 1.40; 
            }
            if (p1.slowTimer > 0) {
                p1Speed *= 0.80; 
            }
            if (window.PlayerActions.keys.moveLeft) p1.vx = -p1Speed;
            if (window.PlayerActions.keys.moveRight) p1.vx = p1Speed;
        }

        if (window.PlayerActions.keys.jump && !p1.isJumping && p1.recoilTimer === 0) {
            p1.vy = -p1.jumpHeight; 
            p1.isJumping = true;
        }
        if (window.PlayerActions.keys.swing && !p1.isSwinging) {
            p1.isSwinging = true;
            p1.swingTimer = 12;
            window.PlayerActions.keys.swing = false;
        }

        const p1Required = (p1_char === 'power_apple') ? 8 : ((p1_char === 'iron_mecha') ? 6 : ((p1_char === 'cyber_dog') ? 5 : ((p1_char === 'shadow_ninja') ? 4 : 3)));
        if (window.PlayerActions.keys.ultimate && p1.energyBlocks >= p1Required) {
            triggerUltimate(p1);
            window.PlayerActions.keys.ultimate = false; 
        }

        // P2 移動控制 (線上聯機模式下由 2P socket 控制)
        let p2Speed = p2.speed;
        if (p2.currentCharacter === 'neon_runner' && p2.activeUltimateTimer > 0) {
            p2Speed = p2.speed * 1.40;
        }
        if (p2.slowTimer > 0) {
            p2Speed *= 0.80;
        }

        if (p2.recoilTimer > 0) {
            p2.recoilTimer--;
        } else {
            if (window.EnemyActions.keys.moveLeft) p2.vx = -p2Speed;
            if (window.EnemyActions.keys.moveRight) p2.vx = p2Speed;
        }

        if (mode === 'training') {
            window.EnemyActions.updateAI(p2, ball, difficulty);
        }
        if (window.EnemyActions.keys.jump && !p2.isJumping && p2.recoilTimer === 0) {
            p2.vy = -p2.jumpHeight; 
            p2.isJumping = true;
        }
        if (window.EnemyActions.keys.swing && !p2.isSwinging) {
            p2.isSwinging = true;
            p2.swingTimer = 12;
            window.EnemyActions.keys.swing = false;
        }

        const p2Required = (p2_char === 'power_apple') ? 8 : ((p2_char === 'iron_mecha') ? 6 : ((p2_char === 'cyber_dog') ? 5 : ((p2_char === 'shadow_ninja') ? 4 : 3)));
        if (window.EnemyActions.keys.ultimate && p2.energyBlocks >= p2Required) {
            triggerUltimate(p2);
            window.EnemyActions.keys.ultimate = false; 
        }

        if (p1.activeUltimateTimer > 0) p1.activeUltimateTimer--;
        if (p2.activeUltimateTimer > 0) p2.activeUltimateTimer--;

        if (p1.isSwinging) {
            p1.swingTimer--;
            if (p1.swingTimer <= 0) p1.isSwinging = false;
        }
        if (p2.isSwinging) {
            p2.swingTimer--;
            if (p2.swingTimer <= 0) p2.isSwinging = false;
        }

        checkNeonRunnerAutoSave(p1);
        checkNeonRunnerAutoSave(p2);

        Physics_Aegis.updatePlayer(p1);
        Physics_Aegis.updatePlayer(p2);
        Physics_Aegis.updateBall(ball);
        Physics_Aegis.checkNetCollision(ball);

        checkSwingHit(p1);
        checkSwingHit(p2);
        checkMechaShield(p1);
        checkMechaShield(p2);
        checkPointEnd();

        UI_Aegis.syncHTMLGrid(p1, p2);
        updateScoreHUD();
    }

    function triggerUltimate(player) {
        const opponent = player.side === 'p1' ? p2 : p1;
        
        if (player.currentCharacter === 'neon_runner') {
            player.energyBlocks -= 3;
            player.activeUltimateTimer = 270; 
            UI_Aegis.triggerText("BLINK STEP!", "#ff007f");
        } 
        else if (player.currentCharacter === 'shadow_ninja') {
            player.energyBlocks -= 4;
            player.shadowNinjaUltimateActive = true;
            UI_Aegis.triggerText("PHANTOM DOUBLE!", "#bc13fe");
        } 
        else if (player.currentCharacter === 'cyber_dog') {
            player.energyBlocks -= 5;
            window.screenShakeTimer = 110; 
            opponent.slowTimer = 180; 
            ball.activeUltimate = 'cyber_dog';
            
            window.visualEffects.push({
                type: 'ripple',
                x: player.x,
                y: player.y,
                radius: 10,
                maxRadius: 350,
                color: '#ffbc00',
                timer: 60
            });
            UI_Aegis.triggerText("BARK STORM!", "#ffbc00");
        } 
        else if (player.currentCharacter === 'iron_mecha') {
            player.energyBlocks -= 6;
            player.activeUltimateTimer = 180; 
            UI_Aegis.triggerText("AEGIS SHIELD!", "#00f0ff");
        } 
        else if (player.currentCharacter === 'power_apple') {
            player.energyBlocks -= 8;
            player.powerAppleUltimateActive = true;
            UI_Aegis.triggerText("METEOR READY!", "#ff3333");
        }
    }

    function checkNeonRunnerAutoSave(player) {
        if (player.currentCharacter === 'neon_runner' && player.activeUltimateTimer > 0 && ball.canScore && ball.lastHitter !== player.side) {
            const onMySide = (player.side === 'p1' && ball.x < 600) || (player.side === 'p2' && ball.x >= 600);
            if (ball.y > 440 && onMySide) {
                const dist = Math.sqrt((ball.x - player.x) * (ball.x - player.x) + (ball.y - player.y) * (ball.y - player.y));
                if (dist <= 180) {
                    player.x = player.side === 'p1' ? Math.max(80, Math.min(530, ball.x)) : Math.max(670, Math.min(1120, ball.x));
                    player.isSwinging = true;
                    player.swingTimer = 12;
                    UI_Aegis.triggerText("BLINK SAVE!", "#ff007f");
                }
            }
        }
    }

    function checkMechaShield(player) {
        if (player.currentCharacter === 'iron_mecha' && player.activeUltimateTimer > 0) {
            if (ball.x >= 580 && ball.x <= 620 && ball.y >= 200 && ball.y <= 390) {
                if (ball.canScore && ball.lastHitter !== player.side) {
                    ball.vx = player.side === 'p1' ? 7.0 : -7.0;
                    ball.vy = -3.0;
                    ball.activeUltimate = null;
                    ball.lastHitter = player.side;
                    ball.canScore = true;
                    player.hitCooldown = 30; 
                    chargeEnergyBlock(player, 100); 
                    UI_Aegis.triggerText("ABS REBOUND!", "#00f0ff");
                    window.playHitSound(); 
                }
            }
        }
    }

    function checkSwingHit(player) {
        if (!player.isSwinging) return;

        const racketPose = window.getRacketPosition(player);
        const racketX = racketPose.racketX;
        const racketY = racketPose.racketY;

        if (player.side === 'p1' && (ball.x > 600 || racketX > 600)) return;
        if (player.side === 'p2' && (ball.x < 600 || racketX < 600)) return;

        const dist = Math.sqrt((ball.x - racketX) * (ball.x - racketX) + (ball.y - racketY) * (ball.y - racketY));
        
        if (dist < player.weaponRadius) {
            if (player.hitCooldown > 0) {
                return; 
            }

            if (ball.canScore && ball.lastHitter === player.side) {
                p1.isSwinging = false; p2.isSwinging = false;
                triggerDoubleTouchFoul(player);
                return;
            }

            if (ball.y > 475) {
                statsTracker.clutch_saves++;
                chargeEnergyBlock(player, 100); 
                UI_Aegis.triggerText("CLUTCH SAVE!", "#39ff14");
            }

            let speed = 16.5 * player.smashMult; 
            let isSmashShot = false;

            if (player.isJumping) {
                speed *= 1.45; 
                isSmashShot = true;
            } else {
                speed *= 0.85; 
            }

            if (rallyHits >= 10) {
                const overSteps = Math.floor((rallyHits - 10) / 2);
                const rallyMultiplier = Math.pow(1.1, overSteps);
                speed *= rallyMultiplier;
                speed = Math.min(speed, 45); 
                UI_Aegis.triggerText(`RALLY INTENS_ x${rallyMultiplier.toFixed(2)}`, "#ccff00");
            }

            let forwardSpeedBonus = 0;
            if (player.side === 'p1' && player.vx > 0) {
                forwardSpeedBonus = player.vx * 0.35; 
            } else if (player.side === 'p2' && player.vx < 0) {
                forwardSpeedBonus = player.vx * 0.35; 
            }

            let forwardVerticalBonus = Math.abs(player.vx) * 0.40; 

            if (isSmashShot) {
                let smashSpeed = speed * 1.05;
                ball.vx = player.side === 'p1' ? (smashSpeed + forwardSpeedBonus) : (-smashSpeed + forwardSpeedBonus);
                ball.vy = 5.8 + forwardVerticalBonus; 
            } else {
                let clearSpeed = speed * 0.98;
                ball.vx = player.side === 'p1' ? (clearSpeed + forwardSpeedBonus) : (-clearSpeed + forwardSpeedBonus);
                ball.vy = -11.6 - forwardVerticalBonus; 
            }

            if (ball.activeUltimate === 'power_apple') {
                ball.vx *= 1.35;
                ball.vy *= 1.35;
            }

            if (player.shadowNinjaUltimateActive) {
                ball.activeUltimate = 'shadow_ninja';
                player.shadowNinjaUltimateActive = false;

                ball.phantom = {
                    x: ball.x,
                    y: ball.y,
                    vx: ball.vx * 1.05,
                    vy: ball.vy - 1.5,
                    active: true
                };
            }
            else if (player.powerAppleUltimateActive) {
                ball.activeUltimate = 'power_apple';
                player.powerAppleUltimateActive = false;
            }

            window.GamePhysics.applyRecoilKnockback(player, ball);

            ball.lastHitter = player.side; 
            player.hitCooldown = 30; 
            
            rallyHits++;
            if (rallyHits % 6 === 0) {
                chargeEnergyBlock(player, 100); 
            }

            if (isSmashShot) {
                UI_Aegis.triggerText("SMASH!", "#ff007f");
            }

            player.isSwinging = false; 
            window.playHitSound(); 
        }
    }

    function triggerDoubleTouchFoul(offendingPlayer) {
        if (!ball.canScore) return;
        ball.canScore = false; 

        UI_Aegis.triggerText("DOUBLE TOUCH!", "#ff3333");
        if (offendingPlayer.side === 'p1') {
            p2Score++;
            serverPlayer = p2;
        } else {
            p1Score++;
            serverPlayer = p1;
        }

        resetPositions();
    }

    function chargeEnergyBlock(player, points) {
        player.energyPoints += points;
        if (player.energyPoints >= 100) {
            player.energyPoints -= 100;
            player.energyBlocks = Math.min(player.energyBlocks + 1, 8); 
        }
    }

    function checkPointEnd() {
        if (!ball.canScore) return;

        if (ball.y >= 495) {
            ball.canScore = false; 

            if (ball.x < 600) {
                p2Score++;
                chargeEnergyBlock(p2, 100); 
                serverPlayer = p2; 
            } else {
                p1Score++;
                chargeEnergyBlock(p1, 100); 
                serverPlayer = p1; 
            }

            resetPositions();

            if (rallyHits >= 6 && rallyTime >= 600) {
                statsTracker.high_rallies_won++;
                UI_Aegis.triggerText("EPIC RALLY!", "#ff007f");
            } else {
                UI_Aegis.triggerText("POINT!", "#00f0ff");
            }

            updateScoreHUD();
            checkMatchOverConditions();
        }
    }

    function checkMatchOverConditions() {
        if (p1Score >= 21 || p2Score >= 21) {
            if (!isDeuce) {
                if (Math.abs(p1Score - p2Score) >= 2) {
                    gameState = 'OVER';
                    return;
                }
                if (p1Score === 20 && p2Score === 20) {
                    isDeuce = true;
                    UI_Aegis.triggerText("DEUCE!", "#ff005b");
                }
            }
        }

        if (isDeuce) {
            if (p1Score === 30 || p2Score === 30) {
                gameState = 'OVER';
                return;
            }
            if (Math.abs(p1Score - p2Score) >= 2) {
                gameState = 'OVER';
            }
        }
    }

    function score_board_is_active(el) {
        return el !== null;
    }

    function updateScoreHUD() {
        const scoreEl = document.getElementById("vsScore");
        if (!score_board_is_active(scoreEl)) return;

        // 💡 鏡面同步：2P 視角下將看板比分進行左右對調，保證本人在左側
        let leftScore = p1Score;
        let rightScore = p2Score;
        if (mode === 'online_pvp' && networkSide === 'p2') {
            leftScore = p2Score;
            rightScore = p1Score;
        }

        if (isDeuce) {
            const secs = Math.max(0, Math.ceil(deuceTimer / 60));
            scoreEl.innerText = `${leftScore} : ${rightScore} | DEUCE [${secs}S]`;
        } else {
            if (gameState === 'SERVING') {
                if (mode !== 'training' && (serverPlayer === p1 || serverPlayer === p2)) {
                    const secs = Math.max(0, Math.ceil(activeServeTimer / 60));
                    scoreEl.innerText = `${leftScore} : ${rightScore} | SERVE IN ${secs}S`;
                } else {
                    scoreEl.innerText = `${leftScore} : ${rightScore}`;
                }
            } else {
                scoreEl.innerText = `${leftScore} : ${rightScore}`;
            }
        }
    }

    function resetPositions() {
        p1.x = 250; p1.y = 420; p1.vx = 0; p1.vy = 0; p1.isJumping = false; p1.recoilTimer = 0;
        p2.x = 950; p2.y = 420; p2.vx = 0; p2.vy = 0; p2.isJumping = false; p2.recoilTimer = 0;

        ball.x = serverPlayer === p1 ? p1.x + 30 : p2.x - 30;
        ball.y = serverPlayer === p1 ? p1.y - 30 : p2.y - 30;
        ball.vx = 0; ball.vy = 0;
        ball.activeUltimate = null;
        ball.lastHitter = null; 
        ball.phantom = null;
        rallyHits = 0;
        rallyTime = 0;
        p1.hitCooldown = 0;
        p2.hitCooldown = 0;
        activeServeTimer = 300; 

        gameState = 'SERVING'; 
    }

    function drawGameOver() {
        ctx.save();
        ctx.fillStyle = "rgba(16, 19, 26, 0.95)";
        ctx.fillRect(0, 0, 1200, 600);

        ctx.font = "bold 60px 'Space Grotesk'";
        
        let isP1Winner = p1Score > p2Score;
        let isLocalUserWinner = (networkSide === 'p1') ? isP1Winner : !isP1Winner;

        ctx.fillStyle = isLocalUserWinner ? "#00f0ff" : "#ff007f";
        ctx.textAlign = "center";
        ctx.fillText(isLocalUserWinner ? "VICTORY!" : "DEFEAT", 600, 220);

        ctx.font = "24px 'Space Grotesk'";
        ctx.fillStyle = "#e1e2eb";
        
        let leftFinal = p1Score;
        let rightFinal = p2Score;
        if (mode === 'online_pvp' && networkSide === 'p2') {
            leftFinal = p2Score;
            rightFinal = p1Score;
        }
        ctx.fillText(`最終比分  ${leftFinal} : ${rightFinal}`, 600, 300);

        ctx.font = "16px 'Space Grotesk'";
        ctx.fillStyle = "#849495";
        ctx.fillText("數據正在上傳雲端保險箱，請稍後...", 600, 380);
        ctx.restore();

        if (gameState === 'OVER') {
            gameState = 'SAVED'; 

            const isSingle = mode === 'training';

            window.NetworkSystem.uploadFinalResult(
                activeUser, p1Score, p2Score, difficulty, isSingle, statsTracker, mode,
                (res) => {
                    setTimeout(() => {
                        window.location.href = window.getCyberUrl('/lobby');
                    }, 5000); 
                }
            );
        }
    }

    function getUrlParam(name) {
        let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        let r = window.location.search.substr(1).match(reg);
        if (r != null) return decodeURIComponent(r[2]);
        return null;
    }

    window.drawCountdown = function() {
        ctx.save();
        ctx.font = "bold 100px 'Space Grotesk'";
        ctx.fillStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 25;
        ctx.textAlign = "center";
        
        let sec = Math.ceil(countdownTimer / 60);
        ctx.fillText(sec, 600, 280);
        ctx.restore();
    };

    initGame();
});