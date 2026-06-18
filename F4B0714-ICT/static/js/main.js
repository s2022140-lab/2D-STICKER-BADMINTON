/**
 * main.js - 全域交通部
 * 嚴格鎖定 URL 中 ?user=xxx 參數，維護全域使用者狀態
 */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    let username = params.get("user");

    // 1. 若 URL 中無 user 參數，嘗試自本地快取提取
    if (!username) {
        username = localStorage.getItem("cyber_badminton_user");
    } else {
        localStorage.setItem("cyber_badminton_user", username);
    }

    const currentPath = window.location.pathname;

    // 2. 路由守衛：若無使用者代號，且當前不在登入頁，強制返回登入頁
    if (!username && currentPath !== "/login" && currentPath !== "/") {
        window.location.href = "/login";
        return;
    }

    // 3. 更新全域使用者 UI
    const userBadge = document.getElementById("global-user-badge");
    const usernameDisplay = document.getElementById("global-username");

    if (username && userBadge && usernameDisplay) {
        userBadge.classList.remove("hidden");
        userBadge.classList.add("flex");
        usernameDisplay.textContent = username.toUpperCase();
    }

    // 4. 提供全域工具函數，讓所有 sub-pages 產生的連結都自動攜帶 ?user= 參數
    window.getCyberUrl = function(basePath) {
        if (!username) return basePath;
        const separator = basePath.includes("?") ? "&" : "?";
        return `${basePath}${separator}user=${encodeURIComponent(username)}`;
    };

    // 5. 自動將頁面上的帶有 data-cyber-link 的 A 標籤 href 屬性補上參數
    document.querySelectorAll("a[data-cyber-link]").forEach(link => {
        const baseHref = link.getAttribute("href");
        link.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = window.getCyberUrl(baseHref);
        });
    });
});