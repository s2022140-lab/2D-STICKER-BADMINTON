/**
 * lobby.js - 賽博大廳主控模組
 * 100% 完美保留美術樣式，已將勝場數更新為「經驗值/經驗值上限」動態渲染
 */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const renameToggleBtn = document.getElementById("renameToggleBtn");
    const displayName = document.getElementById("playerNameDisplay");
    const inputName = document.getElementById("playerNameInput");
    const iconElement = document.getElementById("renameBtnIcon");

    let isEditing = false;

    // 1. 根據黃金中庸天梯算法，判定對應段位稱號與英語名稱
    function getRankNameByScore(score) {
        if (score === undefined || score === null || score <= 0) return "未定段 (UNRANKED)";
        if (score >= 2600) return "無極至尊 (SUPREME)";
        if (score >= 2200) return "璀璨鑽石 (DIAMOND)";
        if (score >= 1800) return "白金精英 (PLATINUM)";
        if (score >= 1400) return "黃金先鋒 (GOLD)";
        return "白銀衛士 (SILVER)";
    }

    // 2. 特工名稱編輯切換邏輯 (保留 Stitch 完整結構)
    if (renameToggleBtn && displayName && inputName && iconElement) {
        renameToggleBtn.addEventListener("click", () => {
            if (!isEditing) {
                // 進入編輯狀態
                isEditing = true;
                displayName.classList.add("hidden");
                inputName.classList.remove("hidden");
                inputName.value = displayName.textContent.trim();
                inputName.focus();
                iconElement.textContent = "save"; // 切換為儲存圖示
            } else {
                // 執行變更保存
                const newName = inputName.value.trim();
                if (!newName) {
                    window.showCyberToast ? window.showCyberToast("特工名稱不可為空。", "error") : alert("特工名稱不可為空。");
                    return;
                }
                const oldName = getUrlParam('user') || "CyberPlayer";

                if (newName !== oldName) {
                    // 發送後台更名請求
                    fetch(`/api/rename?user=${encodeURIComponent(oldName)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ new_name: newName })
                    })
                    .then(res => {
                        if (!res.ok) throw new Error("API Offline");
                        return res.json();
                    })
                    .then(data => {
                        if (data.status === "success") {
                            window.showCyberToast ? window.showCyberToast(`🟢 特工更名成功！更新代號：${data.new_name}`) : alert(`🟢 特工更名成功！`);
                            localStorage.setItem("cyber_badminton_user", data.new_name);
                            window.location.href = `/lobby?user=${encodeURIComponent(data.new_name)}`;
                        } else {
                            window.showCyberToast ? window.showCyberToast("❌ 更名失敗：該代號已被佔用", "error") : alert("❌ 更名失敗：該特工代號已被使用。");
                        }
                    })
                    .catch(err => {
                        // 離線/測試 Fallback 邏輯
                        console.warn("後台 API 暫未完全啟用，實施本地更名相容：", err);
                        displayName.textContent = newName;
                        localStorage.setItem("cyber_badminton_user", newName);
                        window.location.href = `/lobby?user=${encodeURIComponent(newName)}`;
                    });
                }

                // 還原為顯示狀態
                isEditing = false;
                displayName.classList.remove("hidden");
                inputName.classList.add("hidden");
                iconElement.textContent = "edit";
            }
        });

        // 支援鍵盤 Enter 直接儲存
        inputName.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                renameToggleBtn.click();
            }
        });
    }

    // 3. 全域大廳數據加載
    window.fetchLobbyData = function() {
        const activeUser = getUrlParam('user') || "CyberPlayer";

        // 預先同步 UI
        if (displayName) displayName.textContent = activeUser;
        if (inputName) inputName.value = activeUser;

        // 重設經驗條寬度為 0 進行漸入準備
        const xpBar = document.getElementById("xpBar");
        if (xpBar) xpBar.style.width = "0%";

        // 讀取特工個人資料
        fetch(`/api/user_info?user=${encodeURIComponent(activeUser)}`)
            .then(res => {
                if (!res.ok) throw new Error("API user_info offline");
                return res.json();
            })
            .then(data => {
                if (displayName) displayName.textContent = data.username;
                if (inputName) inputName.value = data.username;
                
                const userCoins = document.getElementById("userCoins");
                if (userCoins) userCoins.innerText = data.coins;

                // 換算等級及動態經驗條漸入 (每升一級需要 level * 200)
                const playerLvl = document.getElementById("playerLvl");
                const currentRankText = document.getElementById("playerCurrentRankText");
                const playerStatsText = document.getElementById("playerStatsText");
                const statXp = document.getElementById("statXp");

                let lvl = data.level || 1;
                let currentXp = data.xp || 0;
                let xpRequired = lvl * 200; // 階梯升級公式
                let expPercent = (currentXp / xpRequired) * 100;

                if (playerLvl) {
                    playerLvl.innerText = `LVL ${lvl.toString().padStart(2, '0')}`;
                    
                    // 經驗條過渡漸入動畫延遲注入
                    setTimeout(() => {
                        if (xpBar) xpBar.style.width = `${expPercent}%`;
                    }, 150);
                }

                // 將卡片下方的勝場數替換為真實的「經驗值/經驗值上限」文字
                if (statXp) {
                    statXp.innerText = `${currentXp} / ${xpRequired}`;
                }

                // 渲染目前段位
                if (currentRankText) {
                    const score = data.score || 0;
                    currentRankText.innerText = getRankNameByScore(score);
                }

                // 渲染真實對戰數據統計 (勝率 + 場數)
                if (playerStatsText) {
                    const wins = data.wins || 0;
                    const matches = data.matches_played || 0;
                    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
                    playerStatsText.innerText = `Win Rate: ${winRate}% | Total Matches: ${matches}`;
                }
            })
            .catch(err => {
                console.warn("API `/api/user_info` 未就緒，載入基礎離線數值。");
                const userCoins = document.getElementById("userCoins");
                if (userCoins) userCoins.innerText = "300";
                
                const statXp = document.getElementById("statXp");
                if (statXp) statXp.innerText = "0 / 200";
                
                const playerLvl = document.getElementById("playerLvl");
                const currentRankText = document.getElementById("playerCurrentRankText");
                const playerStatsText = document.getElementById("playerStatsText");
                
                if (playerLvl) playerLvl.innerText = "LVL 01";
                if (currentRankText) currentRankText.innerText = "未定段 (UNRANKED)";
                if (playerStatsText) playerStatsText.innerText = "Win Rate: 0% | Total Matches: 0";
                
                // 離線狀態經驗條
                setTimeout(() => {
                    if (xpBar) xpBar.style.width = "0%";
                }, 150);
            });

        // 讀取排位段位排行榜 (未建置或無數據時，強迫全虛位以待，徹底掃除假資料)
        fetch(`/api/leaderboard`)
            .then(res => {
                if (!res.ok) throw new Error("API leaderboard offline");
                return res.json();
            })
            .then(resData => {
                renderLeaderboard(resData.data || resData);
            })
            .catch(err => {
                console.warn("API `/api/leaderboard` 未就緒，加載全虛位以待天梯排行。");
                // 傳遞空陣列，促使渲染器將 5 個位置全部渲染為「虛位以待」
                renderLeaderboard([]);
            });
    };

    // 4. 排行榜填充渲染模組 (100% 遵循中庸段位顯示，缺口自動填充「虛位以待」)
    function renderLeaderboard(dataArray) {
        const leaderboardList = document.getElementById("leaderboardList");
        if (!leaderboardList) return;

        const maxSlots = 5;
        let listHtml = '';
        const rawItems = Array.isArray(dataArray) ? dataArray : [];
        const finalItems = [...rawItems];

        // 排行榜數據不足 5 筆，自動以半透明「虛位以待」佔位元素填滿
        while (finalItems.length < maxSlots) {
            finalItems.push({
                username: "虛位以待",
                score: 0,
                isPlaceholder: true
            });
        }

        finalItems.forEach((r, idx) => {
            let trophy = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}`));
            let cardStyle, textStyle;

            if (r.isPlaceholder) {
                // 虛位以待佔位行：100% 保留您的賽博灰透明度與虛線樣式
                cardStyle = 'border-dashed border-outline-variant/20 opacity-30 bg-transparent';
                textStyle = 'text-on-surface-variant italic';
            } else {
                // 有效選手天梯行：完美保留您原本的霓虹亮色
                cardStyle = idx === 0 ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,219,233,0.15)]' : 'border-outline-variant/10 bg-surface-container/25';
                textStyle = idx === 0 ? 'text-primary font-bold' : 'text-on-surface';
            }

            let name = r.username || r.player_name || "虛位以待";
            let rankTier = r.isPlaceholder ? "排位虛位以待" : getRankNameByScore(r.score);
            let displayScore = r.isPlaceholder ? "---" : `${r.score || 0} LP`;

            listHtml += `
            <div class="flex items-center gap-4 p-2.5 rounded border ${cardStyle}">
                <span class="font-label-caps text-lg">${trophy}</span>
                <div class="flex-grow min-w-0">
                    <p class="font-headline-md text-sm ${textStyle} truncate">${escapeHtml(name)}</p>
                    <p class="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider">${rankTier} <span class="ml-2 font-mono text-primary/80">${displayScore}</span></p>
                </div>
            </div>`;
        });

        leaderboardList.innerHTML = listHtml;
    }

    // 5. 全域登出邏輯
    window.handleLogout = function() {
        fetch('/api/logout', { method: 'POST' })
            .then(() => {
                localStorage.removeItem("cyber_badminton_user");
                window.location.href = '/login';
            })
            .catch(() => {
                localStorage.removeItem("cyber_badminton_user");
                window.location.href = '/login';
            });
    };

    // 啟動大廳加載
    fetchLobbyData();
});

// HTML 轉義安全工具
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 參數解析工具
function getUrlParam(name) {
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    let r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURIComponent(r[2]);
    return null;
}